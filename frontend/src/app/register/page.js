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
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineCpuChip,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineIdentification,
  HiOutlineAcademicCap,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

/* ─── Field MUST be at module level — never define inside the parent component.
   If defined inside, every keystroke creates a new component type, React
   unmounts/remounts the input → loses focus on every character typed.       ── */
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

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '',
    /* Student fields (step 2) */
    rollNumber: '', course: '', year: 1, department: '',
    guardianName: '', guardianPhone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [step, setStep]                 = useState(1);
  const { register } = useAuthStore();
  const router        = useRouter();

  const update = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword)
      return toast.error('Passwords do not match');
    if (formData.password.length < 8)
      return toast.error('Password must be at least 8 characters');

    setLoading(true);
    try {
      /* Everyone registers as STUDENT — role is changed by admin in the DB */
      const payload = {
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        password:  formData.password,
        phone:     formData.phone,
        role:      'STUDENT',
        studentProfile: {
          rollNumber:    formData.rollNumber,
          course:        formData.course,
          year:          Number(formData.year),
          department:    formData.department,
          guardianName:  formData.guardianName,
          guardianPhone: formData.guardianPhone,
        },
      };

      await register(payload);
      toast.success('Account created! You can now sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
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
        style={{ width: '100%', maxWidth: 500, padding: 'clamp(24px, 5vw, 40px)', borderRadius: 24, position: 'relative', zIndex: 1 }}
      >
        {/* Back */}
        <Link href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none', color: 'var(--color-text-muted)', fontSize: 13, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary-light)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          <HiOutlineHome size={15} /> Back to Home
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="icon-box icon-box-lg glow"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', margin: '0 auto 16px' }}>
            <HiOutlineCpuChip size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }} className="gradient-text">Create Account</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>Step {step} of 2</p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-primary)' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= 2 ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.3s' }} />
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Step 1: Account details ── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

              {/* Name row */}
              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="First Name" icon={HiOutlineUser}>
                  <input value={formData.firstName} onChange={e => update('firstName', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="John" required />
                </Field>
                <Field label="Last Name" icon={HiOutlineUser}>
                  <input value={formData.lastName} onChange={e => update('lastName', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="Doe" required />
                </Field>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 12 }}>
                <Field label="Email Address" icon={HiOutlineEnvelope}>
                  <input type="email" value={formData.email} onChange={e => update('email', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="you@example.com" required />
                </Field>
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 12 }}>
                <Field label="Phone Number" icon={HiOutlinePhone}>
                  <input value={formData.phone} onChange={e => update('phone', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="+91 9876543210" required />
                </Field>
              </div>

              {/* Password */}
              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <Field label="Password" icon={HiOutlineLockClosed}>
                  <input type={showPassword ? 'text' : 'password'} value={formData.password}
                    onChange={e => update('password', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38, paddingRight: 36 }}
                    placeholder="Min. 8 chars" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', zIndex: 2 }}>
                    {showPassword ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
                  </button>
                </Field>
                <Field label="Confirm">
                  <input type="password" value={formData.confirmPassword}
                    onChange={e => update('confirmPassword', e.target.value)}
                    className="input-field" placeholder="Re-enter" required />
                </Field>
              </div>

              <button type="button" onClick={() => setStep(2)} className="btn-primary"
                style={{ width: '100%', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Next Step <HiOutlineArrowRight size={17} />
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Student profile ── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>

              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Roll Number" icon={HiOutlineIdentification}>
                  <input value={formData.rollNumber} onChange={e => update('rollNumber', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="2024CS001" />
                </Field>
                <Field label="Course" icon={HiOutlineAcademicCap}>
                  <select value={formData.course} onChange={e => update('course', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }}>
                    <option value="">Select Course</option>
                    <option value="B.Tech">B.Tech</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="B.Sc">B.Sc</option>
                    <option value="M.Sc">M.Sc</option>
                    <option value="MBA">MBA</option>
                    <option value="Ph.D">Ph.D</option>
                  </select>
                </Field>
              </div>

              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Department">
                  <input value={formData.department} onChange={e => update('department', e.target.value)}
                    className="input-field" placeholder="Computer Science" />
                </Field>
                <Field label="Year">
                  <select value={formData.year} onChange={e => update('year', e.target.value)} className="input-field">
                    {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </Field>
              </div>

              <div className="register-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <Field label="Guardian Name" icon={HiOutlineUser}>
                  <input value={formData.guardianName} onChange={e => update('guardianName', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="Parent/Guardian" />
                </Field>
                <Field label="Guardian Phone" icon={HiOutlinePhone}>
                  <input value={formData.guardianPhone} onChange={e => update('guardianPhone', e.target.value)}
                    className="input-field" style={{ paddingLeft: 38 }} placeholder="+91 …" />
                </Field>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(1)} className="btn-secondary"
                  style={{ flex: 1, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <HiOutlineArrowLeft size={17} /> Back
                </button>
                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ flex: 2, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? 'Creating Account…' : (<>Create Account <HiOutlineArrowRight size={17} /></>)}
                </button>
              </div>
            </motion.div>
          )}
        </form>

        <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
