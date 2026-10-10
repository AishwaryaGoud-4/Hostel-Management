'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  HiOutlineHome, HiOutlineCalendarDays, HiOutlineExclamationTriangle, HiOutlineBanknotes,
  HiOutlineChatBubbleLeftEllipsis, HiOutlineTicket, HiOutlineArrowRight, HiOutlineUser,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/store/socketProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { extractRoomFromMeResponse } from '@/lib/roomResponse';
import StatusBadge from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

const BASE = '/dashboard/student';

const C = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  muted: '#94a3b8',
};

const TODAY_STATUS = {
  PRESENT: { label: 'Marked present today', color: C.green },
  ABSENT: { label: 'Marked absent today', color: C.red },
  ON_LEAVE: { label: 'On leave today', color: C.amber },
  LATE: { label: 'Marked late today', color: C.blue },
};

const QUICK_ACTIONS = [
  { href: `${BASE}/complaints`, label: 'Complaint', desc: 'Report an issue', icon: HiOutlineChatBubbleLeftEllipsis, color: C.amber },
  { href: `${BASE}/gatepass`, label: 'Gate pass', desc: 'Request to go out', icon: HiOutlineTicket, color: C.blue },
  { href: `${BASE}/fees`, label: 'Pay fees', desc: 'View invoices', icon: HiOutlineBanknotes, color: C.green },
  { href: '/dashboard/profile', label: 'Profile', desc: 'Update details', icon: HiOutlineUser, color: '#a78bfa' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionHeader({ title, href, linkLabel = 'View all' }) {
  return (
    <div className="sd-section-head">
      <h3>{title}</h3>
      {href && (
        <Link href={href} className="sd-link">
          {linkLabel} <HiOutlineArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ text, href, cta }) {
  return (
    <div className="sd-empty">
      <p>{text}</p>
      {href && <Link href={href} className="sd-link">{cta} <HiOutlineArrowRight size={14} /></Link>}
    </div>
  );
}

function Skeleton({ h = 18, w = '60%' }) {
  return <span className="sd-skeleton" style={{ height: h, width: w }} />;
}

export default function StudentDashboard() {
  const { user, checkAuth } = useAuthStore();
  const allocTried = useRef(false);
  const { socket, sendSOS, isConnected } = useSocket();
  const [sosSending, setSosSending] = useState(false);

  const triggerSOS = async () => {
    if (!window.confirm('Send an emergency SOS to the warden and staff right now?')) return;
    setSosSending(true);
    const res = await sendSOS({ message: 'Emergency! Immediate help needed.', location: roomCode ? `Room ${roomCode}` : undefined });
    setSosSending(false);
    if (res?.ok) toast.success('SOS sent. Help is on the way.');
    else toast.error('Could not send SOS. Call the warden directly.');
  };
  const reduced = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [fees, setFees] = useState({ invoices: [], totalDue: 0 });
  const [attendance, setAttendance] = useState({ percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null });
  const [room, setRoom] = useState(null);
  const [roomPulse, setRoomPulse] = useState(false);

  const loadData = async () => {
    const [cRes, fRes, aRes, roomRes] = await Promise.all([
      api.get('/complaints?limit=5').catch(() => ({ data: { complaints: [] } })),
      api.get('/fees/my').catch(() => ({ data: { invoices: [], totalDue: 0 } })),
      api.get('/attendance/my').catch(() => ({ data: { percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null } })),
      api.get('/rooms/me').catch(() => null),
    ]);
    setComplaints(cRes.data?.complaints || []);
    setFees(fRes.data || { invoices: [], totalDue: 0 });
    setAttendance(aRes.data || { percentage: 0, presentCount: 0, totalDays: 0, todayStatus: null });
    let myRoom = extractRoomFromMeResponse(roomRes);
    if (!myRoom && !allocTried.current) {
      allocTried.current = true;
      const alloc = await api.post('/rooms/me/allocate', {}).catch(() => null);
      myRoom = alloc?.success ? extractRoomFromMeResponse(alloc) : null;
      if (myRoom) {
        toast.success(`Room ${myRoom.roomId} assigned to you`);
        checkAuth();
      }
    }
    setRoom(myRoom);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useLiveRefresh(['complaint:updated', 'fee:updated', 'gatepass:updated'], () => loadData());

  useEffect(() => {
    if (!socket) return;
    const onAttendanceUpdate = () => loadData();
    const onRoom = (event) => {
      const eventUserId = event?.user?._id || event?.student?._id;
      const sameUser = eventUserId && String(eventUserId) === String(user?._id);
      const myCode = user?.studentProfile?.roomCode;
      const sameRoom = myCode && (event?.room?.roomId === myCode || event?.room?.roomCode === myCode);
      if (!sameUser && !sameRoom) return;
      loadData();
      if (!sameUser) return;
      setRoomPulse(true);
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

  const today = TODAY_STATUS[attendance.todayStatus];
  const hasAttendance = attendance.totalDays > 0;
  const openComplaints = complaints.filter((c) => ['OPEN', 'IN_PROGRESS', 'ESCALATED'].includes(c.status)).length;
  const roomCode = room?.roomId || user?.studentProfile?.roomCode;
  const capacity = room?.capacity || 0;
  const occupied = room?.occupied || 0;
  const profile = user?.studentProfile || {};

  const stats = [
    {
      href: `${BASE}/room`, icon: HiOutlineHome, label: 'My room', color: roomCode ? C.blue : C.muted,
      value: roomCode || 'Not assigned',
      sub: room ? `Room ${room.roomNumber} · ${occupied}/${capacity} beds` : 'Waiting for allocation',
    },
    {
      href: `${BASE}/attendance`, icon: HiOutlineCalendarDays, label: 'Attendance',
      color: !hasAttendance ? C.muted : attendance.percentage >= 75 ? C.green : C.red,
      value: hasAttendance ? `${attendance.percentage}%` : '—',
      sub: hasAttendance ? `${attendance.presentCount} of ${attendance.totalDays} days present` : 'No records yet',
      progress: hasAttendance ? attendance.percentage : null,
    },
    {
      href: `${BASE}/complaints`, icon: HiOutlineExclamationTriangle, label: 'Open complaints',
      color: openComplaints ? C.amber : C.muted,
      value: openComplaints,
      sub: openComplaints ? 'Being looked into' : 'All clear',
    },
    {
      href: `${BASE}/fees`, icon: HiOutlineBanknotes, label: 'Fees due',
      color: fees.totalDue ? C.red : C.green,
      value: `₹${(fees.totalDue || 0).toLocaleString('en-IN')}`,
      sub: fees.totalDue ? 'Tap to pay' : 'Nothing pending',
    },
  ];

  const rise = (i = 0) => (reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] } });

  return (
    <div className="sd">
      {/* Hero */}
      <motion.section {...rise(0)} className="glass sd-hero">
        <div style={{ minWidth: 0 }}>
          <div className="sd-hero-top">
            <p className="sd-eyebrow">{format(new Date(), 'EEEE, d MMMM')}</p>
            <button type="button" className="sd-sos" onClick={triggerSOS} disabled={sosSending || !isConnected}
              title={isConnected ? 'Send an emergency alert to the warden and staff' : 'Reconnecting…'}>
              <HiOutlineExclamationTriangle size={14} /> {sosSending ? 'Sending…' : 'SOS'}
            </button>
          </div>
          <h1 className="sd-title">
            {greeting()}, <span className="gradient-text">{user?.firstName || 'there'}</span>
          </h1>
          <div className="sd-chips">
            {profile.course && <span className="sd-chip">{profile.course}</span>}
            {profile.year && <span className="sd-chip">Year {profile.year}</span>}
            {profile.rollNumber && <span className="sd-chip">Roll {profile.rollNumber}</span>}
            {roomCode && <span className="sd-chip sd-chip-blue">Room {roomCode}</span>}
            {today && (
              <span className="sd-chip" style={{ color: today.color, borderColor: `${today.color}55`, background: `${today.color}14` }}>
                {today.label}
              </span>
            )}
          </div>
        </div>
        <div className="sd-actions">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className="sd-action">
              <span className="sd-action-icon" style={{ color: a.color, background: `${a.color}1f` }}>
                <a.icon size={18} />
              </span>
              <span style={{ minWidth: 0 }}>
                <strong>{a.label}</strong>
                <small>{a.desc}</small>
              </span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Stats */}
      <div className="sd-stats">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...rise(i + 1)}>
            <Link href={s.href} className="glass sd-stat">
              <div className="sd-stat-top">
                <span className="sd-stat-icon" style={{ color: s.color, background: `${s.color}1f` }}>
                  <s.icon size={20} />
                </span>
                <HiOutlineArrowRight className="sd-stat-arrow" size={16} />
              </div>
              <p className="sd-stat-label">{s.label}</p>
              {loading ? <Skeleton h={26} w="55%" /> : <p className="sd-stat-value">{s.value}</p>}
              {s.progress != null && (
                <div className="sd-bar"><span style={{ width: `${Math.min(s.progress, 100)}%`, background: s.color }} /></div>
              )}
              <p className="sd-stat-sub">{loading ? ' ' : s.sub}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {hasAttendance && attendance.percentage < 75 && (
        <motion.div {...rise(5)} className="sd-alert">
          <HiOutlineExclamationTriangle size={20} />
          <div>
            <strong>Attendance below 75%</strong>
            <p>You are at {attendance.percentage}%. Attend regularly to avoid disciplinary action.</p>
          </div>
        </motion.div>
      )}

      <div className="sd-grid">
        {/* Room */}
        <motion.section {...rise(5)} className={`glass sd-card${roomPulse ? ' room-live' : ''}`}>
          <SectionHeader title="My room" href={`${BASE}/room`} linkLabel="Details" />
          {loading ? (
            <><Skeleton h={30} w="40%" /><div style={{ height: 12 }} /><Skeleton h={14} w="70%" /></>
          ) : room ? (
            <>
              <div className="sd-room-head">
                <div>
                  <p className="sd-room-code">{room.roomId}</p>
                  <p className="sd-muted">Room {room.roomNumber} · {room.course}</p>
                </div>
                <StatusBadge status={room.status}>{room.status || 'Available'}</StatusBadge>
              </div>
              <div className="sd-beds" aria-label={`${occupied} of ${capacity} beds occupied`}>
                {Array.from({ length: capacity }).map((_, i) => (
                  <div key={i} className={`sd-bed${i < occupied ? ' taken' : ''}`}>
                    <span />
                    <small>{i < occupied ? 'Occupied' : 'Free'}</small>
                  </div>
                ))}
              </div>
              <p className="sd-muted" style={{ marginTop: 12 }}>
                {room.availableBeds} of {capacity} beds free
              </p>
            </>
          ) : (
            <EmptyState text="You don't have a room yet. The warden will allocate one soon." />
          )}
        </motion.section>

        {/* Fees */}
        <motion.section {...rise(6)} className="glass sd-card">
          <SectionHeader title="Fees" href={`${BASE}/fees`} />
          {loading ? (
            <Skeleton h={48} w="100%" />
          ) : fees.invoices?.length ? (
            <div className="sd-list">
              {fees.invoices.slice(0, 3).map((inv) => (
                <Link key={inv._id} href={`${BASE}/fees`} className="sd-row">
                  <div style={{ minWidth: 0 }}>
                    <p className="sd-row-title">{inv.invoiceId}</p>
                    <p className="sd-muted">{inv.academicYear} · Semester {inv.semester}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className="sd-row-title">₹{inv.totalAmount?.toLocaleString('en-IN')}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text="No invoices yet." />
          )}
        </motion.section>

        {/* Complaints */}
        <motion.section {...rise(7)} className="glass sd-card sd-span">
          <SectionHeader title="Recent complaints" href={`${BASE}/complaints`} />
          {loading ? (
            <Skeleton h={48} w="100%" />
          ) : complaints.length ? (
            <div className="sd-list">
              {complaints.slice(0, 5).map((c) => (
                <Link key={c._id} href={`${BASE}/complaints`} className="sd-row">
                  <div style={{ minWidth: 0 }}>
                    <p className="sd-row-title">{c.title}</p>
                    <p className="sd-muted">{c.ticketId} · {c.category}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text="No complaints filed. Something broken in your room?" href={`${BASE}/complaints`} cta="Raise a complaint" />
          )}
        </motion.section>
      </div>
    </div>
  );
}
