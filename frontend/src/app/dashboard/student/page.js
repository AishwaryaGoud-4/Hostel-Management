'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiGrid, FiAlertCircle, FiCalendar, FiCheckCircle, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/store/socketProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import toast from 'react-hot-toast';

/* ── Wanderlust Dusk tokens (mirrored for inline styles) ────── */
const T = {
  primary:    '#e2725b',
  accent:     '#2a9d8f',
  accentLight:'#5fc9ba',
  success:    '#6fae66',
  warning:    '#f4a259',
  danger:     '#e15554',
  primaryLight:'#f2a679',
  textMuted:  '#a89f92',
  bgSurface:  'rgba(23,20,15,0.6)',
};

const StatusBadge = ({ status }) => {
  const map = { OPEN: 'badge-open', IN_PROGRESS: 'badge-progress', RESOLVED: 'badge-resolved', CLOSED: 'badge-resolved', ESCALATED: 'badge-critical', CRITICAL: 'badge-critical', PENDING: 'badge-pending' };
  return <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }} className={map[status] || 'badge-pending'}>{status}</span>;
};

const TODAY_STATUS_LABELS = {
  PRESENT: { label: '✅ Present', color: T.success },
  ABSENT: { label: '❌ Absent', color: T.danger },
  ON_LEAVE: { label: '🟡 On Leave', color: T.warning },
  LATE: { label: '⏰ Late', color: T.primaryLight },
};

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const reduced = useReducedMotion();
  const [complaints, setComplaints] = useState([]);
  const [fees, setFees] = useState({ invoices: [], totalDue: 0 });
  const [attendance, setAttendance] = useState({ percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null });

  const loadData = async () => {
    const [cRes, fRes, aRes] = await Promise.all([
      api.get('/complaints?limit=5').catch(() => ({ data: { complaints: [] } })),
      api.get('/fees/my').catch(() => ({ data: { invoices: [], totalDue: 0 } })),
      api.get('/attendance/my').catch(() => ({ data: { percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null } })),
    ]);
    setComplaints(cRes.data?.complaints || []);
    setFees(fRes.data || { invoices: [], totalDue: 0 });
    setAttendance(aRes.data || { percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null });
  };

  useEffect(() => { loadData(); }, []);

  // Real-time attendance updates
  useEffect(() => {
    if (!socket) return;
    const onAttendanceUpdate = () => {
      loadData();
      toast('Your attendance has been updated!', { icon: '📋' });
    };
    const onUserUpdate = (data) => {
      toast('Your profile has been updated!', { icon: '👤' });
    };
    socket.on('attendance:updated', onAttendanceUpdate);
    socket.on('user:updated', onUserUpdate);
    return () => {
      socket.off('attendance:updated', onAttendanceUpdate);
      socket.off('user:updated', onUserUpdate);
    };
  }, [socket]);

  const todayInfo = TODAY_STATUS_LABELS[attendance.todayStatus];

  const quickStats = [
    { icon: FiGrid, label: 'My Room', value: user?.studentProfile?.roomId ? 'Assigned' : 'Not Assigned', color: T.primary },
    { icon: FiCalendar, label: 'Attendance', value: `${attendance.percentage}%`, color: attendance.percentage >= 75 ? T.success : T.danger },
    { icon: FiAlertCircle, label: 'Open Complaints', value: complaints.filter(c => c.status === 'OPEN').length, color: T.warning },
    { icon: FiDollarSign, label: 'Fees Due', value: `₹${(fees.totalDue || 0).toLocaleString()}`, color: T.danger },
  ];

  /* Student personality: ease-out-back bounce, stagger 0.1s */
  const cardMotion = (i) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 },
        transition: { delay: i * 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] /* --ease-out-back */ } };

  const sectionMotion = (delay) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 },
        transition: { delay, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Hello, <span className="gradient-text">{user?.firstName}</span> 👋</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4, fontSize: 14 }}>
            {user?.studentProfile?.rollNumber && `Roll: ${user.studentProfile.rollNumber} · `}
            {user?.studentProfile?.course} {user?.studentProfile?.department && `· ${user.studentProfile.department}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {todayInfo && (
            <div style={{ padding: '6px 14px', borderRadius: 10, background: `${todayInfo.color}15`, border: `1px solid ${todayInfo.color}30` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: todayInfo.color }}>{todayInfo.label}</span>
            </div>
          )}
          {/* Live indicator — teal pulse-glow-accent (reassuring, not alarming) */}
          {isConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
              background: `${T.accent}18`, border: `1px solid ${T.accent}30` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.accent }} className="pulse-glow-accent" />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.accentLight }}>Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats — bounce-on-arrival + Polaroid tilt on hover */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {quickStats.map((stat, i) => (
          <motion.div key={i} {...cardMotion(i)}
            className="glass room-card" style={{ padding: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={20} color={stat.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{stat.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Attendance Warning */}
      {attendance.percentage > 0 && attendance.percentage < 75 && (
        <motion.div {...sectionMotion(0.4)}
          style={{ padding: 16, borderRadius: 12, marginBottom: 24, background: `${T.danger}18`, border: `1px solid ${T.danger}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <FiAlertTriangle size={20} color={T.danger} />
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: T.danger }}>Low Attendance Warning!</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Your attendance is below 75%. You may face disciplinary action.</p>
          </div>
        </motion.div>
      )}

      {/* Recent Complaints — bounce-on-arrival entrance */}
      <motion.div {...sectionMotion(0.5)}
        className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Complaints</h3>
        {complaints.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No complaints filed yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {complaints.slice(0, 5).map((c) => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: T.bgSurface }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.ticketId} · {c.category}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Fees — bounce-on-arrival entrance */}
      <motion.div {...sectionMotion(0.6)}
        className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Fee Summary</h3>
        {fees.invoices?.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No invoices found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fees.invoices?.slice(0, 3).map((inv) => (
              <div key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: T.bgSurface }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{inv.invoiceId}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{inv.academicYear} · Sem {inv.semester}</p>
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
