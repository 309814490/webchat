import { useState, useEffect, useCallback } from 'react';
import { X, Search, MessageSquare, Users, Image, FileText, Video, UserPlus } from 'lucide-react';
import { friendApi, groupApi, messageApi, UserInfo } from '../services/api';

type SearchTab = 'all' | 'messages' | 'contacts' | 'groups' | 'images' | 'files' | 'videos';

interface SearchResult {
  messages: any[];
  contacts: UserInfo[];
  groups: any[];
  images: any[];
  files: any[];
  videos: any[];
}

interface GlobalSearchProps {
  onClose: () => void;
  onOpenChat?: (friend: { id: string; username: string; studentId: string | null; avatarUrl: string | null }) => void;
  onOpenGroupChat?: (group: { id: number; name: string }) => void;
}

export default function GlobalSearch({ onClose, onOpenChat, onOpenGroupChat }: GlobalSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({
    messages: [], contacts: [], groups: [], images: [], files: [], videos: []
  });
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // 预加载好友和群组列表
  useEffect(() => {
    const loadData = async () => {
      try {
        const [friendsRes, groupsRes] = await Promise.all([
          friendApi.getFriendList(),
          groupApi.getUserGroups(),
        ]);
        setFriends(friendsRes.data);
        setGroups(groupsRes.data);
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    };
    loadData();
  }, []);

  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults({ messages: [], contacts: [], groups: [], images: [], files: [], videos: [] });
      return;
    }
    setLoading(true);
    try {
      const lower = keyword.toLowerCase();

      // 本地搜索好友
      const matchedContacts = friends.filter(f =>
        f.username.toLowerCase().includes(lower) ||
        f.studentId?.toLowerCase().includes(lower)
      );

      // 本地搜索群组
      const matchedGroups = groups.filter(g =>
        g.name.toLowerCase().includes(lower)
      );

      // 远程搜索消息、图片、文件、视频
      const [messagesRes, imagesRes, filesRes, videosRes] = await Promise.all([
        messageApi.globalSearch(keyword, 0, 20),
        messageApi.globalSearchByType(['IMAGE'], 0, 10),
        messageApi.globalSearchByType(['FILE'], 0, 10),
        messageApi.globalSearchByType(['VIDEO'], 0, 10),
      ]);

      setResults({
        messages: messagesRes.data.content || [],
        contacts: matchedContacts,
        groups: matchedGroups,
        images: imagesRes.data.content || [],
        files: filesRes.data.content || [],
        videos: videosRes.data.content || [],
      });
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  }, [friends, groups]);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, doSearch]);

  const tabs: { id: SearchTab; label: string; icon: any; count: number }[] = [
    { id: 'all', label: '全部', icon: Search, count: 0 },
    { id: 'contacts', label: '好友', icon: UserPlus, count: results.contacts.length },
    { id: 'groups', label: '群组', icon: Users, count: results.groups.length },
    { id: 'messages', label: '消息', icon: MessageSquare, count: results.messages.length },
    { id: 'images', label: '图片', icon: Image, count: results.images.length },
    { id: 'files', label: '文件', icon: FileText, count: results.files.length },
    { id: 'videos', label: '视频', icon: Video, count: results.videos.length },
  ];

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天';
    if (days < 7) return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const hasResults = results.contacts.length > 0 || results.groups.length > 0 ||
    results.messages.length > 0 || results.images.length > 0 ||
    results.files.length > 0 || results.videos.length > 0;

  // 渲染联系人结果
  const renderContacts = (limit?: number) => {
    const list = limit ? results.contacts.slice(0, limit) : results.contacts;
    if (list.length === 0) return null;
    return (
      <div className="mb-4">
        {activeTab === 'all' && <h3 className="text-xs font-medium text-gray-500 px-4 py-2 uppercase">好友</h3>}
        {list.map(contact => (
          <div
            key={contact.id}
            onClick={() => { onOpenChat?.({ id: contact.id, username: contact.username, studentId: contact.studentId, avatarUrl: contact.avatarUrl }); onClose(); }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {contact.avatarUrl ? <img src={contact.avatarUrl} className="w-full h-full rounded-full object-cover" loading="lazy" /> : contact.username.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{contact.username}</p>
              <p className="text-xs text-gray-500">学号: {contact.studentId || '未设置'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染群组结果
  const renderGroups = (limit?: number) => {
    const list = limit ? results.groups.slice(0, limit) : results.groups;
    if (list.length === 0) return null;
    return (
      <div className="mb-4">
        {activeTab === 'all' && <h3 className="text-xs font-medium text-gray-500 px-4 py-2 uppercase">群组</h3>}
        {list.map(group => (
          <div
            key={group.id}
            onClick={() => { onOpenGroupChat?.({ id: group.id, name: group.name }); onClose(); }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center text-white shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{group.name}</p>
              {group.description && <p className="text-xs text-gray-500 truncate">{group.description}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染消息结果
  const renderMessages = (limit?: number) => {
    const list = limit ? results.messages.slice(0, limit) : results.messages;
    if (list.length === 0) return null;
    return (
      <div className="mb-4">
        {activeTab === 'all' && <h3 className="text-xs font-medium text-gray-500 px-4 py-2 uppercase">聊天记录</h3>}
        {list.map(msg => (
          <div key={msg.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-100 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {msg.senderAvatarUrl ? <img src={msg.senderAvatarUrl} className="w-full h-full rounded-full object-cover" loading="lazy" /> : (msg.senderStudentId || '?').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">{msg.senderStudentId || msg.senderName}</p>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-600 truncate mt-0.5">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染媒体结果（图片/文件/视频）
  const renderMedia = (type: 'images' | 'files' | 'videos', limit?: number) => {
    const list = limit ? results[type].slice(0, limit) : results[type];
    if (list.length === 0) return null;
    const label = type === 'images' ? '图片' : type === 'files' ? '文件' : '视频';
    return (
      <div className="mb-4">
        {activeTab === 'all' && <h3 className="text-xs font-medium text-gray-500 px-4 py-2 uppercase">{label}</h3>}
        {type === 'images' ? (
          <div className="grid grid-cols-4 gap-2 px-4">
            {list.map(msg => (
              <div key={msg.id} className="aspect-square rounded overflow-hidden cursor-pointer hover:opacity-80" onClick={() => window.open(msg.content, '_blank')}>
                <img src={msg.content} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          list.map(msg => (
            <a key={msg.id} href={msg.content} download className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 cursor-pointer">
              <div className="w-9 h-9 rounded bg-gray-200 flex items-center justify-center shrink-0">
                {type === 'files' ? <FileText className="w-4 h-4 text-gray-600" /> : <Video className="w-4 h-4 text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{msg.metadata?.fileName || (type === 'files' ? '文件' : '视频')}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{msg.senderStudentId || msg.senderName}</span>
                  <span>{formatTime(msg.createdAt)}</span>
                  {msg.metadata?.fileSize && <span>{(msg.metadata.fileSize / 1024 / 1024).toFixed(2)} MB</span>}
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col mx-4">
        {/* 搜索头部 */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="搜索消息、好友、群组、文件..."
              className="flex-1 ml-2 bg-transparent text-sm focus:outline-none"
              autoFocus
            />
            {searchValue && (
              <button onClick={() => setSearchValue('')} className="p-0.5 hover:bg-gray-200 rounded">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
        </div>

        {/* 分类标签 */}
        {searchValue.trim() && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                <span>{tab.label}</span>
                {tab.id !== 'all' && tab.count > 0 && (
                  <span className="bg-gray-200 text-gray-600 rounded-full px-1.5 text-[10px]">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 搜索结果 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-gray-500 text-sm">搜索中...</div>
          ) : !searchValue.trim() ? (
            <div className="text-center py-10 text-gray-400 text-sm">输入关键词开始搜索</div>
          ) : !hasResults ? (
            <div className="text-center py-10 text-gray-400 text-sm">未找到相关结果</div>
          ) : (
            <div className="py-2">
              {activeTab === 'all' && (
                <>
                  {renderContacts(3)}
                  {renderGroups(3)}
                  {renderMessages(5)}
                  {renderMedia('images', 8)}
                  {renderMedia('files', 3)}
                  {renderMedia('videos', 3)}
                </>
              )}
              {activeTab === 'contacts' && renderContacts()}
              {activeTab === 'groups' && renderGroups()}
              {activeTab === 'messages' && renderMessages()}
              {activeTab === 'images' && renderMedia('images')}
              {activeTab === 'files' && renderMedia('files')}
              {activeTab === 'videos' && renderMedia('videos')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
