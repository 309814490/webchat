import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { groupApi } from '../services/api';

interface GroupAnnouncementProps {
  groupId: number;
  onClose: () => void;
  currentUserId: number;
  currentUserRole?: string; // OWNER, ADMIN, MEMBER
  onAnnouncementChanged?: () => void;
}

interface Announcement {
  id: number;
  groupId: number;
  content: string;
  createdAt: string;
  creatorId: number;
  creatorName?: string;
  creatorStudentId?: string;
}

export default function GroupAnnouncement({ groupId, onClose, currentUserId, currentUserRole, onAnnouncementChanged }: GroupAnnouncementProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContent, setNewContent] = useState('');

  const canManageAnnouncement = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  useEffect(() => {
    loadAnnouncements();
  }, [groupId]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await groupApi.getAnnouncements(groupId);
      setAnnouncements(response.data || []);
    } catch (error: any) {
      console.error('加载公告失败:', error);
      alert('加载公告失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newContent.trim()) {
      alert('公告内容不能为空');
      return;
    }

    try {
      setLoading(true);
      await groupApi.createAnnouncement(groupId, newContent.trim());
      setNewContent('');
      setShowCreateForm(false);
      await loadAnnouncements();
      onAnnouncementChanged?.();
      alert('公告发布成功');
    } catch (error: any) {
      console.error('发布公告失败:', error);
      alert('发布公告失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (announcementId: number) => {
    if (!confirm('确定要删除这条公告吗？')) {
      return;
    }

    try {
      setLoading(true);
      await groupApi.deleteAnnouncement(groupId, announcementId);
      await loadAnnouncements();
      onAnnouncementChanged?.();
      alert('公告已删除');
    } catch (error: any) {
      console.error('删除公告失败:', error);
      alert('删除公告失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return days + '天前';
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* 公告面板 */}
      <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-xl z-50 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">群公告</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 发布按钮 */}
        {canManageAnnouncement && !showCreateForm && (
          <div className="px-5 py-3 border-b border-gray-200">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1677ff] text-white rounded hover:bg-[#0958d9] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>发布公告</span>
            </button>
          </div>
        )}

        {/* 发布表单 */}
        {showCreateForm && (
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="输入公告内容..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded resize-none focus:outline-none focus:border-blue-400 text-sm"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewContent('');
                }}
                className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !newContent.trim()}
                className="px-4 py-1.5 text-sm bg-[#1677ff] text-white rounded hover:bg-[#0958d9] disabled:bg-gray-300 transition-colors"
              >
                发布
              </button>
            </div>
          </div>
        )}

        {/* 公告列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading && announcements.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              加载中...
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <p>暂无公告</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">
                          {announcement.creatorStudentId || announcement.creatorName || '未知'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(announcement.createdAt)}
                        </span>
                      </div>
                    </div>
                    {(canManageAnnouncement || announcement.creatorId === currentUserId) && (
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                        title="删除公告"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {announcement.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
