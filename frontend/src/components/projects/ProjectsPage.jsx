import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../services/api';
import useToastStore from '../../store/toastStore';
import { Plus, FolderKanban, Users, CheckSquare, Calendar, Trash2, ArrowRight, Search } from 'lucide-react';
import CreateProjectModal from './CreateProjectModal.jsx';
import { format } from 'date-fns';

const STATUS_COLORS = { active:'#10b981', archived:'#94a3b8', completed:'#6366f1' };

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const toast = useToastStore();
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => projectsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted'); },
    onError: () => toast.error('Failed to delete project'),
  });

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Projects</h1>
          <p style={styles.sub}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div style={styles.searchRow}>
        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input className="form-input" style={{ paddingLeft:34 }} placeholder="Search projects..."
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div style={styles.empty}>Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <FolderKanban size={48} color="#cbd5e1" />
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop:8 }}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map(project => (
            <div key={project.id} className="card fade-in" style={styles.card}>
              <div style={styles.cardTop}>
                <div style={{ ...styles.colorDot, background: project.color }} />
                <span style={{ ...styles.statusBadge, color: STATUS_COLORS[project.status] }}>
                  {project.status}
                </span>
              </div>
              <h3 style={styles.projectName}>{project.name}</h3>
              <p style={styles.projectDesc}>{project.description || 'No description'}</p>
              <div style={styles.stats}>
                <span style={styles.stat}><CheckSquare size={13} />{project.task_count} tasks</span>
                <span style={styles.stat}><Users size={13} />{project.member_count} members</span>
                {project.due_date && (
                  <span style={styles.stat}><Calendar size={13} />{format(new Date(project.due_date), 'MMM d')}</span>
                )}
              </div>
              <div style={styles.cardFooter}>
                <div style={styles.ownerChip}>
                  <div style={styles.miniAvatar}>{project.owner?.full_name?.[0]}</div>
                  <span>{project.owner?.full_name}</span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button className="btn-icon" title="Delete" onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this project?')) deleteMutation.mutate(project.id); }}>
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${project.id}`)}>
                    Open <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

const styles = {
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  heading: { fontSize:24, fontWeight:700 },
  sub: { color:'#64748b', fontSize:14, marginTop:2 },
  searchRow: { marginBottom:24 },
  searchWrap: { position:'relative', maxWidth:320 },
  searchIcon: { position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' },
  empty: { textAlign:'center', color:'#94a3b8', padding:60 },
  emptyState: { textAlign:'center', padding:'60px 20px', color:'#64748b', display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 },
  card: { padding:20, display:'flex', flexDirection:'column', gap:10, transition:'box-shadow 0.15s, transform 0.15s', cursor:'default' },
  cardTop: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  colorDot: { width:10, height:10, borderRadius:'50%' },
  statusBadge: { fontSize:11, fontWeight:600, textTransform:'capitalize' },
  projectName: { fontWeight:700, fontSize:16, color:'#0f172a' },
  projectDesc: { color:'#64748b', fontSize:13, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  stats: { display:'flex', gap:12, flexWrap:'wrap' },
  stat: { display:'flex', alignItems:'center', gap:4, color:'#64748b', fontSize:12 },
  cardFooter: { display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid #f1f5f9', marginTop:'auto' },
  ownerChip: { display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b' },
  miniAvatar: { width:20, height:20, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700 },
};
