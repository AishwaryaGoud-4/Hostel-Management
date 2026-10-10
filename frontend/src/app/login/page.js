'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_HOME } from '@/lib/roles';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import TiltCard from '@/components/ui/TiltCard';
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineHome,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineCpuChip,
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

function Field({ label, icon: Icon, focused, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <motion.label
        animate={{ color: focused ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}
        style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: 'block', letterSpacing: 0.4, textTransform: 'uppercase' }}
      >
        {label}
      </motion.label>
      <div style={{ position: 'relative' }}>
        <motion.span
          animate={{ scale: focused ? 1.15 : 1, color: focused ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}
          style={{ position: 'absolute', left: 14, top: '50%', marginTop: -8.5, display: 'flex', pointerEvents: 'none', zIndex: 2 }}
        >
          <Icon size={17} />
        </motion.span>
        {children}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [focus, setFocus]               = useState(null);
  const [capsLock, setCapsLock]         = useState(false);
  const [error, setError]               = useState('');
  const shake = useAnimationControls();
  const { login, checkAuth } = useAuthStore();
  const router    = useRouter();

  useEffect(() => {
    checkAuth().then((ok) => {
      const role = useAuthStore.getState().user?.role;
      if (ok && ROLE_HOME[role]) router.replace(ROLE_HOME[role]);
    });
  }, [checkAuth, router]);

  const fail = (message) => {
    setError(message);
    shake.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.45 } });
    toast.error(message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return fail('Please fill in all fields');
    setLoading(true);
    try {
      const user = await login(email, password);
      setSuccess(true);
      toast.success(`Welcome back, ${user.firstName}!`);
      setTimeout(() => router.push(ROLE_HOME[user.role] || '/dashboard/student'), 450);
    } catch (err) {
      fail(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const onPasswordKey = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className="aurora-bg grain-overlay animated-gradient"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        <motion.div animate={shake}>
          <TiltCard max={4} className="glass" style={{ padding: 'clamp(24px, 5vw, 42px)', borderRadius: 24, boxShadow: 'var(--shadow-lg)' }}>
            <Link href="/" className="menu-row" style={{ display: 'inline-flex', width: 'auto', marginBottom: 20, marginLeft: -12, color: 'var(--color-text-muted)' }}>
              <HiOutlineHome size={15} /> Back to Home
            </Link>

            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <motion.div
                className="icon-box icon-box-lg glow"
                initial={{ rotate: -30, scale: 0.6 }}
                animate={success ? { rotate: 360, scale: 1.1 } : { rotate: 0, scale: 1 }}
                whileHover={{ rotate: 12, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                style={{ background: success ? 'linear-gradient(135deg, #059669, #34d399)' : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', margin: '0 auto 18px' }}
              >
                {success ? <HiOutlineCheckCircle size={28} color="white" /> : <HiOutlineCpuChip size={28} color="white" />}
              </motion.div>
              <h1 style={{ fontSize: 26, fontWeight: 800 }} className="gradient-text">Welcome Back</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8 }}>Sign in to your SHMS account</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <Field label="Email Address" icon={HiOutlineEnvelope} focused={focus === 'email'}>
                <input type="email" value={email} autoComplete="email"
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onFocus={() => setFocus('email')} onBlur={() => setFocus(null)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(error)}
                  className="input-field" style={{ paddingLeft: 42 }} required />
              </Field>

              <Field label="Password" icon={HiOutlineLockClosed} focused={focus === 'password'}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} autoComplete="current-password"
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={onPasswordKey} onKeyUp={onPasswordKey}
                  onFocus={() => setFocus('password')} onBlur={() => { setFocus(null); setCapsLock(false); }}
                  placeholder="••••••••"
                  aria-invalid={Boolean(error)}
                  className="input-field" style={{ paddingLeft: 42, paddingRight: 46 }} required
                />
                <motion.button type="button" onClick={() => setShowPassword(!showPassword)}
                  whileTap={{ scale: 0.85 }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 12, top: '50%', marginTop: -9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', zIndex: 2 }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={showPassword ? 'hide' : 'show'} initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 45 }} transition={{ duration: 0.12 }} style={{ display: 'flex' }}>
                      {showPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </Field>

              <AnimatePresence>
                {(capsLock || error) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div role="alert" style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, marginBottom: 16, fontSize: 13,
                      background: error ? 'rgba(220,38,38,0.12)' : 'rgba(217,119,6,0.12)',
                      border: `1px solid ${error ? 'rgba(220,38,38,0.3)' : 'rgba(217,119,6,0.3)'}`,
                      color: error ? '#fca5a5' : '#fbbf24',
                    }}>
                      <HiOutlineExclamationCircle size={17} style={{ flexShrink: 0 }} />
                      {error || 'Caps Lock is on'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" className="btn-primary" disabled={loading}
                whileHover={loading ? undefined : { scale: 1.015 }}
                whileTap={loading ? undefined : { scale: 0.98 }}
                style={{ width: '100%', padding: 14, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8,
                  background: success ? 'linear-gradient(135deg, #059669, #047857)' : undefined }}>
                <AnimatePresence mode="wait" initial={false}>
                  {success ? (
                    <motion.span key="ok" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <HiOutlineCheckCircle size={18} /> Signed in
                    </motion.span>
                  ) : loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="register-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />
                      Signing in…
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      Sign In <HiOutlineArrowRight size={17} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--color-text-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>
                Student registration
              </Link>
              {' · '}
              <Link href="/register/warden" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>
                Warden registration
              </Link>
            </p>
          </TiltCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
