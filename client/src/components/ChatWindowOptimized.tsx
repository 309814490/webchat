import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Mic, Smile, Plus, Reply, X, AtSign, MoreHorizontal } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { conversationApi, messageApi, fileApi, UserInfo } from '../services/api';
import EmojiPicker from './EmojiPicker';
import MoreActionsPanel from './MoreActionsPanel';
import MentionSelector from './MentionSelector';
import GroupInfo from './GroupInfo';

interface ChatWindowProps {
  friend: UserInfo;
  onClose: () => void;
  isGroup?: boolean; // 标识是否为群聊
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

export default function ChatWindowOptimized({ friend, onClose, isGroup = false }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showMentionSelector, setShowMentionSelector] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<{ id: number; studentId: string }[]>([]);
  const [isMentionAll, setIsMentionAll] = useState(false);
  const [readMentionIds, setReadMentionIds] = useState<Set<number>>(new Set());
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 计算当前用户在群组中的角色
  const currentUserRole = useMemo(() => {
    if (!isGroup || !currentUserId || groupMembers.length === 0) return 'MEMBER';
    const me = groupMembers.find((m: any) => m.id === currentUserId);
    return me?.role || 'MEMBER';
  }, [isGroup, currentUserId, groupMembers]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      const response = await messageApi.getMessages(conversationId);
      const list = response.data.content || [];
      setMessages([...list].reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

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

  const handleClose = async () => {
    if (conversationId) {
      try {
        await conversationApi.markAsRead(conversationId);
      } catch (error) {
        console.error('Failed to mark as read on close:', error);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* 头部 - 标题居中显示 */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        {/* 左侧返回按钮 */}
        <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* 中间标题 */}
        <div className="flex-1 flex justify-center">
          <p className="text-lg font-semibold text-gray-900">
            {isGroup
              ? `${friend.username}（${memberCount}）`
              : friend.studentId
            }
          </p>
        </div>

        {/* 右侧：群聊显示"..."按钮，私聊占位 */}
        {isGroup ? (
          <button
            onClick={() => setShowGroupInfo(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 relative">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>开始聊天吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              // 全局分组：相同 content+type 的消息（不限连续）≥3条时折叠
              // 折叠卡片显示在该组最后一条消息的位置
              type GroupMeta = {
                isFirst: boolean; skip: boolean; count: number;
                senders: { id: number; studentId: string; avatarUrl: string; times: number }[];
              };
              const groupMeta: GroupMeta[] = messages.map(() => ({
                isFirst: false, skip: false, count: 0, senders: []
              }));
              // 按 content+type 分组，收集索引
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
                // 最后一条消息处显示折叠卡片
                groupMeta[lastIdx] = { isFirst: true, skip: false, count: indices.length, senders };
                // 其余位置跳过
                for (const idx of indices) {
                  if (idx !== lastIdx) {
                    groupMeta[idx] = { isFirst: false, skip: true, count: indices.length, senders };
                  }
                }
              }

              return messages.map((msg, idx) => {
              const meta = groupMeta[idx];
              if (meta.skip) return null;

              const isMe = currentUserId ? msg.senderId === currentUserId : false;

              // 检查当前用户是否被@
              const isMentionedMe = !isMe && currentUserId != null && (
                msg.mentionAll === true ||
                (msg.mentionedUserIds && msg.mentionedUserIds.includes(currentUserId))
              );

              const formatTime = (timeStr: string) => {
                const date = new Date(timeStr);
                const now = new Date();
                const diff = now.getTime() - date.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                if (days === 1) return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' +
                       date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
              };

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
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                      {msg.senderAvatarUrl ? (
                        <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm">{msg.senderStudentId || '?'}</span>
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
                      <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
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
                      <div className={`${isMe ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 shadow`}>
                        <p className="text-sm break-words">
                          {msg.content.split(/(@\S+)/g).map((part, i) =>
                            part.startsWith('@') ? (
                              <span key={i} className={`font-semibold ${isMe ? 'text-blue-100' : 'text-blue-600'}`}>{part}</span>
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
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                      {msg.senderAvatarUrl ? (
                        <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm">{msg.senderStudentId || '我'}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            });
            })()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* @提及浮标 */}
      {isGroup && (() => {
        const mentionMsgs = messages.filter(m =>
          m.senderId !== currentUserId && (
            m.mentionAll === true ||
            (m.mentionedUserIds && currentUserId != null && m.mentionedUserIds.includes(currentUserId))
          ) && !readMentionIds.has(m.id)
        );
        if (mentionMsgs.length === 0) return null;
        return (
          <button
            onClick={() => {
              const firstMention = mentionMsgs[0];
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
            <span>{mentionMsgs.length} 条@我</span>
          </button>
        );
      })()}

      <div className="bg-white border-t border-gray-200 p-3">
        {/* 回复预览条 */}
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-2 py-2 bg-gray-50 rounded-lg border-l-2 border-blue-500">
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
              className="p-1 hover:bg-gray-200 rounded-full shrink-0"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* 左侧：语音/键盘切换按钮 */}
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            title={isVoiceMode ? "切换到键盘" : "切换到语音"}
          >
            <Mic className={`w-6 h-6 ${isVoiceMode ? 'text-blue-600' : 'text-gray-600'}`} />
          </button>

          {/* 中间：输入框或语音按钮 */}
          {isVoiceMode ? (
            <button
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
              onMouseDown={() => console.log('开始录音')}
              onMouseUp={() => console.log('结束录音')}
              onTouchStart={() => console.log('开始录音')}
              onTouchEnd={() => console.log('结束录音')}
            >
              按住 说话
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2 relative">
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
                    // 记录被@的用户
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
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => {
                  const val = e.target.value;
                  setMessage(val);
                  // 检测@触发
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
                  if (e.key === 'Enter' && !e.shiftKey && !showMentionSelector) handleSend();
                }}
                placeholder={isGroup ? '输入消息，@成员...' : '输入消息...'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {message.trim() && (
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors shrink-0"
                >
                  发送
                </button>
              )}
            </div>
          )}

          {/* 右侧：表情和+按钮 */}
          {!isVoiceMode && !message.trim() && (
            <>
              <div className="relative">
                <button
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="表情"
                >
                  <Smile className="w-6 h-6 text-gray-600" />
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
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  title="更多"
                >
                  <Plus className="w-6 h-6 text-gray-600" />
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
            </>
          )}
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

      {/* 群聊信息页面 */}
      {isGroup && showGroupInfo && conversationId && (
        <GroupInfo
          conversationId={conversationId}
          groupName={friend.username}
          memberCount={memberCount}
          groupMembers={groupMembers}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setShowGroupInfo(false)}
          onMembersUpdated={reloadGroupMembers}
        />
      )}
    </div>
  );
}
