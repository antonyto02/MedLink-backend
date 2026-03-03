import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class IotGateway {
  @WebSocketServer()
  server: Server;

  emitVitals(payload: unknown) {
    this.server.emit('vitals', payload);
  }
}
