#include <MFRC522v2.h>
#include <MFRC522DriverSPI.h>
#include <MFRC522DriverPinSimple.h>
#include <MFRC522Debug.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
34567891011121314151617181920212223242526272829303132333435363738394041424344454647484950

bool waitingForCardScan = false;
String currentUserId = "";
const char *server_url = "http://192.168.30.101:3000/users/add-cardNumber";

void setup() {
  Serial.begin(115200);  

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {

Not connected. Select a board and a port to connect automatically.
New Line

#include <esp_wifi.h>
#include "secret.h"

const char *ssid = WIFI_SSID; 
const char *password = WIFI_PASSWORD; 

const char *mqtt_broker = MQTT_BROKER_URL;
const char *topic = INIT_TOPIC;  
const char *mqtt_username = USER_NAME;
const char *mqtt_password = PASSWORD;
const int mqtt_port = MQTT_PORT;  

WiFiClientSecure esp_client;
PubSubClient mqtt_client(esp_client);

const char *ca_cert = CERT;

MFRC522DriverPinSimple ss_pin(5);

MFRC522DriverSPI driver{ss_pin}; 
MFRC522 mfrc522{driver};      

bool waitingForCardScan = false;
String currentUserId = "";
const char *server_url = "http://192.168.30.101:3000/users/add-cardNumber";

void setup() {
  Serial.begin(115200);  

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
  mqtt_client.subscribe("add_cardnumber");

  while (!Serial);  
  
  mfrc522.PCD_Init();    
  MFRC522Debug::PCD_DumpVersionToSerial(mfrc522, Serial);	
  Serial.println(F("Scan PICC to see UID"));
}

void callback(char *topic, byte *payload, unsigned int length) {
  Serial.print("Message arrived in topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  
  Serial.println(message);

  if (strcmp(topic, "add_cardnumber") == 0) {
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (!error) {
      const char* userId = doc["data"];
      if (userId) {
        currentUserId = String(userId);
      } else {
        Serial.println("No data field found in JSON message");
        currentUserId = String(message);
      }
    } else {
      Serial.print("Not a JSON message, using raw message as user ID: ");
      currentUserId = String(message);
      Serial.println(currentUserId);
    }
    
    if (currentUserId.length() > 0) {
      Serial.print("User ID to enroll: ");
      Serial.println(currentUserId);
      
      waitingForCardScan = true;
      Serial.println("Please scan your card now...");
    } else {
      Serial.println("No valid user ID found in message");
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
      mqtt_client.subscribe("add_cardnumber"); 
    } else {
      Serial.print("Failed to connect, state: ");
      Serial.println(mqtt_client.state());
      delay(2000);
    }
  }
}

void sendCardNumberToServer(String userId, String cardNumber) {
  HTTPClient http;
  
  http.begin(server_url);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc; 
  doc["userId"] = userId;
  doc["cardNumber"] = cardNumber;
  
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
      Serial.println("Publishing to card_attendance topic"
      mqtt_client.publish("card_attendance", uidString.c_str());
    }
    
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }
}