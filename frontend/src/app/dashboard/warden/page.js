'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
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
  textMuted:  '#a89f92',
  bgSurface:  'rgba(23,20,15,0.6)',
};

export default function WardenDashboard() {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const reduced = useReducedMotion();
  const [complaints, setComplaints] = useState([]);
  const [passes, setPasses] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState({ present: 0, absent: 0, total: 0 });
  /* Track newly-inserted complaint IDs for animate-new-row */
  const prevComplaintIds = useRef(new Set());

  const loadData = async () => {
    const [cRes, pRes, sRes] = await Promise.all([
      api.get('/complaints?limit=10').catch(() => ({ data: { complaints: [] } })),
      api.get('/gate-passes?status=PENDING&limit=10').catch(() => ({ data: { passes: [] } })),
      api.get('/attendance/warden/students').catch(() => ({ data: { students: [] } })),
    ]);

    const newComplaints = cRes.data?.complaints || [];
    setComplaints(newComplaints);

    // Track which complaints are genuinely new (for scale-in animation)
    const newIds = new Set(newComplaints.map(c => c._id));
    prevComplaintIds.current = newIds;

    setPasses(pRes.data?.passes || []);

    const students = sRes.data?.students || [];
    setStudentCount(students.length);
    const present = students.filter(s => s.todayStatus === 'PRESENT' || s.todayStatus === 'LATE').length;
    const absent = students.filter(s => s.todayStatus === 'ABSENT').length;
    setTodayAttendance({ present, absent, total: students.length });
  };

  useEffect(() => { loadData(); }, []);

  // Real-time listeners
  useEffect(() => {
    if (!socket) return;
    const onStudentAdded = () => { loadData(); toast('New student added to your hostel!', { icon: '👤' }); };
    const onAttendanceUpdate = () => { loadData(); };
    socket.on('student:added', onStudentAdded);
    socket.on('attendance:updated', onAttendanceUpdate);
    socket.on('attendance:bulk-updated', onAttendanceUpdate);
    return () => {
      socket.off('student:added', onStudentAdded);
      socket.off('attendance:updated', onAttendanceUpdate);
      socket.off('attendance:bulk-updated', onAttendanceUpdate);
    };
  }, [socket]);

  const stats = [
    { icon: FiUsers,       label: 'Assigned Students', value: studentCount,                                     color: T.accent },
    { icon: FiCheckCircle, label: 'Present Today',     value: todayAttendance.present,                          color: T.success },
    { icon: FiAlertCircle, label: 'Open Complaints',   value: complaints.filter(c => c.status === 'OPEN').length, color: T.warning },
    { icon: FiFileText,    label: 'Pending Passes',    value: passes.length,                                    color: T.primary },
  ];

  const statusClass = { OPEN: 'badge-open', IN_PROGRESS: 'badge-progress', RESOLVED: 'badge-resolved', ESCALATED: 'badge-critical', PENDING: 'badge-pending', CLOSED: 'badge-resolved' };

  /* Warden personality: slide-in-left for stats (queue arrival feel) */
  const statMotion = (i) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 },
        transition: { delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] } };

  /* Section motion: slide-in-right for panels */
  const panelMotion = (delay) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 },
        transition: { delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] } };

  /* Determine if a complaint is urgent (ESCALATED, CRITICAL priority, or overdue) */
  const isUrgent = (c) => c.status === 'ESCALATED' || c.priority === 'CRITICAL';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Warden Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4, fontSize: 14 }}>Welcome, {user?.firstName} {user?.lastName}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live monitoring cue — heartbeat dot */}
          {isConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
              background: `${T.accent}18`, border: `1px solid ${T.accent}30` }}>
              <span className="live-monitor-dot" />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.accentLight }}>Monitoring</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats — slide-in-left (items "arriving" into a queue) */}
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

      {/* Attendance overview bar */}
      {todayAttendance.total > 0 && (
        <motion.div {...panelMotion(0.35)}
          className="glass" style={{ padding: 20, borderRadius: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Today&apos;s Attendance</h3>
          <div style={{ display: 'flex', gap: 4, height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(52,48,42,0.5)' }}>
            {todayAttendance.present > 0 && (
              <div style={{ width: `${(todayAttendance.present / todayAttendance.total) * 100}%`, background: T.success, borderRadius: 4, transition: 'width 0.5s ease' }} />
            )}
            {todayAttendance.absent > 0 && (
              <div style={{ width: `${(todayAttendance.absent / todayAttendance.total) * 100}%`, background: T.danger, borderRadius: 4, transition: 'width 0.5s ease' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
            <span>✅ {todayAttendance.present} Present</span>
            <span>❌ {todayAttendance.absent} Absent</span>
            <span>📊 {todayAttendance.total} Total</span>
          </div>
        </motion.div>
      )}

      {/* Two-column: Complaints + Gate Passes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="responsive-grid-2">
        {/* Complaints — slide-in-left (queue arrival) */}
        <motion.div {...panelMotion(0.45)}
          className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Complaints</h3>
          {complaints.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No complaints</p> : (
            <div className="table-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {complaints.slice(0, 6).map(c => (
                <div key={c._id}
                  className={isUrgent(c) ? 'row-urgent' : ''}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 12, borderRadius: 10, background: T.bgSurface,
                    transition: 'background 0.15s ease',
                  }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.ticketId} · {c.category} · {c.priority}</p>
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

        {/* Gate Passes — slide-in-right */}
        <motion.div
          {...(reduced
            ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
            : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 },
                transition: { delay: 0.55, duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
          )}
          className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pending Gate Passes</h3>
          {passes.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No pending passes</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {passes.slice(0, 6).map(p => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: T.bgSurface }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{p.studentId?.firstName} {p.studentId?.lastName}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.passId} · {p.type}</p>
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
