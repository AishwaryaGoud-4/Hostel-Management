'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineWrenchScrewdriver,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCpuChip,
  HiOutlineFunnel,
  HiOutlineChevronDown,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', RESOLVED: '#10b981',
  CLOSED: '#6b7280', ESCALATED: '#ef4444',
};
const PRIORITY_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#dc2626' };
const STATUS_CLASSES  = {
  OPEN: 'badge-open', IN_PROGRESS: 'badge-progress',
  RESOLVED: 'badge-resolved', CLOSED: 'badge-resolved', ESCALATED: 'badge-critical',
};

export default function StaffComplaintsPage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('ALL');
  const [selected, setSelected]     = useState(null);
  const [note, setNote]             = useState('');
  const [updating, setUpdating]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints?limit=50');
      if (res.success) {
        const all = res.data?.complaints || [];
        // Show complaints assigned to this staff member
        const mine = all.filter(c =>
          c.assignedTo === user?._id || c.assignedTo?._id === user?._id
        );
        setComplaints(mine.length > 0 ? mine : all);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL' ? complaints : complaints.filter(c => c.status === filter);

  const markInProgress = async (complaint) => {
    setUpdating(true);
    try {
      const res = await api.put(`/complaints/${complaint._id}/status`, { status: 'IN_PROGRESS', note: 'Work started by staff.' });
      if (res.success) { toast.success('Marked as In Progress'); load(); setSelected(null); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setUpdating(false);
  };

  const markResolved = async (complaint) => {
    if (!note.trim()) return toast.error('Please add a resolution note');
    setUpdating(true);
    try {
      const res = await api.put(`/complaints/${complaint._id}/status`, { status: 'RESOLVED', note });
      if (res.success) { toast.success('Marked as Resolved ✓'); setNote(''); load(); setSelected(null); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setUpdating(false);
  };

  const FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
          Assigned <span className="gradient-text">Tasks</span>
        </h1>
        <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>
          Complaints assigned to you — update status as you work on them
        </p>
      </div>

      {/* Stats strip */}
      <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: HiOutlineWrenchScrewdriver, label: 'Total Assigned', value: complaints.length, color: '#7c3aed' },
          { icon: HiOutlineClock,             label: 'Open',            value: complaints.filter(c => c.status === 'OPEN').length, color: '#3b82f6' },
          { icon: HiOutlineExclamationTriangle,label: 'In Progress',   value: complaints.filter(c => c.status === 'IN_PROGRESS').length, color: '#f59e0b' },
          { icon: HiOutlineCheckCircle,       label: 'Resolved',        value: complaints.filter(c => c.status === 'RESOLVED').length, color: '#10b981' },
        ].map((s, i) => (
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

      {/* Filter tabs */}
      <div className="glass" style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineFunnel size={16} style={{ color: '#64748b', marginRight: 4 }} />
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filter === f ? '#7c3aed' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#fff' : '#94a3b8',
              transition: 'all 0.2s',
            }}>
            {f.replace('_', ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
          <HiOutlineCheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>All clear!</p>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>No {filter !== 'ALL' ? filter.toLowerCase().replace('_',' ') : ''} tasks found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((c, i) => (
            <motion.div key={c._id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="glass card-hover"
              style={{ padding: 20, borderRadius: 14, cursor: 'pointer', borderLeft: `3px solid ${PRIORITY_COLORS[c.priority] || '#94a3b8'}` }}
              onClick={() => setSelected(c)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{c.ticketId}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${PRIORITY_COLORS[c.priority]}18`, color: PRIORITY_COLORS[c.priority] }}>
                      {c.priority}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>
                      {c.category}
                    </span>
                    {c.aiClassification?.isEmergency && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: '#f87171', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <HiOutlineCpuChip size={10} /> AI EMERGENCY
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.title}</h4>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 6 }}>{c.description?.substring(0, 100)}…</p>
                  <div style={{ fontSize: 11, color: '#475569', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>📍 Room {c.roomNumber || '—'}</span>
                    <span>👤 {c.studentId?.firstName} {c.studentId?.lastName}</span>
                    <span>🗓 {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span className={STATUS_CLASSES[c.status] || 'badge-pending'}
                    style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {c.status?.replace('_', ' ')}
                  </span>
                  <HiOutlineChevronDown size={14} style={{ color: '#64748b' }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail / Action Modal */}
      <AnimatePresence>
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setSelected(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              className="glass" style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 20 }}
              onClick={e => e.stopPropagation()}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{selected.ticketId}</span>
                    <span className={STATUS_CLASSES[selected.status] || 'badge-pending'}
                      style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>
                      {selected.status?.replace('_',' ')}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selected.title}</h3>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}>✕</button>
              </div>

              <div style={{ background: 'rgba(15,15,35,0.5)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{selected.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: 12 }}>
                <div style={{ background: 'rgba(15,15,35,0.4)', borderRadius: 8, padding: 10 }}>
                  <span style={{ color: '#64748b' }}>Category</span>
                  <p style={{ fontWeight: 600, marginTop: 2 }}>{selected.category}</p>
                </div>
                <div style={{ background: 'rgba(15,15,35,0.4)', borderRadius: 8, padding: 10 }}>
                  <span style={{ color: '#64748b' }}>Priority</span>
                  <p style={{ fontWeight: 600, marginTop: 2, color: PRIORITY_COLORS[selected.priority] }}>{selected.priority}</p>
                </div>
                <div style={{ background: 'rgba(15,15,35,0.4)', borderRadius: 8, padding: 10 }}>
                  <span style={{ color: '#64748b' }}>Student</span>
                  <p style={{ fontWeight: 600, marginTop: 2 }}>{selected.studentId?.firstName} {selected.studentId?.lastName}</p>
                </div>
                <div style={{ background: 'rgba(15,15,35,0.4)', borderRadius: 8, padding: 10 }}>
                  <span style={{ color: '#64748b' }}>Reported</span>
                  <p style={{ fontWeight: 600, marginTop: 2 }}>{new Date(selected.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {selected.status !== 'RESOLVED' && selected.status !== 'CLOSED' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      Resolution Note
                    </label>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      className="input-field" rows={3} placeholder="Describe what was done to fix this issue…"
                      style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {selected.status === 'OPEN' && (
                      <button onClick={() => markInProgress(selected)} disabled={updating} className="btn-secondary"
                        style={{ flex: 1, padding: 12, fontSize: 13 }}>
                        {updating ? 'Updating…' : '🔧 Start Working'}
                      </button>
                    )}
                    <button onClick={() => markResolved(selected)} disabled={updating} className="btn-primary"
                      style={{ flex: 1, padding: 12, fontSize: 13 }}>
                      {updating ? 'Updating…' : '✓ Mark Resolved'}
                    </button>
                  </div>
                </>
              )}

              {(selected.status === 'RESOLVED' || selected.status === 'CLOSED') && (
                <div style={{ textAlign: 'center', padding: '20px 0 0' }}>
                  <HiOutlineCheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>This task is completed</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
