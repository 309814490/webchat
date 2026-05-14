import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ChatWindowOptimized from './ChatWindowOptimized';
import { conversationApi, UserInfo } from '../services/api';

export default function Chat() {
  const { conversationId, type } = useParams<{ conversationId: string; type: 'private' | 'group' }>();
  const navigate = useNavigate();
  const [friend, setFriend] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversationInfo = async () => {
      if (!conversationId) {
        navigate('/messages');
        return;
      }

      try {
        setLoading(true);
        const conversations = await conversationApi.getUserConversations();
        const conversation = conversations.data.find(c => c.id === Number(conversationId));

        if (!conversation) {
          console.error('Conversation not found');
          navigate('/messages');
          return;
        }

        if (type === 'private') {
          const friendInfo: UserInfo = {
            id: String(conversation.otherUserId || ''),
            username: conversation.otherUsername || '',
            email: '',
            phone: null,
            studentId: conversation.otherStudentId || null,
            idCard: null,
            avatarUrl: conversation.avatarUrl || null,
            status: 'ACTIVE',
            createdAt: ''
          };
          setFriend(friendInfo);
        } else {
          const groupInfo: UserInfo = {
            id: String(conversation.id),
            username: conversation.name || '未命名群组',
            email: '',
            phone: null,
            studentId: null,
            idCard: null,
            avatarUrl: conversation.avatarUrl || null,
            status: 'ACTIVE',
            createdAt: ''
          };
          setFriend(groupInfo);
        }
      } catch (error) {
        console.error('Failed to load conversation info:', error);
        navigate('/messages');
      } finally {
        setLoading(false);
      }
    };

    loadConversationInfo();
  }, [conversationId, type, navigate]);

  const handleClose = () => {
    navigate('/messages');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!friend) {
    return null;
  }

  return (
    <ChatWindowOptimized
      friend={friend}
      onClose={handleClose}
      isGroup={type === 'group'}
    />
  );
}
