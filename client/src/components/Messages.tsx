import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Search, Plus, Users, Pin, BellOff, Trash2 } from 'lucide-react';
import AddFriend from './AddFriend';
import CreateGroup from './CreateGroup';
import GlobalSearch from './GlobalSearch';
import { conversationApi, ConversationInfo } from '../services/api';

interface Props {
  onOpenChat?: (conv: ConversationInfo) => void;
  onOpenFriendChat?: (friend: { id: string; username: string; studentId: string | null; avatarUrl: string | null }) => void;
  onOpenGroupChat?: (group: { id: number; name: string }) => void;
  nameUpdates?: Record<number, string>;
}

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }
};

const ConversationItem = memo(({ conv, displayName, onClick, onContextMenu }: {
  conv: ConversationInfo;
  displayName: string;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) => (
  <div
    className={`border-b border-gray-100 px-3 py-3 hover:bg-gray-50 cursor-pointer ${conv.pinned ? 'bg-[#f5f5f5]' : 'bg-white'}`}
    onClick={onClick}
    onContextMenu={onContextMenu}
  >
    <div className="flex items-center gap-3">
      {conv.type === 'GROUP' ? (
        conv.avatarUrl ? (
          <img src={conv.avatarUrl} alt={conv.name} className="w-11 h-11 rounded object-cover shrink-0" loading="lazy" />
        ) : (
          <div className="w-11 h-11 rounded bg-gray-400 flex items-center justify-center text-white shrink-0">
            <Users className="w-6 h-6" />
          </div>
        )
      ) : (
        conv.avatarUrl ? (
          <img src={conv.avatarUrl} alt={conv.name} className="w-11 h-11 rounded object-cover shrink-0" loading="lazy" />
        ) : (
          <div className="w-11 h-11 rounded bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
            <span className="text-sm">{conv.otherStudentId || '?'}</span>
          </div>
        )
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-normal text-[15px] text-gray-900">{displayName}</span>
          <div className="flex items-center gap-1">
            {conv.pinned && <Pin className="w-3 h-3 text-gray-400" />}
            {conv.muted && <BellOff className="w-3 h-3 text-gray-400" />}
            <span className="text-xs text-gray-400">{formatTime(conv.lastMessageTime)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-gray-500 truncate">{conv.lastMessage || '暂无消息'}</p>
          {conv.unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[11px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
));

export default function Messages({ onOpenChat, onOpenFriendChat, onOpenGroupChat, nameUpdates }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; conv: ConversationInfo } | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await conversationApi.getUserConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConversationClick = useCallback(async (conv: ConversationInfo) => {
    if (conv.unreadCount > 0) {
      try {
        await conversationApi.markAsRead(conv.id);
        setConversations(prevConvs =>
          prevConvs.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
    onOpenChat?.(conv);
  }, [onOpenChat]);

  const handleContextMenu = useCallback((e: React.MouseEvent, conv: ConversationInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, conv });
  }, []);

  const handleTogglePin = useCallback(async (conv: ConversationInfo) => {
    try {
      const newPinned = !conv.pinned;
      setConversations(prevConvs => {
        const updated = prevConvs.map(c =>
          c.id === conv.id ? { ...c, pinned: newPinned } : c
        );
        updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });
        return updated;
      });
      if (newPinned) {
        await conversationApi.pinConversation(conv.id);
      } else {
        await conversationApi.unpinConversation(conv.id);
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      const response = await conversationApi.getUserConversations();
      setConversations(response.data);
    }
    setContextMenu(null);
  }, []);

  const handleToggleMute = useCallback(async (conv: ConversationInfo) => {
    try {
      const newMuted = !conv.muted;
      setConversations(prevConvs =>
        prevConvs.map(c => c.id === conv.id ? { ...c, muted: newMuted } : c)
      );
      if (newMuted) {
        await conversationApi.muteConversation(conv.id);
      } else {
        await conversationApi.unmuteConversation(conv.id);
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      const response = await conversationApi.getUserConversations();
      setConversations(response.data);
    }
    setContextMenu(null);
  }, []);

  const handleHideConversation = useCallback(async (conv: ConversationInfo) => {
    try {
      setConversations(prevConvs => prevConvs.filter(c => c.id !== conv.id));
      await conversationApi.hideConversation(conv.id);
    } catch (error) {
      console.error('Failed to hide conversation:', error);
      const response = await conversationApi.getUserConversations();
      setConversations(response.data);
    }
    setContextMenu(null);
  }, []);

  // 使用 useMemo 缓存会话列表的渲染项
  const conversationItems = useMemo(() => {
    return conversations.map((conv) => (
      <ConversationItem
        key={conv.id}
        conv={conv}
        displayName={nameUpdates?.[conv.id] || conv.name || '未命名'}
        onClick={() => handleConversationClick(conv)}
        onContextMenu={(e) => handleContextMenu(e, conv)}
      />
    ));
  }, [conversations, nameUpdates, handleConversationClick, handleContextMenu]);

  return (
    <div className="flex flex-col h-full bg-[#ebebeb]">
      {/* 搜索栏 + 操作按钮 */}
      <div className="bg-[#ebebeb] px-4 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex-1 flex items-center bg-white rounded px-3 py-2 cursor-text"
            onClick={() => setShowSearch(true)}
          >
            <Search className="w-[18px] h-[18px] text-gray-400 shrink-0" />
            <span className="ml-2 text-[15px] text-gray-400 select-none">搜索</span>
          </div>
          <div className="relative">
            <button
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 transition-colors"
              onClick={() => setShowMenu(!showMenu)}
            >
              <Plus className="w-[22px] h-[22px] text-gray-600" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => { loadConversations(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  刷新消息
                </button>
                <button
                  onClick={() => { setShowAddFriend(true); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  添加朋友
                </button>
                <button
                  onClick={() => { setShowCreateGroup(true); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  创建群聊
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-gray-500 text-center">
              <p className="text-lg mb-2">暂无消息</p>
              <p className="text-sm">添加好友或创建群组开始聊天</p>
            </div>
          </div>
        ) : (
          conversationItems
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleTogglePin(contextMenu.conv)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Pin className="w-4 h-4" />
            {contextMenu.conv.pinned ? '取消置顶' : '置顶'}
          </button>
          <button
            onClick={() => handleToggleMute(contextMenu.conv)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <BellOff className="w-4 h-4" />
            {contextMenu.conv.muted ? '取消免打扰' : '消息免打扰'}
          </button>
          <button
            onClick={() => handleHideConversation(contextMenu.conv)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-500"
          >
            <Trash2 className="w-4 h-4" />
            删除会话
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddFriend && <AddFriend onClose={() => setShowAddFriend(false)} />}
      {showCreateGroup && <CreateGroup onClose={() => setShowCreateGroup(false)} />}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} onOpenChat={onOpenFriendChat} onOpenGroupChat={onOpenGroupChat} />}
    </div>
  );
}
