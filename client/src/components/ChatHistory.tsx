import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, FileText, Image, Calendar, Users, X } from 'lucide-react';
import { messageApi, conversationApi } from '../services/api';

interface ChatHistoryProps {
  conversationId: number;
  isGroup?: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: number;
  senderId: number;
  senderName: string;
  senderStudentId?: string;
  senderAvatarUrl?: string;
  content: string;
  type: string;
  createdAt: string;
  metadata?: any;
}

interface MemberInfo {
  userId: number;
  username: string;
  studentId?: string;
  avatarUrl?: string;
}

interface FilterTag {
  type: 'keyword' | 'file' | 'media' | 'date' | 'member';
  label: string;
  value?: any;
}

export default function ChatHistory({ conversationId, isGroup, onClose }: ChatHistoryProps) {
  const [inputValue, setInputValue] = useState('');
  const [filters, setFilters] = useState<FilterTag[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 默认加载所有最近消息
  useEffect(() => {
    doSearch(true);
  }, []);

  useEffect(() => {
    if (isGroup && members.length === 0) {
      loadMembers();
    }
  }, []);

  // filters 变化时重新搜索
  useEffect(() => {
    doSearch(true);
  }, [filters]);

  // 滚动加载更多
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      const nextPage = page + 1;
      setPage(nextPage);
      doSearch(false, nextPage);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await conversationApi.getConversationMembers(conversationId);
      setMembers(res.data.map((m: any) => ({
        userId: m.userId,
        username: m.username,
        studentId: m.studentId,
        avatarUrl: m.avatarUrl,
      })));
    } catch (e) {
      console.error('加载成员失败:', e);
    }
  };

  // 统一搜索逻辑：根据当前 filters 决定调用哪个接口
  const doSearch = async (resetPage = true, forcePage?: number) => {
    const currentPage = forcePage !== undefined ? forcePage : (resetPage ? 0 : page);
    setLoading(true);
    try {
      let res: any;
      const keywordFilter = filters.find(f => f.type === 'keyword');
      const typeFilter = filters.find(f => f.type === 'file' || f.type === 'media');
      const dateFilter = filters.find(f => f.type === 'date');
      const memberFilter = filters.find(f => f.type === 'member');

      if (memberFilter) {
        res = await messageApi.searchBySender(conversationId, memberFilter.value, currentPage, 10);
      } else if (dateFilter) {
        res = await messageApi.searchByDate(conversationId, dateFilter.value.start, dateFilter.value.end, currentPage, 10);
      } else if (typeFilter) {
        const types = typeFilter.type === 'file' ? ['FILE'] : ['IMAGE', 'VIDEO'];
        res = await messageApi.searchByType(conversationId, types, currentPage, 10);
      } else if (keywordFilter) {
        res = await messageApi.searchMessages(conversationId, keywordFilter.value, currentPage, 10);
      } else {
        res = await messageApi.getMessages(conversationId, currentPage, 10);
      }

      const list = res.data.content || [];
      if (resetPage) { setResults(list); setPage(0); } else { setResults(prev => [...prev, ...list]); }
      setHasMore(!res.data.last);
    } catch (e) { console.error('搜索失败:', e); }
    finally { setLoading(false); }
  };

  // 添加关键词 filter
  const handleKeywordSubmit = () => {
    if (!inputValue.trim()) return;
    // 替换已有的 keyword filter
    setFilters(prev => [
      ...prev.filter(f => f.type !== 'keyword'),
      { type: 'keyword', label: inputValue.trim(), value: inputValue.trim() }
    ]);
    setInputValue('');
  };

  // 添加类型 filter
  const addTypeFilter = (type: 'file' | 'media') => {
    const label = type === 'file' ? '文件' : '图片与视频';
    // 移除所有分类 filter（file, media, date, member），只保留 keyword
    setFilters(prev => [
      ...prev.filter(f => f.type === 'keyword'),
      { type, label, value: type }
    ]);
    // 关闭日期选择器
    setShowDatePicker(false);
  };

  // 添加日期 filter（默认最近一周）
  const addDateFilter = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startStr = weekAgo.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];
    setDateStart(startStr);
    setDateEnd(endStr);
    setShowDatePicker(true);
  };

  const confirmDateFilter = () => {
    if (!dateStart) return;
    const end = dateEnd || dateStart;
    const label = `${dateStart} ~ ${end}`;
    // 移除所有分类 filter（file, media, date, member），只保留 keyword
    setFilters(prev => [
      ...prev.filter(f => f.type === 'keyword'),
      { type: 'date', label, value: { start: dateStart, end } }
    ]);
    // 不关闭日期选择器，让用户可以继续调整
  };

  // 添加成员 filter
  const addMemberFilter = (member: MemberInfo) => {
    // 移除所有分类 filter（file, media, date, member），只保留 keyword
    setFilters(prev => [
      ...prev.filter(f => f.type === 'keyword'),
      { type: 'member', label: member.studentId || member.username, value: member.userId }
    ]);
    setShowMemberPicker(false);
    // 关闭日期选择器
    setShowDatePicker(false);
  };

  // 移除 filter
  const removeFilter = (index: number) => {
    const removedFilter = filters[index];
    setFilters(prev => prev.filter((_, i) => i !== index));
    // 如果移除的是日期筛选，关闭日期选择器
    if (removedFilter.type === 'date') {
      setShowDatePicker(false);
    }
  };

  const getActiveKeyword = () => {
    const kf = filters.find(f => f.type === 'keyword');
    return kf ? kf.value : '';
  };

  const highlightKeyword = (text: string) => {
    const kw = getActiveKeyword();
    if (!kw) return text;
    const parts = text.split(new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part: string, i: number) =>
      part.toLowerCase() === kw.toLowerCase()
        ? <span key={i} className="bg-yellow-200 text-yellow-900 font-medium">{part}</span>
        : part
    );
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days < 7) return days + '天前';
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between shrink-0">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <p className="text-lg font-semibold text-gray-900">聊天记录</p>
        <div className="w-9" />
      </div>

      {/* Search area with filter tags */}
      <div className="bg-white px-4 py-2 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 flex-wrap bg-gray-100 rounded-lg px-3 py-1.5 min-h-[36px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          {filters.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs whitespace-nowrap">
              {f.label}
              <button onClick={() => removeFilter(i)} className="hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleKeywordSubmit(); }}
            placeholder={filters.length === 0 ? '搜索聊天内容...' : ''}
            className="flex-1 min-w-[60px] bg-transparent text-sm outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* Category shortcuts */}
      <div className="bg-white px-4 py-2 border-b border-gray-200 flex gap-3 shrink-0">
        <button onClick={() => addTypeFilter('file')} className="text-base text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <FileText className="w-4 h-4" />文件
        </button>
        <button onClick={() => addTypeFilter('media')} className="text-base text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <Image className="w-4 h-4" />图片与视频
        </button>
        <button onClick={addDateFilter} className="text-base text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <Calendar className="w-4 h-4" />日期
        </button>
        {isGroup && (
          <button onClick={() => { setShowMemberPicker(true); setShowDatePicker(false); }} className="text-base text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <Users className="w-4 h-4" />群成员
          </button>
        )}
      </div>

      {/* Date picker overlay */}
      {showDatePicker && (
        <div className="bg-white px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">开始:</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">结束:</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <button onClick={confirmDateFilter} disabled={!dateStart}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300">
              确定
            </button>
          </div>
        </div>
      )}

      {/* Member picker overlay */}
      {showMemberPicker && (
        <div className="bg-white border-b border-gray-200 max-h-48 overflow-y-auto shrink-0">
          <div className="px-4 py-2 text-xs text-gray-500 sticky top-0 bg-white">选择群成员</div>
          {members.map(m => (
            <button key={m.userId} onClick={() => addMemberFilter(m)}
              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50 text-left">
              <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs shrink-0 overflow-hidden">
                {m.avatarUrl
                  ? <img src={m.avatarUrl} className="w-full h-full object-cover" />
                  : (m.studentId || m.username || '?').slice(0, 2)
                }
              </div>
              <span className="text-sm text-gray-700">{m.studentId || m.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef} onScroll={handleScroll}>
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">加载中...</div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <p className="text-sm">暂无消息记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {results.map(msg => (
              <div key={msg.id} className="px-4 py-3 hover:bg-white transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white text-xs shrink-0 overflow-hidden">
                    {msg.senderAvatarUrl
                      ? <img src={msg.senderAvatarUrl} className="w-full h-full object-cover" />
                      : (msg.senderStudentId || msg.senderName || '?').slice(0, 2)
                    }
                  </div>
                  <span className="text-xs font-medium text-gray-700">{msg.senderStudentId || msg.senderName}</span>
                  <span className="text-xs text-gray-400 ml-auto">{formatTime(msg.createdAt)}</span>
                </div>
                <div className="pl-9">
                  {msg.type === 'IMAGE' || msg.type === 'image' ? (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer" className="block w-32 h-32 rounded overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity">
                      <img src={msg.content} alt="图片消息" className="w-full h-full object-cover" />
                    </a>
                  ) : msg.type === 'VIDEO' || msg.type === 'video' ? (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                      <span>[视频] {msg.metadata?.fileName || '点击查看'}</span>
                    </a>
                  ) : msg.type === 'FILE' || msg.type === 'file' ? (
                    <a href={msg.content} download={msg.metadata?.fileName} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
                      <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{msg.metadata?.fileName || '文件'}</span>
                    </a>
                  ) : (
                    <p className="text-sm text-gray-800 break-words">{highlightKeyword(msg.content)}</p>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="px-4 py-3 text-center">
                <button onClick={() => { const np = page + 1; setPage(np); doSearch(false, np); }}
                  disabled={loading} className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400">
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
