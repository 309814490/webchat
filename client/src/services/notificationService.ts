import { userApi } from './api';

class NotificationService {
  private settings = {
    notificationEnabled: true,
    notificationSound: true,
    notificationVibrate: true,
    notificationPreview: true,
  };

  private audio: HTMLAudioElement | null = null;

  constructor() {
    this.loadSettings();
    this.initAudio();
  }

  private async loadSettings() {
    try {
      const response = await userApi.getSettings();
      this.settings = response.data;
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private initAudio() {
    // 创建通知音效
    this.audio = new Audio('/notification.mp3');
    this.audio.volume = 0.5;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async showNotification(title: string, options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: any;
  }) {
    if (!this.settings.notificationEnabled) {
      return;
    }

    // 播放声音
    if (this.settings.notificationSound && this.audio) {
      try {
        this.audio.currentTime = 0;
        await this.audio.play();
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }

    // 震动
    if (this.settings.notificationVibrate && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // 显示浏览器通知
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: this.settings.notificationPreview ? options?.body : '您有新消息',
        icon: options?.icon || '/logo.png',
        tag: options?.tag,
        data: options?.data,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.conversationId) {
          // 可以在这里跳转到对应会话
          window.location.hash = `#/chat/${options.data.conversationId}`;
        }
      };

      // 5秒后自动关闭
      setTimeout(() => notification.close(), 5000);
    }
  }

  updateSettings(newSettings: Partial<typeof this.settings>) {
    this.settings = { ...this.settings, ...newSettings };
  }
}

export const notificationService = new NotificationService();
