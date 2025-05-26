#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <HardwareSerial.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <base64.h>
#include <esp_wifi.h>
#include <MFRC522v2.h>
#include <MFRC522DriverSPI.h>
#include <MFRC522DriverPinSimple.h>
#include <MFRC522Debug.h>
#include <WebServer.h>
#include <EEPROM.h>
#include "secret.h"
#include "fp_lib.h"

// EEPROM configs
#define EEPROM_SIZE 96
#define SSID_ADDR 0
#define PASS_ADDR 32

// Wifi configs
const char *ssid = NULL; 
const char *password = NULL;

// MQTT configs
const char *mqtt_broker = MQTT_BROKER_URL;
const char *mqtt_username = USER_NAME;
const char *mqtt_password = PASSWORD;
const int mqtt_port = MQTT_PORT;  
const char *ca_cert = CERT;

WiFiClientSecure esp_client;
PubSubClient mqtt_client(esp_client);
WebServer server(80);

HardwareSerial mySerial(2);
Adafruit_Fingerprint finger(&mySerial);

MFRC522DriverPinSimple ss_pin(21);
MFRC522DriverSPI driver{ss_pin}; 
MFRC522 mfrc522{driver}; 

uint8_t id;
uint8_t lastUsedId = 0;
String currentUserId = "";
bool waitingForCardScan = false;
bool isAPMode = false;

String macAddress;
String verifyDeviceTopic;
String deleteFingerTopic;
String emptyDatabaseTopic;
String addFingerTopic;
String importFingerTopic;
String addCardTopic;
String fingerAttendanceTopic;
String cardAttendanceTopic;
String cardRegistrationResultTopic;
String fingerprintDeletionResultTopic;

// WiFi setup functions
void saveCredentials(const String& ssid, const String& password) {
  for (int i = 0; i < 32; i++) {
    EEPROM.write(SSID_ADDR + i, i < ssid.length() ? ssid[i] : 0);
    EEPROM.write(PASS_ADDR + i, i < password.length() ? password[i] : 0);
  }
  EEPROM.commit();
}

void loadCredentials(String &ssid, String &password) {
  char ssidBuf[33];
  char passBuf[33];
  for (int i = 0; i < 32; i++) {
    ssidBuf[i] = EEPROM.read(SSID_ADDR + i);
    passBuf[i] = EEPROM.read(PASS_ADDR + i);
  }
  ssidBuf[32] = '\0';
  passBuf[32] = '\0';

  ssid = String(ssidBuf);
  password = String(passBuf);
}

void clearCredentials() {
  for (int i = 0; i < 64; i++) EEPROM.write(i, 0);
  EEPROM.commit();
}

void handleRoot() {
  String html = "<h1>Configure WiFi</h1><form method='POST' action='/setup'>";
  html += "SSID: <input name='ssid' type='text'><br>";
  html += "Password: <input name='password' type='password'><br>";
  html += "<input type='submit'></form>";
  server.send(200, "text/html", html);
}

void handleSetup() {
  String ssid = server.arg("ssid");
  String password = server.arg("password");

  if (ssid.length() > 0 && password.length() > 0) {
    saveCredentials(ssid, password);
    server.send(200, "text/html", "<h1>Saved! Rebooting...</h1>");
    delay(2000);
    ESP.restart();
  } else {
    server.send(400, "text/html", "Invalid SSID or password");
  }
}

void startAPMode() {
  WiFi.softAP("ESP32_Config", "12345678");
  Serial.println("Started Access Point: ESP32_Config");
  Serial.println("IP Address: " + WiFi.softAPIP().toString());

  server.on("/", handleRoot);
  server.on("/setup", HTTP_POST, handleSetup);
  server.begin();
  
  isAPMode = true;
}

