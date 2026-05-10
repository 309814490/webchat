import { useState } from 'react';
import { ArrowLeft, Camera, ChevronRight, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { userApi, fileApi } from '../services/api';

interface Props {
  onClose: () => void;
}

export default function ProfileEdit({ onClose }: Props) {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await fileApi.uploadFile(file, 'AVATAR');
      const avatarUrl = res.data.url;
      const profileRes = await userApi.updateProfile({ avatarUrl });
      setUser({ ...user!, avatarUrl: profileRes.data.avatarUrl });
      setMessage('头像更新成功');
    } catch (err: any) {
      setMessage(err.response?.data?.message || '头像上传失败');
    }
  };

  const handleResetAvatar = async () => {
    try {
      const profileRes = await userApi.updateProfile({ avatarUrl: '' });
      setUser({ ...user!, avatarUrl: profileRes.data.avatarUrl });
      setMessage('头像已重置');
    } catch (err: any) {
      setMessage(err.response?.data?.message || '重置失败');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await userApi.updateProfile({ username, phone });
      setUser({ ...user!, username: res.data.username, phone: res.data.phone });
      setMessage('保存成功');
    } catch (err: any) {
      setMessage(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage('两次输入的密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('新密码至少6位');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await userApi.updatePassword({ oldPassword, newPassword });
      setMessage('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      setMessage(err.response?.data?.message || '密码修改失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">个人信息</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar */}
        <div className="bg-white mt-2 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">头像</span>
            <div className="flex items-center gap-2">
              {user?.avatarUrl && (
                <button
                  onClick={handleResetAvatar}
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                  title="重置头像"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <label className="cursor-pointer flex items-center gap-2">
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {(user?.studentId || 'U').slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
          </div>
        </div>

        {/* Info fields */}
        <div className="bg-white mt-2 divide-y divide-gray-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-700">学号</span>
            <span className="text-gray-500">{user?.studentId || '未设置'}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-700">身份证</span>
            <span className="text-gray-500">
              {user?.idCard
                ? user.idCard.slice(0, 4) + '**********' + user.idCard.slice(-4)
                : '未设置'}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-700">姓名</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="text-right text-gray-900 bg-transparent outline-none w-40"
              placeholder="请输入姓名"
            />
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-700">手机号</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="text-right text-gray-900 bg-transparent outline-none w-40"
              placeholder="请输入手机号"
            />
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-700">邮箱</span>
            <span className="text-gray-500">{user?.email || '未设置'}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-700">注册时间</span>
            <span className="text-gray-500">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知'}</span>
          </div>
        </div>

        {/* Save button */}
        <div className="px-4 mt-4">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>

        {/* Password section */}
        <div className="bg-white mt-4">
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-gray-700">修改密码</span>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
          </button>
          {showPasswordForm && (
            <div className="px-4 pb-4 space-y-3">
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="当前密码"
                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="新密码（至少6位）"
                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="确认新密码"
                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={handleChangePassword}
                disabled={saving || !oldPassword || !newPassword || !confirmPassword}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300"
              >
                确认修改密码
              </button>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm text-center ${message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
