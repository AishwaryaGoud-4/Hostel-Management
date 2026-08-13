'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUsers,
  HiOutlineSquares2X2,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineHome,
  HiOutlineFunnel,
  HiOutlineUserPlus,
} from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const T = {
  primary: '#e2725b', accent: '#2a9d8f', accentLight: '#5fc9ba',
  success: '#6fae66', warning: '#f4a259', danger: '#e15554',
  textMuted: '#a89f92', bgSurface: 'rgba(23,20,15,0.6)', border: '#34302a',
};

export default function RoomAllocationPage() {
  const [unassigned, setUnassigned] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);

  // Modal state
  const [modal, setModal] = useState(null); // { student, mode: 'assign' | 'reassign' }
  const [selectedRoom, setSelectedRoom] = useState('');

  const loadUnassigned = async () => {
    setLoading(true);
    const res = await api.get(`/hostels/students/unassigned${search ? `?search=${encodeURIComponent(search)}` : ''}`).catch(() => ({ data: { students: [] } }));
    setUnassigned(res.data?.students || []);
    setLoading(false);
  };

  const loadHostels = async () => {
    const res = await api.get('/hostels').catch(() => ({ data: { hostels: [] } }));
    const h = res.data?.hostels || [];
    setHostels(h);
    if (h.length > 0 && !selectedHostel) setSelectedHostel(h[0]._id);
  };

  const loadRooms = async (hostelId) => {
    if (!hostelId) return;
    const res = await api.get(`/hostels/${hostelId}/rooms`).catch(() => ({ data: { rooms: [] } }));
    setRooms(res.data?.rooms || []);
  };

  useEffect(() => { loadHostels(); }, []);
  useEffect(() => { loadUnassigned(); }, [search]);
  useEffect(() => { if (selectedHostel) loadRooms(selectedHostel); }, [selectedHostel]);

  const openAssignModal = (student) => {
    setModal({ student, mode: 'assign' });
    setSelectedRoom('');
  };

  const handleAllocate = async () => {
    if (!selectedRoom || !modal?.student) return toast.error('Select a room');
    setAllocating(true);
    try {
      const endpoint = modal.mode === 'reassign' ? '/hostels/rooms/reassign' : '/hostels/rooms/allocate';
      const body = modal.mode === 'reassign'
        ? { studentId: modal.student._id, newRoomId: selectedRoom }
        : { roomId: selectedRoom, studentId: modal.student._id };
      const res = await api.post(endpoint, body);
      if (res.success) {
        toast.success(res.message || 'Room allocated ✓');
        setModal(null);
        loadUnassigned();
        loadRooms(selectedHostel);
      } else toast.error(res.message || 'Allocation failed');
    } catch { toast.error('Server error'); }
    setAllocating(false);
  };

  const availableRooms = rooms.filter(r => r.occupants?.length < r.capacity && r.status !== 'MAINTENANCE');

  const cardMotion = (i) => ({
    initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700 }}>
          <span className="gradient-text">Room Allocation</span>
        </h1>
        <p style={{ color: T.textMuted, marginTop: 6, fontSize: 14 }}>
          Assign and manage room allocations for students
        </p>
      </div>

      {/* Stats row */}
      <div className="responsive-grid-3" style={{ marginBottom: 24 }}>
        {[
          { icon: HiOutlineUsers, label: 'Unassigned Students', value: unassigned.length, color: T.warning },
          { icon: HiOutlineSquares2X2, label: 'Available Rooms', value: availableRooms.length, color: T.success },
          { icon: HiOutlineHome, label: 'Total Rooms', value: rooms.length, color: T.accent },
        ].map((s, i) => (
          <motion.div key={i} {...cardMotion(i)}
            className="glass card-hover" style={{ padding: 20, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-box icon-box-md" style={{ background: `${s.color}18` }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: T.textMuted }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hostel filter + search */}
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineFunnel size={16} style={{ color: T.textMuted }} />
        <select value={selectedHostel} onChange={e => setSelectedHostel(e.target.value)}
          className="input-field" style={{ width: 'auto', minWidth: 180 }}>
          {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <HiOutlineMagnifyingGlass size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ paddingLeft: 34, width: '100%' }}
            placeholder="Search students by name, email, roll no…" />
        </div>
        <button onClick={() => { loadUnassigned(); loadRooms(selectedHostel); }} className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HiOutlineArrowPath size={14} /> Refresh
        </button>
      </div>

      {/* Unassigned students list */}
      <motion.div {...cardMotion(0)} className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="icon-box icon-box-sm" style={{ background: `${T.warning}18` }}>
            <HiOutlineUsers size={14} color={T.warning} />
          </div>
          Unassigned Students
          <span style={{ marginLeft: 'auto', fontSize: 12, color: T.textMuted }}>{unassigned.length} student{unassigned.length !== 1 ? 's' : ''}</span>
        </h3>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />)}
          </div>
        ) : unassigned.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <HiOutlineCheckCircle size={40} color={T.success} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, fontSize: 15 }}>All students have rooms assigned!</p>
            <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>No pending room allocations.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unassigned.map((s, i) => (
              <motion.div key={s._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 10, background: T.bgSurface,
                  borderLeft: `3px solid ${T.warning}`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0,
                  }}>
                    {s.firstName?.[0]}{s.lastName?.[0]}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{s.firstName} {s.lastName}</p>
                    <p style={{ fontSize: 11, color: T.textMuted }}>
                      {s.studentProfile?.rollNumber || s.email}
                      {s.studentProfile?.course && ` · ${s.studentProfile.course}`}
                      {s.studentProfile?.year && ` · Year ${s.studentProfile.year}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => openAssignModal(s)} className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  <HiOutlineUserPlus size={14} /> Assign Room
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Available Rooms overview */}
      <motion.div {...cardMotion(1)} className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="icon-box icon-box-sm" style={{ background: `${T.success}18` }}>
            <HiOutlineSquares2X2 size={14} color={T.success} />
          </div>
          Available Rooms
          <span style={{ marginLeft: 'auto', fontSize: 12, color: T.textMuted }}>
            {availableRooms.length} available in {hostels.find(h => h._id === selectedHostel)?.name || '—'}
          </span>
        </h3>
        {availableRooms.length === 0 ? (
          <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 14, padding: 20 }}>No available rooms in the selected hostel.</p>
        ) : (
          <div className="responsive-grid-4">
            {availableRooms.map((r, i) => (
              <div key={r._id} style={{
                padding: 14, borderRadius: 10, background: T.bgSurface,
                borderLeft: `3px solid ${T.success}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Room {r.roomNumber}</span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>Floor {r.floor}</span>
                </div>
                <p style={{ fontSize: 11, color: T.textMuted }}>{r.type} · {r.occupants?.length || 0}/{r.capacity} occupied</p>
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: `${T.success}20`, color: T.success, fontWeight: 600 }}>
                    {r.capacity - (r.occupants?.length || 0)} bed{r.capacity - (r.occupants?.length || 0) !== 1 ? 's' : ''} free
                  </span>
                  {r.isAirConditioned && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: `${T.accent}20`, color: T.accentLight, fontWeight: 600 }}>AC</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Allocation Modal */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              className="glass" style={{ width: '100%', maxWidth: 480, padding: 32, borderRadius: 20, maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
                    {modal.mode === 'reassign' ? 'Reassign Room' : 'Assign Room'}
                  </h3>
                  <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
                    For {modal.student.firstName} {modal.student.lastName}
                    {modal.student.studentProfile?.rollNumber && ` (${modal.student.studentProfile.rollNumber})`}
                  </p>
                </div>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 20 }}>
                  <HiOutlineXMark size={22} />
                </button>
              </div>

              {/* Student info */}
              <div style={{ padding: 14, borderRadius: 10, background: T.bgSurface, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: T.textMuted }}>
                  {modal.student.email} · {modal.student.studentProfile?.course || '—'} · Year {modal.student.studentProfile?.year || '—'}
                </p>
              </div>

              {/* Hostel selector for modal */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Hostel
                </label>
                <select value={selectedHostel} onChange={e => { setSelectedHostel(e.target.value); setSelectedRoom(''); }}
                  className="input-field">
                  {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              </div>

              {/* Room selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Available Room
                </label>
                {availableRooms.length === 0 ? (
                  <p style={{ fontSize: 13, color: T.danger, padding: 10 }}>No available rooms in this hostel.</p>
                ) : (
                  <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="input-field">
                    <option value="">Select a room…</option>
                    {availableRooms.map(r => (
                      <option key={r._id} value={r._id}>
                        Room {r.roomNumber} — Floor {r.floor} — {r.type} — {r.capacity - (r.occupants?.length || 0)} bed(s) free — ₹{r.monthlyRent?.toLocaleString()}/mo
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button onClick={handleAllocate} disabled={allocating || !selectedRoom} className="btn-primary"
                style={{ width: '100%', padding: 14, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {allocating ? 'Allocating…' : (<><HiOutlineCheckCircle size={16} /> Confirm Allocation</>)}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
