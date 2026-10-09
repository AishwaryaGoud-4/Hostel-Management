'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiHome,
  FiUsers,
  FiRefreshCw,
  FiCheckCircle,
  FiLayers,
  FiCalendar,
  FiInfo,
} from 'react-icons/fi';
import {
  HiOutlineBuildingOffice2,
  HiOutlineWifi,
  HiOutlineBolt,
  HiOutlineTableCells,
  HiOutlineArchiveBox,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/store/socketProvider';
import toast from 'react-hot-toast';

const T = {
  primary: '#2563eb',
  accent: '#059669',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  textMuted: '#94a3b8',
  border: '#243044',
};

const FACILITY_META = {
  'Wi-Fi': { icon: HiOutlineWifi, emoji: '📶' },
  WiFi: { icon: HiOutlineWifi, emoji: '📶' },
  Bed: { emoji: '🛏' },
  Electricity: { icon: HiOutlineBolt, emoji: '💡' },
  'Study Table': { icon: HiOutlineTableCells, emoji: '🪑' },
  Desk: { icon: HiOutlineTableCells, emoji: '🪑' },
  Cupboard: { icon: HiOutlineArchiveBox, emoji: '👕' },
  Wardrobe: { icon: HiOutlineArchiveBox, emoji: '👕' },
  Fan: { emoji: '🌀' },
  Water: { emoji: '🚿' },
  Laundry: { emoji: '🧺' },
  Security: { emoji: '🔒' },
  Mess: { emoji: '🍽' },
  Gym: { emoji: '🏋' },
  Library: { emoji: '📚' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function statusConfig(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'full') {
    return { label: 'Full', color: T.danger, bg: `${T.danger}22` };
  }
  if (value === 'available') {
    return { label: 'Available', color: T.success, bg: `${T.success}22` };
  }
  if (value === 'maintenance') {
    return { label: 'Maintenance', color: T.warning, bg: `${T.warning}22` };
  }
  return { label: status || 'Occupied', color: T.warning, bg: `${T.warning}22` };
}

function mergeFacilities(roomAmenities = [], hostelFacilities = []) {
  const seen = new Set();
  const list = [];
  [...roomAmenities, ...hostelFacilities].forEach((name) => {
    const key = String(name).trim();
    if (!key || seen.has(key.toLowerCase())) return;
    seen.add(key.toLowerCase());
    list.push(key);
  });
  return list;
}

function OccupancyDots({ capacity, occupied }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: capacity }, (_, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.05 * i, type: 'spring', stiffness: 260 }}
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: i < occupied ? T.primary : 'rgba(168,159,146,0.25)',
            boxShadow: i < occupied ? `0 0 10px ${T.primary}55` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
        {Icon && <Icon size={15} />}
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function MyRoomPage() {
  const { user, checkAuth } = useAuthStore();
  const [room, setRoom] = useState(undefined);
  const [course, setCourse] = useState(user?.studentProfile?.course || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendMissingRoutes, setBackendMissingRoutes] = useState(false);
  const [allocationNote, setAllocationNote] = useState('');
  const [pulse, setPulse] = useState(false);
  const { socket } = useSocket() || {};

  const isRoomsRouteMissing = (res) =>
    res?.httpStatus === 404 &&
    String(res?.message || '').toLowerCase().includes('route not found') &&
    String(res?.message || '').includes('/api/rooms');

  const parseRoomResponse = (res) => {
    if (!res?.success) return { room: null, course: null };
    const roomPayload = res.data?.room ?? res.room ?? null;
    const courseVal =
      res.data?.course ?? roomPayload?.course ?? user?.studentProfile?.course ?? null;
    return { room: roomPayload, course: courseVal };
  };

  const loadRoom = useCallback(async () => {
    const res = await api.get('/rooms/me');
    if (isRoomsRouteMissing(res)) {
      setBackendMissingRoutes(true);
      setRoom(null);
      return null;
    }
    setBackendMissingRoutes(false);
    const { room: roomPayload, course: courseVal } = parseRoomResponse(res);
    setRoom(roomPayload);
    setCourse(courseVal);
    return roomPayload;
  }, [user?.studentProfile?.course]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let roomPayload = await loadRoom();
      if (active && !roomPayload && !backendMissingRoutes) {
        const alloc = await api.post('/rooms/me/allocate', {});
        if (isRoomsRouteMissing(alloc)) {
          setBackendMissingRoutes(true);
        }
        if (alloc?.success) {
          roomPayload = alloc.data?.room ?? alloc.room ?? null;
          if (roomPayload) {
            setRoom(roomPayload);
            setCourse(roomPayload.course ?? user?.studentProfile?.course ?? null);
          }
          await checkAuth();
        } else if (alloc?.message) {
          setAllocationNote(alloc.message);
        }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [loadRoom, checkAuth, user?.studentProfile?.course]);

  useEffect(() => {
    if (!socket) return undefined;
    const onRoom = (event) => {
      const eventUserId = event?.user?._id || event?.student?._id;
      const sameUser = eventUserId && String(eventUserId) === String(user?._id);
      const myCode = user?.studentProfile?.roomCode || room?.roomId;
      const sameRoom = myCode && (event?.room?.roomId === myCode || event?.room?.roomCode === myCode);
      if (event && !sameUser && !sameRoom) return;
      setPulse(true);
      loadRoom();
      window.setTimeout(() => setPulse(false), 1200);
    };
    socket.on('room:allocated', onRoom);
    socket.on('room:updated', onRoom);
    socket.on('room:vacated', onRoom);
    return () => {
      socket.off('room:allocated', onRoom);
      socket.off('room:updated', onRoom);
      socket.off('room:vacated', onRoom);
    };
  }, [socket, loadRoom, user?._id, user?.studentProfile?.roomCode, room?.roomId]);

  const handleRefresh = async (tryAllocate = false) => {
    setRefreshing(true);
    try {
      if (tryAllocate) {
        const alloc = await api.post('/rooms/me/allocate', {});
        if (alloc?.success) {
          const assigned = alloc.data?.room ?? alloc.room;
          if (assigned) setRoom(assigned);
          await checkAuth();
          toast.success(alloc.message || 'Room assigned successfully');
        } else if (alloc?.message && !room) {
          toast.error(alloc.message);
        }
      }
      await loadRoom();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 32, width: 180, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'inherit' }}>
            <span className="gradient-text">My Room</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 6 }}>
            Your complete room and roommate details
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass"
          style={{
            padding: 'clamp(32px, 6vw, 56px)',
            borderRadius: 20,
            textAlign: 'center',
            border: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, fontFamily: 'inherit' }}>
            {backendMissingRoutes ? 'Room API Not Available' : 'Room Not Assigned Yet'}
          </h2>
          {backendMissingRoutes ? (
            <p style={{ color: T.warning, fontSize: 14, maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.6 }}>
              The deployed backend at Render does not include <code>/api/rooms</code> yet. Push the latest backend
              (branch with room routes) to <strong>master</strong> and redeploy the Render service, then refresh this page.
            </p>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 420, margin: '0 auto 8px', lineHeight: 1.6 }}>
              {allocationNote || 'Your room is currently being processed.'}
            </p>
          )}
          {course && (
            <p style={{ fontSize: 14, fontWeight: 600, color: T.accent, marginBottom: 16 }}>
              Course: {course}
            </p>
          )}
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 28 }}>
            Please check again later or contact the hostel administrator.
          </p>
          <button
            type="button"
            onClick={() => handleRefresh(true)}
            disabled={refreshing}
            className="touch-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 12,
              border: 'none',
              cursor: refreshing ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <FiRefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Refresh Room Status
          </button>
          <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </motion.div>
      </div>
    );
  }

  const displayRoomId = room.roomId || room.roomNumber;
  const pct = Math.round((room.occupied / room.capacity) * 100);
  const st = statusConfig(room.status);
  const facilities = mergeFacilities(room.amenities, room.hostelFacilities);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'inherit' }}>
          <span className="gradient-text">My Room</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 6 }}>
          Your complete hostel room information
        </p>
      </header>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`glass${pulse ? ' room-live' : ''}`}
        style={{
          padding: 'clamp(28px, 5vw, 48px)',
          borderRadius: 20,
          textAlign: 'center',
          marginBottom: 24,
          border: `1px solid rgba(37,99,235,0.15)`,
          background: 'linear-gradient(145deg, rgba(33,29,24,0.95), rgba(5,150,105,0.06))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: `${T.success}22`,
            color: T.success,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            marginBottom: 20,
          }}
        >
          <FiCheckCircle size={14} />
          ROOM ASSIGNED
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
            fontWeight: 800,
            letterSpacing: 1,
            marginBottom: 4,
            fontFamily: 'inherit',
          }}
          className="gradient-text"
        >
          {displayRoomId}
        </motion.h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>YOUR ROOM ID</p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '12px 28px',
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          <span><strong>Room number:</strong> {room.roomNumber}</span>
          <span><strong>Course:</strong> {room.course}</span>
          <span><strong>Floor:</strong> {room.floorLabel}</span>
          <span><strong>Block:</strong> {room.block}</span>
          <span><strong>Capacity:</strong> {room.capacity}</span>
          <span><strong>Occupied:</strong> {room.occupied}</span>
          <span><strong>Available:</strong> {room.availableBeds}</span>
        </div>

        <p style={{ fontSize: 16, fontWeight: 700 }}>
          {room.occupied} / {room.capacity} Students
        </p>
        <p style={{ fontSize: 13, color: T.accent, marginTop: 4 }}>
          {room.availableBeds > 0 ? `${room.availableBeds} Bed Available` : 'Room Full'}
        </p>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              color: st.color,
              background: st.bg,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />
            {st.label}
          </span>
        </div>
      </motion.section>

      {/* Overview cards */}
      <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        ROOM OVERVIEW
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          { title: 'Room ID', value: displayRoomId },
          { title: 'Room number', value: room.roomNumber || '—' },
          { title: 'Course', value: room.course || '—' },
          { title: 'Capacity', value: room.capacity },
          { title: 'Occupied beds', value: room.occupied },
          { title: 'Available beds', value: room.availableBeds },
          { title: 'Status', value: st.label },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="glass"
            style={{ padding: 20, borderRadius: 14, border: `1px solid ${T.border}` }}
          >
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{card.title}</p>
            <p style={{ fontSize: 18, fontWeight: 800 }}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Occupancy bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass"
        style={{ padding: 24, borderRadius: 16, marginBottom: 28, border: `1px solid ${T.border}` }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 16, color: 'var(--color-text-muted)' }}>
          ROOM OCCUPANCY
        </h3>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          {room.occupied} / {room.capacity} Students
        </p>
        <OccupancyDots capacity={room.capacity} occupied={room.occupied} />
        <div style={{ marginTop: 20, height: 8, borderRadius: 999, background: 'rgba(168,159,146,0.2)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.primary}, ${T.accent})` }}
          />
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 10 }}>
          {pct}% Occupied · {room.availableBeds > 0 ? `${room.availableBeds} Bed Available` : 'Room Full'}
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 20 }}>
        {/* Roommates */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass"
          style={{ padding: 24, borderRadius: 16, border: `1px solid ${T.border}` }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiUsers size={16} color={T.primary} />
            YOUR ROOMMATES
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {room.roommates?.length ? room.roommates.map((mate) => (
              <div
                key={mate.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: mate.isYou
                      ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
                      : 'rgba(37,99,235,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    color: mate.isYou ? 'white' : T.primary,
                  }}
                >
                  {mate.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{mate.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{mate.course} · Student</p>
                </div>
                {mate.isYou ? (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, background: `${T.accent}33`, color: T.accent }}>
                    YOU
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>Roommate</span>
                )}
              </div>
            )) : (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No roommates listed yet.</p>
            )}
          </div>
        </motion.div>

        {/* Room information */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass"
          style={{ padding: 24, borderRadius: 16, border: `1px solid ${T.border}` }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiInfo size={16} color={T.accent} />
            ROOM INFORMATION
          </h3>
          <InfoRow label="Room ID" value={displayRoomId} icon={FiHome} />
          <InfoRow label="Course" value={room.course} />
          <InfoRow label="Block" value={room.block} icon={HiOutlineBuildingOffice2} />
          <InfoRow label="Floor" value={room.floorLabel} icon={FiLayers} />
          <InfoRow label="Room Type" value={room.roomType} />
          <InfoRow label="Capacity" value={room.capacity} />
          <InfoRow label="Current Occupancy" value={room.occupied} />
          <InfoRow label="Available Beds" value={room.availableBeds} />
          <InfoRow label="Status" value={st.label} />
          <InfoRow label="Allocated On" value={formatDate(room.assignedAt)} icon={FiCalendar} />
        </motion.div>
      </div>

      {/* Allocation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass"
        style={{ padding: 24, borderRadius: 16, marginTop: 20, border: `1px solid ${T.border}` }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 16, color: 'var(--color-text-muted)' }}>
          ROOM ALLOCATION
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Assigned On</p>
            <p style={{ fontWeight: 700 }}>{formatDate(room.assignedAt)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Allocation Type</p>
            <p style={{ fontWeight: 700 }}>{room.allocationType}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Allocation</p>
            <p style={{ fontWeight: 700 }}>{room.allocationNote}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Course</p>
            <p style={{ fontWeight: 700 }}>{room.course}</p>
          </div>
        </div>
      </motion.div>

      {/* Facilities */}
      <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: 'var(--color-text-muted)', margin: '28px 0 12px' }}>
        HOSTEL FACILITIES
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {facilities.map((name) => {
          const meta = FACILITY_META[name] || { emoji: '✨' };
          return (
            <motion.div
              key={name}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="glass"
              style={{
                padding: 16,
                borderRadius: 12,
                textAlign: 'center',
                border: `1px solid ${T.border}`,
                cursor: 'default',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{meta.emoji}</div>
              <p style={{ fontSize: 12, fontWeight: 600 }}>{name}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass"
        style={{ padding: 24, borderRadius: 16, marginBottom: 8, border: `1px solid ${T.border}` }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 14, color: 'var(--color-text-muted)' }}>
          ROOM RULES
        </h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.8 }}>
          {room.rules?.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
