#include "OV2640.h"
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiClient.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

#define CAMERA_MODEL_AI_THINKER

#include "camera_pins.h"

#include "home_wifi_multi.h"

OV2640 cam;

WebServer server(80);

const char HEADER[] = "HTTP/1.1 200 OK\r\n" \
                      "Access-Control-Allow-Origin: *\r\n" \
                      "Content-Type: multipart/x-mixed-replace; boundary=123456789000000000000987654321\r\n";
const char BOUNDARY[] = "\r\n--123456789000000000000987654321\r\n";
const char CTNTTYPE[] = "Content-Type: image/jpeg\r\nContent-Length: ";
const int hdrLen = strlen(HEADER);
const int bdrLen = strlen(BOUNDARY);
const int cntLen = strlen(CTNTTYPE);

// Server settings for image recognition
String serverName = "10.14.23.89";
String serverPath = "/users/recognize";
const int serverPort = 3000;
const int timerInterval = 10000;  
unsigned long previousMillis = 0;

void handle_jpg_stream(void)
{
  char buf[32];
  int s;

  WiFiClient client = server.client();

  client.write(HEADER, hdrLen);
  client.write(BOUNDARY, bdrLen);

  while (true)
  {
    if (!client.connected()) break;
    cam.run();
    s = cam.getSize();
    client.write(CTNTTYPE, cntLen);
    sprintf( buf, "%d\r\n\r\n", s );
    client.write(buf, strlen(buf));
    client.write((char *)cam.getfb(), s);
    client.write(BOUNDARY, bdrLen);

    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= timerInterval) {
      uint8_t *currentFrame = cam.getfb();
      size_t currentSize = cam.getSize();
      if (currentFrame && currentSize > 0) {
        sendPhotoFromBuffer(currentFrame, currentSize);
      }
      previousMillis = currentMillis;
    }
  }
}

void sendPhotoFromBuffer(uint8_t* fbBuf, size_t fbLen) {
  WiFiClient client;
  
  if (client.connect(serverName.c_str(), serverPort)) {
    Serial.println("Connection successful!");    

    String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    String head = "--" + boundary + "\r\n";
    head += "Content-Disposition: form-data; name=\"image\"; filename=\"esp32-cam.jpg\"\r\n";
    head += "Content-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--" + boundary + "--\r\n";

    uint32_t extraLen = head.length() + tail.length();
    uint32_t totalLen = fbLen + extraLen;
  
    client.println("POST " + serverPath + " HTTP/1.1");
    client.println("Host: " + serverName);
    client.println("Content-Length: " + String(totalLen));
    client.println("Content-Type: multipart/form-data; boundary=" + boundary);
    client.println();
    client.print(head);
  
    for (size_t n=0; n<fbLen; n=n+1024) {
      if (n+1024 < fbLen) {
        client.write(fbBuf + n, 1024);
      }
      else if (fbLen%1024>0) {
        size_t remainder = fbLen%1024;
        client.write(fbBuf + n, remainder);
      }
    }   
    client.print(tail);
    
    String response = client.readString();
    Serial.println(response);
    client.stop();
  }
}

String sendPhoto() {
  cam.run();
  if (!cam.getfb()) {
    Serial.println("Camera capture failed");
    return "Camera capture failed";
  }
  
  uint8_t *fbBuf = cam.getfb();
  size_t fbLen = cam.getSize();
  
  sendPhotoFromBuffer(fbBuf, fbLen);
  return "Photo sent";
}

const char JHEADER[] = "HTTP/1.1 200 OK\r\n" \
                       "Content-disposition: inline; filename=capture.jpg\r\n" \
                       "Content-type: image/jpeg\r\n\r\n";
const int jhdLen = strlen(JHEADER);

void handle_jpg(void)
{
  WiFiClient client = server.client();

  cam.run();
  if (!client.connected()) return;

  client.write(JHEADER, jhdLen);
  client.write((char *)cam.getfb(), cam.getSize());
}

void handleNotFound()
{
  String message = "Server is running!\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  server.send(200, "text / plain", message);
}

void setup()
{
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Lower the frame size and quality for better stability
  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA;  // Changed from SVGA to VGA
    config.jpeg_quality = 12;  // Slightly reduced quality
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_CIF;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Add debug messages
  Serial.println("Starting camera initialization...");
  
  esp_err_t err = cam.init(config);
  if (err != ESP_OK) {
    Serial.printf("Camera initialization failed with error 0x%x", err);
    Serial.println("Retrying with lower XCLK frequency...");
    
    // Try with lower XCLK frequency
    config.xclk_freq_hz = 10000000;  // Lower to 10MHz
    err = cam.init(config);
    
    if (err != ESP_OK) {
      Serial.printf("Camera initialization still failed with error 0x%x", err);
      delay(1000);
      ESP.restart();
    }
  }

  Serial.println("Camera initialization successful!");

#if defined(CAMERA_MODEL_ESP_EYE)
  pinMode(13, INPUT_PULLUP);
  pinMode(14, INPUT_PULLUP);
#endif

  IPAddress ip;

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID1, PWD1);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(F("."));
  }
  ip = WiFi.localIP();
  Serial.println(F("WiFi connected"));
  Serial.println("");
  Serial.println(ip);
  Serial.print("Stream Link: http://");
  Serial.print(ip);
  Serial.println("/mjpeg/1");

  // Add routes for both streaming and image capture
  server.on("/mjpeg/1", HTTP_GET, handle_jpg_stream);
  server.on("/jpg", HTTP_GET, handle_jpg);
  server.onNotFound(handleNotFound);
  server.begin();

  // Initial image send
  sendPhoto();
}

void loop()
{
  server.handleClient();
  
  // Check if it's time to send a photo
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= timerInterval) {
    sendPhoto();
    previousMillis = currentMillis;
  }
}
