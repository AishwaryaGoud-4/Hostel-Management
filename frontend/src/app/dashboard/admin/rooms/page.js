'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlusCircle, HiOutlineTrash, HiOutlineFunnel } from 'react-icons/hi2';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const COURSES = ['CSE', 'ECE', 'EEE', 'BSC', 'BBA'];

export default function AdminCourseRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [form, setForm] = useState({ course: 'CSE', roomNumber: '', capacity: 4 });
  const [submitting, setSubmitting] = useState(false);

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
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Course <span className="gradient-text">Rooms</span></h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          Create and manage rooms per course. Students are auto-assigned on registration.
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
            <HiOutlinePlusCircle size={18} /> {submitting ? 'Creating…' : 'Add room'}
          </button>
        </form>
      </motion.div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <HiOutlineFunnel size={18} color="var(--color-text-muted)" />
        {['ALL', ...COURSES].map((c) => (
          <button key={c} type="button" onClick={() => setCourseFilter(c)}
            className={courseFilter === c ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 14px', fontSize: 13, borderRadius: 999 }}>
            {c}
          </button>
        ))}
      </div>

      <motion.div className="glass" style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'rgba(226,114,91,0.08)', textAlign: 'left' }}>
                {['Course', 'Room Number', 'Capacity', 'Occupied', 'Available', ''].map((h) => (
                  <th key={h} style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 11, letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
              ) : rooms.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>No course rooms yet. Create one above.</td></tr>
              ) : rooms.map((r) => {
                const occupied = r.occupied ?? r.occupants?.length ?? 0;
                const available = r.available ?? (r.capacity - occupied);
                return (
                  <tr key={r._id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.course}</td>
                    <td style={{ padding: '12px 16px' }}>{r.roomNumber}</td>
                    <td style={{ padding: '12px 16px' }}>{r.capacity}</td>
                    <td style={{ padding: '12px 16px' }}>{occupied}</td>
                    <td style={{ padding: '12px 16px', color: available > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{available}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button type="button" onClick={() => removeRoom(r._id)} title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                        <HiOutlineTrash size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
