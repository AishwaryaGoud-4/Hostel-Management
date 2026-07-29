'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiTrendingUp, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';

export default function AdminFeesPage() {
  const [stats, setStats] = useState({ byStatus: [], revenue: {} });
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    const [sRes, iRes] = await Promise.all([
      api.get('/fees/stats').catch(() => ({ data: {} })),
      api.get(`/fees/invoices?status=${statusFilter}&limit=15`).catch(() => ({ data: { invoices: [] } })),
    ]);
    setStats(sRes.data || { byStatus: [], revenue: {} });
    setInvoices(iRes.data?.invoices || []);
    setPagination(iRes.pagination || {});
  };
  useEffect(() => { load(); }, [statusFilter]);

  const pieColors = ['#94a3b8', '#f59e0b', '#10b981', '#ef4444', '#7c3aed'];
  const statusColors = { PENDING: '#94a3b8', PARTIAL: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444', WAIVED: '#7c3aed' };

  const kpis = [
    { icon: FiDollarSign, label: 'Total Billed', value: `₹${(stats.revenue?.total || 0).toLocaleString()}`, color: '#7c3aed' },
    { icon: FiCheckCircle, label: 'Collected', value: `₹${(stats.revenue?.collected || 0).toLocaleString()}`, color: '#10b981' },
    { icon: FiAlertTriangle, label: 'Late Fees', value: `₹${(stats.revenue?.lateFees || 0).toLocaleString()}`, color: '#ef4444' },
    { icon: FiTrendingUp, label: 'Collection Rate', value: `${stats.revenue?.total ? ((stats.revenue.collected / stats.revenue.total) * 100).toFixed(1) : 0}%`, color: '#06b6d4' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Financial Management</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Fee collection, invoices, and revenue analytics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {kpis.map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass card-hover" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={22} color={k.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800 }}>{k.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Revenue by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.byStatus?.map(s => ({ name: s._id, value: s.totalAmount })) || []}
                cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value">
                {(stats.byStatus || []).map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(val) => `₹${val.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {stats.byStatus?.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: pieColors[i % pieColors.length] }} />
                <span style={{ color: '#94a3b8' }}>{s._id} ({s.count})</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Collection Summary</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.byStatus?.map(s => ({ name: s._id, billed: s.totalAmount, collected: s.collected })) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(val) => `₹${val.toLocaleString()}`} />
              <Bar dataKey="billed" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Invoices Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d2d44' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Invoices</h3>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: 140 }}>
            <option value="">All</option>
            {['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2d2d44' }}>
                {['Invoice', 'Student', 'Amount', 'Paid', 'Due Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv._id} style={{ borderBottom: '1px solid rgba(45,45,68,0.4)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{inv.invoiceId}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{inv.studentId?.firstName} {inv.studentId?.lastName}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>₹{inv.totalAmount?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#10b981' }}>₹{inv.paidAmount?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${statusColors[inv.status]}15`, color: statusColors[inv.status] }}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invoices.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32, fontSize: 14 }}>No invoices found.</p>}
      </motion.div>
    </div>
  );
}
