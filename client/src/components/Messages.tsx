import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users } from 'lucide-react';
import AddFriend from './AddFriend';
import CreateGroup from './CreateGroup';
import SearchFriends from './SearchFriends';
import { conversationApi, ConversationInfo } from '../services/api';

export default function Messages() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mention'>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await conversationApi.getUserConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'unread') return conv.unreadCount > 0;
    if (activeTab === 'mention') return false; // TODO: implement mention filter
    return true;
  });

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

  const handleConversationClick = async (conv: ConversationInfo) => {
    // 标记会话为已读
    if (conv.unreadCount > 0) {
      try {
        await conversationApi.markAsRead(conv.id);
        // 立即更新本地状态，清除未读数量
        setConversations(prevConvs =>
          prevConvs.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // 跳转到聊天页面
    const type = conv.type === 'PRIVATE' ? 'private' : 'group';
    navigate(`/chat/${type}/${conv.id}`);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <button className="p-2" onClick={() => setShowSearch(true)}>
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">消息</h1>
          <div className="relative">
            <button
              className="p-2"
              onClick={() => setShowMenu(!showMenu)}
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                <button
                  onClick={() => { loadConversations(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  更新消息
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
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">扫一扫</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 py-2 flex gap-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
        >
          所有
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'unread' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
        >
          未读
        </button>
        <button
          onClick={() => setActiveTab('mention')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'mention' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
        >
          @我
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-gray-500 text-center">
              <p className="text-lg mb-2">暂无消息</p>
              <p className="text-sm">添加好友或创建群组开始聊天</p>
            </div>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className="bg-white border-b border-gray-100 px-4 py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleConversationClick(conv)}
            >
              <div className="flex items-center gap-3">
                {conv.type === 'GROUP' ? (
                  conv.avatarUrl ? (
                    <img src={conv.avatarUrl} alt={conv.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center text-white shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                  )
                ) : (
                  conv.avatarUrl ? (
                    <img src={conv.avatarUrl} alt={conv.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                      <span className="text-sm">{conv.otherStudentId || '?'}</span>
                    </div>
                  )
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{conv.name || '未命名'}</span>
                    <span className="text-xs text-gray-500">{formatTime(conv.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage || '暂无消息'}</p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 shrink-0">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showAddFriend && <AddFriend onClose={() => setShowAddFriend(false)} />}
      {showCreateGroup && <CreateGroup onClose={() => setShowCreateGroup(false)} />}
      {showSearch && <SearchFriends onClose={() => setShowSearch(false)} />}
    </div>
  );
}
