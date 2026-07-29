'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiFilter, FiAlertCircle, FiCpu } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', page: 1 });
  const [selected, setSelected] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' });

  const load = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('limit', '15');
    const res = await api.get(`/complaints?${params}`);
    if (res.success) { setComplaints(res.data.complaints); setPagination(res.pagination || {}); }
  };
  useEffect(() => { load(); }, [filters.status, filters.priority, filters.category, filters.page]);

  const updateStatus = async () => {
    if (!selected || !statusUpdate.status) return;
    const res = await api.put(`/complaints/${selected._id}/status`, statusUpdate);
    if (res.success) { toast.success('Status updated'); setSelected(null); setStatusUpdate({ status: '', note: '' }); load(); }
    else toast.error(res.message);
  };

  const statusClass = { OPEN: 'badge-open', IN_PROGRESS: 'badge-progress', RESOLVED: 'badge-resolved', CLOSED: 'badge-resolved', ESCALATED: 'badge-critical' };
  const priorityColors = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#dc2626' };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Complaint Management</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Track and manage all hostel complaints</p>
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: 16, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))} className="input-field" style={{ width: 150 }}>
          <option value="">All Status</option>
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value, page: 1 }))} className="input-field" style={{ width: 150 }}>
          <option value="">All Priority</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))} className="input-field" style={{ width: 150 }}>
          <option value="">All Categories</option>
          {['ELECTRICAL', 'PLUMBING', 'FURNITURE', 'INTERNET', 'CLEANING', 'SECURITY', 'NOISE', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Complaints List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {complaints.map((c, i) => (
          <motion.div key={c._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 14, cursor: 'pointer', borderLeft: `3px solid ${priorityColors[c.priority]}` }}
            onClick={() => setSelected(c)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{c.ticketId}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${priorityColors[c.priority]}15`, color: priorityColors[c.priority] }}>{c.priority}</span>
                  {c.aiClassification?.isEmergency && (
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(239,68,68,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <FiCpu size={10} /> AI EMERGENCY
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.title}</h4>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{c.description?.substring(0, 120)}...</p>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
                  <span>By: {c.studentId?.firstName} {c.studentId?.lastName}</span>
                  <span>Category: {c.category}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600 }} className={statusClass[c.status]}>{c.status}</span>
            </div>
            {c.aiClassification && (
              <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(124,58,237,0.05)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#a78bfa' }}>
                <FiCpu size={12} /> AI: {c.aiClassification.suggestedCategory} (Confidence: {(c.aiClassification.confidenceScore * 100).toFixed(0)}%)
              </div>
            )}
          </motion.div>
        ))}
        {complaints.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>No complaints found.</p>}
      </div>

      {/* Status Update Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}
          onClick={() => setSelected(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 20 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selected.title}</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>{selected.ticketId} · {selected.category} · {selected.priority}</p>
            <p style={{ fontSize: 13, color: '#b0b8c8', marginBottom: 20, lineHeight: 1.7 }}>{selected.description}</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Update Status</label>
              <select value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value }))} className="input-field">
                <option value="">Select Status</option>
                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Note</label>
              <textarea value={statusUpdate.note} onChange={e => setStatusUpdate(s => ({ ...s, note: e.target.value }))}
                className="input-field" rows={3} placeholder="Add a note..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setSelected(null)} className="btn-secondary" style={{ flex: 1, padding: 12 }}>Cancel</button>
              <button onClick={updateStatus} className="btn-primary" style={{ flex: 1, padding: 12 }}>Update</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ padding: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: filters.page === p ? '#7c3aed' : 'rgba(45,45,68,0.5)', color: filters.page === p ? '#fff' : '#94a3b8' }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
