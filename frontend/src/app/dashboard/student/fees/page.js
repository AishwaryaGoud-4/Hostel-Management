'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiClock, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

/* ── Wanderlust Dusk tokens ──────────────────────────────────── */
const T = {
  primary:    '#e2725b',
  accent:     '#2a9d8f',
  success:    '#6fae66',
  warning:    '#f4a259',
  danger:     '#e15554',
  textMuted:  '#a89f92',
  bgCard:     '#211d18',
  border:     '#34302a',
  bgSurface:  'rgba(23,20,15,0.6)',
};

const statusColors = {
  PENDING: T.textMuted,
  PARTIAL: T.warning,
  PAID: T.success,
  OVERDUE: T.danger,
  WAIVED: T.accent,
};

export default function StudentFeesPage() {
  const [data, setData] = useState({ invoices: [], totalDue: 0 });
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'UPI', transactionId: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fees/my');
      if (res?.success !== false) setData(res.data || { invoices: [], totalDue: 0 });
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !payForm.transactionId) return toast.error('Fill all fields');
    try {
      const res = await api.post(`/fees/${payModal._id}/pay`, {
        amount: Number(payForm.amount),
        method: payForm.method,
        transactionId: payForm.transactionId,
      });
      if (res?.success !== false) {
        toast.success('Payment recorded!');
        setPayModal(null);
        setPayForm({ amount: '', method: 'UPI', transactionId: '' });
        load();
      } else {
        toast.error(res?.message || 'Payment failed');
      }
    } catch {
      toast.error('Server error');
    }
  };

  const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        <span className="gradient-text">Fee Management</span>
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>
        Monthly hostel fee: <strong style={{ color: 'var(--color-text)' }}>₹7,500</strong> · Due at the end of every month · Late fee: ₹50/day
      </p>

      {/* Total Due Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass glow" style={{ padding: 28, borderRadius: 16, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Total Outstanding</p>
          <p style={{ fontSize: 36, fontWeight: 800 }} className="gradient-text">₹{(data.totalDue || 0).toLocaleString()}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data.totalDue > 0 && <FiAlertTriangle size={28} color={T.warning} />}
          {data.totalDue <= 0 && data.invoices?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiCheckCircle size={20} color={T.success} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.success }}>All Paid!</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
        </div>
      )}

      {/* Invoices */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.invoices?.map((inv, i) => {
            const outstanding = inv.totalAmount + (inv.lateFeeApplied || 0) - inv.paidAmount;
            const dueDate = new Date(inv.dueDate);
            const isOverdue = dueDate < new Date() && outstanding > 0;

            return (
              <motion.div key={inv._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass card-hover" style={{ padding: 24, borderRadius: 16, borderLeft: isOverdue ? `3px solid ${T.danger}` : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{inv.invoiceId}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{inv.academicYear} · Semester {inv.semester}</p>
                  </div>
                  <span style={{
                    padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: `${statusColors[inv.status]}15`, color: statusColors[inv.status],
                  }}>
                    {inv.status}
                  </span>
                </div>

                {inv.lineItems?.map((item, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: `1px solid ${T.border}40` }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{item.description}</span>
                    <span>₹{item.amount?.toLocaleString()}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Total: </span><span style={{ fontWeight: 700 }}>₹{inv.totalAmount?.toLocaleString()}</span>
                    {inv.lateFeeApplied > 0 && <span style={{ color: T.danger, marginLeft: 10 }}>+ ₹{inv.lateFeeApplied} late fee</span>}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Paid: </span><span style={{ color: T.success, fontWeight: 600 }}>₹{inv.paidAmount?.toLocaleString()}</span>
                  </div>
                </div>

                {outstanding > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Due: </span>
                      <span style={{ fontWeight: 700, color: T.danger }}>₹{outstanding.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 10 }}>
                        by {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <button onClick={() => { setPayModal(inv); setPayForm(f => ({ ...f, amount: outstanding })); }}
                      className="btn-primary" style={{ padding: '8px 20px', fontSize: 13 }}>Pay Now</button>
                  </div>
                )}

                {inv.status === 'PAID' && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiCheckCircle size={14} color={T.success} />
                    <span style={{ fontSize: 12, color: T.success, fontWeight: 600 }}>Fully paid</span>
                  </div>
                )}
              </motion.div>
            );
          })}

          {data.invoices?.length === 0 && !loading && (
            <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center' }}>
              <FiCheckCircle size={40} color={T.success} style={{ marginBottom: 12 }} />
              <p style={{ color: T.success, fontWeight: 600 }}>All Clear!</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No pending invoices.</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setPayModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass" style={{ width: '100%', maxWidth: 440, padding: 32, borderRadius: 20 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Make Payment</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Invoice: {payModal.invoiceId}</p>
            <form onSubmit={handlePay}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount (₹)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="input-field" required />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Method</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} className="input-field">
                  {['UPI', 'ONLINE', 'CASH', 'CHEQUE'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Transaction ID</label>
                <input value={payForm.transactionId} onChange={e => setPayForm(f => ({ ...f, transactionId: e.target.value }))} className="input-field" placeholder="Enter transaction ref" required />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setPayModal(null)} className="btn-secondary" style={{ flex: 1, padding: 12 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 12 }}>Pay</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
