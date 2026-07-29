'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
  HiOutlinePlusCircle,
  HiOutlineFunnel,
  HiOutlineArrowPath,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
} from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const BED_STATUS_CLASSES = {
  AVAILABLE:   'badge-available',
  OCCUPIED:    'badge-occupied',
  MAINTENANCE: 'badge-maintenance',
  RESERVED:    'badge-reserved',
};

export default function WardenRoomsPage() {
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedRoom, setSelectedRoom]     = useState(null);
  const [allocForm, setAllocForm] = useState({ studentId: '', bedIndex: 0 });
  const [allocating, setAllocating] = useState(false);

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
    api.get(`/hostels/${selectedHostel}/rooms`).then(res => {
      setRooms(res.data?.rooms || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedHostel]);

  const allocate = async () => {
    if (!allocForm.studentId.trim()) return toast.error('Enter student ID');
    setAllocating(true);
    try {
      const res = await api.post('/hostels/rooms/allocate', {
        roomId: selectedRoom._id,
        studentId: allocForm.studentId,
        bedIndex: allocForm.bedIndex,
      });
      if (res.success) {
        toast.success('Bed allocated ✓');
        setSelectedRoom(null);
        setAllocForm({ studentId: '', bedIndex: 0 });
        // refresh rooms
        const r2 = await api.get(`/hostels/${selectedHostel}/rooms`);
        setRooms(r2.data?.rooms || r2.data || []);
      } else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setAllocating(false);
  };

  const deallocate = async (roomId, bedIndex) => {
    try {
      const res = await api.post('/hostels/rooms/deallocate', { roomId, bedIndex });
      if (res.success) {
        toast.success('Bed deallocated');
        const r2 = await api.get(`/hostels/${selectedHostel}/rooms`);
        setRooms(r2.data?.rooms || r2.data || []);
        setSelectedRoom(null);
      } else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
  };

  const totalBeds    = rooms.reduce((s, r) => s + (r.beds?.length || r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((s, r) => s + (r.beds?.filter(b => b.status === 'OCCUPIED').length || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700 }}>
          <span className="gradient-text">Rooms</span> & Beds
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 14 }}>
          Manage room allocation across your hostels
        </p>
      </div>

      {/* Stats */}
      <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: HiOutlineSquares2X2, label: 'Total Rooms', value: rooms.length, color: 'var(--color-primary)' },
          { icon: HiOutlineUsers, label: 'Total Beds', value: totalBeds, color: 'var(--color-accent)' },
          { icon: HiOutlineLockClosed, label: 'Occupied', value: occupiedBeds, color: 'var(--color-warning)' },
          { icon: HiOutlineLockOpen, label: 'Available', value: totalBeds - occupiedBeds, color: 'var(--color-success)' },
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

      {/* Hostel selector */}
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <HiOutlineFunnel size={16} style={{ color: 'var(--color-text-muted)' }} />
        <select value={selectedHostel} onChange={e => setSelectedHostel(e.target.value)}
          className="input-field" style={{ width: 'auto', minWidth: 200 }}>
          {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {rooms.length} room{rooms.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Rooms grid */}
      {loading ? (
        <div className="responsive-grid-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
          <HiOutlineSquares2X2 size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 16 }}>No rooms found</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>Create rooms in the admin panel first.</p>
        </div>
      ) : (
        <div className="responsive-grid-3">
          {rooms.map((room, i) => {
            const beds = room.beds || [];
            const occupied = beds.filter(b => b.status === 'OCCUPIED').length;
            return (
              <motion.div key={room._id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass card-hover"
                style={{ padding: 20, borderRadius: 14, cursor: 'pointer' }}
                onClick={() => setSelectedRoom(room)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Room {room.roomNumber}</h3>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Floor {room.floor}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {beds.map((bed, bi) => (
                    <div key={bi} style={{
                      width: 32, height: 32, borderRadius: 8, fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: bed.status === 'OCCUPIED' ? 'rgba(226,114,91,0.2)' : 'rgba(42,157,143,0.2)',
                      color: bed.status === 'OCCUPIED' ? 'var(--color-primary-light)' : 'var(--color-accent-light)',
                      border: `1px solid ${bed.status === 'OCCUPIED' ? 'rgba(226,114,91,0.3)' : 'rgba(42,157,143,0.3)'}`,
                    }}>
                      {bi + 1}
                    </div>
                  ))}
                  {beds.length === 0 && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Cap: {room.capacity}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{occupied}/{beds.length || room.capacity} occupied</span>
                  <span style={{ color: occupied < (beds.length || room.capacity) ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {occupied < (beds.length || room.capacity) ? '● Available' : '● Full'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Room detail / allocation modal */}
      <AnimatePresence>
        {selectedRoom && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setSelectedRoom(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              className="glass" style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 20, maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Room {selectedRoom.roomNumber}</h3>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Floor {selectedRoom.floor} · Type: {selectedRoom.type || 'Standard'}</p>
                </div>
                <button onClick={() => setSelectedRoom(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 20 }}>✕</button>
              </div>

              {/* Beds */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>Bed Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {(selectedRoom.beds || []).map((bed, bi) => (
                  <div key={bi} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(23,20,15,0.5)',
                    borderLeft: `3px solid ${bed.status === 'OCCUPIED' ? 'var(--color-primary)' : 'var(--color-accent)'}`,
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Bed {bi + 1}</span>
                      {bed.student && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{bed.student?.firstName} {bed.student?.lastName}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={BED_STATUS_CLASSES[bed.status] || 'badge-available'}
                        style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                        {bed.status}
                      </span>
                      {bed.status === 'OCCUPIED' && (
                        <button onClick={() => deallocate(selectedRoom._id, bi)}
                          style={{ background: 'rgba(225,85,84,0.15)', border: '1px solid rgba(225,85,84,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#e15554', cursor: 'pointer' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Allocate form */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  <HiOutlinePlusCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Allocate Bed
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, marginBottom: 12 }}>
                  <input value={allocForm.studentId} onChange={e => setAllocForm(f => ({ ...f, studentId: e.target.value }))}
                    className="input-field" placeholder="Student User ID" />
                  <select value={allocForm.bedIndex} onChange={e => setAllocForm(f => ({ ...f, bedIndex: Number(e.target.value) }))}
                    className="input-field">
                    {(selectedRoom.beds || []).map((b, i) => <option key={i} value={i}>Bed {i + 1}</option>)}
                  </select>
                </div>
                <button onClick={allocate} disabled={allocating} className="btn-primary"
                  style={{ width: '100%', padding: 12, fontSize: 13 }}>
                  {allocating ? 'Allocating…' : '✓ Allocate Student'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
