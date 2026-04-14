import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import MainLayout from './components/MainLayout';
import Messages from './components/Messages';
import Contacts from './components/Contacts';
import Profile from './components/Profile';
import Chat from './components/Chat';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" /> : <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

        {/* 主应用路由 - 使用 MainLayout 作为布局容器 */}
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/messages" replace />} />
          <Route path="messages" element={<Messages />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 聊天页面 - 独立路由，不在 MainLayout 中 */}
        <Route path="/chat/:type/:conversationId" element={<PrivateRoute><Chat /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
