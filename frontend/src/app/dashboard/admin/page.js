'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineBuildingOffice2,
  HiOutlineUsers,
  HiOutlineExclamationTriangle,
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineSignal,
} from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCountUp } from '@/hooks/useCountUp';

/* ── Wanderlust Dusk chart tokens ─────────────────────────────
   All colours reference the design system. CSS custom properties
   can't be read directly by recharts (SVG fill), so we mirror
   the token values here as constants.
──────────────────────────────────────────────────────────────── */
const TOKENS = {
  primary:      '#e2725b', // var(--color-primary)
  primaryLight: '#f2a679', // var(--color-primary-light)
  accent:       '#2a9d8f', // var(--color-accent)
  accentLight:  '#5fc9ba', // var(--color-accent-light)
  success:      '#6fae66', // var(--color-success)
  warning:      '#f4a259', // var(--color-warning)
  danger:       '#e15554', // var(--color-danger)
  textMuted:    '#a89f92', // var(--color-text-muted)
  text:         '#f5ece3', // var(--color-text)
  bgCard:       '#211d18', // var(--color-bg-card)
  border:       '#34302a', // var(--color-border)
};

const PIE_COLORS = [TOKENS.primary, TOKENS.accent, TOKENS.success, TOKENS.warning, TOKENS.danger];

const TOOLTIP_STYLE = {
  background: TOKENS.bgCard,
  border: `1px solid ${TOKENS.border}`,
  borderRadius: 8,
  color: TOKENS.text,
};

