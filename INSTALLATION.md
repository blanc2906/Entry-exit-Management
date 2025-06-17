# Hướng Dẫn Cài Đặt Hệ Thống Chấm Công Vân Tay & RFID

## 1. Yêu Cầu Hệ Thống

### 1.1. Phần Cứng
- ESP32 Development Board
- Cảm biến vân tay AS608
- Module RFID-RC522
- Màn hình LCD I2C 16x2
- Nguồn 5V/2A
- Dây cáp kết nối

### 1.2. Phần Mềm
- Node.js (v16 trở lên)
- MongoDB
- MQTT Broker (HiveMQ)
- Git

## 2. Cài Đặt Backend

### 2.1. Chuẩn Bị
```bash
cd backend

# Cài đặt dependencies
npm install
```

### 2.2. Cấu Hình
1. Tạo file `.env` trong thư mục gốc backend:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/attendance_db

# MQTT
MQTT_URL=mqtt://broker.hivemq.com
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_PORT=8883

# Server
PORT=3000
```

### 2.3. Chạy Backend
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 3. Cài Đặt Frontend

### 3.1. Chuẩn Bị
```bash
cd frontend

# Cài đặt dependencies
npm install
```

### 3.2. Cấu Hình
1. Tạo file `.env` trong thư mục frontend:
```env
VITE_API_URL=http://localhost:3000
```

### 3.3. Chạy Frontend
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run preview
```

## 4. Cài Đặt Firmware ESP32

### 4.1. Chuẩn Bị
1. Cài đặt Arduino IDE
2. Cài đặt ESP32 board trong Arduino IDE
3. Cài đặt các thư viện cần thiết:
   - PubSubClient
   - ArduinoJson
   - MFRC522
   - LiquidCrystal_I2C
   - WiFi
   - HTTPClient

### 4.2. Cấu Hình
1. Mở file `fingerprint_rfid.ino`
2. Cập nhật các thông tin trong file `secret.h`:
```cpp
#define MQTT_BROKER_URL "broker.hivemq.com"
#define USER_NAME "your_username"
#define PASSWORD "your_password"
#define MQTT_PORT 8883
#define CERT "your_certificate"
```

### 4.3. Upload Firmware
1. Kết nối ESP32 với máy tính
2. Chọn đúng board và port trong Arduino IDE
3. Upload code

## 5. Kết Nối Phần Cứng

### 5.1. Sơ Đồ Kết Nối
```
ESP32    ->   AS608 (Vân tay)
GPIO16   ->   TX
GPIO17   ->   RX
3.3V     ->   VCC
GND      ->   GND

ESP32    ->   RC522 (RFID)
GPIO21   ->   SDA
3.3V     ->   3.3V
GND      ->   GND
GPIO23   ->   SCK
GPIO19   ->   MOSI
GPIO18   ->   MISO
GPIO5    ->   RST

ESP32    ->   LCD I2C
GPIO4    ->   SDA
GPIO5    ->   SCL
3.3V     ->   VCC
GND      ->   GND
```

### 5.2. Cấu Hình WiFi
1. Khi thiết bị khởi động lần đầu, nó sẽ tạo một Access Point
2. Kết nối với WiFi "Chamcong-Config" (password: 12345678)
3. Truy cập 192.168.4.1 để cấu hình:
   - SSID WiFi
   - Password WiFi
   - IP Server

## 6. Kiểm Tra Hệ Thống

### 6.1. Kiểm Tra Backend
```bash
# Kiểm tra API
curl http://localhost:3000/health
```

### 6.2. Kiểm Tra Frontend
- Truy cập http://localhost:5173
- Đăng nhập với tài khoản admin

### 6.3. Kiểm Tra Thiết Bị
1. Đèn LED trên ESP32 phải sáng
2. Màn hình LCD hiển thị "Place Finger"
3. Kiểm tra kết nối MQTT trong console

## 7. Xử Lý Sự Cố

### 7.1. Thiết Bị Không Kết Nối
- Kiểm tra nguồn điện
- Kiểm tra kết nối WiFi
- Reset thiết bị

### 7.2. Backend Lỗi
- Kiểm tra logs: `npm run logs`
- Kiểm tra kết nối MongoDB
- Kiểm tra cấu hình MQTT

### 7.3. Frontend Lỗi
- Xóa cache trình duyệt
- Kiểm tra console để xem lỗi
- Kiểm tra kết nối API

## 8. Bảo Trì

### 8.1. Backup Dữ Liệu
```bash
# Backup MongoDB
mongodump --db attendance_db --out ./backup
```

### 8.2. Cập Nhật Firmware
1. Tải firmware mới
2. Upload qua Arduino IDE
3. Kiểm tra hoạt động


