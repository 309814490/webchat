import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { groupApi } from '../services/api';

interface Group {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

interface Props {
  onOpenGroupChat?: (group: Group) => void;
}

export default function GroupListPanel({ onOpenGroupChat }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupApi.getUserGroups();
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white px-4 py-3 shadow-sm flex items-center shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">群聊</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">加载中...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-lg mb-2">暂无群组</p>
            <p className="text-sm">创建群组开始聊天</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => onOpenGroupChat?.(group)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white cursor-pointer border border-gray-200 bg-white"
              >
                <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center text-white font-semibold">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-sm text-gray-500 truncate">{group.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
