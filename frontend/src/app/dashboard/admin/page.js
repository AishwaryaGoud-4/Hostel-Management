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

const KPICard = ({ icon: Icon, label, value, change, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="glass card-hover" style={{ padding: 24, borderRadius: 16 }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 32, fontWeight: 800 }}>{value}</p>
        {change && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: change > 0 ? '#10b981' : '#ef4444' }}>
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

export default function AdminDashboard() {
  const { user } = useAuthStore();
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

  const pieColors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
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

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800 }}>Welcome back, <span className="gradient-text">{user?.firstName}</span> 👋</h1>
        <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>Here&apos;s what&apos;s happening across your hostels today.</p>
      </div>

      {/* KPI Cards */}
      <div className="responsive-grid-4" style={{ marginBottom: 28 }}>
        <KPICard icon={HiOutlineBuildingOffice2} label="Total Hostels" value={stats?.totalHostels || 0} change={5} color="#7c3aed" delay={0} />
        <KPICard icon={HiOutlineUsers} label="Total Beds" value={stats?.totalBeds || 0} change={12} color="#06b6d4" delay={0.1} />
        <KPICard icon={HiOutlineSignal} label="Occupied Beds" value={stats?.occupiedBeds || 0} change={-3} color="#10b981" delay={0.2} />
        <KPICard icon={HiOutlineExclamationTriangle} label="Open Complaints" value={complaintStats?.byStatus?.find(s => s._id === 'OPEN')?.count || 0} change={-8} color="#f59e0b" delay={0.3} />
      </div>

      {/* Charts Row */}
      <div className="responsive-grid-2" style={{ marginBottom: 28 }}>
        {/* Complaint Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass" style={{ padding: 24, borderRadius: 16 }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Weekly Complaint Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 8, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="complaints" stroke="#7c3aed" fill="url(#colorComplaints)" strokeWidth={2} />
              <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="url(#colorResolved)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Complaint Status Pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass" style={{ padding: 24, borderRadius: 16 }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Complaints by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={complaintPieData.length ? complaintPieData : [{ name: 'No Data', value: 1 }]}
                cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
              >
                {(complaintPieData.length ? complaintPieData : [{}]).map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 8, color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {complaintPieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: pieColors[i % pieColors.length] }} />
                <span style={{ color: '#94a3b8' }}>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Category Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass" style={{ padding: 24, borderRadius: 16 }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Complaints by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData.length ? categoryData : trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 8, color: '#e2e8f0' }} />
            <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
