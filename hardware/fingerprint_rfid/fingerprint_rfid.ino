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
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "secret.h"
#include "fp_lib.h"

#define LCD_SDA 4
#define LCD_SCL 5
#define LCD_ADDR 0x27  
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2); 

// EEPROM configs
#define EEPROM_SIZE 96
#define SSID_ADDR 0
#define PASS_ADDR 32
#define SERVER_IP_ADDR 64  // Địa chỉ bắt đầu lưu IP server trong EEPROM

// Wifi configs
const char *ssid = NULL; 
const char *password = NULL;
String serverIP = "192.168.100.82"; // IP mặc định

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
bool isCardRegistrationMode = false; // Thêm biến mới để kiểm soát chế độ đăng ký thẻ

String macAddress;
String verifyDeviceTopic;
String deleteFingerTopic;
String emptyDatabaseTopic;
String addFingerTopic;
String importFingerTopic;
String addCardTopic;
String fingerAttendanceTopic;
String cardAttendanceTopic;
String attendanceNotificationTopic;
String configDeviceTopic; // Thêm topic config
String getConfigTopic; // Thêm topic lấy config
String currentRequestId = "";
// Add new variables for attendance response tracking
bool waitingForAttendanceResponse = false;
unsigned long lastAttendanceTime = 0;
const unsigned long ATTENDANCE_TIMEOUT = 5000; // timeout 5 seconds
const char* FINGERPRINT_REGISTRATION_RESULT = "fingerprint_registration_result/";
const char* CARD_REGISTRATION_RESULT = "card_registration_result/";

// Add variable for LCD state tracking
String currentLCDText = "";

// Thêm biến cho bulk fingerprint registration
String targetDeviceIds = "";
bool isBulkRegistrationMode = false;
String bulkRegistrationUserId = "";

// Add LCD helper function
void updateLCD(const String& line1, const String& line2 = "") {
  String newText = line1 + line2;
  if (newText != currentLCDText) {  // Only update when content changes
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    if (line2.length() > 0) {
      lcd.setCursor(0, 1);
      lcd.print(line2);
    }
    currentLCDText = newText;
  }
}

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
  for (int i = 0; i < 96; i++) EEPROM.write(i, 0); // Xóa cả phần lưu IP server
  EEPROM.commit();
}

void saveServerIP(const String& ip) {
  for (int i = 0; i < ip.length(); i++) {
    EEPROM.write(SERVER_IP_ADDR + i, ip[i]);
  }
  EEPROM.write(SERVER_IP_ADDR + ip.length(), 0); // Null terminator
  EEPROM.commit();
}

void loadServerIP() {
  char ipBuf[16];
  int i = 0;
  char c;
  while ((c = EEPROM.read(SERVER_IP_ADDR + i)) != 0 && i < 15) {
    ipBuf[i] = c;
    i++;
  }
  ipBuf[i] = '\0';
  
  if (i > 0) {
    String newIP = String(ipBuf);
    if (isValidIP(newIP)) {
      serverIP = newIP;
      Serial.print("Loaded server IP from EEPROM: ");
      Serial.println(serverIP);
    } else {
      Serial.println("Invalid IP in EEPROM, using default IP");
    }
  } else {
    Serial.println("No IP in EEPROM, using default IP");
  }
}

bool isValidIP(const String& ip) {
  // Kiểm tra cơ bản định dạng IP
  int dots = 0;
  for (int i = 0; i < ip.length(); i++) {
    if (ip[i] == '.') dots++;
  }
  return dots == 3;
}

void handleRoot() {
  String html = "<h1>Configure WiFi</h1><form method='POST' action='/setup'>";
  html += "SSID: <input name='ssid' type='text'><br>";
  html += "Password: <input name='password' type='password'><br>";
  html += "Server IP: <input name='server_ip' type='text' value='" + serverIP + "'><br>";
  html += "<input type='submit'></form>";
  server.send(200, "text/html", html);
}
void startAPMode() {
  WiFi.softAP("Chamcong-Config", "12345678");
  Serial.println("Started Access Point: ESP32_Config");
  Serial.println("IP Address: " + WiFi.softAPIP().toString());

  server.on("/", handleRoot);
  server.on("/setup", HTTP_POST, handleSetup);
  server.begin();
  
  isAPMode = true;
}

void handleSetup() {
  String ssid = server.arg("ssid");
  String password = server.arg("password");
  String newServerIP = server.arg("server_ip");

  if (ssid.length() > 0 && password.length() > 0) {
    saveCredentials(ssid, password);
    
    // Lưu IP server nếu được cung cấp và hợp lệ
    if (newServerIP.length() > 0 && isValidIP(newServerIP)) {
      saveServerIP(newServerIP);
      serverIP = newServerIP;
      Serial.print("Saved new server IP: ");
      Serial.println(serverIP);
    }
    
    server.send(200, "text/html", "<h1>Saved! Rebooting...</h1>");
    delay(2000);
    ESP.restart();
  } else {
    server.send(400, "text/html", "Invalid SSID or password");
  }
}

