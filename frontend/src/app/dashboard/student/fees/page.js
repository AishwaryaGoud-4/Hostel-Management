'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiClock, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function StudentFeesPage() {
  const [data, setData] = useState({ invoices: [], totalDue: 0 });
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'UPI', transactionId: '' });

  const load = async () => {
    const res = await api.get('/fees/my');
    if (res.success) setData(res.data);
  };
  useEffect(() => { load(); }, []);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !payForm.transactionId) return toast.error('Fill all fields');
    const res = await api.post(`/fees/${payModal._id}/pay`, { amount: Number(payForm.amount), method: payForm.method, transactionId: payForm.transactionId });
    if (res.success) { toast.success('Payment recorded!'); setPayModal(null); setPayForm({ amount: '', method: 'UPI', transactionId: '' }); load(); }
    else toast.error(res.message);
  };

  const statusColors = { PENDING: '#94a3b8', PARTIAL: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444', WAIVED: '#7c3aed' };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Fee Management</h1>

      {/* Total Due Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass glow" style={{ padding: 28, borderRadius: 16, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Total Outstanding</p>
          <p style={{ fontSize: 36, fontWeight: 800 }} className="gradient-text">₹{(data.totalDue || 0).toLocaleString()}</p>
        </div>
        {data.totalDue > 0 && <FiAlertTriangle size={28} color="#f59e0b" />}
      </motion.div>

      {/* Invoices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {data.invoices?.map((inv, i) => {
          const outstanding = inv.totalAmount + (inv.lateFeeApplied || 0) - inv.paidAmount;
          return (
            <motion.div key={inv._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass card-hover" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{inv.invoiceId}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>{inv.academicYear} · Semester {inv.semester}</p>
                </div>
                <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColors[inv.status]}15`, color: statusColors[inv.status] }}>{inv.status}</span>
              </div>

              {inv.lineItems?.map((item, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: '1px solid rgba(45,45,68,0.3)' }}>
                  <span style={{ color: '#94a3b8' }}>{item.description}</span>
                  <span>₹{item.amount?.toLocaleString()}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #2d2d44' }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#94a3b8' }}>Total: </span><span style={{ fontWeight: 700 }}>₹{inv.totalAmount?.toLocaleString()}</span>
                  {inv.lateFeeApplied > 0 && <span style={{ color: '#ef4444', marginLeft: 10 }}>+ ₹{inv.lateFeeApplied} late fee</span>}
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#94a3b8' }}>Paid: </span><span style={{ color: '#10b981', fontWeight: 600 }}>₹{inv.paidAmount?.toLocaleString()}</span>
                </div>
              </div>

              {outstanding > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <div>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Due: </span>
                    <span style={{ fontWeight: 700, color: '#f87171' }}>₹{outstanding.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 10 }}>by {new Date(inv.dueDate).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => { setPayModal(inv); setPayForm(f => ({ ...f, amount: outstanding })); }}
                    className="btn-primary" style={{ padding: '8px 20px', fontSize: 13 }}>Pay Now</button>
                </div>
              )}
            </motion.div>
          );
        })}
        {data.invoices?.length === 0 && (
          <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center' }}>
            <FiCheckCircle size={40} color="#10b981" style={{ marginBottom: 12 }} />
            <p style={{ color: '#10b981', fontWeight: 600 }}>All Clear!</p>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No pending invoices.</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setPayModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass" style={{ width: '100%', maxWidth: 440, padding: 32, borderRadius: 20 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Make Payment</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Invoice: {payModal.invoiceId}</p>
            <form onSubmit={handlePay}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Amount (₹)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="input-field" required />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Method</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} className="input-field">
                  {['UPI', 'ONLINE', 'CASH', 'CHEQUE'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Transaction ID</label>
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
