'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineHome,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineCpuChip,
  HiOutlineArrowRight,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const { login } = useAuthStore();
  const router    = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.firstName}!`);
      const map = {
        SUPER_ADMIN: '/dashboard/admin',
        WARDEN:      '/dashboard/warden',
        STUDENT:     '/dashboard/student',
        STAFF:       '/dashboard/staff',
      };
      router.push(map[user.role] || '/dashboard/student');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="aurora-bg grain-overlay animated-gradient"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
        className="glass"
        style={{ width: '100%', maxWidth: 440, padding: 'clamp(24px, 5vw, 42px)', borderRadius: 24, position: 'relative', zIndex: 1 }}
      >
        {/* Back link */}
        <Link href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28, textDecoration: 'none', color: 'var(--color-text-muted)', fontSize: 13, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary-light)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          <HiOutlineHome size={15} /> Back to Home
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="icon-box icon-box-lg glow"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', margin: '0 auto 18px' }}>
            <HiOutlineCpuChip size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }} className="gradient-text">Welcome Back</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8 }}>Sign in to your SHMS account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: 'block', color: 'var(--color-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <HiOutlineEnvelope
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 0 }}
                size={17}
              />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field" style={{ paddingLeft: 42 }} required />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 26 }}>
            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: 'block', color: 'var(--color-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <HiOutlineLockClosed
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 0 }}
                size={17}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field" style={{ paddingLeft: 42, paddingRight: 46 }} required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', zIndex: 2 }}>
                {showPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', padding: 14, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? 'Signing In…' : (<>Sign In <HiOutlineArrowRight size={17} /></>)}
          </button>
        </form>



        <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--color-text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
