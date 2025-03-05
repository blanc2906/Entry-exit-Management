#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_Fingerprint.h>
#include <HardwareSerial.h>
#include <secret.h>
#include <LiquidCrystal_I2C.h>

int lcdColumns = 16;
int lcdRows = 2;

LiquidCrystal_I2C lcd(0x27, lcdColumns, lcdRows);

const char *ssid = WIFI_SSID; 
const char *password = WIFI_PASSWORD;  

const char *mqtt_broker = MQTT_BROKER_URL;
const char *topic = INIT_TOPIC;  
const char *mqtt_username = USER_NAME;
const char *mqtt_password = PASSWORD;
const int mqtt_port = MQTT_PORT;  

const char *ca_cert = CERT;

WiFiClientSecure esp_client;
PubSubClient mqtt_client(esp_client);

HardwareSerial mySerial(2);
Adafruit_Fingerprint finger(&mySerial);

uint8_t id;
uint8_t lastUsedId = 0;


void setup() {
  Serial.begin(9600);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Initializing...");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to the Wi-Fi network");
  
  esp_client.setCACert(ca_cert);
  mqtt_client.setServer(mqtt_broker, mqtt_port);
  mqtt_client.setCallback(callback);

  while (!mqtt_client.connected()) {
    String client_id = "esp32-client-";
    client_id += String(WiFi.macAddress());
    Serial.printf("The client %s connects to the public MQTT broker\n", client_id.c_str());
    if (mqtt_client.connect(client_id.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("Public HiveMQ MQTT broker connected");
    } else {
      Serial.print("Failed with state ");
      Serial.print(mqtt_client.state());
      delay(2000);
    }
  }
  mqtt_client.subscribe(topic);
  mqtt_client.subscribe("delete_user");
  mqtt_client.subscribe("create_user");
  mqtt_client.subscribe("attended_success");

  while (!Serial); 
  delay(100);

  mySerial.begin(57600, SERIAL_8N1, 16, 17);
  
  Serial.println("\n\nFingerprint Sensor System");

  finger.begin(57600);
  delay(5);
  
  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
    while (1) { delay(1); }
  }

  finger.getTemplateCount();

  if (finger.templateCount == 0) {
    Serial.println("Sensor doesn't contain any fingerprint data. Starting enrollment mode...");
  }
  else {
    Serial.print("Sensor contains "); 
    Serial.print(finger.templateCount); 
    Serial.println(" templates");
    Serial.println("Starting detection mode...");
  }
}

void callback(char *topic, byte *payload, unsigned int length) {
  Serial.print("Message arrived in topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  
  // Convert payload to string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  
  Serial.println(message);

  if (strcmp(topic, "create_user") == 0) {
    Serial.println("Starting enrollment process...");
    uint8_t newId = enrollFingerprint();
    
    if (newId > 0) {
        Serial.printf("Successfully enrolled fingerprint for ID #%d\n", newId);
    } else {
        Serial.println("Enrollment failed");
    }
  }

  else if (strcmp(topic, "attended_success") == 0) {
    // Extract name from the JSON-like message
    char* dataStart = strstr(message, "\"data\":\"");
    if (dataStart) {
      dataStart += 8; // Skip "data":"
      char* dataEnd = strchr(dataStart, '"');
      if (dataEnd) {
        char name[32]; // Buffer for the name
        int len = dataEnd - dataStart;
        strncpy(name, dataStart, len);
        name[len] = '\0';
        
        // Display welcome message and name
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Welcome");
        lcd.setCursor(0, 1);
        lcd.print(name);
        delay(5000);
      }
    }
  }
  else if (strcmp(topic, "delete_user") == 0) {
    // Extract finger_id from the JSON-like message
    char* dataStart = strstr(message, "\"data\":\"");
    if (dataStart) {
      dataStart += 8; // Skip "data":"
      char* dataEnd = strchr(dataStart, '"');
      if (dataEnd) {
        char finger_id_str[4];
        int len = dataEnd - dataStart;
        strncpy(finger_id_str, dataStart, len);
        finger_id_str[len] = '\0';
        
        uint8_t finger_id = atoi(finger_id_str);
        Serial.print("Deleting fingerprint ID #");
        Serial.println(finger_id);
        deleteFingerprint(finger_id);
      }
    }
  }
}

void reconnect() {
  while (!mqtt_client.connected()) {
    String client_id = "esp32-client-";
    client_id += String(WiFi.macAddress());
    Serial.printf("Reconnecting to MQTT as %s\n", client_id.c_str());
    if (mqtt_client.connect(client_id.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("Reconnected to MQTT broker");
      mqtt_client.subscribe(topic);
      mqtt_client.subscribe("delete_user");
      mqtt_client.subscribe("create_user"); 
      mqtt_client.subscribe("attended_success");
    } else {
      Serial.print("Failed to connect, state: ");
      Serial.println(mqtt_client.state());
      delay(2000);
    }
  }
}

uint8_t readnumber(void) {
  uint8_t num = 0;
  while (num == 0) {
    while (!Serial.available());
    num = Serial.parseInt();
  }
  return num;
}
void loop() {
  if (!WiFi.isConnected()) {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
    }
    Serial.println("WiFi reconnected");
  }

  if (!mqtt_client.connected()) {
    reconnect();
  }
  
  mqtt_client.loop(); 
  getFingerprintID();
  delay(3000); 
}           

uint8_t getFingerprintID() {
  uint8_t p = finger.getImage();
  switch (p) {
    case FINGERPRINT_OK:
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Image taken");
      Serial.println("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Ready to Scan");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_IMAGEFAIL:
      Serial.println("Imaging error");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }

  // OK success!
  p = finger.image2Tz();
  switch (p) {
    case FINGERPRINT_OK:
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Processing...");
      Serial.println("Image converted");
      break;
    case FINGERPRINT_IMAGEMESS:
      Serial.println("Image too messy");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_FEATUREFAIL:
      Serial.println("Could not find fingerprint features");
      return p;
    case FINGERPRINT_INVALIDIMAGE:
      Serial.println("Could not find fingerprint features");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }

  // OK converted!
  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    // lcd.clear();
    // lcd.setCursor(0, 0);
    // lcd.print("Found Match!");
    // lcd.setCursor(0, 1);
    // lcd.print("ID #");
    //lcd.print(finger.fingerID);
    Serial.println("Found a print match!");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    return p;
  } else if (p == FINGERPRINT_NOTFOUND) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("No Match Found");
    Serial.println("Did not find a match");
    return p;
  } else {
    Serial.println("Unknown error");
    return p;
  }

  // found a match!
  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" with confidence of "); Serial.println(finger.confidence);

   char fingerIDStr[5];
  itoa(finger.fingerID, fingerIDStr, 10);
  mqtt_client.publish("finger_attendance", fingerIDStr);

  return finger.fingerID;
}