bool connectToWiFi() {
  String savedSSID, savedPassword;
  loadCredentials(savedSSID, savedPassword);

  if (savedSSID.length() > 0 && savedPassword.length() > 0) {
    WiFi.begin(savedSSID.c_str(), savedPassword.c_str());
    Serial.print("Connecting to WiFi");
    unsigned long startAttempt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
      Serial.print(".");
      delay(500);
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nConnected to WiFi!");
      Serial.println("IP Address: " + WiFi.localIP().toString());
      return true;
    } else {
      Serial.println("\nFailed to connect.");
    }
  } else {
    Serial.println("No saved credentials.");
  }

  startAPMode();
  return false;
}

void setup(){
  Serial.begin(9600);
  EEPROM.begin(EEPROM_SIZE);
  delay(500);
  
  Serial.println("Starting device initialization...");
  
  // Try to connect to WiFi with stored credentials
  if (connectToWiFi()) {
    macAddress = WiFi.macAddress();

    verifyDeviceTopic = "verify_device_" + macAddress;
    deleteFingerTopic = "delete-fingerprint/" + macAddress;
    emptyDatabaseTopic = "empty-database/" + macAddress;
    addFingerTopic = "add-fingerprint/" + macAddress;
    importFingerTopic = "import-fingerprint/" + macAddress;
    addCardTopic = "add-cardnumber/" + macAddress;
    String attendedSuccessTopic = "attended-success/" + macAddress;

    fingerAttendanceTopic = "finger_attendance/" + macAddress;
    cardAttendanceTopic = "card_attendance/" + macAddress;
    cardRegistrationResultTopic = "card_registration_result/" + macAddress;
    fingerprintDeletionResultTopic = "fingerprint_deletion_result/" + macAddress;
    // Initialize MQTT only if WiFi is connected
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

    mqtt_client.subscribe(verifyDeviceTopic.c_str());
    mqtt_client.subscribe(deleteFingerTopic.c_str());
    mqtt_client.subscribe(emptyDatabaseTopic.c_str());
    mqtt_client.subscribe(addFingerTopic.c_str());
    mqtt_client.subscribe(attendedSuccessTopic.c_str());
    mqtt_client.subscribe(importFingerTopic.c_str());
    mqtt_client.subscribe(addCardTopic.c_str());
    
    // Initialize fingerprint sensor
    while (!Serial); 
    delay(100);

    mySerial.begin(57600, SERIAL_8N1, 16, 17);

    finger.begin(57600);
    delay(5);

    if (finger.verifyPassword()) {
      Serial.println("Found fingerprint sensor!");
    } else {
      Serial.println("Did not find fingerprint sensor :(");
      // Continue anyway as we might just want to use RFID
    }

    Serial.println(F("Reading sensor parameters"));
    finger.getParameters();
    Serial.print(F("Status: 0x")); Serial.println(finger.status_reg, HEX);
    Serial.print(F("Sys ID: 0x")); Serial.println(finger.system_id, HEX);
    Serial.print(F("Capacity: ")); Serial.println(finger.capacity);
    Serial.print(F("Security level: ")); Serial.println(finger.security_level);
    Serial.print(F("Device address: ")); Serial.println(finger.device_addr, HEX);
    Serial.print(F("Packet len: ")); Serial.println(finger.packet_len);
    Serial.print(F("Baud rate: ")); Serial.println(finger.baud_rate);

    finger.getTemplateCount();

    if (finger.templateCount == 0) {
      Serial.print("Sensor doesn't contain any fingerprint data. Please run the 'enroll' example.");
    }
    else {
      Serial.print("Sensor contains "); Serial.print(finger.templateCount); Serial.println(" templates");
    }
    
    // Initialize RFID reader
    mfrc522.PCD_Init();    
    MFRC522Debug::PCD_DumpVersionToSerial(mfrc522, Serial);
  }
  // If WiFi connection failed, the device is already in AP mode
}

