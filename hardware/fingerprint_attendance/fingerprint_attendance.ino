#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_Fingerprint.h>
#include <HardwareSerial.h>
#include "secret.h"
#include <LiquidCrystal_I2C.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <base64.h>
#include <esp_wifi.h>

String macAddress = "";

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

const char *server_url = "http://192.168.1.3:3000/users/add-fingerprint";

String base_topic = "verify_device_";
String response_topic = "verified_device_";
WiFiClientSecure esp_client;
PubSubClient mqtt_client(esp_client);

HardwareSerial mySerial(2);
Adafruit_Fingerprint finger(&mySerial);

uint8_t id;
uint8_t lastUsedId = 0;
String currentUserId = "";

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
  base_topic += String(WiFi.macAddress());
  response_topic += String(WiFi.macAddress());
  mqtt_client.subscribe(topic);
  mqtt_client.subscribe("delete_user");
  mqtt_client.subscribe("add_fingerprint");
  mqtt_client.subscribe("attended_success");
  mqtt_client.subscribe("import_fingerprint");
  mqtt_client.subscribe(base_topic.c_str());

  while (!Serial); 
  delay(100);
  Serial.print("[DEFAULT] ESP32 Board MAC Address: ");
  readMacAddress();

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
void readMacAddress(){
  uint8_t baseMac[6];
  esp_err_t ret = esp_wifi_get_mac(WIFI_IF_STA, baseMac);
  if (ret == ESP_OK) {
    macAddress = String(baseMac[0], HEX) + ":" + String(baseMac[1], HEX) + ":" +
                 String(baseMac[2], HEX) + ":" + String(baseMac[3], HEX) + ":" +
                 String(baseMac[4], HEX) + ":" + String(baseMac[5], HEX);
    macAddress.toUpperCase();
    Serial.println(macAddress);
  } else {
    Serial.println("Failed to read MAC address");
  }
}

void callback(char *topic, byte *payload, unsigned int length) {
  Serial.print("Message arrived in topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  
  Serial.println(message);

  if (strcmp(topic, "add_fingerprint") == 0) {
    Serial.println("Starting enrollment process...");
    
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      return;
    }
    
    const char* userId = doc["data"];
    if (userId) {
      currentUserId = String(userId);
      Serial.print("User ID to enroll: ");
      Serial.println(currentUserId);

      uint8_t newId = enrollFingerprint();

      if (newId > 0) {
        Serial.printf("Successfully enrolled fingerprint for ID #%d\n", newId);
        sendFingerDataToServer(currentUserId, newId);
      } else {
        Serial.println("Enrollment failed");
      }
    } else {
      Serial.println("No data field found in message");
    }
  }

  if (strcmp(topic, "import_fingerprint") == 0) {
    Serial.println("Starting fingerprint import process...");
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      return;
    }
    
    const char* userId = doc["data"];
    if (userId) {
      currentUserId = String(userId);
      Serial.print("User ID to import: ");
      Serial.println(currentUserId);
      getTemplateFromServerWithUserId(userId);
    } else {
      Serial.println("No data field found in message");
    }
    
  }
  if (strcmp(topic, base_topic.c_str()) == 0 ) {
    Serial.println("Verifying device...");
    mqtt_client.publish(response_topic.c_str(),"verified");
    
  }
}

// void sendFingerDataToServer(String userId, uint8_t fingerId) {
//   HTTPClient http;
  
//   http.begin(server_url);
//   http.addHeader("Content-Type", "application/json");
  
//   String fingerTemplate = getFingerprintTemplate(fingerId);
  
//   // Check if we got a valid template
//   if (fingerTemplate.length() == 0) {
//     Serial.println("Failed to get fingerprint template, cannot send to server");
    
//     lcd.clear();
//     lcd.setCursor(0, 0);
//     lcd.print("Error: No");
//     lcd.setCursor(0, 1);
//     lcd.print("template data");
//     delay(3000);
//     return;
//   }
  
//   StaticJsonDocument<4096> doc; // Increased size for larger templates
//   doc["userId"] = userId;
//   doc["fingerId"] = String(fingerId);
//   doc["fingerTemplate"] = fingerTemplate;
  
