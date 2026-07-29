'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_CLASSES = {
  OPEN: 'badge-open', IN_PROGRESS: 'badge-progress',
  RESOLVED: 'badge-resolved', CLOSED: 'badge-resolved', ESCALATED: 'badge-critical',
};
const PRIORITY_COLORS = { LOW: '#6fae66', MEDIUM: '#f4a259', HIGH: '#e15554', CRITICAL: '#dc2626' };

export default function WardenComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState({ status: '', priority: '' });
  const [selected, setSelected]     = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' });
  const [updating, setUpdating]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.priority) params.set('priority', filter.priority);
      params.set('limit', '30');
      const res = await api.get(`/complaints?${params}`);
      if (res.success) setComplaints(res.data?.complaints || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter.status, filter.priority]);

  const updateStatus = async () => {
    if (!statusUpdate.status) return toast.error('Select a status');
    setUpdating(true);
    try {
      const res = await api.put(`/complaints/${selected._id}/status`, statusUpdate);
      if (res.success) {
        toast.success('Status updated ✓');
        setSelected(null);
        setStatusUpdate({ status: '', note: '' });
        load();
      } else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setUpdating(false);
  };

  const openCount      = complaints.filter(c => c.status === 'OPEN').length;
  const progressCount  = complaints.filter(c => c.status === 'IN_PROGRESS').length;
  const resolvedCount  = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700 }}>
          <span className="gradient-text">Complaints</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 14 }}>
          Track and manage complaints in your hostel
        </p>
      </div>

      {/* Stats */}
      <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: HiOutlineExclamationTriangle, label: 'Total', value: complaints.length, color: 'var(--color-primary)' },
          { icon: HiOutlineClock, label: 'Open', value: openCount, color: '#3b82f6' },
          { icon: HiOutlineCpuChip, label: 'In Progress', value: progressCount, color: 'var(--color-warning)' },
          { icon: HiOutlineCheckCircle, label: 'Resolved', value: resolvedCount, color: 'var(--color-success)' },
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
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineFunnel size={16} style={{ color: 'var(--color-text-muted)' }} />
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="input-field" style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Status</option>
          {['OPEN','IN_PROGRESS','RESOLVED','CLOSED','ESCALATED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
          className="input-field" style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Priority</option>
          {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {complaints.length} complaint{complaints.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
          <HiOutlineCheckCircle size={48} style={{ color: 'var(--color-success)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 16 }}>All clear!</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>No complaints match the current filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.map((c, i) => (
            <motion.div key={c._id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="glass card-hover"
              style={{ padding: 20, borderRadius: 14, cursor: 'pointer', borderLeft: `3px solid ${PRIORITY_COLORS[c.priority] || '#a89f92'}` }}
              onClick={() => { setSelected(c); setStatusUpdate({ status: '', note: '' }); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{c.ticketId}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: `${PRIORITY_COLORS[c.priority]}18`, color: PRIORITY_COLORS[c.priority] }}>
                      {c.priority}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(226,114,91,0.1)', color: 'var(--color-primary-light)' }}>
                      {c.category}
                    </span>
                    {c.aiClassification?.isEmergency && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(225,85,84,0.15)', color: '#f87171', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <HiOutlineCpuChip size={10} /> EMERGENCY
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Fraunces', serif" }}>{c.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                    {c.description?.substring(0, 120)}…
                  </p>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>👤 {c.studentId?.firstName} {c.studentId?.lastName}</span>
                    <span>🗓 {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <span className={STATUS_CLASSES[c.status] || 'badge-pending'}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  {c.status?.replace('_', ' ')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail + Update Modal */}
      <AnimatePresence>
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setSelected(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              className="glass" style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 20 }}
              onClick={e => e.stopPropagation()}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{selected.ticketId}</span>
                    <span className={STATUS_CLASSES[selected.status] || 'badge-pending'}
                      style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>
                      {selected.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{selected.title}</h3>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 20 }}>✕</button>
              </div>

              <div style={{ background: 'rgba(23,20,15,0.5)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{selected.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: 12 }}>
                {[
                  ['Category', selected.category],
                  ['Priority', selected.priority],
                  ['Student', `${selected.studentId?.firstName || ''} ${selected.studentId?.lastName || ''}`],
                  ['Date', new Date(selected.createdAt).toLocaleDateString('en-IN')],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(23,20,15,0.4)', borderRadius: 8, padding: 10 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                    <p style={{ fontWeight: 600, marginTop: 2 }}>{val}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>Update Status</label>
                <select value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value }))}
                  className="input-field">
                  <option value="">Select Status</option>
                  {['OPEN','IN_PROGRESS','RESOLVED','CLOSED','ESCALATED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>Note</label>
                <textarea value={statusUpdate.note} onChange={e => setStatusUpdate(s => ({ ...s, note: e.target.value }))}
                  className="input-field" rows={3} placeholder="Add a note…" style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setSelected(null)} className="btn-secondary" style={{ flex: 1, padding: 12 }}>Cancel</button>
                <button onClick={updateStatus} disabled={updating} className="btn-primary" style={{ flex: 1, padding: 12 }}>
                  {updating ? 'Updating…' : '✓ Update'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
