'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineShieldCheck,
  HiOutlineFunnel,
  HiOutlineQrCode,
  HiOutlineUser,
} from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  PENDING:  { label: 'Pending',  bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  APPROVED: { label: 'Approved', bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  USED:     { label: 'Used',     bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  EXPIRED:  { label: 'Expired',  bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
};

export default function StaffGatepassesPage() {
  const [passes, setPasses]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [reason, setReason]     = useState('');
  const [acting, setActing]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gatepasses?limit=50');
      if (res.success) setPasses(res.data?.gatePasses || res.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL' ? passes : passes.filter(p => p.status === filter);

  const approve = async () => {
    setActing(true);
    try {
      const res = await api.put(`/gatepasses/${selected._id}/approve`);
      if (res.success) { toast.success('Gate pass approved ✓'); load(); setSelected(null); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setActing(false);
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error('Please provide a rejection reason');
    setActing(true);
    try {
      const res = await api.put(`/gatepasses/${selected._id}/reject`, { rejectionReason: reason });
      if (res.success) { toast.success('Gate pass rejected'); setReason(''); load(); setSelected(null); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setActing(false);
  };

  const markUsed = async () => {
    setActing(true);
    try {
      const res = await api.put(`/gatepasses/${selected._id}/scan`);
      if (res.success) { toast.success('Marked as Used ✓'); load(); setSelected(null); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setActing(false);
  };

  const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED'];

  const stats = [
    { icon: HiOutlineDocumentText, label: 'Total',    value: passes.length,                                   color: '#7c3aed' },
    { icon: HiOutlineClock,        label: 'Pending',  value: passes.filter(p => p.status === 'PENDING').length,  color: '#3b82f6' },
    { icon: HiOutlineCheckCircle,  label: 'Approved', value: passes.filter(p => p.status === 'APPROVED').length, color: '#10b981' },
    { icon: HiOutlineXCircle,      label: 'Rejected', value: passes.filter(p => p.status === 'REJECTED').length, color: '#ef4444' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
          Gate <span className="gradient-text">Passes</span>
        </h1>
        <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>
          Review and approve student exit/entry gate pass requests
        </p>
      </div>

      {/* Stats */}
      <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-box icon-box-md" style={{ background: `${s.color}18`, border: `1px solid ${s.color}25` }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#64748b' }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineFunnel size={16} style={{ color: '#64748b', marginRight: 4 }} />
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filter === f ? '#7c3aed' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#fff' : '#94a3b8', transition: 'all 0.2s',
            }}>{f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{filtered.length} pass{filtered.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
          <HiOutlineShieldCheck size={48} style={{ color: '#7c3aed', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>No gate passes found</p>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Nothing in the {filter} filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((p, i) => {
            const ss = STATUS_STYLES[p.status] || STATUS_STYLES.PENDING;
            return (
              <motion.div key={p._id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="glass card-hover"
                style={{ padding: 20, borderRadius: 14, cursor: 'pointer', borderLeft: `3px solid ${ss.color}` }}
                onClick={() => { setSelected(p); setReason(''); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <HiOutlineUser size={13} style={{ color: '#64748b' }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {p.studentId?.firstName} {p.studentId?.lastName}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>• {p.passType || 'DAY'} pass</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>{p.reason || 'No reason provided'}</p>
                    <div style={{ fontSize: 11, color: '#475569', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>🕐 Out: {p.outTime ? new Date(p.outTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                      <span>🕐 In:  {p.inTime  ? new Date(p.inTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })  : '—'}</span>
                    </div>
                  </div>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                    {ss.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setSelected(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              className="glass" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 20 }}
              onClick={e => e.stopPropagation()}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <HiOutlineQrCode size={18} style={{ color: '#7c3aed' }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.passId || 'GP-XXXXX'}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: (STATUS_STYLES[selected.status] || {}).bg,
                      color: (STATUS_STYLES[selected.status] || {}).color }}>
                      {selected.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                    {selected.studentId?.firstName} {selected.studentId?.lastName}
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selected.studentId?.email}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}>✕</button>
              </div>

              <div style={{ background: 'rgba(15,15,35,0.5)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{selected.reason || 'No reason provided'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: 12 }}>
                {[
                  ['Pass Type', selected.passType || 'DAY'],
                  ['Destination', selected.destination || '—'],
                  ['Out Time', selected.outTime ? new Date(selected.outTime).toLocaleString('en-IN') : '—'],
                  ['Return Time', selected.inTime  ? new Date(selected.inTime).toLocaleString('en-IN')  : '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(15,15,35,0.4)', borderRadius: 8, padding: 10 }}>
                    <span style={{ color: '#64748b' }}>{label}</span>
                    <p style={{ fontWeight: 600, marginTop: 2 }}>{val}</p>
                  </div>
                ))}
              </div>

              {selected.status === 'PENDING' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      Rejection Reason (required only for reject)
                    </label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)}
                      className="input-field" rows={2} placeholder="Reason for rejection…" style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={reject} disabled={acting} className="btn-secondary"
                      style={{ flex: 1, padding: 12, fontSize: 13, color: '#f87171', borderColor: '#f87171' }}>
                      {acting ? '…' : '✕ Reject'}
                    </button>
                    <button onClick={approve} disabled={acting} className="btn-primary"
                      style={{ flex: 1, padding: 12, fontSize: 13 }}>
                      {acting ? '…' : '✓ Approve'}
                    </button>
                  </div>
                </>
              )}

              {selected.status === 'APPROVED' && (
                <button onClick={markUsed} disabled={acting} className="btn-primary"
                  style={{ width: '100%', padding: 12, fontSize: 13 }}>
                  {acting ? 'Updating…' : '📲 Scan / Mark as Used'}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
