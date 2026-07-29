'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiFileText, FiCheck, FiX } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function StudentGatePassPage() {
  const { user } = useAuthStore();
  const [passes, setPasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'OUTING',
    outingDetails: { purpose: '', destination: '', expectedReturn: '' },
    leaveDetails: { reason: '', fromDate: '', toDate: '' },
    visitorDetails: { name: '', phone: '', relationship: '', purpose: '' },
  });

  const load = async () => {
    const res = await api.get('/gate-passes');
    if (res.success) setPasses(res.data.passes);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hostelId = typeof user?.studentProfile?.hostelId === 'object' ? user.studentProfile.hostelId._id : user?.studentProfile?.hostelId;
    const payload = { type: form.type, hostelId: hostelId || '000000000000000000000000' };
    if (form.type === 'OUTING') payload.outingDetails = form.outingDetails;
    if (form.type === 'LEAVE') payload.leaveDetails = form.leaveDetails;
    if (form.type === 'VISITOR') payload.visitorDetails = form.visitorDetails;
    const res = await api.post('/gate-passes', payload);
    if (res.success) { toast.success('Gate pass requested!'); setShowForm(false); load(); }
    else toast.error(res.message);
  };

  const statusColors = { PENDING: '#94a3b8', APPROVED: '#10b981', REJECTED: '#ef4444', EXPIRED: '#64748b', USED: '#7c3aed' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Gate Passes</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
          <FiPlus size={16} /> Request Pass
        </button>
      </div>

      {/* New Gate Pass Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 20, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Request Gate Pass</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                  <option value="OUTING">Outing</option>
                  <option value="LEAVE">Leave</option>
                  <option value="VISITOR">Visitor</option>
                </select>
              </div>

              {form.type === 'OUTING' && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Purpose</label>
                    <input value={form.outingDetails.purpose} onChange={e => setForm(f => ({ ...f, outingDetails: { ...f.outingDetails, purpose: e.target.value } }))} className="input-field" placeholder="Purpose of outing" required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Destination</label>
                    <input value={form.outingDetails.destination} onChange={e => setForm(f => ({ ...f, outingDetails: { ...f.outingDetails, destination: e.target.value } }))} className="input-field" placeholder="Where are you going?" required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Expected Return</label>
                    <input type="datetime-local" value={form.outingDetails.expectedReturn} onChange={e => setForm(f => ({ ...f, outingDetails: { ...f.outingDetails, expectedReturn: e.target.value } }))} className="input-field" required />
                  </div>
                </>
              )}

              {form.type === 'LEAVE' && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Reason</label>
                    <textarea value={form.leaveDetails.reason} onChange={e => setForm(f => ({ ...f, leaveDetails: { ...f.leaveDetails, reason: e.target.value } }))} className="input-field" rows={3} required style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>From</label>
                      <input type="date" value={form.leaveDetails.fromDate} onChange={e => setForm(f => ({ ...f, leaveDetails: { ...f.leaveDetails, fromDate: e.target.value } }))} className="input-field" required />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>To</label>
                      <input type="date" value={form.leaveDetails.toDate} onChange={e => setForm(f => ({ ...f, leaveDetails: { ...f.leaveDetails, toDate: e.target.value } }))} className="input-field" required />
                    </div>
                  </div>
                </>
              )}

              {form.type === 'VISITOR' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Visitor Name</label>
                      <input value={form.visitorDetails.name} onChange={e => setForm(f => ({ ...f, visitorDetails: { ...f.visitorDetails, name: e.target.value } }))} className="input-field" required />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Phone</label>
                      <input value={form.visitorDetails.phone} onChange={e => setForm(f => ({ ...f, visitorDetails: { ...f.visitorDetails, phone: e.target.value } }))} className="input-field" required />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Relationship</label>
                    <input value={form.visitorDetails.relationship} onChange={e => setForm(f => ({ ...f, visitorDetails: { ...f.visitorDetails, relationship: e.target.value } }))} className="input-field" placeholder="e.g. Parent, Sibling" required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Purpose</label>
                    <input value={form.visitorDetails.purpose} onChange={e => setForm(f => ({ ...f, visitorDetails: { ...f.visitorDetails, purpose: e.target.value } }))} className="input-field" placeholder="Purpose of visit" required />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ flex: 1, padding: 12 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 12 }}>Submit</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Passes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {passes.map((p, i) => (
          <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass card-hover" style={{ padding: 20, borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{p.passId}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>{p.type}</span>
                </div>
                {p.type === 'OUTING' && p.outingDetails && <p style={{ fontSize: 12, color: '#94a3b8' }}>To: {p.outingDetails.destination} · {p.outingDetails.purpose}</p>}
                {p.type === 'LEAVE' && p.leaveDetails && <p style={{ fontSize: 12, color: '#94a3b8' }}>{p.leaveDetails.reason} · {new Date(p.leaveDetails.fromDate).toLocaleDateString()} - {new Date(p.leaveDetails.toDate).toLocaleDateString()}</p>}
                {p.type === 'VISITOR' && p.visitorDetails && <p style={{ fontSize: 12, color: '#94a3b8' }}>Visitor: {p.visitorDetails.name} ({p.visitorDetails.relationship})</p>}
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
              <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColors[p.status]}15`, color: statusColors[p.status] }}>{p.status}</span>
            </div>
            {p.status === 'APPROVED' && p.qrCode && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <img src={p.qrCode} alt="Gate Pass QR" style={{ width: 120, height: 120, borderRadius: 8 }} />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Show this QR at the gate</p>
              </div>
            )}
          </motion.div>
        ))}
        {passes.length === 0 && (
          <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center' }}>
            <FiFileText size={40} color="#94a3b8" style={{ marginBottom: 12 }} />
            <p style={{ color: '#94a3b8' }}>No gate passes requested yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