// void startAPMode() {
//   WiFi.softAP("ESP32_Config", "12345678");
//   Serial.println("Started Access Point: ESP32_Config");
//   Serial.println("IP Address: " + WiFi.softAPIP().toString());

//   server.on("/", handleRoot);
//   server.on("/setup", HTTP_POST, handleSetup);
//   server.begin();
  
//   isAPMode = true;
// }

bool connectToWiFi() {
  String savedSSID, savedPassword;
  loadCredentials(savedSSID, savedPassword);
  if (savedSSID.length() > 0 && savedPassword.length() > 0) {
    WiFi.begin(savedSSID.c_str(), savedPassword.c_str());
    Serial.print("Connecting to WiFi");
    updateLCD("Connecting Wifi");
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

  // Load saved server IP
  loadServerIP();
  Serial.print("Using server IP: ");
  Serial.println(serverIP);
  
  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.init();
  lcd.backlight();
  updateLCD("Initializing...");
  
  Serial.println("Starting device initialization...");
  
  // Try to connect to WiFi with stored credentials
  if (connectToWiFi()) {
    macAddress = WiFi.macAddress();

    String lwtTopic = "device-status/" + macAddress;

    verifyDeviceTopic = "verify_device_" + macAddress;
    deleteFingerTopic = "delete-fingerprint/" + macAddress;
    emptyDatabaseTopic = "empty-database/" + macAddress;
    addFingerTopic = "add-fingerprint/" + macAddress;
    importFingerTopic = "import-fingerprint/" + macAddress;
    addCardTopic = "add-cardnumber/" + macAddress;
    configDeviceTopic = "config-device/" + macAddress; // Thêm topic config
    getConfigTopic = "get-config/" + macAddress; // Thêm topic lấy config
    String attendedSuccessTopic = "attended-success/" + macAddress;
    attendanceNotificationTopic = "attendance-noti/" + macAddress;

    fingerAttendanceTopic = "finger_attendance/" + macAddress;
    cardAttendanceTopic = "card_attendance/" + macAddress;

    // Initialize MQTT only if WiFi is connected
      String fingerprintResultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
  mqtt_client.subscribe(fingerprintResultTopic.c_str());
    esp_client.setCACert(ca_cert);
    mqtt_client.setServer(mqtt_broker, mqtt_port);
    mqtt_client.setCallback(callback);
    
     String client_id = "esp32-client-" + macAddress;

    while (!mqtt_client.connected()) {
      Serial.printf("The client %s connects to the public MQTT broker\n", client_id.c_str());
      if (mqtt_client.connect(
            client_id.c_str(), 
            mqtt_username, 
            mqtt_password,
            lwtTopic.c_str(),    
            1,                    
            true,                 
            "offline"             
          )) {
        Serial.println("Public HiveMQ MQTT broker connected");
        // Publish online status
        mqtt_client.publish(lwtTopic.c_str(), "online", true);
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
    mqtt_client.subscribe(attendanceNotificationTopic.c_str());
    mqtt_client.subscribe(configDeviceTopic.c_str()); // Subscribe topic config
    mqtt_client.subscribe(getConfigTopic.c_str()); // Subscribe topic lấy config

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

  // Xử lý lấy config hiện tại
  if (strcmp(topic, getConfigTopic.c_str()) == 0) {
    Serial.println("Received get config request");
    
    // Parse JSON message để lấy requestId
    DynamicJsonDocument doc(256);
    DeserializationError error = deserializeJson(doc, message);
    
    String requestId = "";
    // Handle nested data structure from NestJS
    if (!error && doc.containsKey("data") && doc["data"].is<JsonObject>() && doc["data"].containsKey("requestId")) {
      requestId = doc["data"]["requestId"].as<String>();
    } else {
      Serial.println("Could not find requestId in message, using fallback.");
      requestId = String(millis());
    }
    
    Serial.print("Using requestId: ");
    Serial.println(requestId);
    
    sendCurrentConfig(requestId);
    return;
  }

  // Xử lý config device
  if (strcmp(topic, configDeviceTopic.c_str()) == 0) {
    handleDeviceConfig(String(message));
    return;
  }

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
    String requestId = "";
    
    // Handle nested data structure
    if (outerDoc.containsKey("data")) {
      JsonObject data1 = outerDoc["data"];
      if (data1.containsKey("data")) {
        JsonObject data2 = data1["data"];
        if (data2.containsKey("fingerId")) {
          fingerId = data2["fingerId"].as<uint8_t>();
        }
        if (data2.containsKey("requestId")) {
          requestId = data2["requestId"].as<String>();
        }
      }
    } else {
      // Fallback to direct format
      if (outerDoc.containsKey("fingerId")) {
        fingerId = outerDoc["fingerId"].as<uint8_t>();
      } else {
        fingerId = atoi(message);
      }
      if (outerDoc.containsKey("requestId")) {
        requestId = outerDoc["requestId"].as<String>();
      }
    }
    
    if (fingerId > 0) {
      Serial.print("Deleting fingerprint ID #");
      Serial.println(fingerId);
      
      currentRequestId = requestId;
      deleteFingerprintWithResponse(fingerId);
    } else {
      Serial.println("Invalid fingerprint ID received");
    }
  }

  if (strcmp(topic, addFingerTopic.c_str()) == 0) {
    Serial.println("Starting enrollment process...");
    
    // Parse JSON message
    StaticJsonDocument<512> doc; // Tăng kích thước để xử lý JSON phức tạp hơn
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      // Fallback to using the raw message if parsing fails
      currentUserId = String(message);
      isBulkRegistrationMode = false;
      targetDeviceIds = "";
    } else {
      // Check if this is a NestJS format with pattern and data fields
      if (doc.containsKey("data")) {
        // Get the data string
        const char* dataString = doc["data"];
        
        // Parse the inner JSON in the data field
        DynamicJsonDocument innerDoc(512);
        DeserializationError innerError = deserializeJson(innerDoc, dataString);
        
        if (innerError) {
          Serial.print("Inner JSON parsing failed: ");
          Serial.println(innerError.c_str());
          // Use the data string directly as userId
          currentUserId = String(dataString);
          isBulkRegistrationMode = false;
          targetDeviceIds = "";
        } else {
          // Check if this is a bulk registration request
          if (innerDoc.containsKey("userId") && innerDoc.containsKey("targetDeviceIds")) {
            // Bulk registration mode
            currentUserId = innerDoc["userId"].as<String>();
            bulkRegistrationUserId = currentUserId; // Đảm bảo cả hai biến có cùng giá trị
            isBulkRegistrationMode = true;
            
            // Convert targetDeviceIds array to string for later use
            if (innerDoc["targetDeviceIds"].is<JsonArray>()) {
              JsonArray deviceIdsArray = innerDoc["targetDeviceIds"];
              targetDeviceIds = "";
              for (JsonArray::iterator it = deviceIdsArray.begin(); it != deviceIdsArray.end(); ++it) {
                if (targetDeviceIds.length() > 0) {
                  targetDeviceIds += ",";
                }
                targetDeviceIds += it->as<String>();
              }
            }
            
            Serial.print("Bulk registration mode - User ID: ");
            Serial.println(currentUserId);
            Serial.print("Target devices: ");
            Serial.println(targetDeviceIds);
            
            updateLCD("Place Finger");
          } else if (innerDoc.containsKey("userId")) {
            // Regular single device registration
            currentUserId = innerDoc["userId"].as<String>();
            isBulkRegistrationMode = false;
            targetDeviceIds = "";
            Serial.print("Single device registration - User ID: ");
            Serial.println(currentUserId);
          } else {
            // Use the data string if no recognizable structure
            currentUserId = String(dataString);
            isBulkRegistrationMode = false;
            targetDeviceIds = "";
          }
        }
      } else if (doc.containsKey("userId") && doc.containsKey("targetDeviceIds")) {
        // Direct bulk registration format (not NestJS)
        currentUserId = doc["userId"].as<String>();
        bulkRegistrationUserId = currentUserId;
        isBulkRegistrationMode = true;
        
        // Convert targetDeviceIds array to string for later use
        if (doc["targetDeviceIds"].is<JsonArray>()) {
          JsonArray deviceIdsArray = doc["targetDeviceIds"];
          targetDeviceIds = "";
          for (JsonArray::iterator it = deviceIdsArray.begin(); it != deviceIdsArray.end(); ++it) {
            if (targetDeviceIds.length() > 0) {
              targetDeviceIds += ",";
            }
            targetDeviceIds += it->as<String>();
          }
        }
        
        Serial.print("Bulk registration mode (direct) - User ID: ");
        Serial.println(currentUserId);
        Serial.print("Target devices: ");
        Serial.println(targetDeviceIds);
        
        updateLCD("Place Finger");
      } else if (doc.containsKey("data")) {
        // Regular single device registration
        currentUserId = doc["data"].as<String>();
        isBulkRegistrationMode = false;
        targetDeviceIds = "";
        Serial.print("Single device registration - User ID: ");
        Serial.println(currentUserId);
      } else {
        // Use raw message if no recognizable structure
        currentUserId = String(message);
        isBulkRegistrationMode = false;
        targetDeviceIds = "";
      }
    }
    
    uint8_t newId = enrollFingerprint();

    if (newId > 0) {
      Serial.printf("Successfully enrolled fingerprint for ID #%d\n", newId);
      if (isBulkRegistrationMode) {
        sendBulkFingerDataToServer(currentUserId, newId, targetDeviceIds);
      } else {
        sendFingerDataToServer(currentUserId, newId);
      }
    } else {
      Serial.println("Enrollment failed");
      // Reset bulk registration mode on failure
      isBulkRegistrationMode = false;
      targetDeviceIds = "";
      bulkRegistrationUserId = "";
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
    updateLCD("Card Registration", "Scan Your Card");
    
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
      isCardRegistrationMode = true; // Set chế độ đăng ký thẻ
      Serial.println("Please scan your card now...");
      // Hiển thị thông báo rõ ràng hơn
      updateLCD("Ready to Register", "Place Card Now");
    } else {
      Serial.println("No valid user ID found in message");
      updateLCD("Registration Error", "Invalid User ID");
      delay(3000);
      updateLCD("Place Finger");
    }
}

  if (strcmp(topic, emptyDatabaseTopic.c_str()) == 0) {
    Serial.println("Received empty database command");
    Serial.print("Message: ");
    Serial.println(message);
    
    // Parse outer JSON message
    StaticJsonDocument<512> outerDoc;
    DeserializationError error = deserializeJson(outerDoc, message);
    
    if (error) {
      Serial.print("Outer JSON parsing failed: ");
      Serial.println(error.c_str());
      return;
    }

    // Get first data object
    if (outerDoc.containsKey("data")) {
      JsonObject firstData = outerDoc["data"];
      
      // Get second nested data object
      if (firstData.containsKey("data")) {
        JsonObject secondData = firstData["data"];
        
        // Finally get requestId
        if (secondData.containsKey("requestId")) {
          currentRequestId = secondData["requestId"].as<String>();
          Serial.print("Successfully extracted requestId: ");
          Serial.println(currentRequestId);
          
          deleteAllModels();
        } else {
          Serial.println("Missing requestId in inner data object");
        }
      } else {
        Serial.println("Missing inner data object");
      }
    } else {
      Serial.println("Missing outer data object");
    }
}

  if (strstr(topic, attendanceNotificationTopic.c_str()) != NULL) {
    // Parse JSON message
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      return;
    }

    // Get data from message
    if (doc.containsKey("data")) {
      const char* notificationData = doc["data"];
      
      // Display on LCD
      updateLCD(notificationData);
      
      // Reset waiting state
      waitingForAttendanceResponse = false;
      
      // Delay to let user read the message
      delay(3000);
      
      // Return to default state
      updateLCD("Place Finger");
    }
  }
}


void reconnect() {
  while (!mqtt_client.connected() && !isAPMode) {
    String client_id = "esp32-client-" + macAddress;
    String lwtTopic = "device-status/" + macAddress;

    Serial.printf("Reconnecting to MQTT as %s\n", client_id.c_str());

    if (mqtt_client.connect(
          client_id.c_str(),
          mqtt_username,
          mqtt_password,
          lwtTopic.c_str(),  // LWT topic
          1,                 // QoS
          true,              // retain
          "offline"          // LWT message
        )) {

      Serial.println("Reconnected to MQTT broker");

      // Sau khi kết nối thành công → cập nhật trạng thái online
      mqtt_client.publish(lwtTopic.c_str(), "online", true);

      mqtt_client.subscribe(verifyDeviceTopic.c_str());
      mqtt_client.subscribe(deleteFingerTopic.c_str());
      mqtt_client.subscribe(emptyDatabaseTopic.c_str());
      mqtt_client.subscribe(addFingerTopic.c_str());
      mqtt_client.subscribe(("attended-success/" + macAddress).c_str());
      mqtt_client.subscribe(importFingerTopic.c_str());
      mqtt_client.subscribe(addCardTopic.c_str());
      mqtt_client.subscribe(attendanceNotificationTopic.c_str());
      mqtt_client.subscribe(configDeviceTopic.c_str()); // Subscribe topic config
      mqtt_client.subscribe(getConfigTopic.c_str()); // Subscribe topic lấy config
      String fingerprintResultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
      mqtt_client.subscribe(fingerprintResultTopic.c_str());

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
      updateLCD("Processing...");
      break;
    case FINGERPRINT_NOFINGER:
      if (!waitingForAttendanceResponse && !isCardRegistrationMode && !isBulkRegistrationMode) {
        updateLCD("Place Finger");
      } else if (isBulkRegistrationMode) {
        updateLCD("Place Finger");
      }
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      updateLCD("Error!", "Try Again");
      return p;
    case FINGERPRINT_IMAGEFAIL:
      Serial.println("Imaging error");
      updateLCD("Imaging Error!");
      return p;
    default:
      Serial.println("Unknown error");
      updateLCD("Unknown Error!");
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

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.println("Found a print match!");
    updateLCD("Match Found!", "ID #" + String(finger.fingerID));

    char fingerIDStr[5];
    itoa(finger.fingerID, fingerIDStr, 10);
    mqtt_client.publish(fingerAttendanceTopic.c_str(), fingerIDStr);
    
    waitingForAttendanceResponse = true;
    lastAttendanceTime = millis();
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    updateLCD("Comm Error!");
    return p;
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("Did not find a match");
    updateLCD("No Match Found!");
    delay(3000);
    return p;
  } else {
    Serial.println("Unknown error");
    return p;
  }

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
  } else {
    Serial.println("DEBUG: Preparing to send failure MQTT message");
    
    // Gửi thông báo lỗi qua MQTT
    StaticJsonDocument<256> doc;
    doc["success"] = false;
    doc["error"] = "Failed to enroll fingerprint";
    doc["userId"] = currentUserId;
    
    String response;
    serializeJson(doc, response);
    
    String resultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
    Serial.print("DEBUG: Sending to topic: ");
    Serial.println(resultTopic);
    Serial.print("DEBUG: Message content: ");
    Serial.println(response);
    
    bool published = mqtt_client.publish(resultTopic.c_str(), response.c_str());
    Serial.print("DEBUG: MQTT publish result: ");
    Serial.println(published ? "Success" : "Failed");
    
    return 0;
  }
  
  
}

bool getFingerprintEnroll(uint8_t id) {
  int p = -1;
  
  if (isBulkRegistrationMode) {
    Serial.println("Waiting for valid finger to enroll (Bulk Mode)");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Place finger");
    lcd.setCursor(0, 1);
    lcd.print("to enroll #");
    lcd.print(id);
  } else {
    Serial.println("Waiting for valid finger to enroll");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Place finger");
    lcd.setCursor(0, 1);
    lcd.print("to enroll #");
    lcd.print(id);
  }
  
  // Add timeout for first scan
  unsigned long startTime = millis();
  const unsigned long TIMEOUT = 30000; // 30 seconds timeout
  
  while (p != FINGERPRINT_OK) {
    if (millis() - startTime > TIMEOUT) {
      Serial.println("Timeout waiting for first scan");
      updateLCD("Timeout!","Try again");
      delay(2000);
      return false;
    }
    
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
    updateLCD("Fingerprint", "already exist");
    delay(5000);
    return false;
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("No duplicate found, proceeding with enrollment");
  } else {
    Serial.println("Error during duplicate check");
    return false;
  }

  Serial.println("Remove finger");
  updateLCD("Remove Finger");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    delay(100);
  }

  Serial.println("Place same finger again");
  updateLCD("Place Same", "Finger Again");
  
  // Add timeout for second scan
  startTime = millis();
  p = -1;
  while (p != FINGERPRINT_OK) {
    if (millis() - startTime > TIMEOUT) {
      Serial.println("Timeout waiting for second scan");
      updateLCD("Timeout!", "Try again");
      delay(2000);
      return false;
    }
    
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
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Enrollment OK!");
  lcd.setCursor(0, 1);
  lcd.print("ID #");
  lcd.print(id);
  delay(2000);
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
void deleteFingerprintWithResponse(uint8_t id) {
  uint8_t result = deleteFingerprint(id);

  StaticJsonDocument<256> doc;
  doc["deviceMac"] = macAddress;
  doc["requestId"] = currentRequestId;
  doc["success"] = (result == FINGERPRINT_OK);
  doc["message"] = (result == FINGERPRINT_OK)
                    ? "Fingerprint deleted successfully"
                    : "Failed to delete fingerprint";

  String response;
  serializeJson(doc, response);

  String responseTopic = "device/response/" + macAddress;
  mqtt_client.publish(responseTopic.c_str(), response.c_str());

  currentRequestId = "";
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
  String server_url = "http://" + serverIP + ":3000/users/add-fingerprint";
  Serial.println("DEBUG: ===== SENDING FINGERPRINT TO SERVER =====");
  Serial.print("DEBUG: Server URL: ");
  Serial.println(server_url);
  Serial.print("DEBUG: User ID: ");
  Serial.println(userId);
  Serial.print("DEBUG: Finger ID: ");
  Serial.println(fingerId);
  
  HTTPClient http;
  http.begin(server_url);
  http.addHeader("Content-Type", "application/json");
  
  Serial.println("DEBUG: Downloading fingerprint template...");
  String fingerTemplate = downloadFingerprintTemplate(fingerId);
  
  if (fingerTemplate.length() == 0) {
    Serial.println("DEBUG: Failed to get fingerprint template");
    deleteFingerprint(fingerId);
    StaticJsonDocument<256> doc;
    doc["success"] = false;
    doc["error"] = "Failed to get fingerprint template";
    doc["userId"] = userId;
    doc["fingerId"] = fingerId;
    
    String response;
    serializeJson(doc, response);
    
    String resultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
    mqtt_client.publish(resultTopic.c_str(), response.c_str());
    delay(3000);
    return;
  }
  
  Serial.print("DEBUG: Template length: ");
  Serial.println(fingerTemplate.length());
  
  StaticJsonDocument<4096> doc; 
  doc["userId"] = userId;
  doc["fingerId"] = fingerId;
  doc["fingerTemplate"] = fingerTemplate;
  doc["deviceMac"] = macAddress;
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.println("DEBUG: Sending POST request to server...");
  Serial.print("DEBUG: Request body length: ");
  Serial.println(requestBody.length());
  Serial.print("DEBUG: Request body: ");
  Serial.println(requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  Serial.print("DEBUG: HTTP Response Code: ");
  Serial.println(httpResponseCode);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("DEBUG: Server Response: ");
    Serial.println(response);
    
    // Parse response để kiểm tra kết quả từ server
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (error) {
      Serial.print("DEBUG: JSON parsing error: ");
      Serial.println(error.c_str());
    }
    
    if (error || !responseDoc["success"]) {
      Serial.println("DEBUG: Server returned error, deleting fingerprint");
      // Nếu server báo lỗi, xóa vân tay
      deleteFingerprint(fingerId);
      
      // Gửi thông báo lỗi qua MQTT
      StaticJsonDocument<256> errorDoc;
      errorDoc["success"] = false;
      errorDoc["error"] = "Server error: " + response;
      errorDoc["userId"] = userId;
      errorDoc["fingerId"] = fingerId;
      String errorResponse;
      serializeJson(errorDoc, errorResponse);
      
      String resultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
      mqtt_client.publish(resultTopic.c_str(), errorResponse.c_str());
    } else {
      Serial.println("DEBUG: Server returned success");
      // Hiển thị thông báo thành công trên LCD
      updateLCD("Registration", "Success!");
      delay(3000);
    }
  } else {
    Serial.print("DEBUG: HTTP Error: ");
    Serial.println(httpResponseCode);
    // Xóa vân tay nếu gửi HTTP thất bại
    deleteFingerprint(fingerId);
    
    // Gửi thông báo lỗi qua MQTT
    StaticJsonDocument<256> doc;
    doc["success"] = false;
    doc["error"] = "HTTP Error: " + String(httpResponseCode);
    doc["userId"] = userId;
    doc["fingerId"] = fingerId;
    
    String response;
    serializeJson(doc, response);
    
    String resultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
    mqtt_client.publish(resultTopic.c_str(), response.c_str());
  }
  
  http.end();
  Serial.println("DEBUG: ===== END SENDING FINGERPRINT =====");
}

void getTemplateFromServerWithUserId(String userId, uint16_t fingerId) {
  String url = "http://" + serverIP + ":3000/users/" + userId + "/get-finger-data";
  //String url = "http://192.168.100.82:3000/users/" + userId + "/get-finger-data";
  Serial.print("Sending request to: ");
  Serial.println(url);
  
  HTTPClient http;
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
  Serial.println("Starting to empty database");
  Serial.print("Using requestId: ");
  Serial.println(currentRequestId);
  
  uint8_t result = finger.emptyDatabase();
  
  // Tạo response message
  StaticJsonDocument<256> doc;
  doc["deviceMac"] = macAddress;
  doc["requestId"] = currentRequestId;  // Sử dụng currentRequestId đã lưu
  doc["success"] = (result == FINGERPRINT_OK);
  doc["message"] = (result == FINGERPRINT_OK) ? 
    "Database emptied successfully" : "Failed to empty database";

  String response;
  serializeJson(doc, response);
  
  // Log response before sending
  Serial.print("Sending response: ");
  Serial.println(response);
  
  // Publish response
  String responseTopic = "device/response/" + macAddress;
  mqtt_client.publish(responseTopic.c_str(), response.c_str());
  

  // Reset requestId
  currentRequestId = "";
}

void sendCardNumberToServer(String userId, String cardNumber) {
  String server_url = "http://" + serverIP + ":3000/users/add-cardNumber";
  Serial.print("Sending request to: ");
  Serial.println(server_url);
  
  HTTPClient http;
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
  
  // Hiển thị đang xử lý
  updateLCD("Processing...", "Please Wait");
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    waitingForCardScan = false;
    currentUserId = "";
    isCardRegistrationMode = false; // Reset chế độ đăng ký thẻ
    
    // Check if response code is 201 (success)
    if (httpResponseCode == 201) {
      updateLCD("Card Registered", "Successfully!");
    } else {
      updateLCD("Registration", "Failed!");
    }
    
    // Delay to show the message for 3 seconds
    delay(3000);
    updateLCD("Place Finger");
    
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    
    waitingForCardScan = false;
    currentUserId = "";
    isCardRegistrationMode = false; // Reset chế độ đăng ký thẻ
    updateLCD("Network Error!", "Try Again");
    
    // Delay to show the error message for 3 seconds
    delay(3000);
    updateLCD("Place Finger");
  }
  
  http.end();
}

// Thêm hàm gửi config hiện tại
void sendCurrentConfig(const String& requestId) {
  Serial.println("Sending current device configuration");
  
  // Đọc config hiện tại từ EEPROM
  String currentSSID, currentPassword;
  loadCredentials(currentSSID, currentPassword);
  
  // Đọc IP server hiện tại
  String currentServerIP = serverIP;
  
  // Tạo response JSON
  StaticJsonDocument<512> doc;
  doc["deviceMac"] = macAddress;
  doc["requestId"] = requestId;
  doc["success"] = true;
  doc["config"]["ssid"] = currentSSID;
  doc["config"]["password"] = currentPassword;
  doc["config"]["serverIP"] = currentServerIP;
  
  String response;
  serializeJson(doc, response);
  
  // Gửi response về backend
  String responseTopic = "device/config-response/" + macAddress;
  mqtt_client.publish(responseTopic.c_str(), response.c_str());
  
  Serial.println("Current config sent to backend");
  Serial.print("SSID: ");
  Serial.println(currentSSID);
  Serial.print("Server IP: ");
  Serial.println(currentServerIP);
}

// Thêm hàm xử lý config từ backend
void handleDeviceConfig(const String& message) {
  Serial.println("Received device configuration request");
  updateLCD("Configuring...", "Please Wait");
  
  // Parse JSON message
  DynamicJsonDocument doc(1024); // Tăng kích thước để xử lý JSON lồng nhau
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    updateLCD("Config Error!", "Invalid JSON");
    delay(3000);
    updateLCD("Place Finger");
    return;
  }
  
  String newSSID = "";
  String newPassword = "";
  String newServerIP = "";
  String requestId = "";
  
  // Trích xuất dữ liệu từ cấu trúc JSON lồng nhau của NestJS
  if (doc.containsKey("data") && doc["data"].is<JsonObject>()) {
    JsonObject outerData = doc["data"];
    if (outerData.containsKey("data") && outerData["data"].is<JsonObject>()) {
      JsonObject innerData = outerData["data"];
      if (innerData.containsKey("ssid")) newSSID = innerData["ssid"].as<String>();
      if (innerData.containsKey("password")) newPassword = innerData["password"].as<String>();
      if (innerData.containsKey("serverIP")) newServerIP = innerData["serverIP"].as<String>();
      if (innerData.containsKey("requestId")) requestId = innerData["requestId"].as<String>();
    } else {
        Serial.println("Inner 'data' object not found or not an object.");
    }
  } else {
    Serial.println("Outer 'data' object not found or not an object.");
  }

  // Thêm log để kiểm tra giá trị
  Serial.println("Parsed config values:");
  Serial.print("SSID: "); Serial.println(newSSID);
  Serial.print("Password: "); Serial.println(newPassword);
  Serial.print("Server IP: "); Serial.println(newServerIP);
  Serial.print("Request ID: "); Serial.println(requestId);

  bool configChanged = false;
  String responseMessage = "";
  
  // Validate and save WiFi credentials
  if (newSSID.length() > 0 && newPassword.length() > 0) {
    saveCredentials(newSSID, newPassword);
    configChanged = true;
    responseMessage += "WiFi credentials updated. ";
    Serial.println("WiFi credentials saved");
  }
  
  // Validate and save server IP
  if (newServerIP.length() > 0 && isValidIP(newServerIP)) {
    saveServerIP(newServerIP);
    serverIP = newServerIP;
    configChanged = true;
    responseMessage += "Server IP updated to: " + newServerIP + ". ";
    Serial.print("Server IP updated to: ");
    Serial.println(newServerIP);
  }
  
  // Gửi phản hồi về backend nếu có requestId
  if (requestId.length() > 0) {
    StaticJsonDocument<256> responseDoc;
    responseDoc["deviceMac"] = macAddress;
    responseDoc["requestId"] = requestId;
    responseDoc["success"] = configChanged;
    responseDoc["message"] = configChanged ? responseMessage : "No valid configuration provided";
    
    String response;
    serializeJson(responseDoc, response);
    
    String responseTopic = "device/response/" + macAddress;
    mqtt_client.publish(responseTopic.c_str(), response.c_str());
    Serial.println("Configuration response sent.");
  } else {
    Serial.println("No requestId found, cannot send response.");
  }
  
  if (configChanged) {
    updateLCD("Config Updated!", "Rebooting...");
    delay(3000);
    ESP.restart(); // Restart để áp dụng config mới
  } else {
    updateLCD("Config Failed!", "Invalid Data");
    delay(3000);
    updateLCD("Place Finger");
  }
}

