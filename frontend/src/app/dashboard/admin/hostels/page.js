'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiUsers } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function HostelsPage() {
  const [hostels, setHostels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', type: 'BOYS', address: '', totalFloors: 3, totalRooms: 1, totalBeds: 1, contactNumber: '', wardenId: '', geoLocation: { latitude: 17.385, longitude: 78.4867, radiusMeters: 200 } });

  const load = async () => {
    const res = await api.get('/hostels');
    if (res.success) setHostels(res.data.hostels);
  };
  useEffect(() => { load(); }, []);

  const loadRooms = async (hostelId) => {
    setSelectedHostel(hostelId);
    const res = await api.get(`/hostels/${hostelId}/rooms`);
    if (res.success) setRooms(res.data.rooms);
  };

  const statusColors = { AVAILABLE: '#10b981', OCCUPIED: '#f59e0b', MAINTENANCE: '#ef4444', RESERVED: '#7c3aed' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Hostels & Rooms</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Manage hostel buildings and room inventory</p>
        </div>
      </div>

      {/* Hostel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 32 }}>
        {hostels.map((h, i) => (
          <motion.div key={h._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass card-hover" style={{ padding: 24, borderRadius: 16, cursor: 'pointer', border: selectedHostel === h._id ? '1px solid #7c3aed' : '1px solid transparent' }}
            onClick={() => loadRooms(h._id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{h.name}</h3>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: h.type === 'BOYS' ? 'rgba(59,130,246,0.15)' : h.type === 'GIRLS' ? 'rgba(236,72,153,0.15)' : 'rgba(124,58,237,0.15)', color: h.type === 'BOYS' ? '#60a5fa' : h.type === 'GIRLS' ? '#f472b6' : '#a78bfa' }}>{h.type}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{h.code}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, color: '#94a3b8' }}>
              <FiMapPin size={14} /> {h.address}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Floors: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{h.totalFloors}</span></div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Rooms: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{h.totalRooms}</span></div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Beds: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{h.totalBeds}</span></div>
            </div>
            {/* Occupancy bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#94a3b8' }}>Occupancy</span>
                <span style={{ fontWeight: 600 }}>{h.occupiedBeds}/{h.totalBeds}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#2d2d44' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${h.totalBeds ? (h.occupiedBeds / h.totalBeds * 100) : 0}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', transition: 'width 0.5s' }} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Warden: <span style={{ color: '#e2e8f0' }}>{h.wardenId?.firstName} {h.wardenId?.lastName}</span>
            </div>
            {h.facilities?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {h.facilities.slice(0, 5).map((f, j) => (
                  <span key={j} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>{f}</span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
        {hostels.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14, gridColumn: '1/-1' }}>No hostels found. Run the seed script to populate data.</p>}
      </div>

      {/* Room Grid */}
      {selectedHostel && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Room Floorplan</h3>
          {rooms.length === 0 ? <p style={{ color: '#94a3b8' }}>No rooms found</p> : (
            <>
              {/* Group by floor */}
              {[...new Set(rooms.map(r => r.floor))].sort().map(floor => (
                <div key={floor} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>Floor {floor}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                    {rooms.filter(r => r.floor === floor).map(room => (
                      <div key={room._id} style={{ padding: 12, borderRadius: 10, textAlign: 'center', background: `${statusColors[room.status]}12`, border: `1px solid ${statusColors[room.status]}30`, cursor: 'pointer', transition: 'all 0.2s' }}
                        title={`${room.roomNumber} - ${room.type} (${room.occupants?.length || 0}/${room.capacity})`}>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{room.roomNumber}</p>
                        <p style={{ fontSize: 10, color: statusColors[room.status] }}>{room.type}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 4 }}>
                          {Array.from({ length: room.capacity }).map((_, bi) => (
                            <div key={bi} style={{ width: 8, height: 8, borderRadius: 2, background: bi < (room.occupants?.length || 0) ? statusColors[room.status] : '#2d2d44' }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                    <span style={{ color: '#94a3b8' }}>{status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
