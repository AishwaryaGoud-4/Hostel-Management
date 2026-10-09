'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useSpring, useMotionValueEvent, animate } from 'framer-motion';
import Link from 'next/link';
import {
  HiOutlineCpuChip,
  HiOutlineBuildingOffice2,
  HiOutlineShieldCheck,
  HiOutlineCalendarDays,
  HiOutlineBell,
  HiOutlineUsers,
  HiOutlineArrowRight,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineSparkles,
  HiOutlineDocumentText,
  HiOutlineSquares2X2,
  HiOutlineExclamationTriangle,
  HiOutlineBanknotes,
  HiOutlineChartBarSquare,
  HiOutlineQrCode,
  HiOutlineBolt,
  HiOutlineCursorArrowRays,
  HiOutlineSun,
  HiOutlineMoon,
} from 'react-icons/hi2';
import TiltCard from '@/components/ui/TiltCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useThemeStore } from '@/store/themeStore';

const ROTATING_WORDS = ['room allocation', 'attendance', 'gate passes', 'complaints', 'fee tracking'];

const features = [
  { icon: HiOutlineCpuChip,         title: 'AI-Powered Analytics',    desc: 'Occupancy forecasting, anomaly detection and fee-risk scoring that surface problems before they grow.', color: '#60a5fa' },
  { icon: HiOutlineBuildingOffice2, title: 'Course-Based Allocation', desc: 'Students are placed into course rooms automatically the moment they register — no spreadsheets.',      color: '#34d399' },
  { icon: HiOutlineQrCode,          title: 'QR Attendance',           desc: 'Dynamic QR check-ins with geofence validation keep the register honest and instant.',                    color: '#a78bfa' },
  { icon: HiOutlineBell,            title: 'Real-time Everything',    desc: 'Socket-powered updates for allocations, complaints and approvals land on every screen live.',            color: '#fbbf24' },
  { icon: HiOutlineDocumentText,    title: 'Digital Gate Passes',     desc: 'Request, approve and verify at the gate — a full audit trail without the paperwork.',                    color: '#f472b6' },
  { icon: HiOutlineShieldCheck,     title: 'Role-Based Access',       desc: 'Purpose-built workspaces for admins, wardens, students and staff with zero overlap.',                     color: '#22d3ee' },
];

const stats = [
  { value: 1000, suffix: '+', label: 'Rooms managed' },
  { value: 4,    suffix: '',  label: 'Role workspaces' },
  { value: 50,   suffix: 'ms', label: 'Live update latency' },
  { value: 99.9, suffix: '%', label: 'Uptime target', decimals: 1 },
];

const roles = [
  {
    id: 'admin', label: 'Super Admin', icon: HiOutlineShieldCheck, color: '#60a5fa',
    tagline: 'Run the whole campus from one control room.',
    points: ['Hostels, rooms and course capacity at a glance', 'User management across every role', 'AI analytics for fees, complaints and occupancy', 'Fee collection and revenue reports'],
  },
  {
    id: 'warden', label: 'Warden', icon: HiOutlineBuildingOffice2, color: '#34d399',
    tagline: 'Stay ahead of every room, request and roll call.',
    points: ['Live room allocation with one-click reassign', 'Daily attendance with instant student updates', 'Complaint triage with priority flags', 'Gate-pass approvals on the go'],
  },
  {
    id: 'student', label: 'Student', icon: HiOutlineUsers, color: '#fbbf24',
    tagline: 'Everything about hostel life, in your pocket.',
    points: ['See your room and roommates instantly', 'Track attendance and fee dues', 'Raise complaints and follow them live', 'Request gate passes in seconds'],
  },
  {
    id: 'staff', label: 'Staff', icon: HiOutlineCalendarDays, color: '#f472b6',
    tagline: 'Know exactly what to fix and who to let through.',
    points: ['Assigned maintenance tasks in one queue', 'Update task status from anywhere', 'Verify gate passes at the gate', 'Real-time alerts for urgent issues'],
  },
];

