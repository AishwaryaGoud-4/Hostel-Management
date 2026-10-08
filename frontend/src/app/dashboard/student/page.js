'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiGrid, FiAlertCircle, FiCalendar, FiCheckCircle, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/store/socketProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { extractRoomFromMeResponse } from '@/lib/roomResponse';
import StatusBadge from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';

/* ── Wanderlust Dusk tokens (mirrored for inline styles) ────── */
const T = {
  primary:    '#2563eb',
  accent:     '#059669',
  accentLight:'#34d399',
  success:    '#16a34a',
  warning:    '#d97706',
  danger:     '#dc2626',
  primaryLight:'#93c5fd',
  textMuted:  '#94a3b8',
  bgSurface:  'rgba(15,23,42,0.45)',
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
  const [room, setRoom] = useState(null);
  const [roomPulse, setRoomPulse] = useState(false);

  const loadData = async () => {
    const [cRes, fRes, aRes] = await Promise.all([
      api.get('/complaints?limit=5').catch(() => ({ data: { complaints: [] } })),
      api.get('/fees/my').catch(() => ({ data: { invoices: [], totalDue: 0 } })),
      api.get('/attendance/my').catch(() => ({ data: { percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null } })),
    ]);
    setComplaints(cRes.data?.complaints || []);
    setFees(fRes.data || { invoices: [], totalDue: 0 });
    setAttendance(aRes.data || { percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null });
    const roomRes = await api.get('/rooms/me').catch(() => null);
    setRoom(extractRoomFromMeResponse(roomRes));
  };

  useEffect(() => { loadData(); }, []);

  // Real-time attendance updates
  useEffect(() => {
    if (!socket) return;
    const onAttendanceUpdate = () => {
      loadData();
      toast('Your attendance has been updated!', { icon: '📋' });
    };
    const onRoom = (event) => {
      const eventUserId = event?.user?._id || event?.student?._id;
      const sameUser = eventUserId && String(eventUserId) === String(user?._id);
      const myCode = user?.studentProfile?.roomCode;
      const sameRoom = myCode && (event?.room?.roomId === myCode || event?.room?.roomCode === myCode);
      if (!sameUser && !sameRoom) return;
      loadData();
      if (!sameUser) return;
      setRoomPulse(true);
      toast('Your room assignment was updated', { icon: '🛏️' });
      window.setTimeout(() => setRoomPulse(false), 1200);
    };
    const onUserUpdate = () => {
      toast('Your profile has been updated!', { icon: '👤' });
      loadData();
    };
    socket.on('attendance:updated', onAttendanceUpdate);
    socket.on('user:updated', onUserUpdate);
    socket.on('room:allocated', onRoom);
    socket.on('room:updated', onRoom);
    socket.on('room:vacated', onRoom);
    return () => {
      socket.off('attendance:updated', onAttendanceUpdate);
      socket.off('user:updated', onUserUpdate);
      socket.off('room:allocated', onRoom);
      socket.off('room:updated', onRoom);
      socket.off('room:vacated', onRoom);
    };
  }, [socket, user?._id, user?.studentProfile?.roomCode]);

  const todayInfo = TODAY_STATUS_LABELS[attendance.todayStatus];

  const quickStats = [
    { icon: FiGrid, label: 'My Room', value: room?.roomId || user?.studentProfile?.roomCode || 'Not Assigned', color: room?.roomId ? T.primary : T.textMuted },
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

      {room && (
        <motion.section {...sectionMotion(0.35)} className={`glass${roomPulse ? ' room-live' : ''}`} style={{ padding: 20, borderRadius: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Assigned room</h3>
            <StatusBadge status={room.status}>{room.status || 'Available'}</StatusBadge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, fontSize: 13 }}>
            <div><p style={{ color: 'var(--color-text-muted)' }}>Room ID</p><strong>{room.roomId}</strong></div>
            <div><p style={{ color: 'var(--color-text-muted)' }}>Room number</p><strong>{room.roomNumber}</strong></div>
            <div><p style={{ color: 'var(--color-text-muted)' }}>Course</p><strong>{room.course}</strong></div>
            <div><p style={{ color: 'var(--color-text-muted)' }}>Capacity</p><strong>{room.capacity}</strong></div>
            <div><p style={{ color: 'var(--color-text-muted)' }}>Occupied beds</p><strong>{room.occupied}</strong></div>
            <div><p style={{ color: 'var(--color-text-muted)' }}>Available beds</p><strong>{room.availableBeds}</strong></div>
          </div>
        </motion.section>
      )}

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
