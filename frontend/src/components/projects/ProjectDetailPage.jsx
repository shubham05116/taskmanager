import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsAPI } from '../../services/api';
import { wsService } from '../../services/websocket';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import KanbanBoard from '../tasks/KanbanBoard.jsx';
import TeamPanel from '../team/TeamPanel.jsx';
import { ArrowLeft, Users, Kanban, Settings } from 'lucide-react';

const TABS = [
  { id:'board', label:'Board', icon:Kanban },
  { id:'team', label:'Team', icon:Users },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('board');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const qc = useQueryClient();
  const toast = useToastStore();
  const { user } = useAuthStore();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.get(id).then(r => r.data),
  });

  useEffect(() => {
    if (!id) return;
    wsService.connect(parseInt(id));

    const unsub = wsService.subscribeToProject(parseInt(id), (msg) => {
      if (msg.event === 'task_created' || msg.event === 'task_updated' || msg.event === 'task_deleted') {
        qc.invalidateQueries(['tasks', id]);
      }
      if (msg.event === 'user_joined' || msg.event === 'user_left') {
        setOnlineUsers(msg.online_users || []);
      }
      if (msg.event === 'comment_added') {
        qc.invalidateQueries(['comments', msg.task_id]);
      }
    });

    return () => {
      unsub();
    };
  }, [id, qc]);

  if (isLoading) return <div style={{ padding:40, color:'#94a3b8' }}>Loading project...</div>;
  if (!project) return <div style={{ padding:40, color:'#ef4444' }}>Project not found</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:0 }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn-icon" onClick={() => navigate('/projects')}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ ...styles.colorDot, background: project.color }} />
          <div>
            <h1 style={styles.title}>{project.name}</h1>
            {project.description && <p style={styles.desc}>{project.description}</p>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {onlineUsers.length > 0 && (
            <div style={styles.onlineChip}>
              <span style={styles.onlineDot} />
              {onlineUsers.length} online
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} className="btn" onClick={() => setTab(tid)}
                  style={{ ...styles.tab, ...(tab===tid ? styles.tabActive : {}) }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:'20px 0 0' }}>
        {tab === 'board' && <KanbanBoard project={project} />}
        {tab === 'team' && <TeamPanel project={project} />}
      </div>
    </div>
  );
}

const styles = {
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', paddingBottom:16, borderBottom:'1px solid #e2e8f0', marginBottom:0 },
  colorDot: { width:12, height:12, borderRadius:'50%', flexShrink:0, marginTop:4 },
  title: { fontSize:22, fontWeight:700 },
  desc: { color:'#64748b', fontSize:13, marginTop:2 },
  tabs: { display:'flex', gap:4, borderBottom:'1px solid #e2e8f0', paddingTop:12, paddingBottom:0 },
  tab: { padding:'8px 14px', borderRadius:'8px 8px 0 0', fontWeight:500, color:'#64748b', borderBottom:'2px solid transparent', marginBottom:-1 },
  tabActive: { color:'#6366f1', borderBottom:'2px solid #6366f1', background:'#f5f3ff' },
  onlineChip: { display:'flex', alignItems:'center', gap:6, background:'#f0fdf4', color:'#166534', padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:500 },
  onlineDot: { width:7, height:7, borderRadius:'50%', background:'#10b981' },
};
