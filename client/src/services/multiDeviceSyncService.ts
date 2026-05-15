import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from './api';

class MultiDeviceSyncService {
  private client: Client | null = null;
  private sessionToken: string | null = null;
  private deviceId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncCallbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  async initialize(userId: number) {
    try {
      // 创建会话
      const response = await api.post('/sessions/login', {
        deviceId: this.deviceId,
        deviceType: 'WEB',
        deviceName: this.getDeviceName()
      });

      this.sessionToken = response.data.sessionToken;

      // 启动心跳
      this.startHeartbeat();

      // 连接 WebSocket 接收同步消息
      this.connectWebSocket(userId);
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
    }
  }

  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  }

  private startHeartbeat() {
    // 每30秒发送一次心跳
    this.heartbeatInterval = setInterval(async () => {
      if (this.sessionToken) {
        try {
          await api.post('/sessions/heartbeat', {
            sessionToken: this.sessionToken
          });
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, 30000);
  }

  private connectWebSocket(userId: number) {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Sync WebSocket connected');

        // 订阅用户同步频道
        this.client?.subscribe(`/topic/user/${userId}/sync`, (message) => {
          const syncData = JSON.parse(message.body);
          this.handleSyncMessage(syncData);
        });

        // 订阅用户状态频道
        this.client?.subscribe(`/topic/user-status/${userId}`, (message) => {
          const statusData = JSON.parse(message.body);
          this.handleStatusMessage(statusData);
        });
      },
      onDisconnect: () => {
        console.log('Sync WebSocket disconnected');
      }
    });

    this.client.activate();
  }

  private handleSyncMessage(data: any) {
    const { type } = data;

    switch (type) {
      case 'READ_STATUS':
        this.triggerCallbacks('readStatus', data);
        break;
      case 'CONVERSATION_STATUS':
        this.triggerCallbacks('conversationStatus', data);
        break;
      case 'MESSAGE_DELETE':
        this.triggerCallbacks('messageDelete', data);
        break;
      case 'CONVERSATION_DELETE':
        this.triggerCallbacks('conversationDelete', data);
        break;
      default:
        console.log('Unknown sync message type:', type);
    }
  }

  private handleStatusMessage(data: any) {
    this.triggerCallbacks('userStatus', data);
  }

  private triggerCallbacks(event: string, data: any) {
    const callbacks = this.syncCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // 注册同步事件监听
  on(event: string, callback: Function) {
    if (!this.syncCallbacks.has(event)) {
      this.syncCallbacks.set(event, []);
    }
    this.syncCallbacks.get(event)?.push(callback);
  }

  // 移除监听
  off(event: string, callback: Function) {
    const callbacks = this.syncCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 获取设备列表
  async getDevices() {
    try {
      const response = await api.get('/sessions/list');
      return response.data;
    } catch (error) {
      console.error('Failed to get devices:', error);
      return [];
    }
  }

  // 踢出设备
  async logoutDevice(deviceId: string) {
    try {
      await api.delete(`/sessions/${deviceId}`);
    } catch (error) {
      console.error('Failed to logout device:', error);
      throw error;
    }
  }

  // 检查用户在线状态
  async checkOnlineStatus(userId: number): Promise<boolean> {
    try {
      const response = await api.get(`/sessions/online-status/${userId}`);
      return response.data.online;
    } catch (error) {
      return false;
    }
  }

  // 清理
  async cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.sessionToken) {
      try {
        await api.post('/sessions/logout', {
          sessionToken: this.sessionToken
        });
      } catch (error) {
        console.error('Failed to logout:', error);
      }
    }

    if (this.client) {
      this.client.deactivate();
    }

    this.syncCallbacks.clear();
  }
}

export const multiDeviceSyncService = new MultiDeviceSyncService();
