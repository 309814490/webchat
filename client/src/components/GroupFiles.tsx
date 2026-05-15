import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Trash2, File, FileText, Image, Video } from 'lucide-react';
import { groupApi } from '../services/api';

interface GroupFilesProps {
  groupId: number;
  currentUserId: number;
  onClose: () => void;
}

export default function GroupFiles({ groupId, currentUserId, onClose }: GroupFilesProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [groupId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await groupApi.getGroupFiles(groupId);
      setFiles(response.data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert('文件大小不能超过 100MB');
      return;
    }

    try {
      setUploading(true);
      const response = await groupApi.uploadGroupFile(groupId, file);
      setFiles(prev => [response.data, ...prev]);
      alert('上传成功');
    } catch (error: any) {
      alert('上传失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('确定要删除这个文件吗？')) return;

    try {
      await groupApi.deleteGroupFile(groupId, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      alert('删除成功');
    } catch (error: any) {
      alert('删除失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <Image className="w-6 h-6 text-blue-500" />;
    if (fileType?.startsWith('video/')) return <Video className="w-6 h-6 text-purple-500" />;
    if (fileType?.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days < 7) return days + '天前';
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">群文件</h2>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{uploading ? '上传中...' : '上传文件'}</span>
          </div>
        </label>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">加载中...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <File className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>暂无文件</p>
            <p className="text-sm mt-1">点击右上角上传文件</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(file => (
              <div key={file.id} className="bg-white rounded-lg p-3 shadow-sm hover:shadow">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.fileName}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{file.uploaderStudentId || file.uploaderName}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={file.fileUrl}
                      download
                      className="p-2 hover:bg-gray-100 rounded"
                      title="下载"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </a>
                    {file.uploaderId === currentUserId && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