/* ── KPI Card with count-up ───────────────────────────────────── */
const KPICard = ({ icon: Icon, label, value, change, color, delay, reduced }) => {
  const displayValue = useCountUp(typeof value === 'number' ? value : 0, 0.8);

  /* Management personality: fade-in-down (top-down authoritative reveal),
     slightly slower stagger (0.15-0.2s increments) */
  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: -16 }, animate: { opacity: 1, y: 0 },
        transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] } };

  return (
    <motion.div {...motionProps} className="glass card-hover" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 32, fontWeight: 800 }}>{typeof value === 'number' ? displayValue : value}</p>
          {change && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12,
              color: change > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {change > 0 ? <HiOutlineArrowTrendingUp size={14} /> : <HiOutlineArrowTrendingDown size={14} />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className="icon-box icon-box-md" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </motion.div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const reduced = useReducedMotion();
  const [stats, setStats] = useState(null);
  const [complaintStats, setComplaintStats] = useState(null);
  const [feeStats, setFeeStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [hostelRes, complaintRes, feeRes] = await Promise.all([
        api.get('/hostels/stats').catch(() => ({ data: {} })),
        api.get('/complaints/stats').catch(() => ({ data: {} })),
        api.get('/fees/stats').catch(() => ({ data: {} })),
      ]);
      setStats(hostelRes.data?.overview || {});
      setComplaintStats(complaintRes.data || {});
      setFeeStats(feeRes.data || {});
    };
    load();
  }, []);

  const complaintPieData = complaintStats?.byStatus?.map((s) => ({ name: s._id, value: s.count })) || [];
  const categoryData = complaintStats?.byCategory?.map((c) => ({ name: c._id, value: c.count })) || [];

  // Mock trend data — fixed values to avoid SSR/client hydration mismatch
  const trendData = useMemo(() => [
    { day: 'Mon', complaints: 8,  resolved: 6,  fees: 18200 },
    { day: 'Tue', complaints: 12, resolved: 9,  fees: 23500 },
    { day: 'Wed', complaints: 5,  resolved: 5,  fees: 11800 },
    { day: 'Thu', complaints: 14, resolved: 11, fees: 31000 },
    { day: 'Fri', complaints: 7,  resolved: 6,  fees: 15400 },
    { day: 'Sat', complaints: 3,  resolved: 3,  fees: 8900  },
    { day: 'Sun', complaints: 6,  resolved: 4,  fees: 12600 },
  ], []);

  /* Management stagger: 0.18s increments (calmer pace) */
  const stagger = 0.18;

  /* Chart motion — fade-in-down for authoritative top-down reveal */
  const chartMotion = (i) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: -12 }, animate: { opacity: 1, y: 0 },
        transition: { delay: 0.4 + i * stagger, duration: 0.5, ease: [0.16, 1, 0.3, 1] } };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800 }}>
          Welcome back, <span className="gradient-text-animated">{user?.firstName}</span> 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 14 }}>
          Here&apos;s what&apos;s happening across your hostels today.
        </p>
      </div>

      {/* KPI Cards — management: fade-in-down, 0.18s stagger, count-up values */}
      <div className="responsive-grid-4" style={{ marginBottom: 28 }}>
        <KPICard icon={HiOutlineBuildingOffice2} label="Total Hostels" value={stats?.totalHostels || 0} change={5}  color={TOKENS.primary}  delay={0}           reduced={reduced} />
        <KPICard icon={HiOutlineUsers}           label="Total Beds"    value={stats?.totalBeds || 0}    change={12} color={TOKENS.accent}   delay={stagger}     reduced={reduced} />
        <KPICard icon={HiOutlineSignal}          label="Occupied Beds" value={stats?.occupiedBeds || 0}  change={-3} color={TOKENS.success}  delay={stagger * 2} reduced={reduced} />
        <KPICard icon={HiOutlineExclamationTriangle} label="Open Complaints"
          value={complaintStats?.byStatus?.find(s => s._id === 'OPEN')?.count || 0}
          change={-8} color={TOKENS.warning} delay={stagger * 3} reduced={reduced} />
      </div>

      {/* Charts Row */}
      <div className="responsive-grid-2" style={{ marginBottom: 28 }}>
        {/* Complaint Trend — AreaChart with Wanderlust Dusk tokens */}
        <motion.div {...chartMotion(0)} className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 className="animate-fade-in-down stagger-1" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Weekly Complaint Trend</h3>
          <ResponsiveContainer width="100%" height={250} className="chart-responsive">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TOKENS.primary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={TOKENS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TOKENS.success} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={TOKENS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.border} />
              <XAxis dataKey="day" stroke={TOKENS.textMuted} fontSize={12} />
              <YAxis stroke={TOKENS.textMuted} fontSize={12} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="complaints" stroke={TOKENS.primary} fill="url(#colorComplaints)" strokeWidth={2}
                isAnimationActive={!reduced} animationDuration={700} animationEasing="ease-out" />
              <Area type="monotone" dataKey="resolved" stroke={TOKENS.success} fill="url(#colorResolved)" strokeWidth={2}
                isAnimationActive={!reduced} animationDuration={700} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Complaint Status Pie */}
        <motion.div {...chartMotion(1)} className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 className="animate-fade-in-down stagger-2" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Complaints by Status</h3>
          <ResponsiveContainer width="100%" height={250} className="chart-responsive">
            <PieChart>
              <Pie data={complaintPieData.length ? complaintPieData : [{ name: 'No Data', value: 1 }]}
                cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                isAnimationActive={!reduced} animationDuration={800} animationEasing="ease-out"
              >
                {(complaintPieData.length ? complaintPieData : [{}]).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {complaintPieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Category Bar Chart */}
      <motion.div {...chartMotion(2)} className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 className="animate-fade-in-down stagger-3" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Complaints by Category</h3>
        <ResponsiveContainer width="100%" height={300} className="chart-responsive">
          <BarChart data={categoryData.length ? categoryData : trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.border} />
            <XAxis dataKey="name" stroke={TOKENS.textMuted} fontSize={12} />
            <YAxis stroke={TOKENS.textMuted} fontSize={12} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" fill={TOKENS.primary} radius={[6, 6, 0, 0]}
              isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
