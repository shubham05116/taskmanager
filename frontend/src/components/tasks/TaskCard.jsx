import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '../../services/api';
import useToastStore from '../../store/toastStore';
import { Calendar, Tag, MessageSquare, Trash2, AlertCircle, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_STYLES = {
  low: { bg:'#f0fdf4', color:'#166534', icon:null },
  medium: { bg:'#fffbeb', color:'#92400e', icon:null },
  high: { bg:'#fff7ed', color:'#9a3412', icon:AlertCircle },
  urgent: { bg:'#fef2f2', color:'#991b1b', icon:ArrowUp },
};

export default function TaskCard({ task, onClick }) {
  const qc = useQueryClient();
  const toast = useToastStore();

  const deleteMutation = useMutation({
    mutationFn: () => tasksAPI.delete(task.id),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', String(task.project_id)]);
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const pStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  const PriorityIcon = pStyle.icon;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      style={styles.card}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6 }}>
        <p style={styles.title}>{task.title}</p>
        <button className="btn-icon" style={{ padding:2, flexShrink:0 }}
                onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete task?')) deleteMutation.mutate(); }}>
          <Trash2 size={12} color="#ef4444" />
        </button>
      </div>

      {task.description && (
        <p style={styles.desc}>{task.description}</p>
      )}

      <div style={styles.footer}>
        <span style={{ ...styles.priorityBadge, background:pStyle.bg, color:pStyle.color }}>
          {PriorityIcon && <PriorityIcon size={10} />}
          {task.priority}
        </span>

        <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>
          {task.due_date && (
            <span style={{ ...styles.meta, color: isOverdue ? '#ef4444' : '#64748b' }}>
              <Calendar size={11} />
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.tags && (
            <span style={styles.meta}><Tag size={11} /></span>
          )}
        </div>
      </div>

      {task.assignee && (
        <div style={styles.assignee}>
          <div style={styles.avatar}>{task.assignee.full_name?.[0]}</div>
          <span style={{ fontSize:11, color:'#64748b' }}>{task.assignee.full_name}</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 12px 10px', cursor:'pointer', display:'flex', flexDirection:'column', gap:8, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', transition:'box-shadow 0.15s', userSelect:'none' },
  title: { fontSize:13, fontWeight:600, color:'#0f172a', lineHeight:1.4 },
  desc: { fontSize:12, color:'#64748b', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', lineHeight:1.4 },
  footer: { display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' },
  priorityBadge: { display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:600, textTransform:'capitalize' },
  meta: { display:'inline-flex', alignItems:'center', gap:3, fontSize:11, color:'#64748b' },
  assignee: { display:'flex', alignItems:'center', gap:5, paddingTop:4, borderTop:'1px solid #f1f5f9' },
  avatar: { width:18, height:18, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:9, fontWeight:700 },
};
