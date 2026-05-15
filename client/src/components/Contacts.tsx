import { useState, useEffect } from 'react';
import { Search, Bell, Users, Ban } from 'lucide-react';
import { friendApi, UserInfo } from '../services/api';

interface FriendWithRemark {
  id: number;
  username: string;
  studentId: string | null;
  avatarUrl: string | null;
  remark: string;
}

interface Props {
  onOpenChat?: (friend: { id: string; username: string; studentId: string | null; avatarUrl: string | null }) => void;
  onOpenFriendRequests?: () => void;
  onOpenGroupList?: () => void;
}

export default function Contacts({ onOpenChat, onOpenFriendRequests, onOpenGroupList }: Props) {
  const [friends, setFriends] = useState<FriendWithRemark[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; friend: FriendWithRemark } | null>(null);
  const [remarkModal, setRemarkModal] = useState<{ friend: FriendWithRemark; value: string } | null>(null);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blacklist, setBlacklist] = useState<UserInfo[]>([]);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await friendApi.getFriendList();
      setFriends(response.data as any);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };
/* PLACEHOLDER_CONTACTS_CONTINUE */

  const handleContextMenu = (e: React.MouseEvent, friend: FriendWithRemark) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, friend });
  };

  const handleUpdateRemark = async () => {
    if (!remarkModal) return;
    try {
      await friendApi.updateRemark(remarkModal.friend.id, remarkModal.value);
      setFriends(prev => prev.map(f =>
        f.id === remarkModal.friend.id ? { ...f, remark: remarkModal.value } : f
      ));
      setRemarkModal(null);
    } catch (error) {
      console.error('Failed to update remark:', error);
    }
  };

  const handleDeleteFriend = async (friend: FriendWithRemark) => {
    if (!confirm(`确定要删除好友 ${friend.remark || friend.username} 吗？`)) return;
    try {
      await friendApi.deleteFriend(friend.id);
      setFriends(prev => prev.filter(f => f.id !== friend.id));
    } catch (error) {
      console.error('Failed to delete friend:', error);
    }
    setContextMenu(null);
  };

  const handleBlockUser = async (friend: FriendWithRemark) => {
    if (!confirm(`确定要拉黑 ${friend.remark || friend.username} 吗？拉黑后将自动删除好友关系。`)) return;
    try {
      await friendApi.blockUser(friend.id);
      setFriends(prev => prev.filter(f => f.id !== friend.id));
    } catch (error) {
      console.error('Failed to block user:', error);
    }
    setContextMenu(null);
  };

  const loadBlacklist = async () => {
    try {
      const response = await friendApi.getBlacklist();
      setBlacklist(response.data);
      setShowBlacklist(true);
    } catch (error) {
      console.error('Failed to load blacklist:', error);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await friendApi.unblockUser(Number(userId));
      setBlacklist(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  };

  const specialItems = [
    { icon: Bell, label: '新的朋友', color: 'bg-orange-500', onClick: () => onOpenFriendRequests?.() },
    { icon: Users, label: '群聊', color: 'bg-green-500', onClick: () => onOpenGroupList?.() },
    { icon: Ban, label: '黑名单', color: 'bg-gray-600', onClick: loadBlacklist },
  ];

  const getDisplayName = (friend: FriendWithRemark) => friend.remark || friend.username;

  const groupedContacts = friends.reduce((acc, friend) => {
    const name = getDisplayName(friend);
    const firstLetter = name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(friend);
    return acc;
  }, {} as Record<string, FriendWithRemark[]>);
/* PLACEHOLDER_CONTACTS_RENDER */

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
                  onClick={() => onOpenChat?.({ id: String(contact.id), username: contact.username, studentId: contact.studentId, avatarUrl: contact.avatarUrl })}
                  onContextMenu={(e) => handleContextMenu(e, contact)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {contact.username.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-gray-900">{getDisplayName(contact)}</p>
                    <p className="text-sm text-gray-500">学号: {contact.studentId || '未设置'}</p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { setRemarkModal({ friend: contextMenu.friend, value: contextMenu.friend.remark || '' }); setContextMenu(null); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            设置备注
          </button>
          <button
            onClick={() => handleDeleteFriend(contextMenu.friend)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-500"
          >
            删除好友
          </button>
          <button
            onClick={() => handleBlockUser(contextMenu.friend)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-500"
          >
            加入黑名单
          </button>
        </div>
      )}

      {/* Remark Modal */}
      {remarkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">设置备注</h3>
            <input
              type="text"
              value={remarkModal.value}
              onChange={(e) => setRemarkModal({ ...remarkModal, value: e.target.value })}
              placeholder="输入备注名"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              maxLength={50}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRemarkModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
              <button onClick={handleUpdateRemark} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">黑名单</h3>
            <div className="flex-1 overflow-y-auto">
              {blacklist.length === 0 ? (
                <p className="text-center text-gray-500 py-4">黑名单为空</p>
              ) : (
                blacklist.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b">
                    <span>{user.username}</span>
                    <button
                      onClick={() => handleUnblock(user.id)}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      移除
                    </button>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowBlacklist(false)} className="mt-4 w-full py-2 bg-gray-100 rounded hover:bg-gray-200">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
