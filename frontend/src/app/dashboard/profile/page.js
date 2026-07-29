'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlinePencilSquare,
  HiOutlineCpuChip,
} from 'react-icons/hi2';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  SUPER_ADMIN: { color: 'var(--color-primary)',   bg: 'rgba(226,114,91,0.15)', label: 'Super Admin' },
  WARDEN:      { color: 'var(--color-accent)',     bg: 'rgba(42,157,143,0.15)', label: 'Warden' },
  STUDENT:     { color: 'var(--color-success)',    bg: 'rgba(111,174,102,0.15)',label: 'Student' },
  STAFF:       { color: 'var(--color-warning)',    bg: 'rgba(244,162,89,0.15)', label: 'Maintenance Staff' },
};

/* ── Module-level sub-components (never inside the parent) ─────────────────── */
function Section({ title, icon: Icon, delay = 0, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="glass" style={{ padding: 28, borderRadius: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(226,114,91,0.08)' }}>
        <div className="icon-box icon-box-sm" style={{ background: 'rgba(226,114,91,0.12)' }}>
          <Icon size={17} color="var(--color-primary-light)" />
        </div>
        <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label}
      </label>
      <input type="text" value={value} readOnly className="input-field" style={{ opacity: 0.6, cursor: 'not-allowed' }} onChange={() => {}} />
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const roleInfo = ROLE_STYLES[user?.role] || ROLE_STYLES.STUDENT;

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    phone:     user?.phone     || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [savingPass, setSavingPass]   = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', profile);
      if (res.success) {
        toast.success('Profile updated ✓');
        if (setUser) setUser({ ...user, ...profile });
      } else toast.error(res.message || 'Update failed');
    } catch { toast.error('Server error'); }
    setSavingProfile(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) return toast.error('New passwords do not match');
    if (passwords.newPass.length < 8) return toast.error('Password must be at least 8 characters');
    setSavingPass(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword:     passwords.newPass,
      });
      if (res.success) {
        toast.success('Password changed ✓');
        setPasswords({ current: '', newPass: '', confirm: '' });
      } else toast.error(res.message || 'Failed');
    } catch { toast.error('Server error'); }
    setSavingPass(false);
  };

  /* Strength score 0–4 */
  const strength = [
    passwords.newPass.length >= 8,
    /[A-Z]/.test(passwords.newPass),
    /[0-9]/.test(passwords.newPass),
    /[^A-Za-z0-9]/.test(passwords.newPass),
  ].filter(Boolean).length;
  const strengthColors = ['#e15554','#f4a259','var(--color-accent)','var(--color-success)'];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* Profile header card */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: 28, borderRadius: 20, marginBottom: 20, background: 'linear-gradient(135deg, rgba(226,114,91,0.1), rgba(42,157,143,0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>

          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 20, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: 'white',
            boxShadow: '0 0 24px rgba(226,114,91,0.35)',
            fontFamily: "'Fraunces', serif",
          }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
              {user?.firstName} {user?.lastName}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: roleInfo.bg, color: roleInfo.color }}>
                {roleInfo.label}
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(111,174,102,0.15)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <HiOutlineCheckCircle size={12} /> Active
              </span>
            </div>
          </div>

          <div className="icon-box icon-box-lg" style={{ background: 'rgba(226,114,91,0.08)' }}>
            <HiOutlineCpuChip size={28} color="var(--color-primary)" />
          </div>
        </div>
      </motion.div>

      {/* Account Info */}
      <Section title="Account Information" icon={HiOutlineUser} delay={0.05}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          <ReadonlyField label="Email Address" value={user?.email || ''} />
          <ReadonlyField label="Role" value={roleInfo.label} />
          <ReadonlyField label="Account ID" value={user?._id?.slice(-10) || '—'} />
          <ReadonlyField label="Member Since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '—'} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
          ⚠ Email and role can only be changed by an administrator.
        </p>
      </Section>

      {/* Edit Profile */}
      <Section title="Edit Profile" icon={HiOutlinePencilSquare} delay={0.1}>
        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
            {[
              { label: 'First Name', key: 'firstName', icon: HiOutlineUser, placeholder: 'John' },
              { label: 'Last Name',  key: 'lastName',  icon: HiOutlineUser, placeholder: 'Doe'  },
              { label: 'Phone',      key: 'phone',      icon: HiOutlinePhone,placeholder: '+91 …' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>{f.label}</label>
                <div style={{ position: 'relative' }}>
                  <f.icon style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 0 }} size={16} />
                  <input value={profile[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder={f.placeholder} />
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary"
            style={{ padding: '12px 28px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {savingProfile ? 'Saving…' : (<><HiOutlineCheckCircle size={16} /> Save Changes</>)}
          </button>
        </form>
      </Section>

      {/* Change Password */}
      <Section title="Change Password" icon={HiOutlineLockClosed} delay={0.15}>
        <form onSubmit={changePassword}>

          {/* Current */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <HiOutlineLockClosed style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 0 }} size={16} />
              <input type={showCurrent ? 'text' : 'password'} value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                className="input-field" style={{ paddingLeft: 38, paddingRight: 42 }}
                placeholder="Enter current password" required />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', zIndex: 2 }}>
                {showCurrent ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
              </button>
            </div>
          </div>

          {/* New + Confirm */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <HiOutlineLockClosed style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 0 }} size={16} />
                <input type={showNew ? 'text' : 'password'} value={passwords.newPass}
                  onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                  className="input-field" style={{ paddingLeft: 38, paddingRight: 42 }}
                  placeholder="Min. 8 characters" required />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', zIndex: 2 }}>
                  {showNew ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <HiOutlineLockClosed style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 0 }} size={16} />
                <input type="password" value={passwords.confirm}
                  onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                  className="input-field" style={{ paddingLeft: 38 }}
                  placeholder="Re-enter new password" required />
              </div>
            </div>
          </div>

          {/* Strength bar */}
          {passwords.newPass.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[1,2,3,4].map(n => (
                  <div key={n} style={{ height: 4, flex: 1, borderRadius: 2, transition: 'background 0.3s',
                    background: n <= strength ? strengthColors[strength - 1] : 'var(--color-border)' }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {['', 'Weak — add uppercase, numbers, symbols', 'Fair', 'Good', 'Strong ✓'][strength]}
              </p>
            </div>
          )}

          <button type="submit" disabled={savingPass} className="btn-primary"
            style={{ padding: '12px 28px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {savingPass ? 'Changing…' : (<><HiOutlineShieldCheck size={16} /> Change Password</>)}
          </button>
        </form>
      </Section>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(225,85,84,0.2)', background: 'rgba(225,85,84,0.04)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e15554', marginBottom: 8 }}>⚠ Danger Zone</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Account deletion is permanent and cannot be undone. Contact your administrator to request removal.
        </p>
        <button className="btn-secondary"
          style={{ borderColor: '#e15554', color: '#e15554', padding: '10px 20px', fontSize: 13 }}
          onClick={() => toast.error('Please contact your administrator to delete this account.')}>
          Request Account Deletion
        </button>
      </motion.div>
    </div>
  );
}
