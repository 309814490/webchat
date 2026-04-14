import { useEffect, useState } from 'react';

interface Member {
  id: number;
  username: string;
  studentId: string;
  avatarUrl: string;
  role: string;
}

interface MentionSelectorProps {
  members: Member[];
  search: string;
  onSelect: (member: Member | null) => void; // null = @所有人
  onClose: () => void;
  canMentionAll?: boolean; // 是否有权@所有人（仅群主/管理员）
}

export default function MentionSelector({ members, search, onSelect, onClose, canMentionAll = false }: MentionSelectorProps) {
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const s = search.toLowerCase();
    const filtered = members.filter(m =>
      m.username.toLowerCase().includes(s) ||
      (m.studentId && m.studentId.toLowerCase().includes(s))
    );
    setFilteredMembers(filtered);
    setSelectedIndex(0);
  }, [search, members]);

  // @所有人是否在搜索结果中显示
  const showMentionAll = canMentionAll && (!search || '所有人'.includes(search));

  // 列表: 如果显示@所有人则 0 = @所有人, 1..n = 成员；否则 0..n-1 = 成员
  const totalCount = filteredMembers.length + (showMentionAll ? 1 : 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalCount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalCount) % totalCount);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (showMentionAll && selectedIndex === 0) {
          onSelect(null);
        } else {
          const memberIdx = showMentionAll ? selectedIndex - 1 : selectedIndex;
          onSelect(filteredMembers[memberIdx]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredMembers, totalCount, onSelect, onClose]);

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
      {/* @所有人 - 仅群主/管理员可见 */}
      {showMentionAll && (
        <div
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
            selectedIndex === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelect(null)}
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">全</div>
          <div>
            <div className="font-medium text-sm">所有人</div>
            <div className="text-xs text-gray-500">通知所有成员</div>
          </div>
        </div>
      )}

      {/* 成员列表 */}
      {filteredMembers.map((member, idx) => (
        <div
          key={member.id}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
            selectedIndex === idx + (showMentionAll ? 1 : 0) ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelect(member)}
        >
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.username} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-medium">
              {member.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{member.username}</div>
            <div className="text-xs text-gray-500 truncate">{member.studentId}</div>
          </div>
          {member.role === 'OWNER' && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">群主</span>
          )}
          {member.role === 'ADMIN' && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">管理</span>
          )}
        </div>
      ))}

      {filteredMembers.length === 0 && search && (
        <div className="p-4 text-center text-gray-500 text-sm">未找到匹配的成员</div>
      )}
    </div>
  );
}
