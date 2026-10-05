'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineHome,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineCpuChip,
  HiOutlineCheckCircle,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

const COURSES = [
  { id: 'CSE', label: 'CSE', sub: 'Computer Science' },
  { id: 'ECE', label: 'ECE', sub: 'Electronics' },
  { id: 'EEE', label: 'EEE', sub: 'Electrical' },
  { id: 'BSC', label: 'BSC', sub: 'Science' },
  { id: 'BBA', label: 'BBA', sub: 'Business' },
];

const LOADING_STEPS = [
  'Creating your account…',
  'Finding an available room…',
  'Assigning your room…',
];

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
            position: 'absolute', left: 13, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
            pointerEvents: 'none', zIndex: 0,
          }} size={16} />
        )}
        {children}
      </div>
    </div>
  );
}

function parseFullName(fullName) {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(' ');
  if (space === -1) return { firstName: trimmed, lastName: trimmed || 'Student' };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim() || 'Student',
  };
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const stepTimerRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      return undefined;
    }
    setLoadingStep(0);
    stepTimerRef.current = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (!course) return toast.error('Please select your course');

    const { firstName, lastName } = parseFullName(fullName);
    if (!firstName) return toast.error('Please enter your full name');

    setLoading(true);
    try {
      const payload = {
        firstName,
        lastName,
        email,
        password,
        phone,
        role: 'STUDENT',
        studentProfile: { course, year: 1 },
      };

      const res = await api.post('/auth/register', payload);
      if (!res.success) throw new Error(res.message || 'Registration failed');

      const user = res.data.user;
      api.setToken(res.data.accessToken);
      useAuthStore.setState({ user, isAuthenticated: true, isLoading: false, error: null });

      const room = user?.studentProfile?.roomId;
      const roomNumber = typeof room === 'object' ? room?.roomNumber : null;
      const capacity = typeof room === 'object' ? room?.capacity : null;

      setRegistrationSuccess({
        name: `${firstName} ${lastName}`.trim(),
        course,
        room: roomNumber || '—',
        capacity: capacity ?? '—',
      });
    } catch (err) {
      toast.error(err.message || 'Registration failed', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aurora-bg grain-overlay animated-gradient"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass"
        style={{ width: '100%', maxWidth: 520, padding: 'clamp(24px, 5vw, 40px)', borderRadius: 24, position: 'relative', zIndex: 1 }}
      >
        <Link href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none', color: 'var(--color-text-muted)', fontSize: 13, transition: 'color 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-light)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <HiOutlineHome size={15} /> Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="icon-box icon-box-lg glow"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', margin: '0 auto 16px' }}>
            <HiOutlineCpuChip size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }} className="gradient-text">Student Registration</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8 }}>
            Select your course — your room is assigned automatically.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {registrationSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{
                textAlign: 'center',
                padding: '28px 20px',
                borderRadius: 20,
                background: 'linear-gradient(145deg, rgba(111,174,102,0.12), rgba(42,157,143,0.08))',
                border: '1px solid rgba(111,174,102,0.25)',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                style={{ marginBottom: 16 }}
              >
                <HiOutlineCheckCircle size={56} color="var(--color-success)" />
              </motion.div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Registration Successful</h2>
              <p style={{ fontSize: 17, marginBottom: 24, color: 'var(--color-text)' }}>
                Welcome, <strong>{registrationSuccess.name.split(' ')[0]}!</strong>
              </p>

              <div style={{
                display: 'grid', gap: 12, textAlign: 'left', marginBottom: 28,
                padding: 20, borderRadius: 14, background: 'rgba(0,0,0,0.2)',
              }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>COURSE</span>
                  <p style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{registrationSuccess.course}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>YOUR ROOM</span>
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 }}
                    style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--color-accent-light)' }}
                  >
                    {registrationSuccess.room}
                  </motion.p>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>ROOM CAPACITY</span>
                  <p style={{ fontSize: 16, marginTop: 4 }}>{registrationSuccess.capacity} Students</p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                Your room has been assigned automatically.
              </p>
              <Link href="/dashboard/student" className="btn-primary"
                style={{ display: 'inline-block', padding: '14px 28px', textDecoration: 'none', marginRight: 10 }}>
                Go to Dashboard
              </Link>
              <Link href="/login" className="btn-secondary"
                style={{ display: 'inline-block', padding: '14px 28px', textDecoration: 'none' }}>
                Sign in later
              </Link>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '40px 20px', textAlign: 'center' }}
            >
              <div className="register-spinner" style={{
                width: 48, height: 48, margin: '0 auto 24px',
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
              }} />
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}
                >
                  {LOADING_STEPS[loadingStep]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div style={{ marginBottom: 12 }}>
                <Field label="Full Name" icon={HiOutlineUser}>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="Rahul Sharma" required />
                </Field>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Field label="Email" icon={HiOutlineEnvelope}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="you@example.com" required />
                </Field>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Field label="Phone" icon={HiOutlinePhone}>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="+91 9876543210" required />
                </Field>
              </div>

              <div style={{ marginBottom: 16 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
                  marginBottom: 10, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase',
                }}>
                  Course / Branch
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 10 }}>
                  {COURSES.map((c) => {
                    const selected = course === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCourse(c.id)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: 14,
                          border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: selected
                            ? 'linear-gradient(145deg, rgba(226,114,91,0.2), rgba(42,157,143,0.12))'
                            : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: selected ? '0 4px 20px rgba(226,114,91,0.15)' : 'none',
                          transform: selected ? 'translateY(-1px)' : 'none',
                        }}
                      >
                        <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>{c.label}</span>
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <Field label="Password" icon={HiOutlineLockClosed}>
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field" style={{ paddingLeft: 38, paddingRight: 36 }}
                    placeholder="Min. 8 characters" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', zIndex: 2,
                    }}>
                    {showPassword ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
                  </button>
                </Field>
                <Field label="Confirm Password" icon={HiOutlineLockClosed}>
                  <input type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="Re-enter password" required />
                </Field>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}
                style={{
                  width: '100%', padding: 16, fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <HiOutlineBuildingOffice2 size={20} /> REGISTER
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {!registrationSuccess && !loading && (
          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
          </p>
        )}
      </motion.div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
