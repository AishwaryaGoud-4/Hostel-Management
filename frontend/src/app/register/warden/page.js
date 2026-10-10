'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineHome,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineShieldCheck,
  HiOutlineIdentification,
  HiOutlineBuildingOffice2,
  HiOutlineClock,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label style={{
        fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
        marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)', pointerEvents: 'none',
          }} size={16} />
        )}
        {children}
      </div>
    </div>
  );
}

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', employeeId: '', department: '', password: '', confirm: '' };

export default function WardenRegisterPage() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');

    setLoading(true);
    const { confirm, ...payload } = form;
    const res = await api.post('/auth/register/warden', payload);
    setLoading(false);
    if (!res?.success) {
      toast.error(res?.message || 'Could not submit your application');
      return;
    }
    setSubmitted({ name: form.firstName, email: form.email.trim().toLowerCase() });
    setForm(EMPTY);
  };

  return (
    <div className="aurora-bg grain-overlay animated-gradient"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass"
        style={{ width: '100%', maxWidth: 520, padding: 'clamp(24px, 5vw, 40px)', borderRadius: 24, position: 'relative', zIndex: 1 }}
      >
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none', color: 'var(--color-text-muted)', fontSize: 13 }}>
          <HiOutlineHome size={15} /> Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="icon-box icon-box-lg glow"
            style={{ background: 'linear-gradient(135deg, #7c3aed, var(--color-primary))', margin: '0 auto 16px' }}>
            <HiOutlineShieldCheck size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }} className="gradient-text">Warden Registration</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8 }}>
            Apply for a warden account. The hostel admin reviews every request before you can sign in.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '28px 20px', borderRadius: 20, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <HiOutlineClock size={52} color="#a78bfa" style={{ marginBottom: 12 }} />
              <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>Application sent</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                Thanks, {submitted.name}. Your warden account <strong>{submitted.email}</strong> is waiting for admin approval.
                You can sign in as soon as it is approved.
              </p>
              <Link href="/login" className="btn-primary" style={{ display: 'inline-block', padding: '14px 28px', textDecoration: 'none' }}>
                Go to Sign In
              </Link>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="First Name" icon={HiOutlineUser}>
                  <input value={form.firstName} onChange={set('firstName')} className="input-field" style={{ paddingLeft: 38 }} placeholder="Anita" required />
                </Field>
                <Field label="Last Name" icon={HiOutlineUser}>
                  <input value={form.lastName} onChange={set('lastName')} className="input-field" style={{ paddingLeft: 38 }} placeholder="Rao" required />
                </Field>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Field label="Email" icon={HiOutlineEnvelope}>
                  <input type="email" value={form.email} onChange={set('email')} className="input-field" style={{ paddingLeft: 38 }} placeholder="warden@college.edu" required />
                </Field>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Field label="Phone" icon={HiOutlinePhone}>
                  <input value={form.phone} onChange={set('phone')} className="input-field" style={{ paddingLeft: 38 }} placeholder="+91 9876543210" required />
                </Field>
              </div>
              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Employee ID" icon={HiOutlineIdentification}>
                  <input value={form.employeeId} onChange={set('employeeId')} className="input-field" style={{ paddingLeft: 38 }} placeholder="EMP-1042" />
                </Field>
                <Field label="Department" icon={HiOutlineBuildingOffice2}>
                  <input value={form.department} onChange={set('department')} className="input-field" style={{ paddingLeft: 38 }} placeholder="Hostel office" />
                </Field>
              </div>
              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <Field label="Password" icon={HiOutlineLockClosed}>
                  <input type="password" value={form.password} onChange={set('password')} className="input-field" style={{ paddingLeft: 38 }} placeholder="Min. 8 characters" required />
                </Field>
                <Field label="Confirm Password" icon={HiOutlineLockClosed}>
                  <input type="password" value={form.confirm} onChange={set('confirm')} className="input-field" style={{ paddingLeft: 38 }} placeholder="Re-enter password" required />
                </Field>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', padding: 16, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <HiOutlineShieldCheck size={20} /> {loading ? 'Sending…' : 'APPLY AS WARDEN'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {!submitted && (
          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--color-text-muted)' }}>
            Already approved?{' '}
            <Link href="/login" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
            <br />
            <span style={{ fontSize: 13 }}>
              Student?{' '}
              <Link href="/register" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>Register as a student</Link>
            </span>
          </p>
        )}
      </motion.div>
    </div>
  );
}
