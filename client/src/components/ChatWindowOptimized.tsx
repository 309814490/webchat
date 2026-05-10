import { useState, useEffect, useRef, useMemo } from 'react';
import { Smile, Plus, Reply, X, AtSign, Bell, MessageSquare, Settings } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { conversationApi, messageApi, fileApi, UserInfo, groupApi } from '../services/api';
import EmojiPicker from './EmojiPicker';
import MoreActionsPanel from './MoreActionsPanel';
import MentionSelector from './MentionSelector';
import GroupInfo from './GroupInfo';
import GroupAnnouncement from './GroupAnnouncement';
import ChatHistory from './ChatHistory';

interface ChatWindowProps {
  friend: UserInfo;
  onClose: () => void;
  isGroup?: boolean; // 标识是否为群聊
  onConversationUpdated?: (newName?: string) => void;
}

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  senderStudentId?: string;
  senderAvatarUrl?: string;
  senderRole?: string; // OWNER, ADMIN, MEMBER
  content: string;
  type: string; // TEXT, IMAGE, VIDEO, FILE
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

// 提取到组件外部，避免每次渲染重新创建
const formatMessageTime = (timeStr: string) => {
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' +
         date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

type GroupMeta = {
  isFirst: boolean; skip: boolean; count: number;
  senders: { id: number; studentId: string; avatarUrl: string; times: number }[];
};

// 计算消息分组的纯函数，供 useMemo 使用
function computeGroupMeta(messages: Message[]): GroupMeta[] {
  const groupMeta: GroupMeta[] = messages.map(() => ({
    isFirst: false, skip: false, count: 0, senders: []
  }));
  const contentGroups = new Map<string, number[]>();
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.recalled) continue;
    const key = `${m.type}::${m.content}`;
    if (!contentGroups.has(key)) contentGroups.set(key, []);
    contentGroups.get(key)!.push(i);
  }
  for (const [, indices] of contentGroups) {
    if (indices.length < 3) continue;
    const lastIdx = indices[indices.length - 1];
    const senderMap = new Map<number, { id: number; studentId: string; avatarUrl: string; times: number }>();
    for (const idx of indices) {
      const m = messages[idx];
      const existing = senderMap.get(m.senderId);
      if (existing) existing.times++;
      else senderMap.set(m.senderId, { id: m.senderId, studentId: m.senderStudentId || m.senderName, avatarUrl: m.senderAvatarUrl || '', times: 1 });
    }
    const senders = Array.from(senderMap.values());
    groupMeta[lastIdx] = { isFirst: true, skip: false, count: indices.length, senders };
    for (const idx of indices) {
      if (idx !== lastIdx) {
        groupMeta[idx] = { isFirst: false, skip: true, count: indices.length, senders };
      }
    }
  }
  return groupMeta;
}

