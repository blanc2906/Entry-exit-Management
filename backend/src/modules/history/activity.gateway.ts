import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ActivityGateway {
  @WebSocketServer()
  server: Server;

  sendRecentActivity(activity: any) {
    console.log(activity);
    this.server.emit('recent-activity', activity);
  }
} 