import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { conversationApi, messageApi, UserInfo } from '../services/api';

interface ChatWindowProps {
  friend: UserInfo;
  onClose: () => void;
}

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

export default function ChatWindow({ friend, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createOrGetConversation();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadMessages();

      // 设置定时器，每5秒刷新一次消息（降低轮询频率）
      const interval = setInterval(() => {
        loadMessages();
      }, 5000);

      // 清理定时器
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClose = async () => {
    // 关闭前标记所有消息为已读
    if (conversationId) {
      try {
        await conversationApi.markAsRead(conversationId);
      } catch (error) {
        console.error('Failed to mark as read on close:', error);
      }
    }
    onClose();
  };

  const createOrGetConversation = async () => {
    try {
      console.log('Creating conversation with friend:', friend.id);
      const response = await conversationApi.getOrCreatePrivateConversation(Number(friend.id));
      console.log('Conversation created:', response.data);
      setConversationId(response.data.id);
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert('创建会话失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      const response = await messageApi.getMessages(conversationId);
      const list = response.data.content || [];
      const newMessages = [...list].reverse();

      // 只在消息数量或内容变化时才更新状态
      if (JSON.stringify(newMessages) !== JSON.stringify(messages)) {
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSend = async () => {
    console.log('=== handleSend called ===');
    console.log('Message value:', message);
    console.log('Message trimmed:', message.trim());
    console.log('ConversationId:', conversationId);

    if (!message.trim()) {
      console.log('Message is empty, returning');
      return;
    }

    if (!conversationId) {
      console.log('ConversationId is null, returning');
      alert('会话ID不存在，请重新打开聊天窗口');
      return;
    }

    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    console.log('Token value:', token?.substring(0, 20) + '...');

    setLoading(true);
    try {
      const response = await messageApi.sendMessage({
        conversationId,
        content: message.trim(),
        type: 'TEXT'
      });
      console.log('Message sent successfully:', response);
      setMessage('');
      await loadMessages();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert('发送消息失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center gap-3">
        <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {friend.username.slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{friend.username}</p>
            <p className="text-xs text-gray-500">学号: {friend.studentId}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>开始聊天吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = msg.senderId !== Number(friend.id);
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 shadow`}>
                    <p className="text-sm break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
