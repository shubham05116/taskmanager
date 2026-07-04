import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { UserPlus, Mail, Lock, User, CheckSquare } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const login = useAuthStore(s => s.login);
  const toast = useToastStore();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      await login({ email: form.email, password: form.password });
      navigate('/projects');
      toast.success('Account created! Welcome aboard 🎉');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type='text', placeholder='', Icon) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position:'relative' }}>
        {Icon && <Icon size={16} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />}
        <input
          type={type}
          className="form-input"
          style={{ paddingLeft: Icon ? 36 : 12 }}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm({...form, [key]: e.target.value})}
          required
        />
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <CheckSquare size={32} color="#6366f1" />
          <h1 style={styles.brand}>TaskManager</h1>
        </div>
        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.sub}>Start managing tasks with your team</p>

        <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:20 }}>
          {field('full_name', 'Full Name', 'text', 'John Doe', User)}
          {field('username', 'Username', 'text', 'johndoe', User)}
          {field('email', 'Email', 'email', 'you@example.com', Mail)}
          {field('password', 'Password', 'password', '••••••••', Lock)}
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'11px', marginTop:4 }} disabled={loading}>
            <UserPlus size={16} />
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign:'center', color:'#64748b', fontSize:14 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'#6366f1', fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', padding:16 },
  card: { background:'#fff', borderRadius:16, boxShadow:'0 20px 60px rgba(99,102,241,0.12)', padding:'40px 36px', width:'100%', maxWidth:420 },
  logo: { display:'flex', alignItems:'center', gap:10, marginBottom:28 },
  brand: { fontSize:22, fontWeight:700, color:'#0f172a' },
  title: { fontSize:24, fontWeight:700, color:'#0f172a', marginBottom:4 },
  sub: { color:'#64748b', marginBottom:28 },
};
