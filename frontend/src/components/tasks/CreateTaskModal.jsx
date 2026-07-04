import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, teamsAPI, usersAPI } from '../../services/api';
import useToastStore from '../../store/toastStore';
import { X, CheckSquare } from 'lucide-react';

const STATUSES = ['todo','in_progress','in_review','done'];
const PRIORITIES = ['low','medium','high','urgent'];

export default function CreateTaskModal({ projectId, initialStatus = 'todo', onClose }) {
  const [form, setForm] = useState({
    title: '', description: '', status: initialStatus,
    priority: 'medium', assignee_id: '', due_date: '', tags: '',
    estimated_hours: '', project_id: projectId,
  });
  const qc = useQueryClient();
  const toast = useToastStore();

  const { data: team } = useQuery({
    queryKey: ['team', projectId],
    queryFn: () => teamsAPI.getByProject(projectId).then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => tasksAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', String(projectId)]);
      toast.success('Task created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create task'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, project_id: projectId };
    if (!payload.assignee_id) delete payload.assignee_id;
    if (!payload.due_date) delete payload.due_date;
    if (!payload.tags) delete payload.tags;
    if (!payload.estimated_hours) delete payload.estimated_hours;
    else payload.estimated_hours = parseInt(payload.estimated_hours);
    mutation.mutate(payload);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CheckSquare size={20} color="#6366f1" />
            <h2 style={{ fontSize:18, fontWeight:700 }}>New Task</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="What needs to be done?" value={form.title}
                     onChange={e => setForm({...form, title: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="Add more detail..." rows={3}
                        value={form.description}
                        onChange={e => setForm({...form, description: e.target.value})}
                        style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status}
                        onChange={e => setForm({...form, status: e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority}
                        onChange={e => setForm({...form, priority: e.target.value})}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-input" value={form.assignee_id}
                        onChange={e => setForm({...form, assignee_id: e.target.value})}>
                  <option value="">Unassigned</option>
                  {team?.members?.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.user?.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="datetime-local" className="form-input" value={form.due_date}
                       onChange={e => setForm({...form, due_date: e.target.value})} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Est. Hours</label>
                <input type="number" className="form-input" placeholder="e.g. 4" min={1} value={form.estimated_hours}
                       onChange={e => setForm({...form, estimated_hours: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Tags</label>
                <input className="form-input" placeholder="bug, feature, ..." value={form.tags}
                       onChange={e => setForm({...form, tags: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !form.title}>
              {mutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
