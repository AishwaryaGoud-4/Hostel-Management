'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiGrid, FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function WardenDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [passes, setPasses] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [cRes, pRes] = await Promise.all([
        api.get('/complaints?limit=10').catch(() => ({ data: { complaints: [] } })),
        api.get('/gate-passes?status=PENDING&limit=10').catch(() => ({ data: { passes: [] } })),
      ]);
      setComplaints(cRes.data?.complaints || []);
      setPasses(pRes.data?.passes || []);
    };
    load();
  }, []);

  const stats = [
    { icon: FiAlertCircle, label: 'Open Complaints', value: complaints.filter(c => c.status === 'OPEN').length, color: '#f59e0b' },
    { icon: FiClock, label: 'In Progress', value: complaints.filter(c => c.status === 'IN_PROGRESS').length, color: '#06b6d4' },
    { icon: FiCheckCircle, label: 'Resolved Today', value: complaints.filter(c => c.status === 'RESOLVED').length, color: '#10b981' },
    { icon: FiFileText, label: 'Pending Passes', value: passes.length, color: '#7c3aed' },
  ];

  const statusClass = { OPEN: 'badge-open', IN_PROGRESS: 'badge-progress', RESOLVED: 'badge-resolved', ESCALATED: 'badge-critical', PENDING: 'badge-pending', CLOSED: 'badge-resolved' };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Warden Dashboard</h1>
        <p style={{ color: '#94a3b8', marginTop: 4, fontSize: 14 }}>Welcome, {user?.firstName} {user?.lastName}</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Complaints</h3>
          {complaints.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 14 }}>No complaints</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {complaints.slice(0, 6).map(c => (
                <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: 'rgba(15,15,35,0.6)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>{c.ticketId} · {c.category} · {c.priority}</p>
                  </div>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }} className={statusClass[c.status] || 'badge-pending'}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pending Gate Passes</h3>
          {passes.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 14 }}>No pending passes</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {passes.slice(0, 6).map(p => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: 'rgba(15,15,35,0.6)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{p.studentId?.firstName} {p.studentId?.lastName}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>{p.passId} · {p.type}</p>
                  </div>
                  <span className="badge-pending" style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>PENDING</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
