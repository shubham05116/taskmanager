import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../../services/api';
import { wsService } from '../../services/websocket';
import useAuthStore from '../../store/authStore';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then(r => r.data),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  useEffect(() => {
    if (!user) return;
    const unsub = wsService.subscribeToUser(`user_${user.id}`, (msg) => {
      if (msg.event === 'notification') {
        qc.invalidateQueries(['notifications']);
      }
    });
    return unsub;
  }, [user, qc]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button className="btn-icon" onClick={() => setOpen(o => !o)} style={{ position:'relative' }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={styles.panel} className="fade-in">
          <div style={styles.panelHeader}>
            <span style={{ fontWeight:700, fontSize:14 }}>Notifications</span>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => markAllMutation.mutate()}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>No notifications</div>
            ) : notifications.slice(0, 15).map(n => (
              <div key={n.id}
                   style={{ ...styles.item, background: n.is_read ? 'transparent' : '#f5f3ff' }}
                   onClick={() => !n.is_read && markReadMutation.mutate(n.id)}>
                {!n.is_read && <div style={styles.dot} />}
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:n.is_read ? 400 : 600, fontSize:13, color:'#0f172a' }}>{n.title}</p>
                  <p style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{n.message}</p>
                  <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  badge: { position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff', borderRadius:999, fontSize:9, fontWeight:700, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' },
  panel: { position:'absolute', right:0, top:'calc(100% + 10px)', width:340, background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, boxShadow:'0 10px 30px rgba(0,0,0,0.12)', zIndex:100, overflow:'hidden' },
  panelHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid #f1f5f9' },
  list: { maxHeight:380, overflow:'auto' },
  item: { display:'flex', gap:10, alignItems:'flex-start', padding:'12px 16px', cursor:'pointer', transition:'background 0.1s', position:'relative' },
  dot: { width:8, height:8, borderRadius:'50%', background:'#6366f1', marginTop:4, flexShrink:0 },
  empty: { padding:32, textAlign:'center', color:'#94a3b8', fontSize:14 },
};
