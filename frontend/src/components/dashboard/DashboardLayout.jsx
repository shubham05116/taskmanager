import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import NotificationBell from '../common/NotificationBell.jsx';
import { CheckSquare, FolderKanban, User, LogOut, Menu, X, ChevronRight } from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const toast = useToastStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Logged out successfully');
  };

  const navItems = [
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? 240 : 64, transition: 'width 0.2s' }}>
        <div style={styles.sidebarTop}>
          <div style={styles.logoRow}>
            <CheckSquare size={22} color="#6366f1" />
            {sidebarOpen && <span style={styles.logoText}>TaskManager</span>}
          </div>
          <button className="btn-icon" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav style={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navActive : {}),
              })}
            >
              <Icon size={18} />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && <ChevronRight size={14} style={{ marginLeft:'auto', opacity:0.4 }} />}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          {sidebarOpen && (
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{user?.full_name?.[0] || 'U'}</div>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{user?.full_name}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>@{user?.username}</div>
              </div>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center', gap:8 }}>
            <LogOut size={16} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={{ fontWeight:600, color:'#0f172a' }}>
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <NotificationBell />
            <div style={styles.avatar}>{user?.full_name?.[0] || 'U'}</div>
          </div>
        </header>
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  layout: { display:'flex', height:'100vh', overflow:'hidden' },
  sidebar: { display:'flex', flexDirection:'column', background:'#0f172a', color:'#e2e8f0', flexShrink:0, overflow:'hidden' },
  sidebarTop: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 14px', borderBottom:'1px solid #1e293b' },
  logoRow: { display:'flex', alignItems:'center', gap:8 },
  logoText: { fontWeight:700, fontSize:15, color:'#f1f5f9' },
  nav: { flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:2 },
  navItem: { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, color:'#94a3b8', fontWeight:500, fontSize:14, transition:'all 0.15s' },
  navActive: { background:'#6366f1', color:'#fff' },
  sidebarBottom: { padding:'12px 8px', borderTop:'1px solid #1e293b', display:'flex', flexDirection:'column', gap:8 },
  userInfo: { display:'flex', alignItems:'center', gap:10, padding:'8px 12px' },
  avatar: { width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, #6366f1, #8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  header: { background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  content: { flex:1, overflow:'auto', padding:'28px' },
};
