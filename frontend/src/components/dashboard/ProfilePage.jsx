import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { usersAPI } from '../../services/api';
import { User, Mail, AtSign, Shield, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const toast = useToastStore();
  const [form, setForm] = useState({ full_name: user?.full_name || '', avatar_url: user?.avatar_url || '' });

  const mutation = useMutation({
    mutationFn: (data) => usersAPI.updateMe(data),
    onSuccess: ({ data }) => {
      updateUser(data);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={styles.heading}>Profile</h1>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={styles.avatarSection}>
          <div style={styles.bigAvatar}>{user?.full_name?.[0]}</div>
          <div>
            <h2 style={{ fontWeight:700, fontSize:18 }}>{user?.full_name}</h2>
            <p style={{ color:'#64748b' }}>@{user?.username}</p>
            <span className={`badge`} style={{ background:'#e0e7ff', color:'#4338ca', marginTop:6 }}>
              <Shield size={10} /> {user?.role}
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ fontWeight:600, marginBottom:20 }}>Edit Profile</h3>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
              style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="form-group">
            <label className="form-label"><User size={13} style={{ marginRight:4 }} />Full Name</label>
            <input className="form-input" value={form.full_name}
                   onChange={e => setForm({...form, full_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label"><Mail size={13} style={{ marginRight:4 }} />Email</label>
            <input className="form-input" value={user?.email} disabled style={{ background:'#f8fafc', cursor:'not-allowed' }} />
          </div>
          <div className="form-group">
            <label className="form-label"><AtSign size={13} style={{ marginRight:4 }} />Username</label>
            <input className="form-input" value={user?.username} disabled style={{ background:'#f8fafc', cursor:'not-allowed' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Avatar URL</label>
            <input className="form-input" placeholder="https://..." value={form.avatar_url}
                   onChange={e => setForm({...form, avatar_url: e.target.value})} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf:'flex-start' }} disabled={mutation.isPending}>
            <Save size={15} />
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  heading: { fontSize:24, fontWeight:700, marginBottom:20 },
  avatarSection: { display:'flex', alignItems:'center', gap:20 },
  bigAvatar: { width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:28 },
};
