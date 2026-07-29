'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiCheckCircle, FiXCircle, FiPercent } from 'react-icons/fi';
import api from '@/lib/api';

export default function StudentAttendancePage() {
  const [data, setData] = useState({ records: [], percentage: 0, presentCount: 0, totalDays: 0 });

  useEffect(() => {
    api.get('/attendance/my?limit=60').then(res => {
      if (res.success) setData(res.data);
    }).catch(() => {});
  }, []);

  const getColor = (pct) => pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Attendance</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { icon: FiPercent, label: 'Attendance %', value: `${data.percentage}%`, color: getColor(data.percentage) },
          { icon: FiCheckCircle, label: 'Present Days', value: data.presentCount, color: '#10b981' },
          { icon: FiXCircle, label: 'Absent Days', value: data.totalDays - data.presentCount, color: '#ef4444' },
          { icon: FiCalendar, label: 'Total Days', value: data.totalDays, color: '#7c3aed' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress Ring */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="glass" style={{ padding: 28, borderRadius: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Attendance Progress</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 160, height: 160 }}>
            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="80" cy="80" r="70" fill="none" stroke="#2d2d44" strokeWidth="10" />
              <circle cx="80" cy="80" r="70" fill="none" stroke={getColor(data.percentage)} strokeWidth="10"
                strokeDasharray={`${(data.percentage / 100) * 440} 440`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: getColor(data.percentage) }}>{data.percentage}%</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Attendance</span>
            </div>
          </div>
          <div>
            <p style={{ color: data.percentage >= 75 ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: 14 }}>
              {data.percentage >= 75 ? '✅ Good Standing' : '⚠️ Below Minimum (75%)'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
              You need at least 75% attendance to be in good standing.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Records */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Records</h3>
        {data.records?.length === 0 ? <p style={{ color: '#94a3b8' }}>No attendance records yet.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {data.records?.map((r, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 10, textAlign: 'center', background: r.isPresent ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${r.isPresent ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <p style={{ fontSize: 12, fontWeight: 600 }}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                <p style={{ fontSize: 11, color: r.isPresent ? '#10b981' : '#ef4444', fontWeight: 600, marginTop: 4 }}>{r.isPresent ? 'Present' : 'Absent'}</p>
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{r.method}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
