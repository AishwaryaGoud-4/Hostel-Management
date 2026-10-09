'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSocket } from '@/store/socketProvider';
import PageHeader from '@/components/ui/PageHeader';
import RoomCard from '@/components/ui/RoomCard';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeletonGrid } from '@/components/ui/LoadingSkeleton';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';

const COURSES = ['CSE', 'ECE', 'EEE', 'BSC', 'BBA'];

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'var(--color-text-muted)' };

export default function AdminCourseRoomsPage() {
  return (
    <Suspense fallback={<CardSkeletonGrid />}>
      <AdminRoomsInner />
    </Suspense>
  );
}

function AdminRoomsInner() {
  const params = useSearchParams();
  const { socket } = useSocket() || {};
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const searchFromUrl = params.get('search') || '';
  const [search, setSearch] = useState(searchFromUrl);
  const [trackedUrl, setTrackedUrl] = useState(searchFromUrl);
  if (searchFromUrl !== trackedUrl) {
    setTrackedUrl(searchFromUrl);
    setSearch(searchFromUrl);
  }
  const [form, setForm] = useState({ course: 'CSE', roomId: '', roomNo: '', capacity: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [liveId, setLiveId] = useState(null);
  const [viewRoom, setViewRoom] = useState(null);
  const [editRoom, setEditRoom] = useState(null);
  const [allocOpen, setAllocOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [alloc, setAlloc] = useState({ studentId: '', roomId: '', mode: 'allocate' });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (courseFilter !== 'ALL') qs.set('course', courseFilter);
    if (statusFilter !== 'ALL') qs.set('status', statusFilter);
    if (search.trim()) qs.set('search', search.trim());
    const res = await api.get(`/rooms${qs.toString() ? `?${qs}` : ''}`);
    if (res.success) setRooms(res.data?.rooms || []);
    else toast.error(res.message || 'Failed to load rooms');
    setLoading(false);
  }, [courseFilter, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return undefined;
    const onRoom = (payload) => {
      const id = payload?.room?._id || payload?.room?.roomId;
      setLiveId(id || 'live');
      load();
      window.setTimeout(() => setLiveId(null), 1200);
    };
    socket.on('room:updated', onRoom);
    socket.on('room:allocated', onRoom);
    socket.on('room:vacated', onRoom);
    return () => {
      socket.off('room:updated', onRoom);
      socket.off('room:allocated', onRoom);
      socket.off('room:vacated', onRoom);
    };
  }, [socket, load]);

  const stats = useMemo(() => {
    const full = rooms.filter((r) => (r.statusLabel || r.displayStatus) === 'Full').length;
    const beds = rooms.reduce((sum, r) => sum + (r.availableBeds ?? 0), 0);
    return { total: rooms.length, full, beds };
  }, [rooms]);

  const createRoom = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const body = { course: form.course, capacity: Number(form.capacity) };
    if (form.roomId.trim()) body.roomId = form.roomId.trim().toUpperCase();
    if (form.roomNo.trim()) body.roomNo = form.roomNo.trim();
    const res = await api.post('/rooms', body);
    setSubmitting(false);
    if (res.success) {
      toast.success(`${res.data?.room?.roomId || 'Room'} created`);
      setForm((f) => ({ ...f, roomId: '', roomNo: '' }));
      load();
    } else toast.error(res.message || 'Could not create room');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const res = await api.put(`/rooms/${editRoom._id}`, {
      roomNo: editRoom.roomNo,
      capacity: Number(editRoom.capacity),
      roomId: editRoom.roomId,
    });
    if (res.success) {
      toast.success('Room updated');
      setEditRoom(null);
      load();
    } else toast.error(res.message || 'Update failed');
  };

  const removeRoom = async (room) => {
    if (!window.confirm(`Delete ${room.roomId || room.roomNumber}?`)) return;
    const res = await api.delete(`/rooms/${room._id}`);
    if (res.success) {
      toast.success('Room deleted');
      load();
    } else toast.error(res.message || 'Could not delete room');
  };

  const openAllocate = async (presetRoom) => {
    const course = presetRoom?.course || (courseFilter !== 'ALL' ? courseFilter : 'CSE');
    const res = await api.get(`/auth/users?role=STUDENT&course=${course}&limit=100`);
    setStudents(res.data?.users || []);
    setAlloc({
      studentId: '',
      roomId: presetRoom?._id || '',
      mode: 'allocate',
      course,
    });
    setAllocOpen(true);
  };

  const submitAlloc = async (e) => {
    e.preventDefault();
    const endpoint = alloc.mode === 'change' ? '/rooms/change' : '/rooms/allocate';
    const res = await api.post(endpoint, { studentId: alloc.studentId, roomId: alloc.roomId });
    if (res.success) {
      toast.success(res.message || 'Room updated');
      setAllocOpen(false);
      setViewRoom(null);
      load();
    } else toast.error(res.message || 'Allocation failed');
  };

  const vacate = async (studentId) => {
    const res = await api.post('/rooms/vacate', { studentId });
    if (res.success) {
      toast.success('Student removed from room');
      setViewRoom(null);
      load();
    } else toast.error(res.message || 'Could not vacate room');
  };

  const courseStudents = students.filter((s) => !alloc.course || s.studentProfile?.course === alloc.course);
  const targetRooms = rooms.filter((r) => !alloc.course || r.course === alloc.course);

  return (
    <div>
      <PageHeader
        title="Room management"
        subtitle="Course rooms for CSE, ECE, EEE, BSC, and BBA. New students are placed in a random available room for their course."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        <StatCard label="Rooms shown" value={stats.total} delay={0} />
        <StatCard label="Full rooms" value={stats.full} delay={0.05} />
        <StatCard label="Available beds" value={stats.beds} delay={0.1} />
      </div>

      <form onSubmit={createRoom} className="glass" style={{ padding: 20, borderRadius: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'end' }}>
        <label style={fieldStyle}>
          <span style={labelStyle}>COURSE</span>
          <select className="input-field" aria-label="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
            {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>ROOM ID</span>
          <input className="input-field" aria-label="Room ID" placeholder="Auto CSE001" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>ROOM NUMBER</span>
          <input className="input-field" aria-label="Room number" placeholder="Auto 101" value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>CAPACITY</span>
          <input className="input-field" aria-label="Capacity" type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </label>
        <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create room'}</button>
      </form>

      <div className="glass" style={{ padding: 16, borderRadius: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input-field" aria-label="Search rooms" placeholder="Search Room ID or number" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="input-field" aria-label="Filter course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="ALL">All courses</option>
          {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input-field" aria-label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="ALL">All statuses</option>
          <option value="Available">Available</option>
          <option value="Full">Full</option>
        </select>
        <button type="button" className="btn-secondary" onClick={() => openAllocate(null)}>Allocate or change</button>
      </div>

      {loading ? <CardSkeletonGrid /> : rooms.length === 0 ? (
        <EmptyState title="No rooms match" message="Create a course room or clear the search and filters." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {rooms.map((room, i) => (
            <RoomCard
              key={room._id}
              room={room}
              delay={Math.min(i, 8) * 0.04}
              live={liveId === room._id || liveId === room.roomId}
              onView={() => setViewRoom(room)}
              onEdit={() => setEditRoom({ ...room, roomNo: room.roomNo || '' })}
              onDelete={() => removeRoom(room)}
              onAllocate={() => openAllocate(room)}
            />
          ))}
        </div>
      )}

      <Modal open={Boolean(viewRoom)} title={viewRoom?.roomId || 'Room'} subtitle={viewRoom ? `${viewRoom.course} · Room ${viewRoom.roomNo || viewRoom.roomNumber}` : ''} onClose={() => setViewRoom(null)}>
        {viewRoom && (
          <div>
            <p style={{ marginBottom: 12, fontSize: 14 }}>
              <StatusBadge status={viewRoom.statusLabel || viewRoom.displayStatus} />
              <span style={{ marginLeft: 8, color: 'var(--color-text-muted)' }}>
                {viewRoom.occupiedBeds ?? viewRoom.occupied ?? 0} occupied · {viewRoom.availableBeds ?? 0} available
              </span>
            </p>
            {(viewRoom.occupants || []).length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No students assigned.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {viewRoom.occupants.map((s) => (
                  <li key={s._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: 12, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    <span>
                      <strong>{s.firstName} {s.lastName}</strong>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)' }}>{s.studentProfile?.course} · {s.email}</span>
                    </span>
                    <button type="button" className="btn-secondary" style={{ padding: '8px 10px' }} onClick={() => vacate(s._id)}>Vacate</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(editRoom)} title="Edit room" subtitle="Room number and capacity" onClose={() => setEditRoom(null)}>
        {editRoom && (
          <form onSubmit={saveEdit} style={{ display: 'grid', gap: 12 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>ROOM ID</span>
              <input className="input-field" value={editRoom.roomId || ''} onChange={(e) => setEditRoom({ ...editRoom, roomId: e.target.value.toUpperCase() })} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>ROOM NUMBER</span>
              <input className="input-field" required value={editRoom.roomNo || ''} onChange={(e) => setEditRoom({ ...editRoom, roomNo: e.target.value })} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>CAPACITY</span>
              <input className="input-field" type="number" min={1} required value={editRoom.capacity} onChange={(e) => setEditRoom({ ...editRoom, capacity: e.target.value })} />
            </label>
            <button className="btn-primary" type="submit">Save changes</button>
          </form>
        )}
      </Modal>

      <Modal open={allocOpen} title={alloc.mode === 'change' ? 'Change room' : 'Allocate room'} subtitle="Only rooms for the student’s course can be selected." onClose={() => setAllocOpen(false)}>
        <form onSubmit={submitAlloc} style={{ display: 'grid', gap: 12 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>ACTION</span>
            <select className="input-field" value={alloc.mode} onChange={(e) => setAlloc({ ...alloc, mode: e.target.value })}>
              <option value="allocate">Allocate available student</option>
              <option value="change">Change an existing room</option>
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>COURSE</span>
            <select className="input-field" value={alloc.course || 'CSE'} onChange={async (e) => {
              const course = e.target.value;
              const res = await api.get(`/auth/users?role=STUDENT&course=${course}&limit=100`);
              setStudents(res.data?.users || []);
              setAlloc((a) => ({ ...a, course, studentId: '' }));
            }}>
              {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>STUDENT</span>
            <select className="input-field" required value={alloc.studentId} onChange={(e) => setAlloc({ ...alloc, studentId: e.target.value })}>
              <option value="">Select student</option>
              {courseStudents
                .filter((s) => (alloc.mode === 'allocate' ? !s.studentProfile?.roomId : Boolean(s.studentProfile?.roomId)))
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName} · {s.studentProfile?.roomCode || s.studentProfile?.roomNumber || 'unassigned'}
                  </option>
                ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>ROOM</span>
            <select className="input-field" required value={alloc.roomId} onChange={(e) => setAlloc({ ...alloc, roomId: e.target.value })}>
              <option value="">Select room</option>
              {targetRooms.filter((r) => (r.availableBeds ?? r.available ?? 1) > 0).map((r) => (
                <option key={r._id} value={r._id}>{r.roomId} · No. {r.roomNo} · {r.availableBeds} beds</option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">{alloc.mode === 'change' ? 'Change room' : 'Allocate room'}</button>
        </form>
      </Modal>
    </div>
  );
}
