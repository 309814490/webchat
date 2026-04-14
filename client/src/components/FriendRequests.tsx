import { useState, useEffect } from 'react';
import { X, UserPlus, UserX } from 'lucide-react';
import { friendApi, FriendRequestInfo } from '../services/api';

interface FriendRequestsProps {
  onClose: () => void;
}

export default function FriendRequests({ onClose }: FriendRequestsProps) {
  const [requests, setRequests] = useState<FriendRequestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await friendApi.getPendingRequests();
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load requests:', error);
      setError('加载好友请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      await friendApi.acceptFriendRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.message || '接受失败');
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await friendApi.rejectFriendRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.message || '拒绝失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">好友申请</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">加载中...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-lg mb-2">暂无好友申请</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {request.fromUsername.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{request.fromUsername}</h3>
                      <p className="text-sm text-gray-600">学号: {request.fromStudentId || '未设置'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      接受
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <UserX className="w-4 h-4" />
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
