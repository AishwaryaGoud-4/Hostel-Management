'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiClock, FiTool } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/* ── Wanderlust Dusk tokens (mirrored for inline styles) ────── */
const T = {
  primary:    '#e2725b',
  accent:     '#2a9d8f',
  success:    '#6fae66',
  warning:    '#f4a259',
  danger:     '#e15554',
  textMuted:  '#a89f92',
  bgSurface:  'rgba(23,20,15,0.6)',
};

export default function StaffDashboard() {
  const { user } = useAuthStore();
  const reduced = useReducedMotion();
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get('/complaints?limit=20').then(res => setComplaints(res.data?.complaints || [])).catch(() => {});
  }, []);

  const assigned = complaints.filter(c => c.assignedTo === user?._id || c.assignedTo?._id === user?._id);
  const stats = [
    { icon: FiTool,        label: 'Assigned Tasks', value: assigned.length,                                            color: T.primary },
    { icon: FiClock,       label: 'In Progress',    value: assigned.filter(c => c.status === 'IN_PROGRESS').length,     color: T.warning },
    { icon: FiCheckCircle, label: 'Resolved',       value: assigned.filter(c => c.status === 'RESOLVED').length,        color: T.success },
    { icon: FiAlertCircle, label: 'Critical',       value: complaints.filter(c => c.priority === 'CRITICAL' && c.status !== 'RESOLVED').length, color: T.danger },
  ];

  const statusClass = { OPEN: 'badge-open', IN_PROGRESS: 'badge-progress', RESOLVED: 'badge-resolved', ESCALATED: 'badge-critical' };

  /* Staff shares warden's "monitoring" personality: slide-in-left for stats */
  const statMotion = (i) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 },
        transition: { delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] } };

  /* Determine if a complaint is urgent */
  const isUrgent = (c) => c.status === 'ESCALATED' || c.priority === 'CRITICAL';

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Staff Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 4, fontSize: 14 }}>Welcome, {user?.firstName} · {user?.staffProfile?.specialization || 'Maintenance'}</p>
      </div>

      {/* Stats — slide-in-left (monitoring/queue personality) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <motion.div key={i} {...statMotion(i)}
            className="glass card-hover" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={22} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 800 }}>{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* All Complaints — slide-in-right with urgent row styling */}
      <motion.div
        {...(reduced
          ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
          : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 },
              transition: { delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
        )}
        className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>All Complaints</h3>
        {complaints.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No complaints found</p> : (
          <div className="table-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {complaints.map(c => (
              <div key={c._id}
                className={isUrgent(c) ? 'row-urgent' : ''}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 14, borderRadius: 10, background: T.bgSurface,
                  transition: 'background 0.15s ease',
                }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.ticketId} · {c.category} · Priority: {c.priority}</p>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                  className={`${statusClass[c.status] || 'badge-pending'}${isUrgent(c) ? ' badge-live' : ''}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