/* ─── Small pieces ─────────────────────────────────────────────────────────── */
function CountUp({ value, suffix, decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>{display.toFixed(decimals)}{suffix}</span>;
}

function RotatingWord() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % ROTATING_WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: 'inline-block', position: 'relative', verticalAlign: 'bottom' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_WORDS[index]}
          className="gradient-text"
          initial={{ y: '60%', opacity: 0, filter: 'blur(6px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-60%', opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'inline-block' }}
        >
          {ROTATING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ─── Interactive product preview ──────────────────────────────────────────── */
const ROOM_STATUSES = ['FULL', 'PARTIAL', 'EMPTY', 'PARTIAL', 'FULL', 'MAINT', 'EMPTY', 'FULL', 'PARTIAL', 'FULL', 'EMPTY', 'PARTIAL'];
const ROOM_COLORS = { FULL: '#3b82f6', PARTIAL: '#34d399', EMPTY: '#64748b', MAINT: '#f59e0b' };
const ROOM_LABELS = { FULL: 'Full · 4/4 beds', PARTIAL: 'Partial · 2/4 beds', EMPTY: 'Empty · 0/4 beds', MAINT: 'Under maintenance' };
const ATTENDANCE = [92, 88, 95, 81, 97, 90, 94];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COMPLAINT_FLOW = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
const COMPLAINT_COLORS = { OPEN: '#60a5fa', IN_PROGRESS: '#fbbf24', RESOLVED: '#34d399' };

function ProductPreview() {
  const [tab, setTab] = useState('rooms');
  const [selectedRoom, setSelectedRoom] = useState(4);
  const [hoverBar, setHoverBar] = useState(null);
  const [complaints, setComplaints] = useState([
    { id: 1, title: 'Wi-Fi down in Block B', status: 'OPEN' },
    { id: 2, title: 'Leaking tap · Room A12', status: 'IN_PROGRESS' },
    { id: 3, title: 'Fan not working · C07', status: 'RESOLVED' },
  ]);

  const cycle = (id) => setComplaints((list) => list.map((c) => c.id === id
    ? { ...c, status: COMPLAINT_FLOW[(COMPLAINT_FLOW.indexOf(c.status) + 1) % COMPLAINT_FLOW.length] }
    : c));

  const tabs = [
    { id: 'rooms', label: 'Rooms', icon: HiOutlineSquares2X2 },
    { id: 'attendance', label: 'Attendance', icon: HiOutlineCalendarDays },
    { id: 'complaints', label: 'Complaints', icon: HiOutlineExclamationTriangle },
  ];

  return (
    <TiltCard max={7} className="glass" style={{ borderRadius: 22, padding: 18, boxShadow: 'var(--shadow-lg)' }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        {['#f87171', '#fbbf24', '#34d399'].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>shms · live workspace</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#34d399' }}>
          <span className="live-monitor-dot" /> Live
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: 14 }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`tab-pill${tab === t.id ? ' active' : ''}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {tab === t.id && (
              <motion.span layoutId="preview-tab" transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 9, background: 'linear-gradient(135deg, rgba(37,99,235,0.35), rgba(5,150,105,0.25))', border: '1px solid rgba(96,165,250,0.3)' }} />
            )}
            <t.icon size={15} style={{ position: 'relative' }} />
            <span style={{ position: 'relative' }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ minHeight: 238 }}>
        <AnimatePresence mode="wait">
          {tab === 'rooms' && (
            <motion.div key="rooms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {ROOM_STATUSES.map((status, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    onClick={() => setSelectedRoom(i)}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: selectedRoom === i ? 1.08 : 1 }}
                    whileHover={{ scale: 1.12, y: -2 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ delay: i * 0.025, type: 'spring', stiffness: 400, damping: 20 }}
                    aria-label={`Room A${i + 1}: ${ROOM_LABELS[status]}`}
                    style={{
                      aspectRatio: '1', borderRadius: 10, cursor: 'pointer',
                      border: selectedRoom === i ? '2px solid #fff' : '1px solid rgba(148,163,184,0.2)',
                      background: `${ROOM_COLORS[status]}${selectedRoom === i ? 'dd' : '55'}`,
                      color: '#fff', fontSize: 11, fontWeight: 700,
                    }}
                  >
                    A{i + 1}
                  </motion.button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={selectedRoom}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}
                  style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="icon-box icon-box-sm" style={{ background: `${ROOM_COLORS[ROOM_STATUSES[selectedRoom]]}33`, color: ROOM_COLORS[ROOM_STATUSES[selectedRoom]] }}>
                    <HiOutlineSquares2X2 size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>Room A{selectedRoom + 1} · B.Tech CSE</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{ROOM_LABELS[ROOM_STATUSES[selectedRoom]]}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2, 3].map((b) => {
                      const s = ROOM_STATUSES[selectedRoom];
                      const filled = s === 'FULL' || (s === 'PARTIAL' && b < 2);
                      return <motion.span key={b} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: b * 0.05 }}
                        style={{ width: 8, height: 20, borderRadius: 3, background: filled ? ROOM_COLORS[s] : 'rgba(148,163,184,0.25)' }} />;
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <HiOutlineCursorArrowRays size={14} /> Click any room to inspect it
              </p>
            </motion.div>
          )}

          {tab === 'attendance' && (
            <motion.div key="attendance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>This week</p>
                <p style={{ fontSize: 22, fontWeight: 800 }} className="gradient-text">
                  {hoverBar == null ? '91%' : `${ATTENDANCE[hoverBar]}%`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, padding: '0 4px' }}>
                {ATTENDANCE.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}
                    onMouseEnter={() => setHoverBar(i)} onMouseLeave={() => setHoverBar(null)}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(v - 60) * 2.6}%`, opacity: hoverBar == null || hoverBar === i ? 1 : 0.4 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 160, damping: 18 }}
                      style={{ width: '100%', borderRadius: 8, background: 'linear-gradient(180deg, #60a5fa, #059669)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 10, color: hoverBar === i ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: 600 }}>{DAYS[i]}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <HiOutlineCursorArrowRays size={14} /> Hover a day to see its rate
              </p>
            </motion.div>
          )}

          {tab === 'complaints' && (
            <motion.div key="complaints" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {complaints.map((c) => (
                <motion.button key={c.id} type="button" layout onClick={() => cycle(c.id)}
                  whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: COMPLAINT_COLORS[c.status], boxShadow: `0 0 10px ${COMPLAINT_COLORS[c.status]}` }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.title}</span>
                  <AnimatePresence mode="wait">
                    <motion.span key={c.status}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="badge"
                      style={{ background: `${COMPLAINT_COLORS[c.status]}22`, color: COMPLAINT_COLORS[c.status], border: `1px solid ${COMPLAINT_COLORS[c.status]}55` }}>
                      {c.status.replace('_', ' ')}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              ))}
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <HiOutlineCursorArrowRays size={14} /> Click a ticket to move it through the workflow
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TiltCard>
  );
}

