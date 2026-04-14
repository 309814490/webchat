import { useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<'recent' | 'smile' | 'gesture' | 'object'>('smile');

  // 常用表情包分类
  const emojiCategories = {
    recent: {
      label: '最近',
      emojis: ['😊', '👍', '❤️', '😂', '🎉', '👏', '🙏', '💪']
    },
    smile: {
      label: '笑脸',
      emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
        '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
        '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
        '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
        '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
        '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'
      ]
    },
    gesture: {
      label: '手势',
      emojis: [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️',
        '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
        '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
        '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪'
      ]
    },
    object: {
      label: '物品',
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
        '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️',
        '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉'
      ]
    }
  };

  const categories = [
    { id: 'recent' as const, label: '⏱️' },
    { id: 'smile' as const, label: '😊' },
    { id: 'gesture' as const, label: '👋' },
    { id: 'object' as const, label: '❤️' }
  ];

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* 表情选择器 */}
      <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 z-40 w-80">
        {/* 分类标签 */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-lg transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 表情网格 */}
        <div className="p-3 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {emojiCategories[activeCategory].emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-gray-100 rounded transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
