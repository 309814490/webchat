import { QrCode, Scan, Wallet, Settings, Shield, HelpCircle, RefreshCw, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function Profile() {
  const { user, logout } = useAuthStore();

  const menuItems = [
    { icon: Scan, label: '扫一扫', color: 'bg-orange-500' },
    { icon: Wallet, label: '我的钱包', color: 'bg-yellow-500' },
    { icon: Settings, label: '通用设置', color: 'bg-purple-500' },
    { icon: Shield, label: '账号安全', color: 'bg-teal-500' },
    { icon: HelpCircle, label: '帮助中心', color: 'bg-cyan-500' },
    { icon: RefreshCw, label: '检查更新', color: 'bg-orange-500' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-4 pt-6 pb-16">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar - show image if available, otherwise show student ID */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-sm">
                {user?.studentId || 'U'}
              </div>
            )}
            <div className="text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{user?.studentId || '用户'}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">未认证</span>
              </div>
              <p className="text-sm text-blue-100 mt-1">{user?.phone || '未绑定手机'}</p>
            </div>
          </div>
          <button className="p-2">
            <QrCode className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 -mt-8 px-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 px-4 py-4 ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              } hover:bg-gray-50 cursor-pointer`}
            >
              <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-900 font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full mt-4 bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <span className="text-red-500 font-medium">退出登录</span>
        </button>
      </div>
    </div>
  );
}