/* ─── Role explorer ────────────────────────────────────────────────────────── */
function RoleExplorer() {
  const [active, setActive] = useState(roles[0].id);
  const role = roles.find((r) => r.id === active);
  return (
    <div className="glass" style={{ borderRadius: 24, padding: 'clamp(20px, 4vw, 36px)' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28 }}>
        {roles.map((r) => (
          <button key={r.id} type="button" onClick={() => setActive(r.id)} className={`tab-pill${active === r.id ? ' active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
            {active === r.id && (
              <motion.span layoutId="role-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 10, background: `${r.color}22`, border: `1px solid ${r.color}55` }} />
            )}
            <r.icon size={17} style={{ position: 'relative', color: active === r.id ? r.color : undefined }} />
            <span style={{ position: 'relative' }}>{r.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={role.id}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, alignItems: 'center' }}>
          <div>
            <motion.div initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="icon-box icon-box-lg" style={{ background: `${role.color}22`, border: `1px solid ${role.color}55`, marginBottom: 18 }}>
              <role.icon size={26} color={role.color} />
            </motion.div>
            <h3 style={{ fontSize: 'clamp(22px, 3vw, 30px)', marginBottom: 10 }}>{role.label}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 22 }}>{role.tagline}</p>
            <Link href="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Sign in as {role.label} <HiOutlineArrowRight size={16} />
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {role.points.map((p, i) => (
              <motion.div key={p}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i + 0.1 }}
                whileHover={{ x: 6 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <HiOutlineCheckCircle size={20} color={role.color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14 }}>{p}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef(null);
  const reduced = useReducedMotion();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30, mass: 0.3 });
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 40));

  const onHeroMove = (e) => {
    if (reduced || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    heroRef.current.style.setProperty('--hx', `${e.clientX - rect.left}px`);
    heroRef.current.style.setProperty('--hy', `${e.clientY - rect.top}px`);
  };

  const navLinks = [
    { href: '#preview', label: 'Live demo' },
    { href: '#features', label: 'Features' },
    { href: '#roles', label: 'Roles' },
  ];

  return (
    <div className="aurora-bg grain-overlay" style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflowX: 'hidden' }}>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} />

      {/* ── Navbar (floating pill) ─────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: '12px clamp(12px, 3vw, 32px) 0', pointerEvents: 'none' }}>
        <motion.nav
          className="glass pill-nav"
          initial={false}
          animate={{ maxWidth: scrolled ? '920px' : '1120px', y: scrolled ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          style={{ maxWidth: '1120px', margin: '0 auto', pointerEvents: 'auto', boxShadow: scrolled ? 'var(--shadow-lg)' : 'var(--shadow-md)' }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <motion.div className="icon-box icon-box-sm" whileHover={{ rotate: 15, scale: 1.1 }}
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', borderRadius: 999 }}>
              <HiOutlineCpuChip size={18} color="white" />
            </motion.div>
            <span style={{ fontWeight: 800, fontSize: 17 }} className="gradient-text">SHMS</span>
          </Link>

          <div className="desktop-nav-links pill-nav-links" onMouseLeave={() => setHoveredLink(null)}>
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="pill-nav-link" onMouseEnter={() => setHoveredLink(l.href)}
                style={{ color: hoveredLink === l.href ? 'var(--color-text)' : undefined }}>
                {hoveredLink === l.href && (
                  <motion.span layoutId="pill-nav-hover" transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(37,99,235,0.16)', border: '1px solid rgba(96,165,250,0.25)' }} />
                )}
                <span style={{ position: 'relative' }}>{l.label}</span>
              </a>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" style={{ borderRadius: 999 }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={theme} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.4, opacity: 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
                  {theme === 'light' ? <HiOutlineMoon size={18} /> : <HiOutlineSun size={18} />}
                </motion.span>
              </AnimatePresence>
            </button>
            <div className="desktop-nav-cta" style={{ gap: 8 }}>
              <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 18px', borderRadius: 999 }}>Sign In</Link>
              <Link href="/register" className="btn-primary"
                style={{ textDecoration: 'none', padding: '9px 20px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
                Get Started <HiOutlineArrowRight size={15} />
              </Link>
            </div>
            <button className="mobile-hamburger icon-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen} style={{ borderRadius: 999 }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={menuOpen ? 'x' : 'bars'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
                  {menuOpen ? <HiOutlineXMark size={22} /> : <HiOutlineBars3 size={22} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </motion.nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="glass"
              initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{ maxWidth: 1120, margin: '10px auto 0', borderRadius: 24, padding: 12, pointerEvents: 'auto', boxShadow: 'var(--shadow-lg)', transformOrigin: 'top center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {navLinks.map((l, i) => (
                  <motion.a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="menu-row"
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ fontSize: 15, borderRadius: 999, padding: '12px 16px' }}>
                    {l.label}
                  </motion.a>
                ))}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 8, display: 'flex', gap: 10 }}>
                  <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', borderRadius: 999 }}>Sign In</Link>
                  <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', borderRadius: 999 }}>Register</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section ref={heroRef} onPointerMove={onHeroMove} className="hero-spotlight" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'center' }}>
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99,
                background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', marginBottom: 24 }}>
              <motion.span animate={{ rotate: [0, 20, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }} style={{ display: 'flex' }}>
                <HiOutlineSparkles size={14} style={{ color: 'var(--color-primary-light)' }} />
              </motion.span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary-light)', letterSpacing: 0.5 }}>Smart Hostel Management · v2</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              style={{ fontSize: 'clamp(34px, 5.6vw, 62px)', fontWeight: 800, lineHeight: 1.08, marginBottom: 20 }}>
              Effortless hostel
              <br />
              <RotatingWord />
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'var(--color-text-muted)', lineHeight: 1.7, maxWidth: 540, marginBottom: 32 }}>
              Course-based room allocation, live attendance, complaints and gate passes — one real-time workspace for admins, wardens, students and staff.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
              className="hero-buttons" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link href="/register" className="btn-primary glow"
                  style={{ textDecoration: 'none', padding: '14px 28px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                  Get Started Free
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ display: 'flex' }}>
                    <HiOutlineArrowRight size={18} />
                  </motion.span>
                </Link>
              </motion.div>
              <a href="#preview" className="btn-secondary"
                style={{ textDecoration: 'none', padding: '14px 24px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                <HiOutlineBolt size={17} /> Try the live demo
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 32 }}>
              {['Real-time sync', 'Role-based access', 'AI insights'].map((t) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <HiOutlineCheckCircle size={16} color="var(--color-accent-light)" /> {t}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div id="preview" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ scrollMarginTop: 90 }}>
            <ProductPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="glass card-hover" style={{ padding: '22px 20px', borderRadius: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 800 }} className="gradient-text">
                <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(64px, 9vw, 112px) clamp(16px, 4vw, 48px)', position: 'relative', zIndex: 1, scrollMarginTop: 70 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4.4vw, 42px)', fontWeight: 800, marginBottom: 12 }}>
            Everything you need, <span className="gradient-text">all in one place</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Hover the cards — every surface in SHMS responds to you.
          </p>
        </motion.div>

        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
              <TiltCard className="glass card-hover" style={{ padding: 28, borderRadius: 20, height: '100%' }} whileHover="hover" initial="rest">
                <motion.div className="icon-box icon-box-md"
                  variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: -8, scale: 1.12 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                  style={{ background: `${f.color}1f`, border: `1px solid ${f.color}44`, marginBottom: 18 }}>
                  <f.icon size={22} color={f.color} />
                </motion.div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{f.desc}</p>
                <motion.div variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }} transition={{ duration: 0.3 }}
                  style={{ height: 2, marginTop: 18, borderRadius: 2, background: `linear-gradient(90deg, ${f.color}, transparent)`, transformOrigin: 'left' }} />
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────────────── */}
      <section id="roles" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px) clamp(64px, 9vw, 112px)', position: 'relative', zIndex: 1, scrollMarginTop: 70 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4.4vw, 42px)', fontWeight: 800, marginBottom: 12 }}>
            A workspace for <span className="gradient-text">every role</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Pick a role to see what it gets.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <RoleExplorer />
        </motion.div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px) clamp(64px, 10vw, 96px)', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="cta-card glass"
          style={{ padding: 'clamp(40px, 6vw, 64px)', borderRadius: 28, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', top: '-50%', left: '-10%', width: '120%', height: '200%', pointerEvents: 'none',
              background: 'conic-gradient(from 0deg, transparent, rgba(37,99,235,0.12), transparent 30%, rgba(5,150,105,0.10), transparent 60%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <HiOutlineChartBarSquare size={34} color="var(--color-primary-light)" style={{ marginBottom: 14 }} />
            <h2 style={{ fontSize: 'clamp(24px, 4.4vw, 42px)', fontWeight: 800, marginBottom: 14 }}>Ready to modernise your hostel?</h2>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.7 }}>
              Register as a student and get your room allocated automatically — it takes under a minute.
            </p>
            <div className="hero-buttons" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link href="/register" className="btn-primary"
                  style={{ textDecoration: 'none', padding: '14px 32px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                  Create Free Account <HiOutlineArrowRight size={18} />
                </Link>
              </motion.div>
              <Link href="/login" className="btn-secondary"
                style={{ textDecoration: 'none', padding: '14px 28px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                <HiOutlineBanknotes size={17} /> Sign In
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
            <span style={{ fontWeight: 700, fontSize: 14 }} className="gradient-text">SHMS</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            © {new Date().getFullYear()} Smart Hostel Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