void sendBulkFingerDataToServer(String userId, uint8_t fingerId, String targetDeviceIds) {
  String server_url = "http://" + serverIP + ":3000/users/add-fingerprint";
  Serial.println("DEBUG: ===== SENDING BULK FINGERPRINT TO SERVER =====");
  Serial.print("DEBUG: Server URL: ");
  Serial.println(server_url);
  Serial.print("DEBUG: User ID: ");
  Serial.println(userId);
  Serial.print("DEBUG: Finger ID: ");
  Serial.println(fingerId);
  Serial.print("DEBUG: Target Device IDs: ");
  Serial.println(targetDeviceIds);
  
  HTTPClient http;
  http.begin(server_url);
  http.addHeader("Content-Type", "application/json");
  
  Serial.println("DEBUG: Downloading fingerprint template...");
  String fingerTemplate = downloadFingerprintTemplate(fingerId);
  
  if (fingerTemplate.length() == 0) {
    Serial.println("DEBUG: Failed to get fingerprint template");
    deleteFingerprint(fingerId);
    StaticJsonDocument<256> doc;
    doc["success"] = false;
    doc["error"] = "Failed to get fingerprint template";
    doc["userId"] = userId;
    doc["fingerId"] = fingerId;
    
    String response;
    serializeJson(doc, response);
    
    String resultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
    mqtt_client.publish(resultTopic.c_str(), response.c_str());
    
    // Reset bulk registration mode
    isBulkRegistrationMode = false;
    targetDeviceIds = "";
    bulkRegistrationUserId = "";
    
    delay(3000);
    return;
  }
  
  Serial.print("DEBUG: Template length: ");
  Serial.println(fingerTemplate.length());
  
  // Tạo JSON với thông tin bulk registration
  StaticJsonDocument<8192> doc; // Tăng kích thước để chứa template và device IDs
  doc["userId"] = userId;
  doc["fingerId"] = fingerId;
  doc["fingerTemplate"] = fingerTemplate;
  doc["deviceMac"] = macAddress;
  
  // Thêm targetDeviceIds nếu có
  if (targetDeviceIds.length() > 0) {
    // Tạo array JSON đúng cách
    JsonArray deviceIdsArray = doc.createNestedArray("targetDeviceIds");
    
    int startPos = 0;
    int commaPos = targetDeviceIds.indexOf(',');
    while (commaPos >= 0) {
      String deviceId = targetDeviceIds.substring(startPos, commaPos);
      deviceIdsArray.add(deviceId);
      startPos = commaPos + 1;
      commaPos = targetDeviceIds.indexOf(',', startPos);
    }
    // Add the last device ID
    if (startPos < targetDeviceIds.length()) {
      String deviceId = targetDeviceIds.substring(startPos);
      deviceIdsArray.add(deviceId);
    }
  }
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.println("DEBUG: Sending POST request to server...");
  Serial.print("DEBUG: Request body length: ");
  Serial.println(requestBody.length());
  Serial.print("DEBUG: Request body: ");
  Serial.println(requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  Serial.print("DEBUG: HTTP Response Code: ");
  Serial.println(httpResponseCode);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("DEBUG: Server Response: ");
    Serial.println(response);
    
    // Parse response để kiểm tra kết quả từ server
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (error) {
      Serial.print("DEBUG: JSON parsing error: ");
      Serial.println(error.c_str());
    }
    
    if (error || !responseDoc["success"]) {
      Serial.println("DEBUG: Server returned error, deleting fingerprint");
      // Nếu server báo lỗi, xóa vân tay
      deleteFingerprint(fingerId);
      
      // Gửi thông báo lỗi qua MQTT
      StaticJsonDocument<256> errorDoc;
      errorDoc["success"] = false;
      errorDoc["error"] = "Server error: " + response;
      errorDoc["userId"] = userId;
      errorDoc["fingerId"] = fingerId;
      String errorResponse;
      serializeJson(errorDoc, errorResponse);
      
      String resultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
      mqtt_client.publish(resultTopic.c_str(), errorResponse.c_str());
    } else {
      Serial.println("DEBUG: Server returned success");
      // Hiển thị thông báo thành công trên LCD
      updateLCD("Registration", "Success!");
      delay(3000);
    }
  } else {
    Serial.print("DEBUG: HTTP Error: ");
    Serial.println(httpResponseCode);
    // Xóa vân tay nếu gửi HTTP thất bại
    deleteFingerprint(fingerId);
    
    // Gửi thông báo lỗi qua MQTT
    StaticJsonDocument<256> doc;
    doc["success"] = false;
    doc["error"] = "HTTP Error: " + String(httpResponseCode);
    doc["userId"] = userId;
    doc["fingerId"] = fingerId;
    
    String response;
    serializeJson(doc, response);
    
    String resultTopic = String(FINGERPRINT_REGISTRATION_RESULT) + macAddress;
    mqtt_client.publish(resultTopic.c_str(), response.c_str());
  }
  
  // Reset bulk registration mode
  isBulkRegistrationMode = false;
  targetDeviceIds = "";
  bulkRegistrationUserId = "";
  
  http.end();
  Serial.println("DEBUG: ===== END SENDING BULK FINGERPRINT =====");
}

