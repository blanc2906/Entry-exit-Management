// src/modules/mqtt/mqtt.service.ts

import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Subject, firstValueFrom, timeout } from 'rxjs';
import { Inject } from '@nestjs/common';

@Injectable()
export class MqttService {
  private responseWaiters = new Map<string, Subject<any>>();

  constructor(
    @Inject('MQTT_CLIENT') private readonly mqttClient: ClientProxy,
  ) {}

  public handleResponse(message: any) {
    console.log('Handling response:', message);
    const { requestId, ...data } = message;
    
    const subject = this.responseWaiters.get(requestId);
    if (subject) {
      subject.next(data);
      subject.complete();
      this.responseWaiters.delete(requestId);
    } else {
      console.warn(`No pending request for requestId ${requestId}`);
    }
  }

  async sendCommandAndWaitResponse(
    deviceMac: string, 
    command: string, 
    payload: any = {}, 
    timeoutMs: number = 10000
  ): Promise<any> {
    const requestId = `${deviceMac}_${Date.now()}`;
    console.log(`Sending command ${command} with requestId ${requestId}`);
    
    const subject = new Subject<any>();
    this.responseWaiters.set(requestId, subject);

    const messagePayload = {
      data: {
        ...payload,
        requestId,
      }
    };

    await this.mqttClient.emit(`${command}/${deviceMac}`, messagePayload).toPromise();

    try {
      console.log(`Waiting for response to requestId ${requestId}`);
      const result = await firstValueFrom(subject.pipe(timeout(timeoutMs)));
      console.log(`Received response for ${requestId}:`, result);
      return result;
    } catch (err) {
      console.error(`Timeout waiting for response to ${requestId}`);
      this.responseWaiters.delete(requestId);
      throw new Error(`Device ${deviceMac} did not respond to command ${command}`);
    } finally {
      this.responseWaiters.delete(requestId);
    }
  }


  async addFingerprint(deviceMac: string, userId: string, fingerId: number): Promise<any> {
    return this.sendCommandAndWaitResponse(deviceMac, 'add-fingerprint', {
      userId,
      fingerId,
    });
  }

  async deleteFingerprint(deviceMac: string, fingerId: number): Promise<any> {
    return this.sendCommandAndWaitResponse(deviceMac, 'delete-fingerprint', {
      fingerId,
    });
  }

  async emptyDatabase(deviceMac: string): Promise<any> {
    return this.sendCommandAndWaitResponse(deviceMac, 'empty-database', {});
  }

  async verifyDevice(deviceMac: string): Promise<any> {
    return this.sendCommandAndWaitResponse(deviceMac, 'verify', {
      deviceMac,
    });
  }
}