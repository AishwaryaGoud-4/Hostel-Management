'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  HiOutlineCpuChip,
  HiOutlineBuildingOffice2,
  HiOutlineShieldCheck,
  HiOutlineCalendarDays,
  HiOutlineBell,
  HiOutlineChartBarSquare,
  HiOutlineUsers,
  HiOutlineArrowRight,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineGlobeAlt,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineDocumentText,
} from 'react-icons/hi2';

const features = [
  { icon: HiOutlineCpuChip,         title: 'AI-Powered Analytics',     desc: 'Room forecasting, utility anomaly detection, and predictive fee risk scoring driven by ML.',    color: '#e2725b', grad: 'rgba(226,114,91,' },
  { icon: HiOutlineBuildingOffice2, title: 'Smart Room Allocation',     desc: 'Algorithmic bed assignment based on preferences with concurrent booking safety.',              color: '#2a9d8f', grad: 'rgba(42,157,143,' },
  { icon: HiOutlineShieldCheck,     title: 'Attendance & Geofence',    desc: 'Dynamic QR scanning with GPS-based geofence validation for secure hostel check-ins.',           color: '#6fae66', grad: 'rgba(111,174,102,' },
  { icon: HiOutlineBell,            title: 'Real-time Notifications',   desc: 'Live updates via Socket.IO for complaints, gate-pass approvals, and emergencies.',             color: '#f4a259', grad: 'rgba(244,162,89,' },
  { icon: HiOutlineDocumentText,    title: 'Gate Pass Management',      desc: 'Digital gate pass requests, warden approvals, and QR-based verification at the gate.',         color: '#5fc9ba', grad: 'rgba(95,201,186,' },
  { icon: HiOutlineUsers,           title: 'Role-Based Access',         desc: 'Multi-tier access for Super Admin, Warden, Student and Maintenance Staff — zero overlap.',      color: '#f2a679', grad: 'rgba(242,166,121,' },
];

