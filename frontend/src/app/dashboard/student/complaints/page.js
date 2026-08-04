'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiAlertCircle } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

/* ── Wanderlust Dusk tokens ──────────────────────────────────── */
const T = {
  primary:    '#e2725b',
  accent:     '#2a9d8f',
  success:    '#6fae66',
  warning:    '#f4a259',
  danger:     '#e15554',
  textMuted:  '#a89f92',
  border:     '#34302a',
  bgCard:     '#211d18',
};

export default function StudentComplaintsPage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'OTHER' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await api.get('/complaints');
    if (res?.success !== false) setComplaints(res.data?.complaints || res.data || []);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return toast.error('Fill all fields');
    setLoading(true);
    const hostelId = typeof user?.studentProfile?.hostelId === 'object' ? user.studentProfile.hostelId._id : user?.studentProfile?.hostelId;
    const roomId = typeof user?.studentProfile?.roomId === 'object' ? user.studentProfile.roomId._id : user?.studentProfile?.roomId;
    const res = await api.post('/complaints', { ...form, hostelId: hostelId || '000000000000000000000000', roomId: roomId || '000000000000000000000000' });
    if (res?.success !== false) { toast.success('Complaint submitted!'); setShowForm(false); setForm({ title: '', description: '', category: 'OTHER' }); load(); }
    else toast.error(res?.message || 'Failed to submit');
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'OPEN': return T.textMuted;
      case 'IN_PROGRESS': return T.warning;
      case 'RESOLVED': case 'CLOSED': return T.success;
      case 'ESCALATED': return T.danger;
      default: return T.primary;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}><span className="gradient-text">My Complaints</span></h1>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
          <FiPlus size={16} /> New Complaint
        </button>
      </div>

      {/* New Complaint Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}
          onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 20 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>File New Complaint</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block' }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                  {['ELECTRICAL', 'PLUMBING', 'FURNITURE', 'INTERNET', 'CLEANING', 'SECURITY', 'NOISE', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block' }}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Brief complaint title" required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" rows={4} placeholder="Describe the issue in detail..." required style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ flex: 1, padding: 12 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, padding: 12 }}>{loading ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Complaints List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {complaints.map((c, i) => {
           const stColor = getStatusColor(c.status);
           return (
          <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.ticketId}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: `${T.accent}20`, color: T.accent }}>{c.category}</span>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.description?.substring(0, 150)}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>{new Date(c.createdAt).toLocaleDateString()} · Priority: {c.priority}</p>
              </div>
              <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${stColor}15`, color: stColor }}>
                {c.status}
              </span>
            </div>
            {c.aiClassification && (
              <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: `${T.primary}15`, fontSize: 11, color: T.primary }}>
                🤖 AI: {c.aiClassification.suggestedCategory} ({(c.aiClassification.confidenceScore * 100).toFixed(0)}% confidence)
                {c.aiClassification.isEmergency && <span style={{ color: T.danger, marginLeft: 8 }}>⚠️ Emergency Detected</span>}
              </div>
            )}
          </motion.div>
        )})}
        {complaints.length === 0 && (
          <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center' }}>
            <FiAlertCircle size={40} color={T.textMuted} style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No complaints filed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

