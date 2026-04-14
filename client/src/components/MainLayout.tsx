import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { MessageCircle, Users, User } from 'lucide-react';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'messages', label: '消息', icon: MessageCircle, path: '/messages' },
    { id: 'contacts', label: '通讯录', icon: Users, path: '/contacts' },
    { id: 'profile', label: '我的', icon: User, path: '/profile' },
  ];

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/messages')) return 'messages';
    if (path.includes('/contacts')) return 'contacts';
    if (path.includes('/profile')) return 'profile';
    return 'messages';
  };

  const activeTab = getActiveTab();

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Main Content - 使用 Outlet 渲染子路由 */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 shadow-lg">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1 py-2 px-6"
            >
              <tab.icon
                className={`w-6 h-6 ${
                  activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
                }`}
              />
              <span
                className={`text-xs ${
                  activeTab === tab.id ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
