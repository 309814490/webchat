import { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { friendApi, groupApi, UserInfo } from '../services/api';

interface CreateGroupProps {
  onClose: () => void;
}

export default function CreateGroup({ onClose }: CreateGroupProps) {
  const [step, setStep] = useState<'select' | 'info'>('select');
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<number>>(new Set());
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const response = await friendApi.getFriendList();
      setFriends(response.data);
    } catch (error) {
      console.error('Failed to load friends:', error);
      setError('加载好友列表失败');
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleFriend = (friendId: number) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleNext = () => {
    if (selectedFriends.size === 0) {
      setError('请至少选择一个成员');
      return;
    }
    setError('');
    setStep('info');
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('请输入群组名称');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await groupApi.createGroup({
        name: groupName,
        memberIds: Array.from(selectedFriends).map(id => Number(id))
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {step === 'select' ? '选择成员' : '群组信息'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' ? (
            <div className="space-y-2">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  已选择 <span className="font-semibold">{selectedFriends.size}</span> 人
                </p>
              </div>

              {loadingFriends ? (
                <div className="text-center py-10 text-gray-500">加载好友列表中...</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-lg mb-2">暂无好友</p>
                  <p className="text-sm">请先添加好友</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriend(Number(friend.id))}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFriends.has(Number(friend.id))
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                      {friend.username.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{friend.username}</p>
                      <p className="text-sm text-gray-600">学号: {friend.studentId || '未设置'}</p>
                    </div>
                    {selectedFriends.has(Number(friend.id)) && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">群组名称</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="请输入群组名称"
                  maxLength={30}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">{groupName.length}/30</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  群组成员 ({selectedFriends.size + 1}人)
                </label>
                <div className="flex flex-wrap gap-2">
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">我</div>
                  {Array.from(selectedFriends).map((friendId) => {
                    const friend = friends.find(f => Number(f.id) === friendId);
                    return friend ? (
                      <div key={friendId} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        {friend.username}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 shrink-0">
          {step === 'select' ? (
            <button
              onClick={handleNext}
              disabled={loadingFriends || friends.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              下一步
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {loading ? '创建中...' : '创建群组'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