export default function ChatWindowOptimized({ friend, onClose, isGroup = false, onConversationUpdated }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showMentionSelector, setShowMentionSelector] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<{ id: number; studentId: string }[]>([]);
  const [isMentionAll, setIsMentionAll] = useState(false);
  const [readMentionIds, setReadMentionIds] = useState<Set<number>>(new Set());
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [groupName, setGroupName] = useState(friend.username);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<number | null>(null);

  // 无限滚动状态
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 计算当前用户在群组中的角色
  const currentUserRole = useMemo(() => {
    if (!isGroup || !currentUserId || groupMembers.length === 0) return 'MEMBER';
    const me = groupMembers.find((m: any) => m.id === currentUserId);
    return me?.role || 'MEMBER';
  }, [isGroup, currentUserId, groupMembers]);

  // 缓存消息分组计算，仅在 messages 变化时重新计算
  const groupMeta = useMemo(() => computeGroupMeta(messages), [messages]);

  // 过滤掉被折叠的消息，保留原始索引用于查找 groupMeta
  const groupedMessages = useMemo(() => {
    return messages
      .map((msg, idx) => ({ msg, originalIdx: idx }))
      .filter(({ originalIdx }) => !groupMeta[originalIdx].skip);
  }, [messages, groupMeta]);

  // 缓存 @提及消息列表
  const mentionMessages = useMemo(() => {
    if (!isGroup || !currentUserId) return [];
    return messages.filter(m =>
      m.senderId !== currentUserId && (
        m.mentionAll === true ||
        (m.mentionedUserIds && m.mentionedUserIds.includes(currentUserId))
      ) && !readMentionIds.has(m.id)
    );
  }, [messages, currentUserId, isGroup, readMentionIds]);

  // 重新加载最新公告
  const reloadLatestAnnouncement = async () => {
    if (!isGroup || !conversationId) return;
    try {
      const response = await groupApi.getLatestAnnouncement(conversationId);
      setLatestAnnouncement(response.data);
    } catch (error) {
      console.error('Failed to reload latest announcement:', error);
    }
  };

  // 重新加载群成员信息
  const reloadGroupMembers = async () => {
    if (!isGroup || !conversationId) return;
    try {
      const [countResponse, membersResponse] = await Promise.all([
        conversationApi.getConversationMemberCount(conversationId),
        conversationApi.getConversationMembers(conversationId),
      ]);
      setMemberCount(countResponse.data.count);
      setGroupMembers(membersResponse.data);
    } catch (error) {
      console.error('Failed to reload group members:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // 获取当前用户ID
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // JWT token 中用户ID存储在 subject 字段中
          const userId = Number(payload.sub);
          setCurrentUserId(userId);
        }

        // 如果是群聊，直接使用 friend.id 作为 conversationId
        if (isGroup) {
          const convId = Number(friend.id);
          setConversationId(convId);
          // 获取会话成员数量和列表
          try {
            const [countResponse, membersResponse] = await Promise.all([
              conversationApi.getConversationMemberCount(convId),
              conversationApi.getConversationMembers(convId),
            ]);
            setMemberCount(countResponse.data.count);
            setGroupMembers(membersResponse.data);
          } catch (error) {
            console.error('Failed to load conversation member info:', error);
          }
          // 加载最新公告
          try {
            const announcementResponse = await groupApi.getLatestAnnouncement(convId);
            setLatestAnnouncement(announcementResponse.data);
          } catch (error) {
            console.error('Failed to load latest announcement:', error);
          }
        } else {
          // 私聊：创建或获取会话
          const response = await conversationApi.getOrCreatePrivateConversation(Number(friend.id));
          setConversationId(response.data.id);
        }
      } catch (error: any) {
        console.error('Failed to create conversation:', error);
        alert('创建会话失败: ' + (error.response?.data?.message || error.message));
      }
    };
    init();
  }, [friend.id, isGroup]);

  // 从 localStorage 加载已关闭的公告 ID
  useEffect(() => {
    if (!conversationId) return;
    const key = `dismissedAnnouncement_${conversationId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setDismissedAnnouncementId(Number(stored));
    }
  }, [conversationId]);

  // 保存已关闭的公告 ID 到 localStorage
  useEffect(() => {
    if (!conversationId || dismissedAnnouncementId === null) return;
    const key = `dismissedAnnouncement_${conversationId}`;
    localStorage.setItem(key, String(dismissedAnnouncementId));
  }, [conversationId, dismissedAnnouncementId]);

  // 从 localStorage 加载已读的 @消息 ID
  useEffect(() => {
    if (!conversationId) return;
    const key = `readMentions_${conversationId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setReadMentionIds(new Set(JSON.parse(stored)));
    }
  }, [conversationId]);

  // 保存已读的 @消息 ID 到 localStorage
  useEffect(() => {
    if (!conversationId || readMentionIds.size === 0) return;
    const key = `readMentions_${conversationId}`;
    localStorage.setItem(key, JSON.stringify(Array.from(readMentionIds)));
  }, [conversationId, readMentionIds]);

  useEffect(() => {
    if (!conversationId) return;

    const token = localStorage.getItem('token');
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      debug: (str) => console.log('STOMP:', str),
      onConnect: () => {
        console.log('WebSocket connected');
        client.subscribe(`/topic/conversation/${conversationId}`, (msg) => {
          const incoming = JSON.parse(msg.body) as Message;
          if (incoming.recalled) {
            // 撤回消息：更新已有消息
            setMessages((prev) =>
              prev.map((m) => (m.id === incoming.id ? incoming : m))
            );
          } else {
            // 新消息：追加到列表
            setMessages((prev) => [...prev, incoming]);
          }
        });
      },
      onDisconnect: () => console.log('WebSocket disconnected'),
      onStompError: (frame) => console.error('STOMP error:', frame),
    });

    client.activate();
    stompClientRef.current = client;
    loadMessages();

    return () => {
      client.deactivate();
    };
  }, [conversationId]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    // 仅在新消息到来时自动滚动（且用户在底部附近）
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    const isNewMessage = messages.length > prevMessagesLenRef.current;
    if (isNearBottom || isNewMessage && prevMessagesLenRef.current === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages]);

  const loadMessages = async (page: number = 0, append: boolean = false) => {
    if (!conversationId) return;
    try {
      if (append) setLoadingMore(true);
      const response = await messageApi.getMessages(conversationId, page, 10);
      const list = response.data.content || [];
      const reversed = [...list].reverse();

      if (append) {
        // 加载更多历史消息，添加到前面
        setMessages(prev => [...reversed, ...prev]);
      } else {
        // 首次加载
        setMessages(reversed);
      }

      // 更新分页状态
      setHasMore(!response.data.last);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (append) setLoadingMore(false);
    }
  };

  // 监听滚动，到顶部时加载更多
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore || loadingMore) return;

    const handleScroll = () => {
      if (container.scrollTop < 100) {
        // 滚动到顶部附近，加载更多
        const prevScrollHeight = container.scrollHeight;
        loadMessages(currentPage + 1, true).then(() => {
          // 保持滚动位置
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          });
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [conversationId, currentPage, hasMore, loadingMore]);

  const handleSend = async () => {
    if (!message.trim() || !conversationId) return;
    setLoading(true);
    try {
      await messageApi.sendMessage({
        conversationId,
        content: message.trim(),
        type: 'TEXT',
        ...(replyingTo ? { replyToId: replyingTo.id } : {}),
        ...(mentionedUsers.length > 0 ? { mentionedUserIds: mentionedUsers.map(u => u.id) } : {}),
        ...(isMentionAll ? { mentionAll: true } : {})
      });
      setMessage('');
      setReplyingTo(null);
      setMentionedUsers([]);
      setIsMentionAll(false);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      alert('发送消息失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleFileUpload = async (file: File, messageType: 'IMAGE' | 'VIDEO' | 'FILE') => {
    if (!conversationId) return;

    setLoading(true);
    try {
      // 上传文件
      const uploadResponse = await fileApi.uploadFile(file, messageType);

      // 发送消息
      await messageApi.sendMessage({
        conversationId,
        content: uploadResponse.data.url,
        type: messageType,
        metadata: {
          fileName: uploadResponse.data.fileName,
          fileSize: uploadResponse.data.fileSize,
          fileType: uploadResponse.data.fileType,
        }
      });
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      alert('文件上传失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };


  // 群设置页面：独立页面渲染
  if (isGroup && showGroupInfo && conversationId) {
    return (
      <GroupInfo
        conversationId={conversationId}
        groupName={groupName}
        memberCount={memberCount}
        groupMembers={groupMembers}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onClose={() => setShowGroupInfo(false)}
        onMembersUpdated={reloadGroupMembers}
        onGroupNameUpdated={(newName) => { setGroupName(newName); onConversationUpdated?.(newName); }}
      />
    );
  }

  // 聊天记录页面：独立页面渲染
  if (showChatHistory && conversationId) {
    return (
      <ChatHistory
        conversationId={conversationId}
        isGroup={isGroup}
        onClose={() => setShowChatHistory(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="bg-[#f5f5f5] pl-[30px] pr-5 h-[68px] border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
        {/* 左侧标题 */}
        <div className="flex-1">
          <p className="text-[25px] font-medium text-gray-800">
            {isGroup
              ? `${groupName}（${memberCount}）`
              : friend.studentId || friend.username
            }
          </p>
        </div>

        {/* 右侧：功能按钮 */}
        <div className="flex items-center gap-3">
          {isGroup && (
            <button
              onClick={() => setShowAnnouncement(true)}
              className="p-1.5 hover:bg-black/5 rounded transition-colors"
              title="公告"
            >
              <Bell className="w-[22px] h-[22px] text-gray-500" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={() => setShowChatHistory(true)}
            className="p-1.5 hover:bg-black/5 rounded transition-colors"
            title="聊天记录"
          >
            <MessageSquare className="w-[22px] h-[22px] text-gray-500" strokeWidth={1.5} />
          </button>
          {isGroup && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="p-1.5 hover:bg-black/5 rounded transition-colors"
              title="群设置"
            >
              <Settings className="w-[22px] h-[22px] text-gray-500" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-[#f5f5f5] relative">
        {/* 群公告卡片 */}
        {isGroup && latestAnnouncement && dismissedAnnouncementId !== latestAnnouncement.id && (
          <div className="sticky top-0 z-10 flex justify-center mb-4 -mx-4 px-4 pt-0 pb-4 bg-[#f5f5f5]">
            <div
              className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 max-w-[600px] w-full cursor-pointer hover:shadow-md transition-shadow relative"
              onClick={() => setShowAnnouncement(true)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedAnnouncementId(latestAnnouncement.id);
                }}
                className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="关闭"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <div className="flex items-start gap-3 pr-6">
                <Bell className="w-5 h-5 text-[#faad14] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#faad14]">群公告</span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2 mb-2">{latestAnnouncement.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{latestAnnouncement.creatorStudentId || latestAnnouncement.creatorName || '未知'}</span>
                    <span>{new Date(latestAnnouncement.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>开始聊天吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map(({ msg, originalIdx }) => {
              const meta = groupMeta[originalIdx];

              const isMe = currentUserId ? msg.senderId === currentUserId : false;

              // 检查当前用户是否被@
              const isMentionedMe = !isMe && currentUserId != null && (
                msg.mentionAll === true ||
                (msg.mentionedUserIds && msg.mentionedUserIds.includes(currentUserId))
              );

              const handlePlusOne = async () => {
                if (!conversationId) return;
                setLoading(true);
                try {
                  await messageApi.sendMessage({ conversationId, content: msg.content, type: msg.type, metadata: msg.metadata });
                } catch (error: any) {
                  console.error('Failed to send +1 message:', error);
                  alert('发送消息失败: ' + (error.response?.data?.message || error.message));
                } finally {
                  setLoading(false);
                }
              };

              // ========== 折叠卡片：连续相同消息≥3条 ==========
              if (meta.isFirst) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-white rounded-xl shadow border border-gray-100 px-4 py-3 max-w-[80%] w-fit">
                      {/* 消息内容 + 总次数 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                          {meta.count}
                        </span>
                        <p className="text-sm text-gray-800 break-words">
                          {msg.type === 'IMAGE' || msg.type === 'image' ? '[图片]'
                            : msg.type === 'VIDEO' || msg.type === 'video' ? '[视频]'
                            : msg.type === 'FILE' || msg.type === 'file' ? '[文件]'
                            : msg.content}
                        </p>
                      </div>
                      {/* 成员列表：群聊显示所有成员，私聊只显示发送者 */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {(() => {
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
                          return allMembers.map((s) => (
                            <div key={s.id} className={`flex items-center gap-1 rounded-full pl-1 pr-2 py-0.5 ${s.participated ? 'bg-gray-50' : 'bg-gray-50 opacity-40'}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 overflow-hidden ${s.participated ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                {s.avatarUrl
                                  ? <img src={s.avatarUrl} alt={s.studentId} className="w-full h-full object-cover" />
                                  : s.studentId.slice(0, 2)}
                              </div>
                              <span className={`text-[11px] ${s.participated ? 'text-gray-600' : 'text-gray-400'}`}>{s.studentId}</span>
                              {s.times > 1 && <span className="text-[10px] text-gray-400">×{s.times}</span>}
                            </div>
                          ));
                        })()}
                      </div>
                      {/* 加一个按钮 */}
                      <button
                        onClick={handlePlusOne}
                        disabled={loading}
                        className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>加一个</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // ========== 普通消息渲染 ==========
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} items-start relative group transition-colors duration-500 rounded-lg ${isMentionedMe ? 'bg-orange-50 border-l-2 border-orange-400 pl-2' : ''}`}>
                  {!isMe && (
                    <div className="w-9 h-9 rounded bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                      {msg.senderAvatarUrl ? (
                        <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-full h-full rounded object-cover" />
                      ) : (
                        <span className="text-xs">{msg.senderStudentId || '?'}</span>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%] relative`}>
                    <div className={`flex items-center gap-2 mb-1`}>
                      {isGroup && (msg.senderRole === 'OWNER' || msg.senderRole === 'ADMIN') && (
                        <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">
                          {msg.senderRole === 'OWNER' ? '群主' : '管理员'}
                        </span>
                      )}
                      {msg.senderStudentId && <span className="text-xs text-gray-500">{msg.senderStudentId}</span>}
                      <span className="text-[10px] text-gray-400">{formatMessageTime(msg.createdAt)}</span>
                    </div>

                    {/* 引用回复块 */}
                    {!msg.recalled && msg.replyToId && msg.replyToContent && (
                      <div
                        className={`${isMe ? 'bg-blue-400/50' : 'bg-gray-100'} rounded-lg px-3 py-2 mb-1 border-l-2 ${isMe ? 'border-blue-200' : 'border-gray-400'} cursor-pointer`}
                        onClick={() => {
                          const replyEl = document.getElementById(`msg-${msg.replyToId}`);
                          if (replyEl) {
                            replyEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            replyEl.classList.add('bg-yellow-50');
                            setTimeout(() => replyEl.classList.remove('bg-yellow-50'), 1500);
                          }
                        }}
                      >
                        <p className={`text-[11px] font-medium ${isMe ? 'text-blue-100' : 'text-gray-600'}`}>
                          {msg.replyToSenderStudentId || msg.replyToSenderName}
                        </p>
                        <p className={`text-[11px] ${isMe ? 'text-blue-100/80' : 'text-gray-500'} truncate`}>
                          {msg.replyToType === 'IMAGE' ? '[图片]'
                            : msg.replyToType === 'VIDEO' ? '[视频]'
                            : msg.replyToType === 'FILE' ? '[文件]'
                            : msg.replyToContent}
                        </p>
                      </div>
                    )}

                    {/* 根据消息类型渲染不同内容 */}
                    {msg.recalled ? (
                      <div className="rounded-lg p-3">
                        <p className="text-sm text-gray-400 italic">[消息已撤回]</p>
                      </div>
                    ) : (msg.type === 'IMAGE' || msg.type === 'image') ? (
                      <div className="rounded-lg overflow-hidden shadow max-w-xs">
                        <img
                          src={msg.content}
                          alt="图片"
                          className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.content, '_blank')}
                          onError={(e) => {
                            console.error('Image load error:', msg.content);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (msg.type === 'VIDEO' || msg.type === 'video') ? (
                      <div className="rounded-lg overflow-hidden shadow max-w-xs">
                        <video
                          src={msg.content}
                          controls
                          className="w-full h-auto"
                          style={{ maxHeight: '300px' }}
                        />
                      </div>
                    ) : (msg.type === 'FILE' || msg.type === 'file') ? (
                      <a
                        href={msg.content}
                        download
                        className={`${isMe ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 shadow flex items-center gap-3 hover:opacity-90 transition-opacity`}
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{msg.metadata?.fileName || '文件'}</p>
                          <p className="text-xs opacity-70">
                            {msg.metadata?.fileSize ? `${(msg.metadata.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                          </p>
                        </div>
                      </a>
                    ) : (
                      <div className={`${isMe ? 'bg-[#95ec69]' : 'bg-white'} rounded p-2.5 shadow-sm`}>
                        <p className="text-sm break-words text-gray-900">
                          {msg.content.split(/(@\S+)/g).map((part, i) =>
                            part.startsWith('@') ? (
                              <span key={i} className="font-semibold text-blue-600">{part}</span>
                            ) : part
                          )}
                        </p>
                      </div>
                    )}
                    {/* 回复按钮 */}
                    {!msg.recalled && (
                    <button
                      onClick={() => {
                        setReplyingTo(msg);
                        inputRef.current?.focus();
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity mt-1 bg-white border border-gray-300 rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm flex items-center gap-0.5 ${isMe ? 'self-end' : 'self-start'}`}
                      title="回复"
                    >
                      <Reply className="w-3 h-3" />
                      <span>回复</span>
                    </button>
                    )}
                    {/* 撤回按钮 */}
                    {!msg.recalled && (() => {
                      const msgTime = new Date(msg.createdAt).getTime();
                      const now = Date.now();
                      const fiveMin = 5 * 60 * 1000;
                      const oneHour = 60 * 60 * 1000;
                      const canRecall =
                        (isMe && (now - msgTime) <= fiveMin) ||
                        (isGroup && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (now - msgTime) <= oneHour);
                      if (!canRecall) return null;
                      return (
                        <button
                          onClick={async () => {
                            if (!confirm('确定要撤回这条消息吗？')) return;
                            try {
                              await messageApi.recallMessage(msg.id);
                            } catch (error: any) {
                              alert('撤回失败: ' + (error.response?.data?.message || error.message));
                            }
                          }}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity mt-1 bg-white border border-gray-300 rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm flex items-center gap-0.5 ${isMe ? 'self-end' : 'self-start'}`}
                          title="撤回"
                        >
                          <span>撤回</span>
                        </button>
                      );
                    })()}
                  </div>
                  {isMe && (
                    <div className="w-9 h-9 rounded bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                      {msg.senderAvatarUrl ? (
                        <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-full h-full rounded object-cover" />
                      ) : (
                        <span className="text-xs">{msg.senderStudentId || '我'}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* @提及浮标 */}
      {isGroup && mentionMessages.length > 0 && (
          <button
            onClick={() => {
              const firstMention = mentionMessages[0];
              const el = document.getElementById(`msg-${firstMention.id}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-orange-400');
                setTimeout(() => el.classList.remove('ring-2', 'ring-orange-400'), 2000);
              }
              setReadMentionIds(prev => new Set([...prev, firstMention.id]));
            }}
            className="absolute bottom-4 right-4 bg-orange-500 text-white rounded-full px-3 py-2 shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5 text-sm font-medium z-10"
          >
            <AtSign className="w-4 h-4" />
            <span>{mentionMessages.length} 条@我</span>
          </button>
      )}

      <div className="bg-[#f5f5f5] border-t border-[#e0e0e0] px-4 py-2 shrink-0">
        {/* 回复预览条 */}
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-gray-50 rounded border-l-2 border-blue-500">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-600">
                回复 {replyingTo.senderStudentId || replyingTo.senderName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {replyingTo.type === 'IMAGE' ? '[图片]'
                  : replyingTo.type === 'VIDEO' ? '[视频]'
                  : replyingTo.type === 'FILE' ? '[文件]'
                  : replyingTo.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-200 rounded shrink-0"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )}

        {/* 输入框 */}
        <div className="relative mb-2">
          {/* @成员选择器 */}
          {isGroup && showMentionSelector && (
            <MentionSelector
              members={groupMembers.filter((m: any) => m.id !== currentUserId)}
              search={mentionSearch}
              canMentionAll={currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'}
              onSelect={(member) => {
                const atText = member === null ? '@所有人 ' : `@${member.studentId || member.username} `;
                const atIdx = message.lastIndexOf('@');
                const newMsg = message.slice(0, atIdx) + atText;
                setMessage(newMsg);
                if (member === null) {
                  setIsMentionAll(true);
                } else {
                  setMentionedUsers(prev => {
                    if (prev.some(u => u.id === member.id)) return prev;
                    return [...prev, { id: member.id, studentId: member.studentId }];
                  });
                }
                setShowMentionSelector(false);
                setMentionSearch('');
                inputRef.current?.focus();
              }}
              onClose={() => { setShowMentionSelector(false); setMentionSearch(''); }}
            />
          )}
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => {
              const val = e.target.value;
              setMessage(val);
              if (isGroup) {
                const atIdx = val.lastIndexOf('@');
                if (atIdx !== -1 && (atIdx === 0 || val[atIdx - 1] === ' ')) {
                  const search = val.slice(atIdx + 1);
                  if (!search.includes(' ')) {
                    setMentionSearch(search);
                    setShowMentionSelector(true);
                    return;
                  }
                }
                setShowMentionSelector(false);
                setMentionSearch('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowMentionSelector(false);
                setMentionSearch('');
              }
              if (e.key === 'Enter' && !e.shiftKey && !showMentionSelector) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isGroup ? '输入消息，@成员...' : '输入消息...'}
            className="w-full h-[100px] px-3 py-2 bg-white border border-gray-300 rounded resize-none focus:outline-none focus:border-blue-400 text-[14px] text-gray-800"
          />
        </div>

        {/* 底部工具栏和发送按钮 */}
        <div className="flex items-center justify-between">
          {/* 左侧工具栏 */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                className="p-1.5 hover:bg-black/5 rounded transition-colors"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="表情"
              >
                <Smile className="w-5 h-5 text-gray-500" />
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
            <div className="relative">
              <button
                className="p-1.5 hover:bg-black/5 rounded transition-colors"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="文件"
              >
                <Plus className="w-5 h-5 text-gray-500" />
              </button>
              {showMoreMenu && (
                <MoreActionsPanel
                  onClose={() => setShowMoreMenu(false)}
                  onImageSelect={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleFileUpload(file, 'IMAGE');
                      }
                    };
                    input.click();
                  }}
                  onFileSelect={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '*/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleFileUpload(file, 'FILE');
                      }
                    };
                    input.click();
                  }}
                  onVideoSelect={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'video/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleFileUpload(file, 'VIDEO');
                      }
                    };
                    input.click();
                  }}
                />
              )}
            </div>
          </div>

          {/* 右侧发送按钮 */}
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="px-5 py-1.5 bg-[#07c160] text-white text-[13px] rounded hover:bg-[#06ad56] disabled:bg-[#e0e0e0] disabled:text-gray-400 transition-colors"
          >
            发送(S)
          </button>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              console.log('Selected file:', file);
              // TODO: 实现文件上传逻辑
            }
          }}
        />
      </div>

      {/* 群公告页面 */}
      {isGroup && showAnnouncement && conversationId && (
        <GroupAnnouncement
          groupId={conversationId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setShowAnnouncement(false)}
          onAnnouncementChanged={reloadLatestAnnouncement}
        />
      )}
    </div>
  );
}
