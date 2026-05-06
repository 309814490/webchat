import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';

interface GroupQRCodeProps {
  conversationId: number;
  groupName: string;
  onClose: () => void;
}

export default function GroupQRCode({ conversationId, groupName, onClose }: GroupQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [conversationId]);

  const generateQRCode = async () => {
    try {
      // 生成群邀请链接（格式：webchat://join-group?id=xxx）
      const inviteLink = `webchat://join-group?id=${conversationId}`;
      const url = await QRCode.toDataURL(inviteLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <p className="text-lg font-semibold text-gray-900">群二维码</p>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{groupName}</h2>
          <p className="text-sm text-gray-500 mb-6">扫描二维码加入群聊</p>

          {qrCodeUrl ? (
            <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
              <img src={qrCodeUrl} alt="群二维码" className="w-[300px] h-[300px]" />
            </div>
          ) : (
            <div className="w-[300px] h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
              <p className="text-gray-400">生成中...</p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-6 text-center max-w-[300px]">
            该二维码7天内有效，可直接扫码加入群聊
          </p>
        </div>
      </div>
    </div>
  );
}
