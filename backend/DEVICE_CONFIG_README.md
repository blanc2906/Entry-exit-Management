# Device Configuration API

Tính năng này cho phép cấu hình WiFi và IP server của thiết bị từ phía backend thông qua MQTT.

## API Endpoints

### 1. Lấy cấu hình hiện tại của thiết bị

```http
GET /devices/:deviceId/config
```

**Response:**
```json
{
  "success": true,
  "config": {
    "ssid": "CurrentWiFiSSID",
    "password": "CurrentPassword",
    "serverIP": "192.168.1.100"
  },
  "deviceId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

### 2. Cập nhật cấu hình thiết bị

```http
POST /devices/:deviceId/config
Content-Type: application/json

{
  "ssid": "NewWiFiSSID",
  "password": "NewPassword123",
  "serverIP": "192.168.1.100"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration command sent to device",
  "deviceId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

## MQTT Topics

### Topics được sử dụng:

1. **`config-device/{macAddress}`** - Backend gửi lệnh config đến thiết bị
2. **`get-config/{macAddress}`** - Backend yêu cầu thiết bị gửi config hiện tại
3. **`device/config-response/{macAddress}`** - Thiết bị gửi config về backend
4. **`device/response/{macAddress}`** - Thiết bị gửi response cho các lệnh khác

## Flow hoạt động

### Lấy config hiện tại:
1. Frontend gọi `GET /devices/:id/config`
2. Backend gửi MQTT message đến topic `get-config/{macAddress}`
3. Thiết bị đọc config từ EEPROM và gửi về topic `device/config-response/{macAddress}`
4. Backend nhận và trả về cho frontend

### Cập nhật config:
1. Frontend gọi `POST /devices/:id/config` với config mới
2. Backend gửi MQTT message đến topic `config-device/{macAddress}`
3. Thiết bị lưu config mới vào EEPROM
4. Thiết bị gửi response về topic `device/response/{macAddress}`
5. Thiết bị restart để áp dụng config mới

## Lưu ý quan trọng

1. **Thiết bị phải online** để có thể config
2. **Timeout 10 giây** cho việc lấy config
3. **Thiết bị sẽ restart** sau khi config thành công
4. **Config được lưu trong EEPROM** của thiết bị
5. **Validation IP address** được thực hiện ở cả backend và thiết bị

## Error Handling

### Backend Errors:
- `404 Not Found` - Thiết bị không tồn tại
- `400 Bad Request` - Thiết bị offline hoặc dữ liệu không hợp lệ
- `408 Request Timeout` - Thiết bị không phản hồi trong 10 giây
- `500 Internal Server Error` - Lỗi server

### Device Errors:
- `Config Error! Invalid JSON` - JSON không hợp lệ
- `Config Failed! Invalid Data` - Dữ liệu config không hợp lệ
- `Config Updated! Rebooting...` - Config thành công, đang restart

## Testing

Sử dụng file `test-config-device.http` để test API:

```bash
# Test lấy config
curl -X GET http://localhost:3000/devices/64f8a1b2c3d4e5f6a7b8c9d0/config

# Test cập nhật config
curl -X POST http://localhost:3000/devices/64f8a1b2c3d4e5f6a7b8c9d0/config \
  -H "Content-Type: application/json" \
  -d '{
    "ssid": "MyWiFiNetwork",
    "password": "MyPassword123",
    "serverIP": "192.168.100.82"
  }'
```

## Security Considerations

1. **Password được mã hóa** khi lưu trong EEPROM
2. **Validation IP address** để tránh injection
3. **Timeout protection** để tránh blocking
4. **Device verification** trước khi config 