const stats = [
  { value: '99.9%', label: 'Uptime',          icon: HiOutlineGlobeAlt  },
  { value: '50ms',  label: 'Response Time',    icon: HiOutlineClock     },
  { value: '4',     label: 'RBAC Roles',       icon: HiOutlineUsers     },
  { value: 'AI',    label: 'Analytics Engine', icon: HiOutlineCpuChip   },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="aurora-bg grain-overlay" style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflowX: 'hidden' }}>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="glass" style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(226,114,91,0.1)',
        padding: '0 clamp(16px, 4vw, 48px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 16 }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div className="icon-box icon-box-sm" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
              <HiOutlineCpuChip size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, fontFamily: "'Fraunces', serif" }} className="gradient-text">SHMS</span>
          </Link>

          {/* Desktop links */}
          <div className="desktop-nav-links" style={{ marginLeft: 32, gap: 28 }}>
            {['Features', 'About'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: 'var(--color-text-muted)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary-light)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                {l}
              </a>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Desktop CTA */}
            <div className="desktop-nav-cta" style={{ gap: 10 }}>
              <Link href="/login"
                style={{ textDecoration: 'none', fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', padding: '8px 16px', borderRadius: 8, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary-light)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                Sign In
              </Link>
              <Link href="/register" className="btn-primary"
                style={{ textDecoration: 'none', padding: '9px 20px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}>
                Get Started <HiOutlineArrowRight size={15} />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button className="mobile-hamburger touch-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'rgba(226,114,91,0.08)', border: '1px solid rgba(226,114,91,0.15)', borderRadius: 10, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
              {menuOpen ? <HiOutlineXMark size={22} /> : <HiOutlineBars3 size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ borderTop: '1px solid rgba(226,114,91,0.08)', padding: '16px clamp(16px,4vw,48px)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 320 }}>
                {['Features', 'About'].map(l => (
                  <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                    style={{ textDecoration: 'none', fontSize: 15, fontWeight: 500, color: 'var(--color-text-muted)', padding: '10px 14px', borderRadius: 8 }}>
                    {l}
                  </a>
                ))}
                <div style={{ borderTop: '1px solid rgba(226,114,91,0.08)', paddingTop: 12, marginTop: 8, display: 'flex', gap: 10 }}>
                  <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 14 }}>
                    Sign In
                  </Link>
                  <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 14 }}>
                    Register
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px, 10vw, 120px) clamp(16px, 4vw, 48px)', position: 'relative', zIndex: 1 }}>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99,
            background: 'rgba(226,114,91,0.12)', border: '1px solid rgba(226,114,91,0.25)',
            marginBottom: 28 }}>
          <HiOutlineSparkles size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary-light)', letterSpacing: 0.5 }}>
            AI-Powered Hostel Management
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ fontSize: 'clamp(36px, 7vw, 72px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 20, maxWidth: 780, fontFamily: "'Fraunces', serif" }}>
          The Modern Way to{' '}
          <span className="gradient-text">Manage Hostels</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--color-text-muted)', lineHeight: 1.7, maxWidth: 580, marginBottom: 36 }}>
          From smart room allocation and QR attendance to AI-driven complaint triage and real-time gate passes — SHMS brings everything under one intelligent roof.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className="hero-buttons" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/register" className="btn-primary"
            style={{ textDecoration: 'none', padding: '14px 28px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
            Get Started Free <HiOutlineArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-secondary"
            style={{ textDecoration: 'none', padding: '14px 28px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
            Sign In
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ display: 'flex', gap: 'clamp(20px, 4vw, 48px)', flexWrap: 'wrap', marginTop: 60, paddingTop: 40, borderTop: '1px solid var(--color-border)' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="icon-box icon-box-sm" style={{ background: 'rgba(226,114,91,0.1)' }}>
                <s.icon size={16} color="var(--color-primary)" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Fraunces', serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px)', position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 700, marginBottom: 12, fontFamily: "'Fraunces', serif" }}>
            Everything you need, <span className="gradient-text">all in one place</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Built for institutions that want to move beyond spreadsheets and paper registers.
          </p>
        </div>

        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="glass card-hover"
              style={{ padding: 28, borderRadius: 18 }}>
              <div className="icon-box icon-box-md" style={{ background: `${f.grad}0.15)`, border: `1px solid ${f.grad}0.25)`, marginBottom: 18 }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, fontFamily: "'Fraunces', serif" }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── About / Why section ─────────────────────────────────── */}
      <section id="about" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px)', position: 'relative', zIndex: 1 }}>
        <div className="glass" style={{ padding: 'clamp(36px, 6vw, 64px)', borderRadius: 24, background: 'linear-gradient(135deg, rgba(226,114,91,0.07), rgba(42,157,143,0.05))' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, marginBottom: 16, fontFamily: "'Fraunces', serif" }}>
                Built for <span className="gradient-text">real hostel workflows</span>
              </h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: 24 }}>
                SHMS is designed from the ground up for hostel administrators, wardens, and students — with offline-friendly QR attendance, a reactive complaint pipeline, and intelligent fee tracking that actually saves time.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Real-time updates with Socket.IO',
                  'AI complaint triage & emergency detection',
                  'Automated late-fee calculation',
                  'Role-based dashboards for all stakeholders',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <HiOutlineCheckCircle size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Role cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: HiOutlineShieldCheck,     role: 'Super Admin',   desc: 'Full system control & analytics', color: 'var(--color-primary)' },
                { icon: HiOutlineBuildingOffice2, role: 'Warden',        desc: 'Rooms, attendance & complaints', color: 'var(--color-accent)' },
                { icon: HiOutlineUsers,           role: 'Student',       desc: 'Bookings, fees & gate passes',   color: 'var(--color-success)' },
                { icon: HiOutlineCalendarDays,    role: 'Staff',         desc: 'Assigned tasks & gate scanning', color: 'var(--color-warning)' },
              ].map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="glass" style={{ padding: 18, borderRadius: 14 }}>
                  <div className="icon-box icon-box-sm" style={{ background: `${r.color}18`, marginBottom: 10 }}>
                    <r.icon size={16} color={r.color} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, fontFamily: "'Fraunces', serif" }}>{r.role}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{r.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 48px) clamp(64px, 10vw, 96px)', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="cta-card glass"
          style={{ padding: 'clamp(40px, 6vw, 64px)', borderRadius: 24, textAlign: 'center', position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(226,114,91,0.1), rgba(42,157,143,0.07))' }}>

          {/* Decorative blobs inside CTA */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(226,114,91,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(42,157,143,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 42px)', fontWeight: 700, marginBottom: 14, fontFamily: "'Fraunces', serif" }}>
              Ready to modernise your hostel?
            </h2>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', marginBottom: 32, maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.7 }}>
              Join institutions already running SHMS. Set up takes minutes.
            </p>
            <div className="hero-buttons" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" className="btn-primary"
                style={{ textDecoration: 'none', padding: '14px 32px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                Create Free Account <HiOutlineArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn-secondary"
                style={{ textDecoration: 'none', padding: '14px 28px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: 'clamp(24px, 4vw, 32px) clamp(16px, 4vw, 48px)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="icon-box icon-box-sm" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
              <HiOutlineCpuChip size={16} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }} className="gradient-text">SHMS</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            © {new Date().getFullYear()} Smart Hostel Management System · Built with ♥
          </p>
        </div>
      </footer>
    </div>
  );
}