// returns -1 if failed, otherwise returns ID #
int getFingerprintIDez() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)  return -1;

  // found a match!
  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" with confidence of "); Serial.println(finger.confidence);
  return finger.fingerID;
}

uint8_t deleteFingerprint(uint8_t id) {
  uint8_t p = -1;
  
  p = finger.deleteModel(id);

  if (p == FINGERPRINT_OK) {
    Serial.println("Fingerprint deleted!");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
  } else if (p == FINGERPRINT_BADLOCATION) {
    Serial.println("Could not delete from that location");
  } else if (p == FINGERPRINT_FLASHERR) {
    Serial.println("Error writing to flash");
  } else {
    Serial.print("Unknown error: 0x"); Serial.println(p, HEX);
  }   

  return p;
}

uint8_t enrollFingerprint() {
  // Get current template count
  if (finger.getTemplateCount() != FINGERPRINT_OK) {
    Serial.println("Error getting template count");
    return 0;
  }
  
  Serial.print("Current template count: ");
  Serial.println(finger.templateCount);
  
  // Check if there's space available (max 127 fingerprints)
  if (finger.templateCount >= 127) {
    Serial.println("No free slot available - maximum capacity reached!");
    return 0;
  }
  
  // Start from ID 1
  id = 1;
  
  // Find first available slot
  while (id <= 127) {
    uint8_t p = finger.loadModel(id);
    if (p == FINGERPRINT_PACKETRECIEVEERR || p != FINGERPRINT_OK) {
      // Empty slot found
      Serial.print("Found empty slot at ID #");
      Serial.println(id);
      break;
    }
    id++;
  }

  Serial.print("Enrolling ID #");
  Serial.println(id);
  
  if (getFingerprintEnroll(id)) {
    lastUsedId = id;
    return id;
  }
  
  return 0;
}

bool getFingerprintEnroll(uint8_t id) {
  int p = -1;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Place finger");
  lcd.setCursor(0, 1);
  lcd.print("ID #");
  lcd.print(id);
  Serial.println("Waiting for valid finger to enroll");
  
  // First reading
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
    case FINGERPRINT_OK:
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Image taken");
      Serial.println("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
      Serial.print(".");
      break;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      break;
    case FINGERPRINT_IMAGEFAIL:
      Serial.println("Imaging error");
      break;
    default:
      Serial.println("Unknown error");
      break;
    }
    delay(100);
  }

  // Convert first image to template for checking duplicates
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("Image conversion failed");
    return false;
  }

  // Check for duplicate fingerprint
  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
    // Fingerprint already exists
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Already Exists!");
    lcd.setCursor(0, 1);
    lcd.print("ID #");
    lcd.print(finger.fingerID);
    Serial.print("This fingerprint already exists with ID #");
    Serial.println(finger.fingerID);
    delay(5000);
    return false;
  } else if (p == FINGERPRINT_NOTFOUND) {
    // Fingerprint is new, proceed with enrollment
    Serial.println("No duplicate found, proceeding with enrollment");
  } else {
    Serial.println("Error during duplicate check");
    return false;
  }

  Serial.println("Remove finger");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Remove finger");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    delay(100);
  }

  // Second reading
  Serial.println("Place same finger again");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Place finger");
  lcd.setCursor(0, 1);
  lcd.print("again");
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
    case FINGERPRINT_OK:
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Image taken");
      Serial.println("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
      Serial.print(".");
      break;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      break;
    case FINGERPRINT_IMAGEFAIL:
      Serial.println("Imaging error");
      break;
    default:
      Serial.println("Unknown error");
      break;
    }
    delay(100);
  }

  // Convert second image to template
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("Image conversion failed");
    return false;
  }

  // Create model from the two templates
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println("Failed to create model");
    return false;
  }

  // Store the model
  p = finger.storeModel(id);
  if (p != FINGERPRINT_OK) {
    Serial.println("Failed to store model");
    return false;
  }
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Success!");
  lcd.setCursor(0, 1);
  lcd.print("ID #");
  lcd.print(id);
  delay(5000);
  Serial.println("Fingerprint enrolled successfully!");
  return true;
}