import { useState, useEffect } from 'react';
import { Search, Bell, Users, MessageSquare } from 'lucide-react';
import FriendRequests from './FriendRequests';
import ChatWindow from './ChatWindow';
import GroupList from './GroupList';
import { friendApi, UserInfo } from '../services/api';

export default function Contacts() {
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showGroupList, setShowGroupList] = useState(false);
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<UserInfo | null>(null);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await friendApi.getFriendList();
      setFriends(response.data);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const specialItems = [
    { icon: Bell, label: '新的朋友', color: 'bg-orange-500', onClick: () => setShowFriendRequests(true) },
    { icon: Users, label: '群聊', color: 'bg-green-500', onClick: () => setShowGroupList(true) },
    { icon: MessageSquare, label: '系统通知', color: 'bg-blue-500', onClick: () => {} },
  ];

  const groupedContacts = friends.reduce((acc, friend) => {
    const firstLetter = friend.username.charAt(0).toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(friend);
    return acc;
  }, {} as Record<string, UserInfo[]>);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <button className="p-2">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">通讯录</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Special Items */}
      <div className="bg-white mt-2">
        {specialItems.map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto mt-2 bg-white">
        {loading ? (
          <div className="text-center py-10 text-gray-500">加载中...</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg mb-2">暂无好友</p>
            <p className="text-sm">添加好友开始聊天</p>
          </div>
        ) : (
          Object.entries(groupedContacts).sort().map(([section, contacts]) => (
            <div key={section}>
              <div className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium sticky top-0">
                {section}
              </div>
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedFriend(contact)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {contact.username.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{contact.username}</p>
                    <p className="text-sm text-gray-500">学号: {contact.studentId || '未设置'}</p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {showFriendRequests && <FriendRequests onClose={() => setShowFriendRequests(false)} />}
      {showGroupList && <GroupList onClose={() => setShowGroupList(false)} />}
      {selectedFriend && <ChatWindow friend={selectedFriend} onClose={() => setSelectedFriend(null)} />}
    </div>
  );
}
