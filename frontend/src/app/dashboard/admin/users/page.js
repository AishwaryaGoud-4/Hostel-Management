'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiUser, FiMail, FiPhone, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ role: '', search: '', page: 1 });

  const load = async () => {
    const params = new URLSearchParams();
    if (filters.role) params.set('role', filters.role);
    if (filters.search) params.set('search', filters.search);
    params.set('page', filters.page);
    params.set('limit', '15');
    const res = await api.get(`/auth/users?${params}`);
    if (res.success) {
      setUsers(res.data.users);
      setPagination(res.pagination || {});
    }
  };

  useEffect(() => { load(); }, [filters.role, filters.page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(f => ({ ...f, page: 1 }));
    load();
  };

  const toggleActive = async (id, isActive) => {
    if (isActive) {
      await api.delete(`/auth/users/${id}`);
      toast.success('User deactivated');
    } else {
      await api.put(`/auth/users/${id}`, { isActive: true });
      toast.success('User activated');
    }
    load();
  };

  const roleColors = { SUPER_ADMIN: '#ef4444', WARDEN: '#7c3aed', STUDENT: '#06b6d4', STAFF: '#f59e0b' };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>User Management</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Manage all system users across roles</p>
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: 16, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
            <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="input-field" style={{ paddingLeft: 36, padding: '10px 10px 10px 36px' }} placeholder="Search by name or email..." />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Search</button>
        </form>
        <select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value, page: 1 }))}
          className="input-field" style={{ width: 160 }}>
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="WARDEN">Warden</option>
          <option value="STUDENT">Student</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>

      {/* User Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2d2d44' }}>
                {['User', 'Email', 'Phone', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid rgba(45,45,68,0.5)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${roleColors[u.role]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: roleColors[u.role] }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{u.firstName} {u.lastName}</p>
                        {u.studentProfile?.rollNumber && <p style={{ fontSize: 11, color: '#94a3b8' }}>{u.studentProfile.rollNumber}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{u.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${roleColors[u.role]}15`, color: roleColors[u.role] }}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: u.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: u.isActive ? '#10b981' : '#ef4444' }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleActive(u._id, u.isActive)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: u.isActive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: u.isActive ? '#ef4444' : '#10b981' }}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ padding: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: filters.page === p ? '#7c3aed' : 'rgba(45,45,68,0.5)', color: filters.page === p ? '#fff' : '#94a3b8' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
