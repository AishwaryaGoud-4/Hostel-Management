'use client';
import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';

export default function RoomCard({ room, live, delay = 0, onEdit, onDelete, onView, onAllocate }) {
  const occupied = room.occupied ?? room.occupiedBeds ?? room.occupants?.length ?? 0;
  const capacity = room.capacity || 0;
  const available = room.availableBeds ?? room.available ?? Math.max(0, capacity - occupied);
  const status = room.statusLabel || room.displayStatus || (available <= 0 ? 'Full' : 'Available');
  const pct = capacity > 0 ? Math.min(100, (occupied / capacity) * 100) : 0;
  const partial = occupied > 0 && available > 0;

  return (
    <motion.article
      className={`glass${live ? ' room-live' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32 }}
      style={{
        padding: 18,
        borderRadius: 16,
        borderLeft: `4px solid ${available <= 0 ? 'var(--color-danger)' : partial ? 'var(--color-warning)' : 'var(--color-accent)'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.6, color: 'var(--color-text-muted)', fontWeight: 700 }}>ROOM ID</p>
          <h3 style={{ fontSize: 22, marginTop: 2 }}>{room.roomId || room.roomCode || room.roomNumber}</h3>
        </div>
        <StatusBadge status={status}>{status}</StatusBadge>
      </div>
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', marginTop: 16, fontSize: 13 }}>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>Room number</dt>
          <dd style={{ fontWeight: 700 }}>{room.roomNo || room.roomNumber}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>Course</dt>
          <dd style={{ fontWeight: 700 }}>{room.course}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>Capacity</dt>
          <dd style={{ fontWeight: 700 }}>{capacity}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>Occupied beds</dt>
          <dd style={{ fontWeight: 700 }}>{occupied}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>Available beds</dt>
          <dd style={{ fontWeight: 700 }}>{available}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>Fill</dt>
          <dd style={{ fontWeight: 700 }}>{partial ? 'Partial' : status}</dd>
        </div>
      </dl>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--color-border)', overflow: 'hidden', marginTop: 14 }} aria-hidden="true">
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 99,
          background: available <= 0 ? 'var(--color-danger)' : partial ? 'var(--color-warning)' : 'var(--color-accent)',
          transition: 'width 400ms ease',
        }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {onView && <button type="button" className="btn-secondary" style={{ padding: '8px 12px' }} onClick={onView}>Students</button>}
        {onAllocate && <button type="button" className="btn-secondary" style={{ padding: '8px 12px' }} onClick={onAllocate}>Allocate</button>}
        {onEdit && <button type="button" className="btn-secondary" style={{ padding: '8px 12px' }} onClick={onEdit}>Edit</button>}
        {onDelete && <button type="button" className="btn-secondary" style={{ padding: '8px 12px', color: 'var(--color-danger)' }} onClick={onDelete}>Delete</button>}
      </div>
    </motion.article>
  );
}
