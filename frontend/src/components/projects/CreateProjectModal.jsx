import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI } from '../../services/api';
import useToastStore from '../../store/toastStore';
import { X, FolderKanban } from 'lucide-react';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#06b6d4','#3b82f6'];

export default function CreateProjectModal({ onClose }) {
  const [form, setForm] = useState({ name:'', description:'', color:'#6366f1', is_public:false });
  const qc = useQueryClient();
  const toast = useToastStore();

  const mutation = useMutation({
    mutationFn: (data) => projectsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['projects']);
      toast.success('Project created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create project'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <FolderKanban size={20} color="#6366f1" />
            <h2 style={{ fontSize:18, fontWeight:700 }}>New Project</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" placeholder="e.g. Website Redesign" value={form.name}
                     onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="What's this project about?"
                        rows={3} value={form.description}
                        onChange={e => setForm({...form, description: e.target.value})}
                        style={{ resize:'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {COLORS.map(c => (
                  <button type="button" key={c} onClick={() => setForm({...form, color: c})}
                          style={{ width:28, height:28, borderRadius:'50%', background:c, border:form.color===c ? '3px solid #0f172a' : '3px solid transparent', transition:'border 0.15s' }} />
                ))}
              </div>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.is_public} onChange={e => setForm({...form, is_public: e.target.checked})} />
              <span style={{ fontSize:14 }}>Make project public</span>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !form.name}>
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
