'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiHome, FiUsers, FiWifi, FiDroplet, FiZap } from 'react-icons/fi';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

/* ── Wanderlust Dusk tokens ──────────────────────────────────── */
const T = {
  primary:    '#e2725b',
  accent:     '#2a9d8f',
  success:    '#6fae66',
  warning:    '#f4a259',
  danger:     '#e15554',
  textMuted:  '#a89f92',
  border:     '#34302a',
  bgCard:     '#211d18',
  primaryLight: '#f2a679',
  accentLight: '#65b8ae',
};

export default function MyRoomPage() {
  const { user } = useAuthStore();
  const [room, setRoom] = useState(null);
  const [hostel, setHostel] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (user?.studentProfile?.hostelId) {
        const hid = typeof user.studentProfile.hostelId === 'object' ? user.studentProfile.hostelId._id : user.studentProfile.hostelId;
        const res = await api.get(`/hostels/${hid}`);
        if (res?.success !== false) {
          const hostelData = res.data?.hostel || res.data;
          setHostel(hostelData);
          const rid = typeof user.studentProfile.roomId === 'object' ? user.studentProfile.roomId._id : user.studentProfile.roomId;
          const myRoom = (res.data?.rooms || []).find(r => r._id === rid);
          if (myRoom) setRoom(myRoom);
        }
      }
    };
    load();
  }, [user]);

  if (!room) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}><span className="gradient-text">My Room</span></h1>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center' }}>
          <FiHome size={48} color={T.textMuted} style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Room Assigned</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Contact your warden for room allocation.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}><span className="gradient-text">My Room</span></h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: 28, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="icon-box icon-box-sm" style={{ background: `${T.primary}18` }}><FiHome size={14} color={T.primary} /></div>
            Room Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Room Number', room.roomNumber],
              ['Floor', room.floor],
              ['Type', room.type],
              ['Status', room.status],
              ['Monthly Rent', `₹${room.monthlyRent?.toLocaleString()}`],
              ['AC', room.isAirConditioned ? 'Yes' : 'No'],
              ['Attached Bathroom', room.hasAttachedBathroom ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
          {room.amenities?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Amenities</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {room.amenities.map((a, i) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: `${T.accent}20`, color: T.accent }}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass" style={{ padding: 28, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Hostel Info</h3>
            {hostel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{hostel.name} ({hostel.code})</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{hostel.address}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Contact: {hostel.contactNumber}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Warden: {hostel.wardenId?.firstName} {hostel.wardenId?.lastName}</p>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass" style={{ padding: 28, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Utility Usage</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 10, background: `${T.warning}18`, textAlign: 'center' }}>
                <FiZap size={20} color={T.warning} style={{ marginBottom: 6, display: 'inline-block' }} />
                <p style={{ fontSize: 20, fontWeight: 800, color: T.warning }}>{room.utilityUsage?.electricity || 0}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>kWh this month</p>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: `${T.accentLight}18`, textAlign: 'center' }}>
                <FiDroplet size={20} color={T.accentLight} style={{ marginBottom: 6, display: 'inline-block' }} />
                <p style={{ fontSize: 20, fontWeight: 800, color: T.accentLight }}>{room.utilityUsage?.water || 0}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Liters this month</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass" style={{ padding: 28, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
               <div className="icon-box icon-box-sm" style={{ background: `${T.primary}18` }}><FiUsers size={14} color={T.primary} /></div>
               Roommates
            </h3>
            {room.occupants?.length > 1 ? room.occupants.filter(o => o._id !== user?._id).map((o, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'white' }}>
                  {o.firstName?.[0]}{o.lastName?.[0]}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{o.firstName} {o.lastName}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{o.studentProfile?.rollNumber || o.email}</p>
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No other occupants</p>}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
