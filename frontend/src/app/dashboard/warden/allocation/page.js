'use client';
import { useEffect, useState, useCallback } from 'react';
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
  HiOutlineArrowsRightLeft,
} from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const T = {
  primary: '#e2725b', accent: '#2a9d8f', accentLight: '#5fc9ba',
  success: '#6fae66', warning: '#f4a259', danger: '#e15554',
  textMuted: '#a89f92', bgSurface: 'rgba(23,20,15,0.6)', border: '#34302a',
};

const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export default function RoomAllocationPage() {
  const [unassigned, setUnassigned] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [tab, setTab] = useState('unassigned'); // 'unassigned' | 'assigned' | 'rooms'

  // Modal state
  const [modal, setModal] = useState(null); // { student, mode: 'assign' | 'reassign' }
  const [selectedRoom, setSelectedRoom] = useState('');

  const loadUnassigned = useCallback(async () => {
    const res = await api.get(`/hostels/students/unassigned${search ? `?search=${encodeURIComponent(search)}` : ''}`).catch(() => ({ data: { students: [] } }));
    setUnassigned(res.data?.students || []);
  }, [search]);

  const loadAssigned = useCallback(async () => {
    const res = await api.get('/auth/users?role=STUDENT&limit=200').catch(() => ({ data: { users: [] } }));
    const all = res.data?.users || [];
    setAssignedStudents(all.filter(s => s.studentProfile?.roomId));
  }, []);

  const loadHostels = async () => {
    const res = await api.get('/hostels').catch(() => ({ data: { hostels: [] } }));
    const h = res.data?.hostels || [];
    setHostels(h);
    if (h.length > 0 && !selectedHostel) setSelectedHostel(h[0]._id);
  };

  const loadRooms = useCallback(async (hostelId) => {
    if (!hostelId) return;
    setLoading(true);
    const res = await api.get(`/hostels/${hostelId}/rooms?limit=1000`).catch(() => ({ data: { rooms: [] } }));
    setRooms(res.data?.rooms || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadHostels(); }, []);
  useEffect(() => { loadUnassigned(); loadAssigned(); }, [search, loadUnassigned, loadAssigned]);
  useEffect(() => { if (selectedHostel) loadRooms(selectedHostel); }, [selectedHostel, loadRooms]);

  const refreshAll = () => { loadUnassigned(); loadAssigned(); if (selectedHostel) loadRooms(selectedHostel); };

  const openAssignModal = (student) => {
    setModal({ student, mode: 'assign' });
    setSelectedRoom('');
  };

  const openReassignModal = (student) => {
    setModal({ student, mode: 'reassign' });
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
        refreshAll();
      } else toast.error(res.message || 'Allocation failed');
    } catch { toast.error('Server error'); }
    setAllocating(false);
  };

  const handleDeallocate = async (student) => {
    if (!student.studentProfile?.roomId) return;
    const roomId = typeof student.studentProfile.roomId === 'object' ? student.studentProfile.roomId._id : student.studentProfile.roomId;
    try {
      const res = await api.post('/hostels/rooms/deallocate', { roomId, studentId: student._id });
      if (res.success) { toast.success('Room removed ✓'); refreshAll(); }
      else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
  };

  // Filter rooms by block
  const availableRooms = rooms.filter(r => r.occupants?.length < r.capacity && r.status !== 'MAINTENANCE');
  const filteredRooms = blockFilter === 'ALL' ? availableRooms : availableRooms.filter(r => r.roomNumber?.startsWith(blockFilter));
  const totalAvailable = availableRooms.length;
  const totalOccupied = rooms.length - totalAvailable;

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
          Assign and manage room allocations for students (Rooms A1–J100)
        </p>
      </div>

      {/* Stats row */}
      <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: HiOutlineUsers, label: 'Unassigned Students', value: unassigned.length, color: T.warning },
          { icon: HiOutlineUserPlus, label: 'Assigned Students', value: assignedStudents.length, color: T.accent },
          { icon: HiOutlineSquares2X2, label: 'Available Rooms', value: totalAvailable, color: T.success },
          { icon: HiOutlineHome, label: 'Occupied Rooms', value: totalOccupied, color: T.primary },
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

      {/* Toolbar: search + hostel filter + refresh */}
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineFunnel size={16} style={{ color: T.textMuted }} />
        <select value={selectedHostel} onChange={e => setSelectedHostel(e.target.value)}
          className="input-field" style={{ width: 'auto', minWidth: 160 }}>
          {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <HiOutlineMagnifyingGlass size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ paddingLeft: 34, width: '100%' }}
            placeholder="Search students…" />
        </div>
        <button onClick={refreshAll} className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HiOutlineArrowPath size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[
          { key: 'unassigned', label: `Unassigned (${unassigned.length})` },
          { key: 'assigned', label: `Assigned (${assignedStudents.length})` },
          { key: 'rooms', label: `Rooms (${rooms.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 18px', fontSize: 13, borderRadius: 10 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Unassigned Students ── */}
      {tab === 'unassigned' && (
        <motion.div {...cardMotion(0)} className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="icon-box icon-box-sm" style={{ background: `${T.warning}18` }}>
              <HiOutlineUsers size={14} color={T.warning} />
            </div>
            Students Without Room
          </h3>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />)}
            </div>
          ) : unassigned.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <HiOutlineCheckCircle size={40} color={T.success} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600, fontSize: 15 }}>All students have rooms assigned!</p>
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
      )}

      {/* ── TAB: Assigned Students ── */}
      {tab === 'assigned' && (
        <motion.div {...cardMotion(0)} className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="icon-box icon-box-sm" style={{ background: `${T.accent}18` }}>
              <HiOutlineUsers size={14} color={T.accent} />
            </div>
            Students With Rooms
          </h3>
          {assignedStudents.length === 0 ? (
            <p style={{ textAlign: 'center', color: T.textMuted, padding: 30, fontSize: 14 }}>No students have rooms assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignedStudents.map((s, i) => {
                const roomInfo = typeof s.studentProfile?.roomId === 'object' ? s.studentProfile.roomId : null;
                const roomLabel = roomInfo?.roomNumber || 'Assigned';
                return (
                  <div key={s._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 10, background: T.bgSurface,
                    borderLeft: `3px solid ${T.accent}`,
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
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: `${T.accent}20`, color: T.accentLight }}>
                        Room {roomLabel}
                      </span>
                      <button onClick={() => openReassignModal(s)} className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HiOutlineArrowsRightLeft size={12} /> Reassign
                      </button>
                      <button onClick={() => handleDeallocate(s)}
                        style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                          background: 'rgba(225,85,84,0.15)', border: '1px solid rgba(225,85,84,0.3)', color: T.danger }}>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB: Rooms Overview ── */}
      {tab === 'rooms' && (
        <motion.div {...cardMotion(0)} className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="icon-box icon-box-sm" style={{ background: `${T.success}18` }}>
                <HiOutlineSquares2X2 size={14} color={T.success} />
              </div>
              Room Status — Block Filter
            </h3>
            {/* Block filter buttons */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button onClick={() => setBlockFilter('ALL')}
                className={blockFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8 }}>ALL</button>
              {BLOCKS.map(b => (
                <button key={b} onClick={() => setBlockFilter(b)}
                  className={blockFilter === b ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8 }}>{b}</button>
              ))}
            </div>
          </div>

          {rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <HiOutlineSquares2X2 size={40} color={T.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>No rooms found</p>
              <p style={{ fontSize: 13, color: T.textMuted }}>Ask your admin to seed rooms (A1–J100) from the admin panel.</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
                Showing {filteredRooms.length} available room{filteredRooms.length !== 1 ? 's' : ''}
                {blockFilter !== 'ALL' && ` in Block ${blockFilter}`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
                {filteredRooms.map(r => {
                  const isOccupied = r.occupants?.length >= r.capacity;
                  return (
                    <div key={r._id} style={{
                      padding: '8px 6px', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 700,
                      background: isOccupied ? 'rgba(226,114,91,0.15)' : 'rgba(42,157,143,0.15)',
                      color: isOccupied ? T.primary : T.accentLight,
                      border: `1px solid ${isOccupied ? 'rgba(226,114,91,0.25)' : 'rgba(42,157,143,0.25)'}`,
                    }}>
                      {r.roomNumber}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Allocation Modal ── */}
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
                    {modal.student.firstName} {modal.student.lastName}
                    {modal.student.studentProfile?.rollNumber && ` (${modal.student.studentProfile.rollNumber})`}
                  </p>
                </div>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}>
                  <HiOutlineXMark size={22} />
                </button>
              </div>

              {/* Student info */}
              <div style={{ padding: 14, borderRadius: 10, background: T.bgSurface, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: T.textMuted }}>
                  {modal.student.email} · {modal.student.studentProfile?.course || '—'} · Year {modal.student.studentProfile?.year || '—'}
                </p>
                {modal.mode === 'reassign' && (
                  <p style={{ fontSize: 12, color: T.warning, marginTop: 6 }}>
                    Current: Room {typeof modal.student.studentProfile?.roomId === 'object' ? modal.student.studentProfile.roomId.roomNumber : 'N/A'}
                  </p>
                )}
              </div>

              {/* Block filter in modal */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Filter by Block
                </label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button onClick={() => setBlockFilter('ALL')}
                    className={blockFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8 }}>ALL</button>
                  {BLOCKS.map(b => {
                    const count = availableRooms.filter(r => r.roomNumber?.startsWith(b)).length;
                    return (
                      <button key={b} onClick={() => setBlockFilter(b)}
                        className={blockFilter === b ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8 }}>
                        {b} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Select Room
                </label>
                {filteredRooms.length === 0 ? (
                  <p style={{ fontSize: 13, color: T.danger, padding: 10 }}>No available rooms{blockFilter !== 'ALL' ? ` in Block ${blockFilter}` : ''}.</p>
                ) : (
                  <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="input-field">
                    <option value="">Select a room…</option>
                    {filteredRooms.map(r => (
                      <option key={r._id} value={r._id}>
                        Room {r.roomNumber} — {r.type} — ₹{r.monthlyRent?.toLocaleString()}/mo
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
