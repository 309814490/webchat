import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { friendApi, UserInfo } from '../services/api';
import ChatWindow from './ChatWindow';

interface SearchFriendsProps {
  onClose: () => void;
}

export default function SearchFriends({ onClose }: SearchFriendsProps) {
  const [searchValue, setSearchValue] = useState('');
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<UserInfo | null>(null);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (searchValue.trim()) {
      const filtered = friends.filter(f => 
        f.username.toLowerCase().includes(searchValue.toLowerCase()) ||
        f.studentId?.includes(searchValue)
      );
      setFilteredFriends(filtered);
    } else {
      setFilteredFriends(friends);
    }
  }, [searchValue, friends]);

  const loadFriends = async () => {
    try {
      const response = await friendApi.getFriendList();
      setFriends(response.data);
      setFilteredFriends(response.data);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">搜索好友</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="搜索姓名或学号"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">加载中...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-lg mb-2">未找到好友</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {friend.username.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{friend.username}</p>
                    <p className="text-sm text-gray-600">学号: {friend.studentId || '未设置'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedFriend && (
        <ChatWindow friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
      )}
    </div>
  );
}
