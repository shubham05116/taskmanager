import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsAPI, usersAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { UserPlus, Shield, UserMinus, Search, Crown, Eye, Edit } from 'lucide-react';

const ROLE_ICONS = { owner: Crown, admin: Shield, member: Edit, viewer: Eye };
const ROLE_COLORS = { owner:'#6366f1', admin:'#f59e0b', member:'#10b981', viewer:'#94a3b8' };

export default function TeamPanel({ project }) {
  const [searchUser, setSearchUser] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [addRole, setAddRole] = useState('member');
  const { user } = useAuthStore();
  const toast = useToastStore();
  const qc = useQueryClient();

  const { data: team } = useQuery({
    queryKey: ['team', project.id],
    queryFn: () => teamsAPI.getByProject(project.id).then(r => r.data),
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['users-search', searchUser],
    queryFn: () => usersAPI.list(searchUser).then(r => r.data),
    enabled: searchUser.length > 1,
  });

  const addMutation = useMutation({
    mutationFn: () => teamsAPI.addMember(project.id, { user_id: selectedUser.id, role: addRole }),
    onSuccess: () => { qc.invalidateQueries(['team', project.id]); toast.success(`${selectedUser.full_name} added!`); setSelectedUser(null); setSearchUser(''); },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to add member'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => teamsAPI.removeMember(project.id, userId),
    onSuccess: () => { qc.invalidateQueries(['team', project.id]); toast.success('Member removed'); },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to remove'),
  });

  const isOwner = project.owner_id === user?.id;
  const members = team?.members || [];
  const existingIds = new Set(members.map(m => m.user_id));

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h3 style={{ fontWeight:700, fontSize:17 }}>Team Members ({members.length})</h3>
      </div>

      {/* Add member (owner only) */}
      {isOwner && (
        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <h4 style={{ fontWeight:600, marginBottom:14 }}>Add Team Member</h4>
          <div style={{ display:'flex', gap:10, marginBottom:12 }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input className="form-input" style={{ paddingLeft:32 }}
                     placeholder="Search by name or email..."
                     value={searchUser}
                     onChange={e => { setSearchUser(e.target.value); setSelectedUser(null); }} />
            </div>
            <select className="form-input" style={{ width:120 }} value={addRole}
                    onChange={e => setAddRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn btn-primary" disabled={!selectedUser || addMutation.isPending}
                    onClick={() => addMutation.mutate()}>
              <UserPlus size={15} />
              Add
            </button>
          </div>

          {/* Search results */}
          {searchUser.length > 1 && searchResults.length > 0 && (
            <div style={styles.dropdown}>
              {searchResults.filter(u => !existingIds.has(u.id)).map(u => (
                <div key={u.id} style={{ ...styles.dropdownItem, background: selectedUser?.id===u.id ? '#f0f4ff' : 'transparent' }}
                     onClick={() => { setSelectedUser(u); setSearchUser(u.full_name); }}>
                  <div style={styles.avatar}>{u.full_name?.[0]}</div>
                  <div>
                    <div style={{ fontWeight:500, fontSize:13 }}>{u.full_name}</div>
                    <div style={{ fontSize:12, color:'#94a3b8' }}>@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="card" style={{ overflow:'hidden' }}>
        {members.map((member, i) => {
          const RoleIcon = ROLE_ICONS[member.role] || Edit;
          const isMe = member.user_id === user?.id;
          return (
            <div key={member.id} style={{ ...styles.memberRow, borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flex:1 }}>
                <div style={styles.avatar}>{member.user?.full_name?.[0]}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>
                    {member.user?.full_name}
                    {isMe && <span style={{ marginLeft:6, fontSize:11, color:'#6366f1', fontWeight:500 }}>(you)</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>@{member.user?.username}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color: ROLE_COLORS[member.role], background:'#f8fafc', padding:'3px 10px', borderRadius:999 }}>
                  <RoleIcon size={11} />
                  {member.role}
                </span>
                {isOwner && member.role !== 'owner' && (
                  <button className="btn-icon" title="Remove" onClick={() => {
                    if(window.confirm(`Remove ${member.user?.full_name}?`)) removeMutation.mutate(member.user_id);
                  }}>
                    <UserMinus size={14} color="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  memberRow: { display:'flex', alignItems:'center', padding:'14px 20px', gap:12 },
  avatar: { width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14, flexShrink:0 },
  dropdown: { border:'1px solid #e2e8f0', borderRadius:10, overflowY:'auto', maxHeight:200 },
  dropdownItem: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', transition:'background 0.1s' },
};
