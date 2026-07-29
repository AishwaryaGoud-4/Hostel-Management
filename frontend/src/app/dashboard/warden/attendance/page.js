'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineQrCode,
  HiOutlineClipboardDocumentCheck,
  HiOutlineUsers,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function WardenAttendancePage() {
  const { user } = useAuthStore();
  const [hostels, setHostels]   = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [qrData, setQrData]     = useState(null);
  const [generating, setGenerating] = useState(false);
  const [manualForm, setManualForm] = useState({ studentId: '', status: 'PRESENT' });
  const [marking, setMarking] = useState(false);
  const [tab, setTab] = useState('records');

  useEffect(() => {
    api.get('/hostels').then(res => {
      const h = res.data?.hostels || res.data || [];
      setHostels(h);
      if (h.length > 0) setSelectedHostel(h[0]._id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedHostel) return;
    setLoading(true);
    api.get(`/attendance/hostel/${selectedHostel}`)
      .then(res => setRecords(res.data?.attendance || res.data || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [selectedHostel]);

  const generateQR = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/attendance/qr/generate', { hostelId: selectedHostel });
      if (res.success) {
        setQrData(res.data);
        toast.success('QR code generated for 10 min');
      } else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setGenerating(false);
  };

  const markManual = async (e) => {
    e.preventDefault();
    if (!manualForm.studentId.trim()) return toast.error('Enter student ID');
    setMarking(true);
    try {
      const res = await api.post('/attendance/manual', {
        studentId: manualForm.studentId,
        hostelId: selectedHostel,
        status: manualForm.status,
      });
      if (res.success) {
        toast.success(`Marked ${manualForm.status}`);
        setManualForm({ studentId: '', status: 'PRESENT' });
        // refresh
        const r2 = await api.get(`/attendance/hostel/${selectedHostel}`);
        setRecords(r2.data?.attendance || r2.data || []);
      } else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setMarking(false);
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const presentToday = records.filter(r => {
    const d = new Date(r.date || r.createdAt);
    const t = new Date();
    return d.toDateString() === t.toDateString() && r.status === 'PRESENT';
  }).length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700 }}>
          <span className="gradient-text">Attendance</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 14 }}>{today}</p>
      </div>

      {/* Stats */}
      <div className="responsive-grid-3" style={{ marginBottom: 24 }}>
        {[
          { icon: HiOutlineCalendarDays, label: 'Total Records', value: records.length, color: 'var(--color-primary)' },
          { icon: HiOutlineCheckCircle, label: 'Present Today', value: presentToday, color: 'var(--color-success)' },
          { icon: HiOutlineUsers, label: 'Hostels', value: hostels.length, color: 'var(--color-accent)' },
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

      {/* Hostel + tabs */}
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selectedHostel} onChange={e => setSelectedHostel(e.target.value)}
          className="input-field" style={{ width: 'auto', minWidth: 200 }}>
          {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[
            { id: 'records', label: '📋 Records' },
            { id: 'mark',    label: '✏️ Mark' },
            { id: 'qr',      label: '📱 QR' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: tab === t.id ? 'var(--color-primary)' : 'rgba(226,114,91,0.08)',
                color: tab === t.id ? '#fff' : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Records */}
      {tab === 'records' && (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
          </div>
        ) : records.length === 0 ? (
          <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
            <HiOutlineCalendarDays size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontWeight: 600, fontSize: 16 }}>No attendance records</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>Start marking attendance using QR or manual entry.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Student', 'Date', 'Status', 'Method'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 50).map((r, i) => (
                  <motion.tr key={r._id || i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    style={{ borderBottom: '1px solid rgba(52,48,42,0.5)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 600 }}>{r.studentId?.firstName} {r.studentId?.lastName}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)' }}>
                      {new Date(r.date || r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: r.status === 'PRESENT' ? 'rgba(111,174,102,0.15)' : r.status === 'LATE' ? 'rgba(244,162,89,0.15)' : 'rgba(225,85,84,0.15)',
                        color: r.status === 'PRESENT' ? '#6fae66' : r.status === 'LATE' ? '#f4a259' : '#e15554',
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)' }}>{r.method || 'Manual'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Mark manually */}
      {tab === 'mark' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: 28, borderRadius: 16, maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div className="icon-box icon-box-md" style={{ background: 'rgba(226,114,91,0.15)' }}>
              <HiOutlineClipboardDocumentCheck size={20} color="var(--color-primary)" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Manual Attendance</h3>
          </div>
          <form onSubmit={markManual}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>Student ID</label>
              <input value={manualForm.studentId} onChange={e => setManualForm(f => ({ ...f, studentId: e.target.value }))}
                className="input-field" placeholder="Paste student user ID" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>Status</label>
              <select value={manualForm.status} onChange={e => setManualForm(f => ({ ...f, status: e.target.value }))}
                className="input-field">
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
              </select>
            </div>
            <button type="submit" disabled={marking} className="btn-primary"
              style={{ width: '100%', padding: 12, fontSize: 14 }}>
              {marking ? 'Marking…' : '✓ Mark Attendance'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Tab: QR */}
      {tab === 'qr' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: 28, borderRadius: 16, maxWidth: 480, textAlign: 'center' }}>
          <div className="icon-box icon-box-lg glow" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', margin: '0 auto 20px' }}>
            <HiOutlineQrCode size={28} color="white" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "'Fraunces', serif" }}>QR Attendance</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Generate a QR code that students can scan to mark their attendance. Valid for 10 minutes.
          </p>

          {qrData ? (
            <div style={{ marginBottom: 20 }}>
              <div className="glass" style={{ padding: 20, borderRadius: 14, marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all', color: 'var(--color-accent-light)' }}>
                  Session: {qrData.sessionId || qrData.qrCode || 'Active'}
                </p>
                {qrData.qrCodeImage && (
                  <img src={qrData.qrCodeImage} alt="QR" style={{ maxWidth: 200, margin: '16px auto 0', display: 'block', borderRadius: 12 }} />
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>⏱ Expires in 10 minutes</p>
            </div>
          ) : null}

          <button onClick={generateQR} disabled={generating} className="btn-primary"
            style={{ padding: '12px 28px', fontSize: 14 }}>
            {generating ? 'Generating…' : '📱 Generate QR Code'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
