'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineCalendarDays, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineQrCode, HiOutlineClipboardDocumentCheck, HiOutlineUsers,
  HiOutlineMagnifyingGlass, HiOutlineClock,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/store/socketProvider';
import toast from 'react-hot-toast';

/* ── Wanderlust Dusk tokens ──────────────────────────────────── */
const T = {
  success:    '#6fae66',
  danger:     '#e15554',
  warning:    '#f4a259',
  primaryLight: '#f2a679',
  textMuted:  '#a89f92',
  accent:     '#2a9d8f',
};

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', color: T.success, bg: `${T.success}18` },
  { value: 'ABSENT', label: 'Absent', color: T.danger, bg: `${T.danger}18` },
  { value: 'ON_LEAVE', label: 'On Leave', color: T.warning, bg: `${T.warning}18` },
  { value: 'LATE', label: 'Late', color: T.primaryLight, bg: `${T.primaryLight}18` },
];

function StatusPill({ status }) {
  const opt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[1];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: opt.bg, color: opt.color }}>
      {opt.label}
    </span>
  );
}

export default function WardenAttendancePage() {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [students, setStudents] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('mark');
  const [attendance, setAttendance] = useState({});
  const [qrData, setQrData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [todaySummary, setTodaySummary] = useState({ total: 0, present: 0, absent: 0, onLeave: 0, late: 0 });

  // Load students assigned to warden
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await api.get(`/attendance/warden/students?${params}`);
      const data = res?.data || res;

      if (res?.success !== false) {
        const studentList = data?.students || data || [];
        const hostelList = data?.hostels || [];

        setStudents(studentList);
        setHostels(hostelList);

        // Auto-select first hostel if none selected
        if (!selectedHostel && hostelList.length > 0) {
          setSelectedHostel(hostelList[0]._id);
        }

        // If no hostels returned but students exist, try to infer hostelId from first student
        if (hostelList.length === 0 && studentList.length > 0) {
          const inferredHostelId = studentList[0]?.studentProfile?.hostelId?._id || studentList[0]?.studentProfile?.hostelId;
          if (inferredHostelId && !selectedHostel) {
            setSelectedHostel(inferredHostelId);
          }
        }

        // Init attendance map from today's status
        const map = {};
        studentList.forEach(s => {
          map[s._id] = s.todayStatus || '';
        });
        setAttendance(map);

        // Compute summary
        const vals = Object.values(map);
        setTodaySummary({
          total: studentList.length,
          present: vals.filter(v => v === 'PRESENT').length,
          absent: vals.filter(v => v === 'ABSENT').length,
          onLeave: vals.filter(v => v === 'ON_LEAVE').length,
          late: vals.filter(v => v === 'LATE').length,
        });
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error('Failed to load students');
    }
    setLoading(false);
  }, [search, selectedHostel]);

  useEffect(() => { loadStudents(); }, []);

  // Socket: real-time student additions
  useEffect(() => {
    if (!socket) return;
    const onStudentAdded = () => { loadStudents(); toast('New student added!', { icon: '👤' }); };
    const onStudentMarked = (data) => {
      setAttendance(prev => ({ ...prev, [data.studentId]: data.status }));
      toast(`${data.method} check-in received`, { icon: '📱' });
    };
    socket.on('student:added', onStudentAdded);
    socket.on('attendance:student-marked', onStudentMarked);
    return () => {
      socket.off('student:added', onStudentAdded);
      socket.off('attendance:student-marked', onStudentMarked);
    };
  }, [socket, loadStudents]);

  const setStatus = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const map = {};
    filteredStudents.forEach(s => { map[s._id] = status; });
    setAttendance(prev => ({ ...prev, ...map }));
  };

  const submitBulk = async () => {
    const records = Object.entries(attendance)
      .filter(([, status]) => status)
      .map(([studentId, status]) => ({ studentId, status }));
    if (records.length === 0) return toast.error('Mark at least one student');

    setSubmitting(true);
    try {
      // Backend auto-resolves hostelId if empty/invalid
      const res = await api.post('/attendance/bulk', { hostelId: selectedHostel || undefined, records });
      if (res?.success !== false) {
        toast.success(`Attendance saved for ${res?.data?.count || records.length} students`);
        loadStudents();
      } else {
        toast.error(res?.message || 'Failed to save attendance');
      }
    } catch (err) {
      console.error('Bulk attendance error:', err);
      toast.error('Server error while saving attendance');
    }
    setSubmitting(false);
  };

  const generateQR = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/attendance/qr/generate', { hostelId: selectedHostel });
      if (res?.success !== false) { setQrData(res.data); toast.success('QR generated (5 min)'); }
      else toast.error(res?.message || 'Failed');
    } catch { toast.error('Server error'); }
    setGenerating(false);
  };

  const handleSearch = (e) => { e.preventDefault(); loadStudents(); };

  // Backend already filters by hostel — use all returned students
  const filteredStudents = students;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const markedCount = Object.values(attendance).filter(v => v).length;

  const stats = [
    { icon: HiOutlineUsers, label: 'Total Students', value: filteredStudents.length, color: 'var(--color-accent)' },
    { icon: HiOutlineCheckCircle, label: 'Present', value: todaySummary.present, color: T.success },
    { icon: HiOutlineXCircle, label: 'Absent', value: todaySummary.absent, color: T.danger },
    { icon: HiOutlineClock, label: 'On Leave / Late', value: todaySummary.onLeave + todaySummary.late, color: T.warning },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700 }}>
          <span className="gradient-text">Attendance</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 14 }}>{today}</p>
      </div>

      {/* Stats */}
      <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
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

      {/* No hostel warning */}
      {!loading && hostels.length === 0 && !selectedHostel && (
        <div className="glass" style={{ padding: 20, borderRadius: 12, marginBottom: 20, background: `${T.warning}12`, border: `1px solid ${T.warning}30` }}>
          <p style={{ fontSize: 13, color: T.warning, fontWeight: 600 }}>⚠️ No hostel is assigned to your account.</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Ask an admin to assign a hostel to your warden account. For testing, all students are shown.</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {hostels.length > 0 && (
          <select value={selectedHostel} onChange={e => setSelectedHostel(e.target.value)} className="input-field" style={{ width: 'auto', minWidth: 180 }}>
            {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        )}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 180 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <HiOutlineMagnifyingGlass style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-field" style={{ paddingLeft: 36 }} placeholder="Search students..." />
          </div>
        </form>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[{ id: 'mark', label: '✏️ Mark' }, { id: 'qr', label: '📱 QR' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: tab === t.id ? 'var(--color-primary)' : 'rgba(226,114,91,0.08)',
                color: tab === t.id ? '#fff' : 'var(--color-text-muted)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Mark Attendance */}
      {tab === 'mark' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>Quick:</span>
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => markAll(opt.value)}
                style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${opt.color}30`, background: opt.bg, color: opt.color, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                All {opt.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{markedCount}/{filteredStudents.length} marked</span>
              <button onClick={submitBulk} disabled={submitting} className="btn-primary" style={{ padding: '8px 20px', fontSize: 13 }}>
                {submitting ? 'Saving…' : '✓ Save Attendance'}
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
              <HiOutlineUsers size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontWeight: 600, fontSize: 16 }}>No students found</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>Students assigned to your hostel will appear here.</p>
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Student', 'Roll No', 'Room', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => (
                      <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        style={{ borderBottom: '1px solid rgba(52,48,42,0.5)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 12, flexShrink: 0 }}>
                              {s.firstName?.[0]}{s.lastName?.[0]}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</p>
                              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>{s.studentProfile?.rollNumber || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                          {s.studentProfile?.roomId?.roomNumber ? `${s.studentProfile.roomId.roomNumber} (F${s.studentProfile.roomId.floor})` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <select
                            value={attendance[s._id] || ''}
                            onChange={(e) => setStatus(s._id, e.target.value)}
                            className="input-field"
                            style={{ width: '130px', padding: '8px 12px', fontSize: 12, fontWeight: 600 }}
                          >
                            <option value="" disabled>Select...</option>
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
            Generate a QR code that students can scan to mark their attendance. Valid for 5 minutes.
          </p>
          {qrData && (
            <div style={{ marginBottom: 20 }}>
              <div className="glass" style={{ padding: 20, borderRadius: 14, marginBottom: 14 }}>
                {qrData.qrDataUrl && <img src={qrData.qrDataUrl} alt="QR" style={{ maxWidth: 200, margin: '0 auto', display: 'block', borderRadius: 12 }} />}
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>⏱ Expires in 5 minutes</p>
            </div>
          )}
          <button onClick={generateQR} disabled={generating} className="btn-primary" style={{ padding: '12px 28px', fontSize: 14 }}>
            {generating ? 'Generating…' : '📱 Generate QR Code'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
