import { useState } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { friendApi, UserInfo } from '../services/api';

interface AddFriendProps {
  onClose: () => void;
}

export default function AddFriend({ onClose }: AddFriendProps) {
  const [searchType, setSearchType] = useState<'studentId' | 'phone'>('studentId');
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('请输入搜索内容');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResult(null);
    setSuccess('');

    try {
      const response = await friendApi.searchUser({
        type: searchType,
        value: searchValue.trim()
      });
      setSearchResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '搜索失败，用户不存在');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;

    setLoading(true);
    setError('');

    try {
      await friendApi.sendFriendRequest(Number(searchResult.id));
      setSuccess('好友请求已发送');
      setSearchResult(null);
      setSearchValue('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">添加朋友</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search Type Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchType('studentId')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                searchType === 'studentId'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              学号搜索
            </button>
            <button
              onClick={() => setSearchType('phone')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                searchType === 'phone'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              手机号搜索
            </button>
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type={searchType === 'phone' ? 'tel' : 'text'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchType === 'studentId' ? '请输入学号' : '请输入手机号'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Search Result */}
          {searchResult && !success && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                  {searchResult.username.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{searchResult.username}</h3>
                  <p className="text-sm text-gray-600">学号: {searchResult.studentId || '未设置'}</p>
                </div>
              </div>
              <button
                onClick={handleAddFriend}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                添加好友
              </button>
            </div>
          )}

          {/* Empty State */}
          {!searchResult && !error && !loading && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">输入学号或手机号搜索用户</p>
            </div>
          )}

          {/* Loading State */}
          {loading && !searchResult && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm">搜索中...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
