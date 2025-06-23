import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class AppWebSocketGateway {
  @WebSocketServer()
  server: Server;

  sendRecentActivity(activity: any) {
    console.log('Sending recent activity:', activity);
    this.server.emit('recent-activity', activity);
  }

  sendFingerprintNotification(notification: any) {
    console.log('Sending fingerprint notification:', notification);
    this.server.emit('fingerprint-notification', notification);
  }

  sendDeviceStatusUpdate(deviceStatus: any) {
    console.log('Sending device status update:', deviceStatus);
    this.server.emit('device-status-update', deviceStatus);
  }

  sendUserUpdate(userUpdate: any) {
    console.log('Sending user update:', userUpdate);
    this.server.emit('user-update', userUpdate);
  }

  sendWorkScheduleUpdate(scheduleUpdate: any) {
    console.log('Sending work schedule update:', scheduleUpdate);
    this.server.emit('work-schedule-update', scheduleUpdate);
  }

  sendWorkShiftUpdate(shiftUpdate: any) {
    console.log('Sending work shift update:', shiftUpdate);
    this.server.emit('work-shift-update', shiftUpdate);
  }

  // Phương thức gửi thông báo tùy chỉnh
  sendCustomEvent(eventName: string, data: any) {
    console.log(`Sending custom event ${eventName}:`, data);
    this.server.emit(eventName, data);
  }

  // Phương thức gửi thông báo đến room cụ thể
  sendToRoom(room: string, eventName: string, data: any) {
    console.log(`Sending to room ${room}, event ${eventName}:`, data);
    this.server.to(room).emit(eventName, data);
  }
} 