void callback(char *topic, byte *payload, unsigned int length) {
  Serial.print("Message arrived in topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  
  Serial.println(message);

  if (strcmp(topic, verifyDeviceTopic.c_str()) == 0) {
    Serial.println("Received device verification request");
    
    // Parse the JSON message
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      return;
    }

    
    //if (doc.containsKey("deviceMac") && doc.containsKey("action")) {
      String deviceMac = doc["deviceMac"].as<String>();
      String action = doc["action"].as<String>();
      
      //if (deviceMac == macAddress && action == "verify") {
        Serial.println("Valid verification request for this device");
        
        // Respond with verification confirmation
        StaticJsonDocument<256> responseDoc;
        responseDoc["deviceMac"] = macAddress;
        responseDoc["verified"] = true;
   
        String responseMsg;
        serializeJson(responseDoc, responseMsg);
        
        mqtt_client.publish("verified_device", responseMsg.c_str());
        Serial.println("Verification response sent");
      //}
    //}
  }

    if (strcmp(topic, deleteFingerTopic.c_str()) == 0) {
    Serial.println("Starting fingerprint deletion process...");
    
    // Parse JSON message
    DynamicJsonDocument outerDoc(512);
    DeserializationError outerError = deserializeJson(outerDoc, message);
    
    if (outerError) {
      Serial.print("JSON parsing failed: ");
      Serial.println(outerError.c_str());
      return;
    }
    
    uint8_t fingerId = 0;
    
    // Check if this is a NestJS format with pattern and data fields
    if (outerDoc.containsKey("data")) {
      // Get the data string
      const char* dataString = outerDoc["data"];
      
      // Parse the inner JSON in the data field
      DynamicJsonDocument innerDoc(256);
      DeserializationError innerError = deserializeJson(innerDoc, dataString);
      
      if (innerError) {
        Serial.print("Inner JSON parsing failed: ");
        Serial.println(innerError.c_str());
        return;
      }
      
      // Extract fingerId from the inner JSON
      if (innerDoc.containsKey("fingerId")) {
        fingerId = innerDoc["fingerId"].as<uint8_t>();
      }
    } else if (outerDoc.containsKey("fingerId")) {
      // Direct format
      fingerId = outerDoc["fingerId"].as<uint8_t>();
    } else {
      // Legacy format - try to convert the whole message to an integer
      fingerId = atoi(message);
    }
    
    if (fingerId > 0) {
      Serial.print("Deleting fingerprint ID #");
      Serial.println(fingerId);
      
      uint8_t result = deleteFingerprint(fingerId);
      
      if (result == FINGERPRINT_OK) {
        Serial.print("Successfully deleted fingerprint ID #");
        Serial.println(fingerId);
      } else {
        Serial.print("Failed to delete fingerprint ID #");
        Serial.println(fingerId);
      }
    } else {
      Serial.println("Invalid fingerprint ID received");
    }
  }

  if (strcmp(topic, addFingerTopic.c_str()) == 0) {
  Serial.println("Starting enrollment process...");
  
  // Parse JSON message
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    // Fallback to using the raw message if parsing fails
    currentUserId = String(message);
  } else {
    // Check if message has data field (NestJS MQTT format)
    if (doc.containsKey("data")) {
      currentUserId = doc["data"].as<String>();
      Serial.print("Extracted userId from JSON data field: ");
      Serial.println(currentUserId);
    } else {
      // Use raw message if no data field
      currentUserId = String(message);
    }
  }
  
  uint8_t newId = enrollFingerprint();

  if (newId > 0) {
    Serial.printf("Successfully enrolled fingerprint for ID #%d\n", newId);
    sendFingerDataToServer(currentUserId, newId);
  } else {
    Serial.println("Enrollment failed");
  }
}

  if (strcmp(topic, importFingerTopic.c_str()) == 0) {
  Serial.println("Starting fingerprint import process...");
  
  // Parse JSON data from message
  DynamicJsonDocument outerDoc(512);
  DeserializationError outerError = deserializeJson(outerDoc, message);
  
  if (outerError) {
    Serial.print("JSON parsing failed: ");
    Serial.println(outerError.c_str());
    return;
  }
  
  // Check if this is a NestJS format with pattern and data fields
  if (outerDoc.containsKey("data")) {
    // Get the data string
    const char* dataString = outerDoc["data"];
    
    // Parse the inner JSON in the data field
    DynamicJsonDocument innerDoc(256);
    DeserializationError innerError = deserializeJson(innerDoc, dataString);
    
    if (innerError) {
      Serial.print("Inner JSON parsing failed: ");
      Serial.println(innerError.c_str());
      return;
    }
    
    // Now extract userId and fingerId from the inner JSON
    if (innerDoc.containsKey("userId") && innerDoc.containsKey("fingerId")) {
      currentUserId = innerDoc["userId"].as<String>();
      uint8_t fingerId = innerDoc["fingerId"].as<uint8_t>();
      
      Serial.print("User ID to import: ");
      Serial.println(currentUserId);
      Serial.print("Finger ID to use: ");
      Serial.println(fingerId);
      
      // Call getTemplateFromServerWithUserId with the fingerId
      getTemplateFromServerWithUserId(currentUserId, fingerId);
      return;
    }
  }
  if (outerDoc.containsKey("userId") && outerDoc.containsKey("fingerId")) {
    currentUserId = outerDoc["userId"].as<String>();
    uint8_t fingerId = outerDoc["fingerId"].as<uint8_t>();
    
    Serial.print("User ID to import (direct format): ");
    Serial.println(currentUserId);
    Serial.print("Finger ID to use: ");
    Serial.println(fingerId);
    
    // Call getTemplateFromServerWithUserId with the fingerId
    getTemplateFromServerWithUserId(currentUserId, fingerId);
  } else {
    // Last resort, try using the whole message as userId (legacy format)
    currentUserId = String(message);
    Serial.print("User ID to import (legacy format): ");
    Serial.println(currentUserId);
    getTemplateFromServerWithUserId(currentUserId, 0);  // 0 means auto-assign fingerId
  }
}
  
  if (strcmp(topic, addCardTopic.c_str()) == 0)  {
    Serial.println("Starting card registration process...");
    
    // Parse JSON message
    DynamicJsonDocument outerDoc(512);
    DeserializationError outerError = deserializeJson(outerDoc, message);
    
    if (outerError) {
      Serial.print("JSON parsing failed: ");
      Serial.println(outerError.c_str());
      // Fallback to using the raw message if parsing fails
      currentUserId = String(message);
    } else {
      // Check if this is a NestJS format with pattern and data fields
      if (outerDoc.containsKey("data")) {
        // Get the data string
        const char* dataString = outerDoc["data"];
        
        // Parse the inner JSON in the data field
        DynamicJsonDocument innerDoc(256);
        DeserializationError innerError = deserializeJson(innerDoc, dataString);
        
        if (innerError) {
          Serial.print("Inner JSON parsing failed: ");
          Serial.println(innerError.c_str());
          // Use the data string directly as userId
          currentUserId = String(dataString);
        } else {
          // Extract userId from the inner JSON
          if (innerDoc.containsKey("userId")) {
            currentUserId = innerDoc["userId"].as<String>();
          } else {
            // Use the whole inner data as userId
            currentUserId = String(dataString);
          }
        }
      } else if (outerDoc.containsKey("userId")) {
        // Direct format
        currentUserId = outerDoc["userId"].as<String>();
      } else {
         // Use raw message if no recognizable structure
        currentUserId = String(message);
      }
    }
    
    if (currentUserId.length() > 0) {
      Serial.print("User ID to enroll card: ");
      Serial.println(currentUserId);
      waitingForCardScan = true;
      Serial.println("Please scan your card now...");
    } else {
      Serial.println("No valid user ID found in message");
    }
  }

  if (strcmp(topic, emptyDatabaseTopic.c_str()) == 0) {
    deleteAllModels();
  }
}

