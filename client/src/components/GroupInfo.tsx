import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Plus, Minus, Users, LogOut, Trash2 } from 'lucide-react';
import { groupApi, friendApi, UserInfo, conversationApi } from '../services/api';
import GroupQRCode from './GroupQRCode';

interface GroupInfoProps {
  conversationId: number;
  groupName: string;
  memberCount: number;
  groupMembers: any[];
  currentUserId: number | null;
  currentUserRole: string;
  onClose: () => void;
  onMembersUpdated: () => void;
  onGroupNameUpdated?: (newName: string) => void;
}

export default function GroupInfo({
  conversationId,
  groupName,
  memberCount,
  groupMembers,
  currentUserId,
  currentUserRole,
  onClose,
  onMembersUpdated,
  onGroupNameUpdated,
}: GroupInfoProps) {
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [announcement, setAnnouncement] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [remark, setRemark] = useState('');
  const [editingRemark, setEditingRemark] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [removingMode, setRemovingMode] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<number>>(new Set());
  const [groupSettings, setGroupSettings] = useState({ allowMemberAddFriend: false, allowMemberViewProfile: false });

  const isAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const isOwner = currentUserRole === 'OWNER';
  const displayMembers = showAllMembers ? groupMembers : groupMembers.slice(0, 19);

  useEffect(() => {
    loadAnnouncement();
    loadGroupSettings();
    const saved = localStorage.getItem(`group_remark_${conversationId}`);
    if (saved) setRemark(saved);
  }, [conversationId]);

  const loadAnnouncement = async () => {
    try {
      const res = await groupApi.getGroupAnnouncement(conversationId);
      setAnnouncement(res.data.announcement || '');
    } catch {
      // No announcement set yet
    }
  };

  const loadGroupSettings = async () => {
    try {
      const res = await conversationApi.getGroupSettings(conversationId);
      setGroupSettings(res.data);
    } catch {
      // Use defaults
    }
  };

  const handleUpdateName = async () => {
    if (!newGroupName.trim() || newGroupName === groupName) {
      setEditingName(false);
      return;
    }
    setLoading(true);
    try {
      await groupApi.updateGroupName(conversationId, newGroupName.trim());
      setEditingName(false);
      onGroupNameUpdated?.(newGroupName.trim());
      onMembersUpdated();
    } catch (error: any) {
      alert('修改群名失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAnnouncement = async () => {
    setLoading(true);
    try {
      await groupApi.updateGroupAnnouncement(conversationId, newAnnouncement.trim());
      setAnnouncement(newAnnouncement.trim());
      setEditingAnnouncement(false);
    } catch (error: any) {
      alert('修改群公告失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRemark = () => {
    localStorage.setItem(`group_remark_${conversationId}`, newRemark.trim());
    setRemark(newRemark.trim());
    setEditingRemark(false);
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('确定要移除该成员吗？')) return;
    setLoading(true);
    try {
      await groupApi.removeMember(conversationId, userId);
      onMembersUpdated();
    } catch (error: any) {
      alert('移除成员失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedFriends.size === 0) return;
    setLoading(true);
    try {
      await groupApi.addMembers(conversationId, Array.from(selectedFriends));
      setShowAddMember(false);
      setSelectedFriends(new Set());
      onMembersUpdated();
    } catch (error: any) {
      alert('添加成员失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await friendApi.getFriendList();
      setFriends(res.data);
    } catch {
      // ignore
    }
  };

  const handleSetAdmin = async (userId: number) => {
    try {
      await groupApi.setAdmin(conversationId, userId);
      onMembersUpdated();
    } catch (error: any) {
      alert('设置管理员失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    try {
      await groupApi.removeAdmin(conversationId, userId);
      onMembersUpdated();
    } catch (error: any) {
      alert('取消管理员失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleTransferOwner = async (userId: number) => {
    if (!confirm('确定要转让群主给该成员吗？此操作不可撤销。')) return;
    try {
      await groupApi.transferOwner(conversationId, userId);
      onMembersUpdated();
    } catch (error: any) {
      alert('转让群主失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('确定要退出该群组吗？')) return;
    setLoading(true);
    try {
      await groupApi.leaveGroup(conversationId);
      alert('已退出群组');
      onClose();
      window.location.reload();
    } catch (error: any) {
      alert('退出群组失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDissolveGroup = async () => {
    if (!confirm('确定要解散该群组吗？此操作不可撤销，所有成员都将被移除。')) return;
    setLoading(true);
    try {
      await groupApi.dissolveGroup(conversationId);
      alert('群组已解散');
      onClose();
      window.location.reload();
    } catch (error: any) {
      alert('解散群组失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroupSettings = async (field: 'allowMemberAddFriend' | 'allowMemberViewProfile', value: boolean) => {
    setLoading(true);
    try {
      await groupApi.updateGroupSettings(conversationId, { [field]: value });
      setGroupSettings(prev => ({ ...prev, [field]: value }));
    } catch (error: any) {
      alert('更新群设置失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // QR Code modal
  if (showQRCode) {
    return <GroupQRCode conversationId={conversationId} groupName={groupName} onClose={() => setShowQRCode(false)} />;
  }

  // Add member modal
  if (showAddMember) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <button onClick={() => { setShowAddMember(false); setSelectedFriends(new Set()); }} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-lg font-semibold text-gray-900">添加成员</p>
          <button
            onClick={handleAddMembers}
            disabled={selectedFriends.size === 0 || loading}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:bg-gray-300"
          >
            确定({selectedFriends.size})
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {friends.length === 0 ? (
            <p className="text-center text-gray-500 py-10">暂无可添加的好友</p>
          ) : (
            friends
              .filter(f => !groupMembers.some(m => m.id === Number(f.id)))
              .map(f => {
                const fId = Number(f.id);
                const selected = selectedFriends.has(fId);
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      const next = new Set(selectedFriends);
                      if (selected) next.delete(fId); else next.add(fId);
                      setSelectedFriends(next);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selected ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden">
                      {f.avatarUrl ? <img src={f.avatarUrl} className="w-full h-full object-cover" loading="lazy" /> : f.username.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{f.username}</p>
                      <p className="text-sm text-gray-600">{f.studentId || ''}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {selected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    );
  }

  // Group management page (owner only)
  if (showGroupManagement) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <button onClick={() => setShowGroupManagement(false)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-lg font-semibold text-gray-900">群管理</p>
          <div className="w-9" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Transfer ownership */}
          {isOwner && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">群主转让</h3>
              <div className="space-y-2">
                {groupMembers.filter(m => m.id !== currentUserId).map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden">
                      {m.avatarUrl ? <img src={m.avatarUrl} className="w-full h-full object-cover" loading="lazy" /> : (m.studentId || m.username || '?').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.username || m.studentId}</p>
                      <p className="text-xs text-gray-500">
                        {m.role === 'ADMIN' ? '管理员' : '成员'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTransferOwner(m.id)}
                      className="px-3 py-1 text-xs bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"
                    >
                      转让
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin management */}
          {isOwner && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">管理员设置</h3>
              <div className="space-y-2">
                {groupMembers.filter(m => m.id !== currentUserId).map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden">
                      {m.avatarUrl ? <img src={m.avatarUrl} className="w-full h-full object-cover" loading="lazy" /> : (m.studentId || m.username || '?').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.username || m.studentId}</p>
                      <p className="text-xs text-gray-500">{m.studentId || ''}</p>
                    </div>
                    {m.role === 'ADMIN' ? (
                      <button
                        onClick={() => handleRemoveAdmin(m.id)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        取消管理员
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetAdmin(m.id)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        设为管理员
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          {isAdmin && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">隐私设置</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">允许群成员互相添加好友</p>
                    <p className="text-xs text-gray-500 mt-1">关闭后，只有管理员和群主可以添加其他成员为好友</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={groupSettings.allowMemberAddFriend}
                      onChange={(e) => handleUpdateGroupSettings('allowMemberAddFriend', e.target.checked)}
                      disabled={loading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">允许群成员查看其他成员信息</p>
                    <p className="text-xs text-gray-500 mt-1">关闭后，普通成员无法查看其他成员的详细信息</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={groupSettings.allowMemberViewProfile}
                      onChange={(e) => handleUpdateGroupSettings('allowMemberViewProfile', e.target.checked)}
                      disabled={loading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Editing name modal
  if (editingName) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <button onClick={() => { setEditingName(false); setNewGroupName(groupName); }} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-lg font-semibold text-gray-900">修改群名称</p>
          <button onClick={handleUpdateName} disabled={loading} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:bg-gray-300">
            保存
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            maxLength={30}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入群名称"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-2">{newGroupName.length}/30</p>
        </div>
      </div>
    );
  }

  // Editing announcement modal
  if (editingAnnouncement) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <button onClick={() => { setEditingAnnouncement(false); setNewAnnouncement(announcement); }} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-lg font-semibold text-gray-900">群公告</p>
          {isAdmin && (
            <button onClick={handleUpdateAnnouncement} disabled={loading} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:bg-gray-300">
              保存
            </button>
          )}
          {!isAdmin && <div className="w-9" />}
        </div>
        <div className="p-4">
          {isAdmin ? (
            <textarea
              value={newAnnouncement}
              onChange={e => setNewAnnouncement(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-none"
              placeholder="请输入群公告"
              autoFocus
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg min-h-[200px]">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement || '暂无群公告'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Editing remark modal
  if (editingRemark) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <button onClick={() => { setEditingRemark(false); setNewRemark(remark); }} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-lg font-semibold text-gray-900">备注</p>
          <button onClick={handleSaveRemark} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg">
            保存
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={newRemark}
            onChange={e => setNewRemark(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入备注"
            autoFocus
          />
        </div>
      </div>
    );
  }

  // Main group info page
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <p className="text-lg font-semibold text-gray-900">
          群管理({memberCount})
        </p>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Member Grid */}
        <div className="bg-white p-4 mb-2">
          <div className="grid grid-cols-5 gap-3">
            {displayMembers.map(member => (
              <div key={member.id} className="flex flex-col items-center relative">
                {/* Remove badge for admin mode */}
                {removingMode && member.id !== currentUserId && (
                  (() => {
                    // Owner can remove anyone; Admin can only remove MEMBERs
                    const canRemove = isOwner || (currentUserRole === 'ADMIN' && member.role === 'MEMBER');
                    if (!canRemove) return null;
                    return (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10"
                      >
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                    );
                  })()
                )}
                <div className="w-12 h-12 rounded-md bg-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.username} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-sm">{(member.studentId || member.username || '?').slice(0, 2)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                  {member.studentId || member.username}
                </p>
                {(member.role === 'OWNER' || member.role === 'ADMIN') && (
                  <span className="text-[10px] text-orange-500">
                    {member.role === 'OWNER' ? '群主' : '管理员'}
                  </span>
                )}
              </div>
            ))}

            {/* Add member button */}
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => { setShowAddMember(true); loadFriends(); }}
            >
              <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">添加</p>
            </div>

            {/* Remove member button (admin/owner only) */}
            {isAdmin && (
              <div
                className="flex flex-col items-center cursor-pointer"
                onClick={() => setRemovingMode(!removingMode)}
              >
                <div className={`w-12 h-12 rounded-md border-2 border-dashed flex items-center justify-center transition-colors ${removingMode ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-red-400 hover:bg-red-50'}`}>
                  <Minus className={`w-6 h-6 ${removingMode ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
                <p className={`text-xs mt-1 ${removingMode ? 'text-red-500' : 'text-gray-400'}`}>
                  {removingMode ? '完成' : '删除'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* More members button */}
        {groupMembers.length > 19 && (
          <div
            className="bg-white px-4 py-3 mb-2 flex items-center justify-between cursor-pointer active:bg-gray-50"
            onClick={() => setShowAllMembers(!showAllMembers)}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {showAllMembers ? '收起群成员' : `更多群成员（共${memberCount}人）`}
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showAllMembers ? 'rotate-90' : ''}`} />
          </div>
        )}

        {/* Settings Section */}
        <div className="bg-white mb-2">
          {/* Group name */}
          <div
            className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 cursor-pointer active:bg-gray-50"
            onClick={() => { setNewGroupName(groupName); setEditingName(true); }}
          >
            <span className="text-sm text-gray-700">群聊名称</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-400 max-w-[200px] truncate">{groupName}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Group QR code */}
          <div
            className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 cursor-pointer active:bg-gray-50"
            onClick={() => setShowQRCode(true)}
          >
            <span className="text-sm text-gray-700">群二维码</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="3" height="3" />
                <rect x="18" y="18" width="3" height="3" />
              </svg>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Group management (admin/owner only) */}
          {isAdmin && (
            <div
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer active:bg-gray-50"
              onClick={() => setShowGroupManagement(true)}
            >
              <span className="text-sm text-gray-700">群管理</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>

        {/* Exit/Dissolve Group Section */}
        <div className="bg-white mb-2">
          {/* Exit Group - visible to all members except owner */}
          {!isOwner && (
            <button
              onClick={handleLeaveGroup}
              disabled={loading}
              className="w-full px-4 py-3.5 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 active:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">退出群组</span>
            </button>
          )}

          {/* Dissolve Group - visible to admin/owner */}
          {isAdmin && (
            <button
              onClick={handleDissolveGroup}
              disabled={loading}
              className="w-full px-4 py-3.5 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 active:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-100"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">解散群组</span>
            </button>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
