'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiClock, FiTool } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function StaffDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get('/complaints?limit=20').then(res => setComplaints(res.data?.complaints || [])).catch(() => {});
  }, []);

  const assigned = complaints.filter(c => c.assignedTo === user?._id || c.assignedTo?._id === user?._id);
  const stats = [
    { icon: FiTool, label: 'Assigned Tasks', value: assigned.length, color: '#7c3aed' },
    { icon: FiClock, label: 'In Progress', value: assigned.filter(c => c.status === 'IN_PROGRESS').length, color: '#f59e0b' },
    { icon: FiCheckCircle, label: 'Resolved', value: assigned.filter(c => c.status === 'RESOLVED').length, color: '#10b981' },
    { icon: FiAlertCircle, label: 'Critical', value: complaints.filter(c => c.priority === 'CRITICAL' && c.status !== 'RESOLVED').length, color: '#ef4444' },
  ];

  const statusClass = { OPEN: 'badge-open', IN_PROGRESS: 'badge-progress', RESOLVED: 'badge-resolved', ESCALATED: 'badge-critical' };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Staff Dashboard</h1>
        <p style={{ color: '#94a3b8', marginTop: 4, fontSize: 14 }}>Welcome, {user?.firstName} · {user?.staffProfile?.specialization || 'Maintenance'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass card-hover" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={22} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 800 }}>{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>All Complaints</h3>
        {complaints.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 14 }}>No complaints found</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {complaints.map(c => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, background: 'rgba(15,15,35,0.6)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>{c.ticketId} · {c.category} · Priority: {c.priority}</p>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }} className={statusClass[c.status] || 'badge-pending'}>{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
