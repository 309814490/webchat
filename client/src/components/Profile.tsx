import { useState } from 'react';
import { QrCode, LogOut, X, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../stores/authStore';

interface Props {
  onOpenProfileEdit?: () => void;
}

export default function Profile({ onOpenProfileEdit }: Props) {
  const { user, logout } = useAuthStore();
  const [showQrCode, setShowQrCode] = useState(false);

  // 生成二维码内容：包含用户信息，方便他人扫码添加好友
  const qrCodeValue = JSON.stringify({
    type: 'user',
    studentId: user?.studentId || '',
    username: user?.username || '',
    id: user?.id || '',
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-4 pt-6 pb-16">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
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
          <button className="p-2" onClick={() => setShowQrCode(true)}>
            <QrCode className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 -mt-8 px-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <button
            onClick={() => onOpenProfileEdit?.()}
            className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 font-medium">个人信息</span>
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <span className="text-red-500 font-medium">退出登录</span>
        </button>
      </div>

      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQrCode(false)}>
          <div className="bg-white rounded-2xl p-6 mx-4 w-80 max-w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">我的二维码</h3>
              <button onClick={() => setShowQrCode(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 mb-4 w-full">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {(user?.studentId || 'U').slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{user?.studentId || '用户'}</p>
                </div>
              </div>
              <div className="p-4 bg-white border border-gray-100 rounded-xl">
                <QRCodeSVG value={qrCodeValue} size={200} level="M" />
              </div>
              <p className="mt-3 text-xs text-gray-400">扫一扫上面的二维码，添加我为好友</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
