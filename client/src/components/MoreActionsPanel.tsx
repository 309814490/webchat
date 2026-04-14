import { Image, File, Video, Camera } from 'lucide-react';

interface MoreActionsPanelProps {
  onClose: () => void;
  onImageSelect: () => void;
  onFileSelect: () => void;
  onVideoSelect: () => void;
}

export default function MoreActionsPanel({ onClose, onImageSelect, onFileSelect, onVideoSelect }: MoreActionsPanelProps) {
  const actions = [
    { id: 'image', label: '图片', icon: Image, color: 'bg-blue-500', onClick: onImageSelect },
    { id: 'camera', label: '拍摄', icon: Camera, color: 'bg-green-500', onClick: () => console.log('拍摄') },
    { id: 'video', label: '视频', icon: Video, color: 'bg-purple-500', onClick: onVideoSelect },
    { id: 'file', label: '文件', icon: File, color: 'bg-yellow-500', onClick: onFileSelect },
  ];

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* 功能面板 - 固定在底部 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 p-6 pb-8">
        {/* 网格布局 */}
        <div className="grid grid-cols-4 gap-6 max-w-md mx-auto">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
            >
              <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                <action.icon className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs text-gray-700 text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
