import { useState } from 'react';
import { MessageCircle, Users, User, Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Messages from './Messages';
import Contacts from './Contacts';
import Profile from './Profile';
import ChatWindowOptimized from './ChatWindowOptimized';
import { conversationApi, ConversationInfo } from '../services/api';

type TabId = 'messages' | 'contacts' | 'profile';

interface ActiveChat {
  conversationId: number;
  type: 'private' | 'group';
  friend: {
    id: string;
    username: string;
    email: string;
    phone: string | null;
    studentId: string | null;
    avatarUrl: string | null;
    status: string;
    createdAt: string;
  };
}

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('messages');
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [nameUpdates, setNameUpdates] = useState<Record<number, string>>({});

  const tabs = [
    { id: 'messages' as TabId, icon: MessageCircle, label: '消息' },
    { id: 'contacts' as TabId, icon: Users, label: '通讯录' },
    { id: 'profile' as TabId, icon: User, label: '我的' },
  ];

  const handleOpenChat = async (conv: ConversationInfo) => {
    const isGroup = conv.type === 'GROUP';
    const friend = isGroup
      ? {
          id: String(conv.id),
          username: conv.name || '未命名群组',
          email: '',
          phone: null,
          studentId: null,
          avatarUrl: conv.avatarUrl || null,
          status: 'ACTIVE',
          createdAt: '',
        }
      : {
          id: String(conv.otherUserId || ''),
          username: conv.otherUsername || '',
          email: '',
          phone: null,
          studentId: conv.otherStudentId || null,
          avatarUrl: conv.avatarUrl || null,
          status: 'ACTIVE',
          createdAt: '',
        };
    setActiveChat({ conversationId: conv.id, type: isGroup ? 'group' : 'private', friend });
  };

  const handleOpenFriendChat = async (friendInfo: { id: string; username: string; studentId: string | null; avatarUrl: string | null }) => {
    try {
      const conversations = await conversationApi.getUserConversations();
      const conv = conversations.data.find(
        c => c.type === 'PRIVATE' && String(c.otherUserId) === friendInfo.id
      );
      if (conv) {
        setActiveChat({
          conversationId: conv.id,
          type: 'private',
          friend: {
            id: friendInfo.id,
            username: friendInfo.username,
            email: '',
            phone: null,
            studentId: friendInfo.studentId,
            avatarUrl: friendInfo.avatarUrl,
            status: 'ACTIVE',
            createdAt: '',
          },
        });
        setActiveTab('messages');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* 左侧图标导航栏 (64px) */}
      <div className="w-16 bg-[#2e2e2e] flex flex-col items-center py-3 shrink-0">
        {/* 头像 */}
        <div className="mb-4">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="me" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {(user?.studentId || 'U').slice(0, 2)}
            </div>
          )}
        </div>

        {/* 主导航 */}
        <div className="flex flex-col items-center gap-1 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* 底部设置/退出 */}
        <button
          onClick={logout}
          title="退出登录"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 中间内容栏 (320px) */}
      <div className="w-[320px] border-r border-gray-200 shrink-0 overflow-hidden">
        {activeTab === 'messages' && (
          <Messages onOpenChat={handleOpenChat} nameUpdates={nameUpdates} />
        )}
        {activeTab === 'contacts' && (
          <Contacts onOpenChat={handleOpenFriendChat} />
        )}
        {activeTab === 'profile' && (
          <Profile />
        )}
      </div>

      {/* 右侧聊天区 */}
      <div className="flex-1 overflow-hidden">
        {activeChat ? (
          <ChatWindowOptimized
            key={activeChat.conversationId}
            friend={activeChat.friend}
            onClose={() => setActiveChat(null)}
            isGroup={activeChat.type === 'group'}
            onConversationUpdated={(newName) => {
              if (newName) {
                setNameUpdates(prev => ({ ...prev, [activeChat.conversationId]: newName }));
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400 select-none">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm">选择一个会话开始聊天</p>
          </div>
        )}
      </div>
    </div>
  );
}
