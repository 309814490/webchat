import { memo, useCallback } from 'react';
import { messageApi } from '../services/api';

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  senderStudentId?: string;
  senderAvatarUrl?: string;
  content: string;
  type: string;
  metadata?: any;
  createdAt: string;
}

interface GroupMeta {
  isFirst: boolean;
  skip: boolean;
  count: number;
  senders: { id: number; studentId: string; avatarUrl: string; times: number }[];
}

interface CollapsedMessageCardProps {
  msg: Message;
  meta: GroupMeta;
  conversationId: number;
  isGroup: boolean;
  groupMembers: any[];
  loading: boolean;
}

const CollapsedMessageCard = memo(({
  msg,
  meta,
  conversationId,
  isGroup,
  groupMembers,
  loading
}: CollapsedMessageCardProps) => {

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

  const displayContent = msg.type === 'IMAGE' || msg.type === 'image' ? '[图片]'
    : msg.type === 'VIDEO' || msg.type === 'video' ? '[视频]'
    : msg.type === 'FILE' || msg.type === 'file' ? '[文件]'
    : msg.content;

  const senderMap = new Map(meta.senders.map(s => [s.id, s]));

  // 群聊：展示所有群成员；私聊：只展示发送者
  const allMembers = isGroup && groupMembers.length > 0
    ? groupMembers.map((m: any) => {
        const sent = senderMap.get(m.id);
        return {
          id: m.id,
          studentId: m.studentId || m.username,
          avatarUrl: m.avatarUrl || '',
          times: sent ? sent.times : 0,
          participated: !!sent,
        };
      })
    : meta.senders.map(s => ({ ...s, participated: true }));

  // 参与者排前面
  allMembers.sort((a, b) => (a.participated === b.participated ? 0 : a.participated ? -1 : 1));

  return (
    <div className="flex justify-center my-2">
      <div className="bg-white rounded-xl shadow border border-gray-100 px-4 py-3 max-w-[80%] w-fit">
        {/* 消息内容 + 总次数 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
            {meta.count}
          </span>
          <p className="text-sm text-gray-800 break-words">{displayContent}</p>
        </div>

        {/* 成员列表 */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {allMembers.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1 rounded-full pl-1 pr-2 py-0.5 ${s.participated ? 'bg-gray-50' : 'bg-gray-50 opacity-40'}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 overflow-hidden ${s.participated ? 'bg-blue-500' : 'bg-gray-400'}`}>
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt={s.studentId} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  s.studentId.slice(0, 2)
                )}
              </div>
              <span className={`text-[11px] ${s.participated ? 'text-gray-600' : 'text-gray-400'}`}>
                {s.studentId}
              </span>
              {s.times > 1 && <span className="text-[10px] text-gray-400">×{s.times}</span>}
            </div>
          ))}
        </div>

        {/* 加一个按钮 */}
        <button
          onClick={handlePlusOne}
          disabled={loading}
          className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <span>+1</span>
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.meta.count === nextProps.meta.count &&
    prevProps.loading === nextProps.loading
  );
});

CollapsedMessageCard.displayName = 'CollapsedMessageCard';

export default CollapsedMessageCard;
