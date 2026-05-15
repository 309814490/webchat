import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Globe, X, LogOut } from 'lucide-react';
import { multiDeviceSyncService } from '../services/multiDeviceSyncService';

interface DeviceSession {
  id: number;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  ipAddress: string;
  online: boolean;
  lastHeartbeat: string;
  createdAt: string;
}

interface DeviceManagerProps {
  onClose: () => void;
}

export default function DeviceManager({ onClose }: DeviceManagerProps) {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const currentDeviceId = localStorage.getItem('deviceId');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const deviceList = await multiDeviceSyncService.getDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (deviceId: string) => {
    if (!confirm('确定要踢出该设备吗？')) return;

    try {
      await multiDeviceSyncService.logoutDevice(deviceId);
      setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      alert('设备已下线');
    } catch (error: any) {
      alert('操作失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'MOBILE':
        return <Smartphone className="w-6 h-6 text-blue-500" />;
      case 'DESKTOP':
        return <Monitor className="w-6 h-6 text-green-500" />;
      default:
        return <Globe className="w-6 h-6 text-purple-500" />;
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[500px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">设备管理</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">加载中...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-10 text-gray-500">暂无设备</div>
          ) : (
            <div className="space-y-3">
              {devices.map(device => (
                <div
                  key={device.id}
                  className={`p-4 rounded-lg border ${
                    device.deviceId === currentDeviceId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {device.deviceName}
                        </p>
                        {device.deviceId === currentDeviceId && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                            当前设备
                          </span>
                        )}
                        {device.online && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                            在线
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                        <p>设备类型: {device.deviceType}</p>
                        <p>IP地址: {device.ipAddress}</p>
                        <p>
                          {device.online
                            ? `最后活跃: ${formatTime(device.lastHeartbeat)}`
                            : `离线时间: ${formatTime(device.lastHeartbeat)}`}
                        </p>
                        <p>登录时间: {new Date(device.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {device.deviceId !== currentDeviceId && (
                      <button
                        onClick={() => handleLogoutDevice(device.deviceId)}
                        className="shrink-0 p-2 hover:bg-red-50 rounded text-red-500"
                        title="踢出设备"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
