import { useState, useEffect } from 'react';
import { Bell, Volume2, Vibrate, Eye, X } from 'lucide-react';
import { userApi } from '../services/api';

interface NotificationSettingsProps {
  onClose: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState({
    notificationEnabled: true,
    notificationSound: true,
    notificationVibrate: true,
    notificationPreview: true,
  });
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    loadSettings();
    checkNotificationPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await userApi.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        new Notification('通知已开启', {
          body: '您将收到新消息通知',
          icon: '/logo.png',
        });
      }
    }
  };

  const handleToggle = async (key: keyof typeof settings) => {
    setLoading(true);
    try {
      const newSettings = { ...settings, [key]: !settings[key] };
      setSettings(newSettings);
      await userApi.updateSettings(newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      loadSettings(); // 回滚
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">通知设置</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 浏览器通知权限 */}
          {permissionStatus !== 'granted' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 mb-2">
                需要开启浏览器通知权限才能接收消息提醒
              </p>
              <button
                onClick={requestNotificationPermission}
                className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
              >
                开启通知权限
              </button>
            </div>
          )}

          {/* 通知总开关 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium">消息通知</p>
                <p className="text-xs text-gray-500">接收新消息通知</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationEnabled}
                onChange={() => handleToggle('notificationEnabled')}
                disabled={loading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 声音 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium">提示音</p>
                <p className="text-xs text-gray-500">新消息播放提示音</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationSound}
                onChange={() => handleToggle('notificationSound')}
                disabled={loading || !settings.notificationEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 震动 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium">震动</p>
                <p className="text-xs text-gray-500">新消息震动提醒（移动设备）</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationVibrate}
                onChange={() => handleToggle('notificationVibrate')}
                disabled={loading || !settings.notificationEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 消息预览 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium">消息预览</p>
                <p className="text-xs text-gray-500">通知中显示消息内容</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationPreview}
                onChange={() => handleToggle('notificationPreview')}
                disabled={loading || !settings.notificationEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