//   String requestBody;
//   serializeJson(doc, requestBody);
  
//   Serial.println("Sending POST request to server...");
//   Serial.print("Template length: ");
//   Serial.println(fingerTemplate.length());
  
//   int httpResponseCode = http.POST(requestBody);
  
//   if (httpResponseCode > 0) {
//     String response = http.getString();
//     Serial.println("HTTP Response code: " + String(httpResponseCode));
//     Serial.println("Response: " + response);
    
//     lcd.clear();
//     lcd.setCursor(0, 0);
//     lcd.print("Data sent");
//     lcd.setCursor(0, 1);
//     lcd.print("Successfully");
//     delay(3000);
//   } else {
//     Serial.println("HTTP Error: " + String(httpResponseCode));
    
//     lcd.clear();
//     lcd.setCursor(0, 0);
//     lcd.print("Failed to send");
//     lcd.setCursor(0, 1);
//     lcd.print("Error: " + String(httpResponseCode));
//     delay(3000);
//   }
  
//   http.end();
// }

void reconnect() {
  while (!mqtt_client.connected()) {
    String client_id = "esp32-client-";
    client_id += String(WiFi.macAddress());
    Serial.printf("Reconnecting to MQTT as %s\n", client_id.c_str());
    if (mqtt_client.connect(client_id.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("Reconnected to MQTT broker");
      mqtt_client.subscribe(topic);
      mqtt_client.subscribe("delete_user");
      mqtt_client.subscribe("add_fingerprint"); 
      mqtt_client.subscribe("attended_success");
      mqtt_client.subscribe("import_fingerprint");
      mqtt_client.subscribe(base_topic.c_str());
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

  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" with confidence of "); Serial.println(finger.confidence);

   char fingerIDStr[5];
  itoa(finger.fingerID, fingerIDStr, 10);
  mqtt_client.publish("finger_attendance", fingerIDStr);

  return finger.fingerID;
}

int getFingerprintIDez() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)  return -1;

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
  if (finger.getTemplateCount() != FINGERPRINT_OK) {
    Serial.println("Error getting template count");
    return 0;
  }
  
  Serial.print("Current template count: ");
  Serial.println(finger.templateCount);
  
  if (finger.templateCount >= 127) {
    Serial.println("No free slot available - maximum capacity reached!");
    return 0;
  }
  
  id = 1;
  while (id <= 127) {
    uint8_t p = finger.loadModel(id);
    if (p == FINGERPRINT_PACKETRECIEVEERR || p != FINGERPRINT_OK) {
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

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("Image conversion failed");
    return false;
  }

  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
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

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("Image conversion failed");
    return false;
  }

  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println("Failed to create model");
    return false;
  }

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

String getFingerprintTemplate(uint8_t id) {
  Serial.print("Attempting to load template #"); 
  Serial.println(id);
  
  uint8_t p = finger.loadModel(id);
  switch (p) {
    case FINGERPRINT_OK:
      Serial.print("Template "); Serial.print(id); Serial.println(" loaded");
      break;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return "";
    default:
      Serial.print("Unknown error "); Serial.println(p);
      return "";
  }

  // OK success!
  Serial.print("Attempting to get template #"); Serial.println(id);
  p = finger.getModel();
  switch (p) {
    case FINGERPRINT_OK:
      Serial.print("Template "); Serial.print(id); Serial.println(" transferring:");
      break;
    default:
      Serial.print("Unknown error "); Serial.println(p);
      return "";
  }

  
  uint8_t bytesReceived[534]; 
  memset(bytesReceived, 0xff, 534);

  uint32_t starttime = millis();
  int i = 0;
  while (i < 534 && (millis() - starttime) < 20000) {
    if (mySerial.available()) {
      bytesReceived[i++] = mySerial.read();
    }
  }
  Serial.print(i); Serial.println(" bytes read.");
  
  if (i != 534) {
    Serial.println("Failed to read complete template");
    return "";
  }
  
  Serial.println("Decoding packet...");

  uint8_t fingerTemplate[512]; 
  memset(fingerTemplate, 0xff, 512);

  
  int uindx = 9, index = 0;
  memcpy(fingerTemplate + index, bytesReceived + uindx, 256);   
  uindx += 256;       
  uindx += 2;         
  uindx += 9;         
  index += 256;       
  memcpy(fingerTemplate + index, bytesReceived + uindx, 256);

  
  String hexTemplate = "";
  for (int i = 0; i < 512; ++i) {
    if (fingerTemplate[i] < 0x10) {
      hexTemplate += "0";
    }
    hexTemplate += String(fingerTemplate[i], HEX);
  }
  
  Serial.print("Template length: ");
  Serial.println(hexTemplate.length());
  return hexTemplate;
}

