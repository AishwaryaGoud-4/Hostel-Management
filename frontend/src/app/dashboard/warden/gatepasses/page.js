'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineFunnel,
  HiOutlineQrCode,
  HiOutlineUser,
} from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  PENDING:  { label: 'Pending',  bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd' },
  APPROVED: { label: 'Approved', bg: 'rgba(111,174,102,0.15)', color: '#6fae66' },
  REJECTED: { label: 'Rejected', bg: 'rgba(225,85,84,0.15)',   color: '#e15554' },
  USED:     { label: 'Used',     bg: 'rgba(168,159,146,0.15)', color: '#a89f92' },
  EXPIRED:  { label: 'Expired',  bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
};

export default function WardenGatepassesPage() {
  const [passes, setPasses]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [reason, setReason]     = useState('');
  const [acting, setActing]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gate-passes?limit=50');
      if (res.success) setPasses(res.data?.passes || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL' ? passes : passes.filter(p => p.status === filter);

  const approve = async () => {
    setActing(true);
    try {
      const res = await api.put(`/gate-passes/${selected._id}/approve`);
      if (res.success) { toast.success('Gate pass approved ✓'); load(); setSelected(null); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setActing(false);
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error('Provide a rejection reason');
    setActing(true);
    try {
      const res = await api.put(`/gate-passes/${selected._id}/reject`, { rejectionReason: reason });
      if (res.success) { toast.success('Gate pass rejected'); setReason(''); load(); setSelected(null); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setActing(false);
  };

  const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700 }}>
          Gate <span className="gradient-text">Passes</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 14 }}>
          Review and approve student gate pass requests
        </p>
      </div>

      {/* Stats */}
      <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: HiOutlineDocumentText, label: 'Total',    value: passes.length,                                   color: 'var(--color-primary)' },
          { icon: HiOutlineClock,        label: 'Pending',  value: passes.filter(p => p.status === 'PENDING').length,  color: '#3b82f6' },
          { icon: HiOutlineCheckCircle,  label: 'Approved', value: passes.filter(p => p.status === 'APPROVED').length, color: 'var(--color-success)' },
          { icon: HiOutlineXCircle,      label: 'Rejected', value: passes.filter(p => p.status === 'REJECTED').length, color: 'var(--color-danger)' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-box icon-box-md" style={{ background: `${s.color}18` }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineFunnel size={16} style={{ color: 'var(--color-text-muted)', marginRight: 4 }} />
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filter === f ? 'var(--color-primary)' : 'rgba(226,114,91,0.08)',
              color: filter === f ? '#fff' : 'var(--color-text-muted)', transition: 'all 0.15s',
            }}>{f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {filtered.length} pass{filtered.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
          <HiOutlineDocumentText size={48} style={{ color: 'var(--color-accent)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 16 }}>No gate passes</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>Nothing in the {filter} filter.</p>
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
                onClick={() => { setSelected(p); setReason(''); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <HiOutlineUser size={13} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {p.studentId?.firstName} {p.studentId?.lastName}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>• {p.passType || 'DAY'}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>{p.reason || 'No reason provided'}</p>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>🕐 Out: {p.outTime ? new Date(p.outTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                      <span>🕐 In: {p.inTime ? new Date(p.inTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
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

      {/* Detail / Approve / Reject Modal */}
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
                    <HiOutlineQrCode size={18} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.passId || 'Gate Pass'}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: (STATUS_STYLES[selected.status] || {}).bg,
                      color: (STATUS_STYLES[selected.status] || {}).color }}>
                      {selected.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
                    {selected.studentId?.firstName} {selected.studentId?.lastName}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{selected.studentId?.email}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 20 }}>✕</button>
              </div>

              <div style={{ background: 'rgba(23,20,15,0.5)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{selected.reason || 'No reason provided'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: 12 }}>
                {[
                  ['Pass Type', selected.passType || 'DAY'],
                  ['Destination', selected.destination || '—'],
                  ['Out Time', selected.outTime ? new Date(selected.outTime).toLocaleString('en-IN') : '—'],
                  ['Return Time', selected.inTime ? new Date(selected.inTime).toLocaleString('en-IN') : '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(23,20,15,0.4)', borderRadius: 8, padding: 10 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                    <p style={{ fontWeight: 600, marginTop: 2 }}>{val}</p>
                  </div>
                ))}
              </div>

              {selected.status === 'PENDING' && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)}
                      className="input-field" rows={2} placeholder="Reason for rejection…" style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={reject} disabled={acting} className="btn-secondary"
                      style={{ flex: 1, padding: 12, fontSize: 13, color: '#e15554', borderColor: '#e15554' }}>
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
                <div style={{ textAlign: 'center', padding: '16px 0 0' }}>
                  <HiOutlineCheckCircle size={40} style={{ color: 'var(--color-success)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-success)' }}>Approved — awaiting student usage</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
