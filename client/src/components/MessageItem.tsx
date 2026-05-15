import { memo, useCallback } from 'react';
import { Reply, Smile, Forward, Star } from 'lucide-react';
import { messageApi } from '../services/api';

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  senderStudentId?: string;
  senderAvatarUrl?: string;
  senderRole?: string;
  content: string;
  type: string;
  metadata?: any;
  createdAt: string;
  replyToId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  replyToSenderStudentId?: string;
  replyToType?: string;
  mentionedUserIds?: number[];
  mentionAll?: boolean;
  recalled?: boolean;
}

interface MessageItemProps {
  msg: Message;
  isMe: boolean;
  isMentionedMe: boolean;
  conversationId: number;
  onReply: (msg: Message) => void;
  onRecall: (msgId: number) => void;
  onForward?: (msg: Message) => void;
  formatMessageTime: (timeStr: string) => string;
}

const MessageItem = memo(({
  msg,
  isMe,
  isMentionedMe,
  conversationId,
  onReply,
  onRecall,
  onForward,
  formatMessageTime
}: MessageItemProps) => {

  const handlePlusOne = useCallback(async () => {
    if (!conversationId) return;
    try {
      await messageApi.sendMessage({
        conversationId,
        content: msg.content,
        type: msg.type,
        metadata: msg.metadata
      });
    } catch (error: any) {
      console.error('Failed to send +1 message:', error);
      alert('发送消息失败: ' + (error.response?.data?.message || error.message));
    }
  }, [conversationId, msg.content, msg.type, msg.metadata]);

  const handleFavorite = useCallback(async () => {
    try {
      await messageApi.favoriteMessage(msg.id);
      alert('已收藏');
    } catch (error: any) {
      alert(error.response?.data?.message || '收藏失败');
    }
  }, [msg.id]);

  if (msg.recalled) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {isMe ? '你撤回了一条消息' : `${msg.senderName || msg.senderStudentId || '对方'}撤回了一条消息`}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* 头像 */}
      {!isMe && (
        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
          {msg.senderAvatarUrl ? (
            <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-full h-full object-cover" />
          ) : (
            (msg.senderStudentId || msg.senderName || '?').slice(0, 2)
          )}
        </div>
      )}

      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* 发送者信息 */}
        {!isMe && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs text-gray-500">
              {msg.senderStudentId || msg.senderName}
            </span>
            {msg.senderRole === 'OWNER' && (
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">群主</span>
            )}
            {msg.senderRole === 'ADMIN' && (
              <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">管理员</span>
            )}
          </div>
        )}

        {/* 回复引用 */}
        {msg.replyToId && msg.replyToContent && (
          <div className={`text-xs bg-gray-100 px-2 py-1 rounded mb-1 max-w-full ${isMe ? 'mr-2' : 'ml-2'}`}>
            <div className="flex items-center gap-1 text-gray-500 mb-0.5">
              <Reply className="w-3 h-3" />
              <span>{msg.replyToSenderStudentId || msg.replyToSenderName || '未知'}</span>
            </div>
            <p className="text-gray-600 truncate">
              {msg.replyToType === 'IMAGE' ? '[图片]' :
               msg.replyToType === 'VIDEO' ? '[视频]' :
               msg.replyToType === 'FILE' ? '[文件]' :
               msg.replyToContent}
            </p>
          </div>
        )}

        {/* 消息内容 */}
        <div className={`relative ${isMe ? 'bg-[#95ec69]' : isMentionedMe ? 'bg-yellow-100' : 'bg-white'} rounded-lg px-3 py-2 shadow-sm`}>
          {/* @提及标记 */}
          {msg.mentionAll && (
            <span className="inline-block bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-1">@所有人</span>
          )}

          {/* 消息内容 */}
          {msg.type === 'IMAGE' || msg.type === 'image' ? (
            <img
              src={msg.content}
              alt="图片"
              className="max-w-full rounded cursor-pointer hover:opacity-90"
              loading="lazy"
              onClick={() => window.open(msg.content, '_blank')}
            />
          ) : msg.type === 'VIDEO' || msg.type === 'video' ? (
            <video src={msg.content} controls className="max-w-full rounded" />
          ) : msg.type === 'FILE' || msg.type === 'file' ? (
            <a href={msg.content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
              <span>📎</span>
              <span>{msg.metadata?.fileName || '文件'}</span>
            </a>
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
          )}

          {/* 悬浮操作按钮 */}
          <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 px-2`}>
            <button
              onClick={() => onReply(msg)}
              className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
              title="回复"
            >
              <Reply className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={handlePlusOne}
              className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
              title="+1"
            >
              <Smile className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={() => onForward?.(msg)}
              className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
              title="转发"
            >
              <Forward className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={handleFavorite}
              className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
              title="收藏"
            >
              <Star className="w-3 h-3 text-gray-600" />
            </button>
            {isMe && (
              <button
                onClick={() => onRecall(msg.id)}
                className="p-1 bg-white rounded-full shadow hover:bg-gray-100 text-xs text-gray-600"
                title="撤回"
              >
                撤回
              </button>
            )}
          </div>
        </div>

        {/* 时间戳 */}
        <span className="text-[10px] text-gray-400 mt-1 px-1">
          {formatMessageTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只有这些属性变化时才重新渲染
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.recalled === nextProps.msg.recalled &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.isMentionedMe === nextProps.isMentionedMe
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