void reconnect() {
  while (!mqtt_client.connected() && !isAPMode) {
    String client_id = "esp32-client-";
    client_id += String(WiFi.macAddress());
    Serial.printf("Reconnecting to MQTT as %s\n", client_id.c_str());
    if (mqtt_client.connect(client_id.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("Reconnected to MQTT broker");
      mqtt_client.subscribe(verifyDeviceTopic.c_str());
      mqtt_client.subscribe(deleteFingerTopic.c_str());
      mqtt_client.subscribe(emptyDatabaseTopic.c_str());
      mqtt_client.subscribe(addFingerTopic.c_str());
      mqtt_client.subscribe(("attended-success/" + macAddress).c_str());
      mqtt_client.subscribe(importFingerTopic.c_str());
      mqtt_client.subscribe(addCardTopic.c_str());
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

uint8_t getFingerprintID() {
  uint8_t p = finger.getImage();
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
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
    Serial.println("Found a print match!");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    return p;
  } else if (p == FINGERPRINT_NOTFOUND) {
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
  mqtt_client.publish(fingerAttendanceTopic.c_str(), fingerIDStr);

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
  Serial.println("Waiting for valid finger to enroll");
  
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
    case FINGERPRINT_OK:
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
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    delay(100);
  }

  Serial.println("Place same finger again");
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
    case FINGERPRINT_OK:
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
  delay(5000);
  Serial.println("Fingerprint enrolled successfully!");
  return true;
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

String downloadFingerprintTemplate(uint16_t id) {
  Serial.println("------------------------------------");
  Serial.print("Attempting to load #"); Serial.println(id);
  
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
  Serial.print("Attempting to get #"); Serial.println(id);
  p = finger.getModel();
  switch (p) {
    case FINGERPRINT_OK:
      Serial.print("Template "); Serial.print(id); Serial.println(" transferring:");
      break;
    default:
      Serial.print("Unknown error "); Serial.println(p);
      return "";
  }

  // one data packet is 128 + 11 = 139 bytes. in one data packet, 11 bytes are 'usesless' :D
  uint8_t bytesReceived[834]; // 4 data packets
  memset(bytesReceived, 0xff, 834);

  uint32_t starttime = millis();
  int i = 0;
  while (i < 834 && (millis() - starttime) < 20000) {
    if (mySerial.available()) {
      bytesReceived[i++] = mySerial.read();
    }
  }
  Serial.print(i); Serial.println(" bytes read.");
  Serial.println("Decoding packet...");

  // Create a string to hold the hex representation
  String templateStr = "";
  for (int i = 0; i < 834; ++i) {
    char hexByte[3];
    sprintf(hexByte, "%02X", bytesReceived[i]);
    templateStr += hexByte;
    
    // Also print to serial for debugging
    printHex(bytesReceived[i], 2);
  }
  Serial.println("\ndone.");

  return templateStr;
}

void printHex(int num, int precision) {
  char tmp[16];
  char format[128];

  sprintf(format, "%%.%dX", precision);

  sprintf(tmp, format, num);
  Serial.print(tmp);
}

uint8_t uploadFingerprintTemplate(const char* hexData, uint16_t id) {
  
  uint8_t p = finger.setModel();
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Template transferring ...");
      break;
    default:
      Serial.print("Unknown error "); Serial.println(p);
      return p;
  }

  byte pkg[834];
  memset(pkg, 0, sizeof(pkg));
  int pkgIndex = 0;
  
  // Use provided hex data string
  Serial.println("Using provided template data");
  Serial.print("Template data length: ");
  Serial.println(strlen(hexData));
  
  // Convert hex string to binary data
  size_t len = strlen(hexData);
  for (size_t j = 0; j < len - 1 && pkgIndex < 834; j += 2) {
    char hexPair[3] = {hexData[j], hexData[j+1], '\0'};
    pkg[pkgIndex++] = strtol(hexPair, NULL, 16);
  }
  
  Serial.print(pkgIndex); Serial.println(" bytes converted and ready to send");
  
  mySerial.write(pkg, pkgIndex);
  
  delay(500);
  
  p = finger.storeModel(id);
  switch (p) {
    case FINGERPRINT_OK:
      Serial.print("Template "); Serial.print(id); Serial.println(" stored");
      break;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    default:
      Serial.print("Unknown error "); Serial.println(p);
      return p;
  }
  
  delay(1000);
  
  return p;
}

void sendFingerDataToServer(String userId, uint8_t fingerId) {
  const char *server_url = "http://192.168.100.82:3000/users/add-fingerprint";
  HTTPClient http;
  
  http.begin(server_url);
  http.addHeader("Content-Type", "application/json");
  
  String fingerTemplate = downloadFingerprintTemplate(fingerId);
  
  if (fingerTemplate.length() == 0) {
    Serial.println("Failed to get fingerprint template, cannot send to server");
    delay(3000);
    return;
  }
  
  StaticJsonDocument<4096> doc; 
  doc["userId"] = userId;
  doc["fingerId"] = fingerId;
  doc["fingerTemplate"] = fingerTemplate;
  doc["deviceMac"] = macAddress;
  
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
    delay(3000);
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    delay(3000);
  }
  
  http.end();
}

void getTemplateFromServerWithUserId(String userId, uint16_t fingerId) {
  HTTPClient http;
  
  String url = "http://192.168.100.82:3000/users/" + userId + "/get-finger-data";
  
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
    
    if (doc.containsKey("templateData") && doc.containsKey("userId")) {

      const char* userId = doc["userId"];
      const char* templateData = doc["templateData"];
      
      Serial.print("Received template - Finger ID: ");
      Serial.print("User ID: ");
      Serial.println(userId);
      Serial.print("Template Data Length: ");
      Serial.println(strlen(templateData));
      
      uploadFingerprintTemplate(templateData,fingerId);
      
      
    } else {
      Serial.println("Missing required fields in the fingerprint data");
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

void deleteAllModels() {
  finger.emptyDatabase();
  Serial.println("Now database is empty :)");
}

void sendCardNumberToServer(String userId, String cardNumber) {
  HTTPClient http;
  const char *server_url = "http://192.168.100.82:3000/users/add-cardNumber";
  http.begin(server_url);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc; 
  doc["userId"] = userId;
  doc["cardNumber"] = cardNumber;
  doc["deviceMac"] = macAddress;
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.println("Sending POST request to server...");
  Serial.println("Request body: " + requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    waitingForCardScan = false;
    currentUserId = "";
    
    String successMsg = "{\"status\":\"success\",\"userId\":\"" + userId + "\",\"cardNumber\":\"" + cardNumber + "\"}";
    mqtt_client.publish("card_registration_result", successMsg.c_str());
    
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    
    String errorMsg = "{\"status\":\"error\",\"userId\":\"" + userId + "\",\"error\":\"" + String(httpResponseCode) + "\"}";
    mqtt_client.publish("card_registration_result", errorMsg.c_str());
  }
  
  http.end();
}

void loop() {
  if (isAPMode) {
    // Handle web server in AP mode
    server.handleClient();
    return;
  }
  
  if (!WiFi.isConnected()) {  
    Serial.println("WiFi disconnected, reconnecting...");
    String savedSSID, savedPassword;
    loadCredentials(savedSSID, savedPassword);
  
    if (savedSSID.length() > 0 && savedPassword.length() > 0) {
      WiFi.begin(savedSSID.c_str(), savedPassword.c_str());
      unsigned long startAttempt = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
      Serial.print(".");
      delay(500);
    }
    
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\nFailed to reconnect, switching to AP mode");
        startAPMode();
        return;
      }
    
    Serial.println("WiFi reconnected");
    } else {
      Serial.println("No saved credentials, switching to AP mode");
      startAPMode();
      return;
    }
  }

  if (!mqtt_client.connected()) {
    reconnect();
  }
  
  mqtt_client.loop(); 
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) {
        uidString += "0"; 
      }
      uidString += String(mfrc522.uid.uidByte[i], HEX);
    }
    
    Serial.print("Card UID: ");
    MFRC522Debug::PrintUID(Serial, (mfrc522.uid));
    Serial.println();
    Serial.println("Card number: " + uidString);
    
    if (waitingForCardScan && currentUserId != "") {
      Serial.println("Registering card for user: " + currentUserId);
      sendCardNumberToServer(currentUserId, uidString);
    } else {
      Serial.println("Publishing to card_attendance topic");  // Fixed missing double quote
      mqtt_client.publish(cardAttendanceTopic.c_str(), uidString.c_str());
    }
    
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }
  getFingerprintID();
  delay(3000); 
}