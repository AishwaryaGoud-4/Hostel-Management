'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiCheckCircle, FiXCircle, FiPercent, FiClock, FiTrendingUp } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { useSocket } from '@/store/socketProvider';
import toast from 'react-hot-toast';

/* ── Wanderlust Dusk tokens ──────────────────────────────────── */
const T = {
  primary:     '#e2725b',
  primaryLight:'#f2a679',
  accent:      '#2a9d8f',
  success:     '#6fae66',
  warning:     '#f4a259',
  danger:      '#e15554',
  textMuted:   '#a89f92',
  border:      '#34302a',
  bgCard:      '#211d18',
  text:        '#f5ece3',
};

const STATUS_COLORS = {
  PRESENT: { color: T.success, bg: `${T.success}14`, border: `${T.success}33`, label: '✅ Present' },
  ABSENT:  { color: T.danger,  bg: `${T.danger}14`,  border: `${T.danger}33`,  label: '❌ Absent' },
  ON_LEAVE:{ color: T.warning, bg: `${T.warning}14`, border: `${T.warning}33`, label: '🟡 On Leave' },
  LATE:    { color: T.primaryLight, bg: `${T.primaryLight}14`, border: `${T.primaryLight}33`, label: '⏰ Late' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TOOLTIP_STYLE = {
  background: T.bgCard,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  color: T.text,
};

export default function StudentAttendancePage() {
  const { socket } = useSocket();
  const [data, setData] = useState({ records: [], percentage: 0, presentCount: 0, totalDays: 0, monthlyStats: [], todayStatus: null });

  const loadAttendance = useCallback(async () => {
    try {
      const res = await api.get('/attendance/my?limit=60');
      if (res?.success !== false) setData(res.data || data);
    } catch {}
  }, []);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  // Real-time: refresh when attendance is updated for this student
  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => {
      loadAttendance();
      toast('Your attendance has been updated!', { icon: '📋', duration: 4000 });
    };
    socket.on('attendance:updated', onUpdate);
    return () => { socket.off('attendance:updated', onUpdate); };
  }, [socket, loadAttendance]);

  const getColor = (pct) => pct >= 75 ? T.success : pct >= 50 ? T.warning : T.danger;
  const todayInfo = STATUS_COLORS[data.todayStatus] || null;

  // Build chart data from monthlyStats
  const chartData = (data.monthlyStats || []).map(m => ({
    name: MONTHS[(m._id?.month || 1) - 1],
    Present: m.present || 0,
    Absent: m.absent || 0,
    Late: m.late || 0,
    'On Leave': m.onLeave || 0,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>My <span className="gradient-text">Attendance</span></h1>
        {/* Today's status badge */}
        {todayInfo ? (
          <div style={{ padding: '8px 18px', borderRadius: 12, background: todayInfo.bg, border: `1px solid ${todayInfo.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: todayInfo.color }}>{todayInfo.label}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Today</span>
          </div>
        ) : (
          <div style={{ padding: '8px 18px', borderRadius: 12, background: `${T.textMuted}14`, border: `1px solid ${T.textMuted}33` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>Not Marked Yet</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { icon: FiPercent, label: 'Attendance %', value: `${data.percentage}%`, color: getColor(data.percentage) },
          { icon: FiCheckCircle, label: 'Present Days', value: data.presentCount, color: T.success },
          { icon: FiXCircle, label: 'Absent Days', value: data.totalDays - data.presentCount, color: T.danger },
          { icon: FiCalendar, label: 'Total Days', value: data.totalDays, color: T.accent },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress Ring + Warning */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="glass" style={{ padding: 28, borderRadius: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Attendance Progress</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 160, height: 160 }}>
            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="80" cy="80" r="70" fill="none" stroke={T.border} strokeWidth="10" />
              <circle cx="80" cy="80" r="70" fill="none" stroke={getColor(data.percentage)} strokeWidth="10"
                strokeDasharray={`${(data.percentage / 100) * 440} 440`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: getColor(data.percentage) }}>{data.percentage}%</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Attendance</span>
            </div>
          </div>
          <div>
            <p style={{ color: data.percentage >= 75 ? T.success : T.danger, fontWeight: 600, fontSize: 14 }}>
              {data.percentage >= 75 ? '✅ Good Standing' : '⚠️ Below Minimum (75%)'}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 8, maxWidth: 260, lineHeight: 1.5 }}>
              {data.percentage >= 75
                ? 'Great job! Keep maintaining your attendance above 75%.'
                : 'Your attendance is below 75%. Please improve to avoid penalties.'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Monthly Analytics Chart */}
      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <FiTrendingUp size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Monthly Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" stroke={T.textMuted} fontSize={12} />
              <YAxis stroke={T.textMuted} fontSize={12} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="Present" fill={T.success} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Absent" fill={T.danger} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Late" fill={T.primaryLight} radius={[4, 4, 0, 0]} />
              <Bar dataKey="On Leave" fill={T.warning} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            {[{ label: 'Present', color: T.success }, { label: 'Absent', color: T.danger }, { label: 'Late', color: T.primaryLight }, { label: 'On Leave', color: T.warning }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Attendance History Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Attendance History</h3>
        {data.records?.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No attendance records yet.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {data.records?.map((r, i) => {
              const st = STATUS_COLORS[r.status] || STATUS_COLORS[r.isPresent ? 'PRESENT' : 'ABSENT'];
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                  style={{ padding: 12, borderRadius: 10, textAlign: 'center', background: st.bg, border: `1px solid ${st.border}` }}>
                  <p style={{ fontSize: 12, fontWeight: 600 }}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  <p style={{ fontSize: 11, color: st.color, fontWeight: 600, marginTop: 4 }}>{r.status || (r.isPresent ? 'PRESENT' : 'ABSENT')}</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.method}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