void loop() {
  if (isAPMode) {
    updateLCD("AP Mode Active", "ESP32_Config");
    server.handleClient();
    return;
  }
  
  if (!WiFi.isConnected()) {
    updateLCD("WiFi Lost!", "Reconnecting...");
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
    updateLCD("MQTT Lost!", "Reconnecting...");
    reconnect();
  }
  
  mqtt_client.loop();

  // Check timeout for attendance response
  if (waitingForAttendanceResponse && (millis() - lastAttendanceTime > ATTENDANCE_TIMEOUT)) {
    waitingForAttendanceResponse = false;
    if (!isCardRegistrationMode && !isBulkRegistrationMode) {
      updateLCD("Place Finger");
    } else if (isBulkRegistrationMode) {
      updateLCD("Place Finger");
    }
  }
  
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) {
        uidString += "0"; 
      }
      uidString += String(mfrc522.uid.uidByte[i], HEX);
    }
    
    if (waitingForCardScan && currentUserId != "") {
      updateLCD("Card Detected!", "Processing...");
      sendCardNumberToServer(currentUserId, uidString);
    } else {
      updateLCD("Card Detected!", "Processing...");
      mqtt_client.publish(cardAttendanceTopic.c_str(), uidString.c_str());
      
      waitingForAttendanceResponse = true;
      lastAttendanceTime = millis();
    }
    
    delay(2000);
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }

  getFingerprintID();
  delay(100);  // Increased from 50ms to 100ms
}