import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, teamsAPI } from '../../services/api';
import useToastStore from '../../store/toastStore';
import useAuthStore from '../../store/authStore';
import { X, MessageSquare, Send, Calendar, Clock, Tag, User } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['todo','in_progress','in_review','done','cancelled'];
const PRIORITIES = ['low','medium','high','urgent'];

export default function TaskDetailModal({ task, projectId, onClose, onUpdate }) {
  const [comment, setComment] = useState('');
  const [editData, setEditData] = useState({ status: task.status, priority: task.priority, assignee_id: task.assignee_id || '' });
  const qc = useQueryClient();
  const toast = useToastStore();
  const { user } = useAuthStore();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', task.id],
    queryFn: () => tasksAPI.getComments(task.id).then(r => r.data),
  });

  const { data: team } = useQuery({
    queryKey: ['team', projectId],
    queryFn: () => teamsAPI.getByProject(projectId).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => tasksAPI.update(task.id, data),
    onSuccess: ({ data }) => {
      qc.invalidateQueries(['tasks', String(projectId)]);
      toast.success('Task updated');
      onUpdate(data);
    },
    onError: () => toast.error('Update failed'),
  });

  const commentMutation = useMutation({
    mutationFn: () => tasksAPI.addComment(task.id, { content: comment, task_id: task.id }),
    onSuccess: () => {
      qc.invalidateQueries(['comments', task.id]);
      setComment('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const handleFieldChange = (field, value) => {
    const updated = { ...editData, [field]: value };
    setEditData(updated);
    const payload = { [field]: value || null };
    updateMutation.mutate(payload);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth:680 }}>
        <div className="modal-header">
          <h2 style={{ fontSize:17, fontWeight:700, flex:1, paddingRight:16 }}>{task.title}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 220px', gap:0, maxHeight:'75vh', overflow:'hidden' }}>
          {/* Main */}
          <div style={{ padding:'20px 20px', overflow:'auto', borderRight:'1px solid #e2e8f0' }}>
            {task.description && (
              <div style={styles.section}>
                <p style={{ color:'#475569', lineHeight:1.6, fontSize:14 }}>{task.description}</p>
              </div>
            )}

            {/* Comments */}
            <div style={styles.section}>
              <h4 style={styles.secTitle}><MessageSquare size={14} /> Comments ({comments.length})</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                {comments.map(c => (
                  <div key={c.id} style={styles.commentItem}>
                    <div style={styles.avatar}>{c.author?.full_name?.[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{c.author?.full_name}</span>
                        <span style={{ color:'#94a3b8', fontSize:11 }}>{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                      <p style={{ fontSize:13, color:'#475569', lineHeight:1.5 }}>{c.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <p style={{ color:'#94a3b8', fontSize:13 }}>No comments yet</p>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <textarea
                  className="form-input"
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  style={{ flex:1, resize:'none' }}
                  onKeyDown={e => { if(e.key==='Enter' && e.metaKey && comment.trim()) commentMutation.mutate(); }}
                />
                <button className="btn btn-primary" style={{ alignSelf:'flex-end' }}
                        disabled={!comment.trim() || commentMutation.isPending}
                        onClick={() => commentMutation.mutate()}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ padding:'20px 16px', overflow:'auto', display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={editData.status}
                      onChange={e => handleFieldChange('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={editData.priority}
                      onChange={e => handleFieldChange('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-input" value={editData.assignee_id}
                      onChange={e => handleFieldChange('assignee_id', e.target.value || null)}>
                <option value="">Unassigned</option>
                {team?.members?.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.user?.full_name}</option>
                ))}
              </select>
            </div>

            {task.due_date && (
              <div style={styles.metaRow}>
                <Calendar size={13} color="#94a3b8" />
                <span style={{ fontSize:13, color:'#475569' }}>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {task.estimated_hours && (
              <div style={styles.metaRow}>
                <Clock size={13} color="#94a3b8" />
                <span style={{ fontSize:13, color:'#475569' }}>{task.estimated_hours}h estimated</span>
              </div>
            )}
            {task.tags && (
              <div style={styles.metaRow}>
                <Tag size={13} color="#94a3b8" />
                <span style={{ fontSize:13, color:'#475569' }}>{task.tags}</span>
              </div>
            )}
            <div style={styles.metaRow}>
              <User size={13} color="#94a3b8" />
              <span style={{ fontSize:13, color:'#475569' }}>By {task.creator?.full_name}</span>
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:'auto' }}>
              Created {format(new Date(task.created_at), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  section: { marginBottom:20, paddingBottom:20, borderBottom:'1px solid #f1f5f9' },
  secTitle: { display:'flex', alignItems:'center', gap:6, fontWeight:600, fontSize:14, marginBottom:12, color:'#374151' },
  commentItem: { display:'flex', gap:10, alignItems:'flex-start' },
  avatar: { width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 },
  metaRow: { display:'flex', alignItems:'center', gap:8 },
};
