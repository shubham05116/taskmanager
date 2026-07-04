import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { LogIn, Mail, Lock, CheckSquare } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const toast = useToastStore();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <CheckSquare size={32} color="#6366f1" />
          <h1 style={styles.brand}>TaskManager</h1>
        </div>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.sub}>Sign in to your account</p>

        <form onSubmit={handle} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={styles.inputWrap}>
              <Mail size={16} style={styles.icon} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputWrap}>
              <Lock size={16} style={styles.icon} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'11px' }} disabled={loading}>
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={styles.demo}>
          <p style={{ fontSize:12, color:'#94a3b8', marginBottom:8 }}>Demo credentials</p>
          <button className="btn btn-secondary btn-sm" onClick={() => setForm({ email:'demo@example.com', password:'demo123' })}>
            Fill demo account
          </button>
        </div>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color:'#6366f1', fontWeight:500 }}>Sign up</Link>
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
  form: { display:'flex', flexDirection:'column', gap:16, marginBottom:20 },
  inputWrap: { position:'relative' },
  icon: { position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' },
  demo: { background:'#f8fafc', borderRadius:10, padding:'14px 16px', textAlign:'center', marginBottom:20 },
  footer: { textAlign:'center', color:'#64748b', fontSize:14 },
};
