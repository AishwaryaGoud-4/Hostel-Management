'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiGrid, FiUsers, FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const StatusBadge = ({ status }) => {
  const map = { OPEN: 'badge-open', IN_PROGRESS: 'badge-progress', RESOLVED: 'badge-resolved', CLOSED: 'badge-resolved', ESCALATED: 'badge-critical', CRITICAL: 'badge-critical', PENDING: 'badge-pending' };
  return <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }} className={map[status] || 'badge-pending'}>{status}</span>;
};

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [fees, setFees] = useState({ invoices: [], totalDue: 0 });
  const [attendance, setAttendance] = useState({ percentage: 0, presentCount: 0, totalDays: 0 });

  useEffect(() => {
    const load = async () => {
      const [cRes, fRes, aRes] = await Promise.all([
        api.get('/complaints?limit=5').catch(() => ({ data: { complaints: [] } })),
        api.get('/fees/my').catch(() => ({ data: { invoices: [], totalDue: 0 } })),
        api.get('/attendance/my').catch(() => ({ data: { percentage: 0, presentCount: 0, totalDays: 0 } })),
      ]);
      setComplaints(cRes.data?.complaints || []);
      setFees(fRes.data || { invoices: [], totalDue: 0 });
      setAttendance(aRes.data || { percentage: 0, presentCount: 0, totalDays: 0 });
    };
    load();
  }, []);

  const quickStats = [
    { icon: FiGrid, label: 'My Room', value: user?.studentProfile?.roomId ? 'Assigned' : 'Not Assigned', color: '#7c3aed' },
    { icon: FiCalendar, label: 'Attendance', value: `${attendance.percentage}%`, color: attendance.percentage >= 75 ? '#10b981' : '#ef4444' },
    { icon: FiAlertCircle, label: 'Open Complaints', value: complaints.filter(c => c.status === 'OPEN').length, color: '#f59e0b' },
    { icon: FiDollarSign, label: 'Fees Due', value: `₹${(fees.totalDue || 0).toLocaleString()}`, color: '#ef4444' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Hello, <span className="gradient-text">{user?.firstName}</span> 👋</h1>
        <p style={{ color: '#94a3b8', marginTop: 4, fontSize: 14 }}>
          {user?.studentProfile?.rollNumber && `Roll: ${user.studentProfile.rollNumber} · `}
          {user?.studentProfile?.course} {user?.studentProfile?.department && `· ${user.studentProfile.department}`}
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {quickStats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={20} color={stat.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{stat.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Attendance Warning */}
      {attendance.percentage > 0 && attendance.percentage < 75 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: 16, borderRadius: 12, marginBottom: 24, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <FiAlertTriangle size={20} color="#ef4444" />
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#f87171' }}>Low Attendance Warning!</p>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>Your attendance is below 75%. You may face disciplinary action.</p>
          </div>
        </motion.div>
      )}

      {/* Recent Complaints */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Complaints</h3>
        {complaints.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>No complaints filed yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {complaints.slice(0, 5).map((c) => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: 'rgba(15, 15, 35, 0.6)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>{c.ticketId} · {c.category}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Fees */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass" style={{ padding: 24, borderRadius: 16 }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Fee Summary</h3>
        {fees.invoices?.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>No invoices found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fees.invoices?.slice(0, 3).map((inv) => (
              <div key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: 'rgba(15, 15, 35, 0.6)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{inv.invoiceId}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>{inv.academicYear} · Sem {inv.semester}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>₹{inv.totalAmount?.toLocaleString()}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