void sendFingerDataToServer(String userId, uint8_t fingerId) {
  HTTPClient http;
  
  http.begin(server_url);
  http.addHeader("Content-Type", "application/json");
  
  String fingerTemplate = getFingerprintTemplate(fingerId);
  
  if (fingerTemplate.length() == 0) {
    Serial.println("Failed to get fingerprint template, cannot send to server");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Error: No");
    lcd.setCursor(0, 1);
    lcd.print("template data");
    delay(3000);
    return;
  }
  
  StaticJsonDocument<4096> doc; 
  doc["userId"] = userId;
  doc["fingerId"] = String(fingerId);
  doc["fingerTemplate"] = fingerTemplate;
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.println("Sending POST request to server...");
  Serial.print("Template length: ");
  Serial.println(fingerTemplate.length());
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Data sent");
    lcd.setCursor(0, 1);
    lcd.print("Successfully");
    delay(3000);
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Failed to send");
    lcd.setCursor(0, 1);
    lcd.print("Error: " + String(httpResponseCode));
    delay(3000);
  }
  
  http.end();
}




int decode_base64(unsigned char *input, unsigned char *output) {
  // Tìm độ dài của chuỗi Base64
  int len = strlen((char*)input);
  
  // Tạo bảng tra cứu giá trị Base64
  int base64_map[256] = {0};
  for (int i = 0; i < 64; i++) {
    if (i < 26) base64_map['A' + i] = i;
    else if (i < 52) base64_map['a' + (i - 26)] = i;
    else if (i < 62) base64_map['0' + (i - 52)] = i;
    else if (i == 62) base64_map['+'] = i;
    else if (i == 63) base64_map['/'] = i;
  }
  
  // Decode
  int outlen = 0;
  for (int i = 0; i < len; i += 4) {
    // Lấy 4 ký tự Base64
    uint32_t val = 0;
    for (int j = 0; j < 4; j++) {
      if (i + j < len && input[i + j] != '=') 
        val = (val << 6) | base64_map[input[i + j]];
      else
        val = val << 6;
    }
    
    // Chuyển đổi thành 3 byte
    output[outlen++] = (val >> 16) & 0xFF;
    if (i + 2 < len && input[i + 2] != '=')
      output[outlen++] = (val >> 8) & 0xFF;
    if (i + 3 < len && input[i + 3] != '=')
      output[outlen++] = val & 0xFF;
  }
  
  return outlen;
}

void getTemplateFromServerWithUserId(String userId) {
  HTTPClient http;
  
  String url = "http://192.168.1.3:3000/users/" + userId + "/get-finger-data";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  Serial.print("Getting fingerprint data for user: ");
  Serial.println(userId);
  Serial.print("URL: ");
  Serial.println(url);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    
    DynamicJsonDocument doc(8192);
    DeserializationError error = deserializeJson(doc, response);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      http.end();
      return;
    }
    
    if (doc.containsKey("fingerId") && doc.containsKey("templateData") && doc.containsKey("userId")) {
      uint8_t fingerId = doc["fingerId"].as<uint8_t>();
      const char* userId = doc["userId"];
      const char* templateData = doc["templateData"];
      
      Serial.print("Received template - Finger ID: ");
      Serial.println(fingerId);
      Serial.print("User ID: ");
      Serial.println(userId);
      Serial.print("Template Data Length: ");
      Serial.println(strlen(templateData));
      
      //processFingerprintTemplate(fingerId, userId, templateData);
      
      notifyTemplateProcessed(fingerId, userId);
    } else {
      Serial.println("Missing required fields in the fingerprint data");
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}



void notifyTemplateProcessed(uint8_t fingerId, const char* userId) {
}



