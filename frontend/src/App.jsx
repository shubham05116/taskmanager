import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore.jsx';
import useToastStore from './store/toastStore.jsx';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProjectsPage from './components/projects/ProjectsPage';
import ProjectDetailPage from './components/projects/ProjectDetailPage';
import ProfilePage from './components/dashboard/ProfilePage';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:16, color:'#6366f1' }}>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const icons = { success: CheckCircle, error: XCircle, info: Info };
  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = icons[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={16} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => removeToast(t.id)} style={{ color: 'inherit', opacity: 0.7 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);

  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/projects" />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
