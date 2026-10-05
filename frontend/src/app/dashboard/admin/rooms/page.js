'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineFunnel,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const COURSES = ['CSE', 'ECE', 'EEE', 'BSC', 'BBA'];

function OccupancyBar({ occupied, capacity }) {
  const pct = capacity > 0 ? Math.min(100, (occupied / capacity) * 100) : 0;
  const full = occupied >= capacity;
  return (
    <div style={{
      height: 8, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden', marginTop: 12,
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          height: '100%',
          borderRadius: 999,
          background: full
            ? 'linear-gradient(90deg, var(--color-danger), #c44)'
            : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
        }}
      />
    </div>
  );
}

function RoomCardSkeleton() {
  return (
    <div className="glass" style={{ padding: 20, borderRadius: 16, minHeight: 200 }}>
      <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 8, width: '100%' }} />
    </div>
  );
}

export default function AdminCourseRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [form, setForm] = useState({ course: 'CSE', roomNumber: '', capacity: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [studentsModal, setStudentsModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = courseFilter !== 'ALL' ? `?course=${courseFilter}` : '';
    const res = await api.get(`/rooms${qs}`);
    if (res.success) setRooms(res.data?.rooms || []);
    else toast.error(res.message || 'Failed to load rooms');
    setLoading(false);
  }, [courseFilter]);

  useEffect(() => { load(); }, [load]);

  const createRoom = async (e) => {
    e.preventDefault();
    if (!form.roomNumber.trim()) return toast.error('Enter room number');
    setSubmitting(true);
    try {
      const res = await api.post('/rooms', {
        course: form.course,
        roomNumber: form.roomNumber.trim(),
        capacity: Number(form.capacity),
      });
      if (res.success) {
        toast.success('Room created');
        setForm((f) => ({ ...f, roomNumber: '' }));
        load();
      } else toast.error(res.message || 'Failed');
    } catch {
      toast.error('Server error');
    }
    setSubmitting(false);
  };

  const removeRoom = async (id) => {
    if (!confirm('Delete this room?')) return;
    const res = await api.delete(`/rooms/${id}`);
    if (res.success) {
      toast.success('Room deleted');
      load();
    } else toast.error(res.message || 'Failed');
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Room <span className="gradient-text">Management</span></h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          Create and manage course rooms. Students are auto-assigned on registration.
        </p>
      </div>

      <motion.div className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Create room</h3>
        <form onSubmit={createRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>COURSE</label>
            <select className="input-field" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
              {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>ROOM NUMBER</label>
            <input className="input-field" placeholder="CSE-101" value={form.roomNumber}
              onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>CAPACITY</label>
            <input type="number" min={1} className="input-field" value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}
            style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <HiOutlinePlusCircle size={18} /> {submitting ? 'Creating…' : 'Create Room'}
          </button>
        </form>
      </motion.div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <HiOutlineFunnel size={18} color="var(--color-text-muted)" />
        {['ALL', ...COURSES].map((c) => (
          <button key={c} type="button" onClick={() => setCourseFilter(c)}
            className={courseFilter === c ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 14px', fontSize: 13, borderRadius: 999, transition: 'transform 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {loading ? (
          [1, 2, 3, 4].map((i) => <RoomCardSkeleton key={i} />)
        ) : rooms.length === 0 ? (
          <div className="glass" style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', borderRadius: 16, color: 'var(--color-text-muted)' }}>
            No course rooms yet. Create one above.
          </div>
        ) : rooms.map((r, idx) => {
          const occupied = r.occupied ?? r.occupants?.length ?? 0;
          const available = r.available ?? (r.capacity - occupied);
          const full = available <= 0;
          return (
            <motion.div
              key={r._id}
              className="glass"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
              style={{
                padding: 20,
                borderRadius: 16,
                border: '1px solid var(--color-border)',
                transition: 'box-shadow 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800 }}>{r.roomNumber}</h3>
                  <span style={{
                    display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(42,157,143,0.15)', color: 'var(--color-accent-light)',
                  }}>
                    {r.course}
                  </span>
                </div>
                <button type="button" onClick={() => removeRoom(r._id)} title="Delete room"
                  style={{
                    background: 'rgba(225,85,84,0.1)', border: 'none', borderRadius: 10,
                    padding: 8, cursor: 'pointer', color: 'var(--color-danger)',
                  }}>
                  <HiOutlineTrash size={18} />
                </button>
              </div>

              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 16 }}>
                Occupied: <strong style={{ color: 'var(--color-text)' }}>{occupied}</strong> / {r.capacity}
              </p>
              <p style={{ fontSize: 13, marginTop: 4, color: full ? 'var(--color-danger)' : 'var(--color-success)' }}>
                Available seats: {available}
              </p>

              <OccupancyBar occupied={occupied} capacity={r.capacity} />

              <button type="button" className="btn-secondary"
                onClick={() => setStudentsModal(r)}
                style={{
                  width: '100%', marginTop: 16, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 13, fontWeight: 600,
                }}>
                <HiOutlineUsers size={18} /> View Students
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {studentsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setStudentsModal(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass"
              style={{ width: '100%', maxWidth: 420, padding: 24, borderRadius: 20, maxHeight: '80vh', overflow: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>{studentsModal.roomNumber}</h3>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{studentsModal.course} · {studentsModal.occupants?.length ?? 0} students</p>
                </div>
                <button type="button" onClick={() => setStudentsModal(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <HiOutlineXMark size={24} />
                </button>
              </div>
              {(studentsModal.occupants?.length ?? 0) === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No students assigned yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {studentsModal.occupants.map((s) => (
                    <li key={s._id || s.email} style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
                    }}>
                      <span style={{ fontWeight: 700 }}>{s.firstName} {s.lastName}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
