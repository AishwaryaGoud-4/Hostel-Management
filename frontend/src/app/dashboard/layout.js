'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useSocket } from '@/store/socketProvider';
import { redirectForRole, notificationHref } from '@/lib/roles';
import LiveDot from '@/components/ui/LiveDot';
import CommandPalette from '@/components/ui/CommandPalette';

import {
  HiOutlineHome,
  HiOutlineBuildingOffice2,
  HiOutlineUsers,
  HiOutlineExclamationTriangle,
  HiOutlineCalendarDays,
  HiOutlineBanknotes,
  HiOutlineChartBarSquare,
  HiOutlineCpuChip,
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlineBell,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserCircle,
  HiOutlineSquares2X2,
  HiOutlineClipboardDocumentList,
  HiOutlineMagnifyingGlass,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineChevronDoubleLeft,
  HiOutlineEllipsisHorizontal,
  HiOutlineInbox,
} from 'react-icons/hi2';

/* ── Role-based sidebar menus ─────────────────────────────────────────────── */
const roleMenus = {
  SUPER_ADMIN: [
    { href: '/dashboard/admin',            icon: HiOutlineHome,                label: 'Dashboard',       badge: null },
    { href: '/dashboard/admin/hostels',    icon: HiOutlineBuildingOffice2,     label: 'Hostels & Rooms', badge: null },
    { href: '/dashboard/admin/rooms',      icon: HiOutlineSquares2X2,          label: 'Room Management', badge: null },
    { href: '/dashboard/admin/users',      icon: HiOutlineUsers,               label: 'Users',           badge: null },
    { href: '/dashboard/admin/complaints', icon: HiOutlineExclamationTriangle, label: 'Complaints',      badge: null },
    { href: '/dashboard/admin/fees',       icon: HiOutlineBanknotes,           label: 'Fees',            badge: null },
    { href: '/dashboard/admin/analytics',  icon: HiOutlineChartBarSquare,      label: 'AI Analytics',    badge: 'AI'  },
  ],
  WARDEN: [
    { href: '/dashboard/warden',               icon: HiOutlineHome,                  label: 'Dashboard',       badge: null },
    { href: '/dashboard/warden/rooms',         icon: HiOutlineSquares2X2,            label: 'Rooms',           badge: null },
    { href: '/dashboard/warden/allocation',    icon: HiOutlineClipboardDocumentList, label: 'Room Allocation', badge: null },
    { href: '/dashboard/warden/attendance',    icon: HiOutlineCalendarDays,          label: 'Attendance',      badge: null },
    { href: '/dashboard/warden/complaints',    icon: HiOutlineExclamationTriangle,   label: 'Complaints',      badge: null },
    { href: '/dashboard/warden/gatepasses',    icon: HiOutlineDocumentText,          label: 'Gate Passes',     badge: null },
  ],
  STUDENT: [
    { href: '/dashboard/student',              icon: HiOutlineHome,                label: 'Dashboard',   badge: null },
    { href: '/dashboard/student/room',         icon: HiOutlineSquares2X2,          label: 'My Room',     badge: null },
    { href: '/dashboard/student/attendance',   icon: HiOutlineCalendarDays,        label: 'Attendance',  badge: null },
    { href: '/dashboard/student/complaints',   icon: HiOutlineExclamationTriangle, label: 'Complaints',  badge: null },
    { href: '/dashboard/student/fees',         icon: HiOutlineBanknotes,           label: 'Fees',        badge: null },
    { href: '/dashboard/student/gatepass',     icon: HiOutlineDocumentText,        label: 'Gate Pass',   badge: null },
  ],
  STAFF: [
    { href: '/dashboard/staff',                icon: HiOutlineHome,                  label: 'Dashboard',      badge: null },
    { href: '/dashboard/staff/complaints',     icon: HiOutlineClipboardDocumentList, label: 'Assigned Tasks', badge: null },
    { href: '/dashboard/staff/gatepasses',     icon: HiOutlineShieldCheck,           label: 'Gate Passes',    badge: null },
  ],
};

const PROFILE_ITEM = { href: '/dashboard/profile', icon: HiOutlineUserCircle, label: 'Profile', badge: null };
const SIDEBAR_KEY = 'shms-sidebar-open';

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function useClickOutside(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside(); };
    const onKey = (e) => { if (e.key === 'Escape') onOutside(); };
    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, onOutside, active]);
}

/* ─── Sidebar Nav Item ────────────────────────────────────────────────────── */
function NavItem({ item, isActive, collapsed, onClick, pillId }) {
  const Icon = item.icon;
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link
        href={item.href}
        onClick={onClick}
        className={`nav-link${isActive ? ' active' : ''}`}
        aria-label={collapsed ? item.label : undefined}
        style={{ background: 'transparent' }}
      >
        {isActive && (
          <motion.span
            layoutId={pillId}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: 10,
              background: 'linear-gradient(90deg, rgba(37,99,235,0.22), rgba(5,150,105,0.10))',
              border: '1px solid rgba(96,165,250,0.22)',
            }}
          />
        )}
        <motion.span
          animate={{ scale: hover && !isActive ? 1.12 : 1, rotate: hover && !isActive ? -6 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          style={{ display: 'flex', position: 'relative' }}
        >
          <Icon size={20} style={{ minWidth: 20, flexShrink: 0 }} />
        </motion.span>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && item.badge && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700, position: 'relative',
            padding: '2px 6px', borderRadius: 6,
            background: 'rgba(37,99,235,0.2)', color: '#93c5fd',
            letterSpacing: 0.5,
          }}>
            {item.badge}
          </span>
        )}
      </Link>
      <AnimatePresence>
        {collapsed && hover && (
          <motion.span
            className="nav-tooltip"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sidebar Content (shared between desktop & mobile) ───────────────────── */
function SidebarContent({ collapsed, menus, pathname, user, onClose, onLogout, onToggle, pillId }) {
  return (
    <>
      <div style={{
        padding: '18px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(37,99,235,0.08)',
      }}>
        <motion.div
          className="icon-box icon-box-sm"
          whileHover={{ rotate: 12, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          style={{ background: 'linear-gradient(135deg, #2563eb, #059669)', flexShrink: 0 }}
        >
          <HiOutlineCpuChip size={18} color="white" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap' }} className="gradient-text">
                SHMS
              </span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(5,150,105,0.18)', color: '#34d399', fontWeight: 700, letterSpacing: 0.5 }}>
                v2.0
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {onClose && (
          <button onClick={onClose} className="icon-btn" aria-label="Close menu" style={{ marginLeft: 'auto' }}>
            <HiOutlineXMark size={20} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '10px 14px 0' }}
          >
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--color-primary-light)',
              textTransform: 'uppercase', padding: '4px 10px',
              background: 'rgba(37,99,235,0.12)', borderRadius: 6,
              display: 'inline-block',
            }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflow: collapsed ? 'visible' : 'auto' }}>
        {menus.map((item) => (
          <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} onClick={onClose} pillId={pillId} />
        ))}
        <div style={{ borderTop: '1px solid rgba(37,99,235,0.08)', margin: '8px 0' }} />
        <NavItem item={PROFILE_ITEM} isActive={pathname === PROFILE_ITEM.href} collapsed={collapsed} onClick={onClose} pillId={pillId} />
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(37,99,235,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, marginBottom: 4 }}>
          <div className="icon-box icon-box-sm"
            style={{ background: 'linear-gradient(135deg, #2563eb, #059669)', fontWeight: 700, color: 'white', fontSize: 13 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 170 }}>
                  {user?.email}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {onToggle && (
          <button onClick={onToggle} className="nav-link"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} style={{ display: 'flex' }}>
              <HiOutlineChevronDoubleLeft size={20} style={{ minWidth: 20 }} />
            </motion.span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>Collapse <kbd>[</kbd></span>}
          </button>
        )}

        <button onClick={onLogout} className="nav-link"
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
          aria-label={collapsed ? 'Logout' : undefined}
        >
          <HiOutlineArrowRightOnRectangle size={20} style={{ minWidth: 20, flexShrink: 0 }} />
          {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Logout</span>}
        </button>
      </div>
    </>
  );
}

/* ─── Notifications dropdown ──────────────────────────────────────────────── */
function NotificationsMenu({ socketState, role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);
  const list = socketState.notifications || [];
  const [highlighted, setHighlighted] = useState(() => new Set());

  const toggle = () => {
    if (!open) {
      setHighlighted(new Set(list.filter((n) => !n.isRead).map((n) => n.id)));
      socketState.clearUnread?.();
    }
    setOpen(!open);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={open} onClick={toggle}>
        <motion.span
          key={socketState.unreadCount}
          animate={socketState.unreadCount > 0 ? { rotate: [0, -16, 14, -10, 6, 0] } : {}}
          transition={{ duration: 0.6 }}
          style={{ display: 'flex' }}
        >
          <HiOutlineBell size={19} />
        </motion.span>
        {socketState.unreadCount > 0 && (
          <span className="badge-ping" style={{ position: 'absolute', top: 3, right: 3, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center' }}>
            {socketState.unreadCount > 9 ? '9+' : socketState.unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dropdown-panel glass"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            style={{ width: 340, maxWidth: 'calc(100vw - 24px)', transformOrigin: 'top right' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <strong style={{ fontSize: 14 }}>Notifications</strong>
              {list.length > 0 && (
                <button type="button" onClick={() => socketState.clearNotifications?.()}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Clear all
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: 6 }}>
              {list.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ display: 'inline-flex', marginBottom: 10 }}>
                    <HiOutlineInbox size={30} />
                  </motion.div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>You&apos;re all caught up</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Live updates will appear here.</p>
                </div>
              ) : (
                list.map((n, i) => (
                  <motion.button key={n.id} type="button"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => { setOpen(false); router.push(notificationHref(role, n.type)); }}
                    style={{ display: 'flex', gap: 10, padding: '10px 10px', borderRadius: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
                    className="menu-row"
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, background: n.isRead && !highlighted.has(n.id) ? 'transparent' : (n.type === 'EMERGENCY' ? '#ef4444' : 'var(--color-primary)'), flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      {n.title && <p style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</p>}
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{n.message}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, opacity: 0.8 }}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Account dropdown ────────────────────────────────────────────────────── */
function AccountMenu({ user, theme, onToggleTheme, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu"
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}>
        <motion.div className="icon-box icon-box-sm"
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #059669)', fontWeight: 700, color: 'white', fontSize: 13, boxShadow: open ? '0 0 0 3px rgba(96,165,250,0.35)' : 'none' }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dropdown-panel glass"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            style={{ width: 240, padding: 6, transformOrigin: 'top right' }}
          >
            <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{user?.firstName} {user?.lastName}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
            </div>
            <Link href="/dashboard/profile" className="menu-row" onClick={close}>
              <HiOutlineUserCircle size={18} /> My profile
            </Link>
            <button type="button" className="menu-row" onClick={onToggleTheme}>
              {theme === 'light' ? <HiOutlineMoon size={18} /> : <HiOutlineSun size={18} />}
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <button type="button" className="menu-row" onClick={onLogout} style={{ color: '#ef4444' }}>
              <HiOutlineArrowRightOnRectangle size={18} /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Theme toggle ────────────────────────────────────────────────────────── */
function ThemeToggle({ theme, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className="icon-btn" aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex' }}
        >
          {theme === 'light' ? <HiOutlineMoon size={18} /> : <HiOutlineSun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/* ─── Layout ──────────────────────────────────────────────────────────────── */
export default function DashboardLayout({ children }) {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || localStorage.getItem(SIDEBAR_KEY) !== '0');
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const socketState = useSocket() || {};
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30, mass: 0.3 });

  useEffect(() => {
    checkAuth().then((ok) => { if (!ok) router.replace('/login'); });
  }, []);

  const roleRedirect = isAuthenticated ? redirectForRole(user?.role, pathname) : null;
  useEffect(() => {
    if (roleRedirect) router.replace(roleRedirect);
  }, [roleRedirect, router]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      localStorage.setItem(SIDEBAR_KEY, open ? '0' : '1');
      return !open;
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); setPaletteOpen(true); }
      else if (e.key === '[') toggleSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  const menus = roleMenus[user?.role] || roleMenus.STUDENT;
  const handleLogout = useCallback(async () => { await logout(); router.push('/login'); }, [logout, router]);

  const paletteItems = useMemo(() => [
    ...[...menus, PROFILE_ITEM].map((m) => ({
      id: m.href, label: m.label, group: 'Pages', icon: m.icon,
      hint: pathname === m.href ? 'Current' : undefined,
      run: () => router.push(m.href),
    })),
    { id: 'theme', label: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode', group: 'Actions', icon: theme === 'light' ? HiOutlineMoon : HiOutlineSun, run: toggleTheme },
    { id: 'sidebar', label: sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar', group: 'Actions', icon: HiOutlineChevronDoubleLeft, hint: '[', run: toggleSidebar },
    { id: 'logout', label: 'Logout', group: 'Actions', icon: HiOutlineArrowRightOnRectangle, run: handleLogout },
  ], [menus, pathname, theme, sidebarOpen, router, toggleTheme, toggleSidebar, handleLogout]);

  const queryItems = useCallback((q) => {
    if (user?.role === 'SUPER_ADMIN') {
      return [{ id: 'room-search', label: `Search rooms for “${q}”`, group: 'Search', icon: HiOutlineMagnifyingGlass,
        run: () => router.push(`/dashboard/admin/rooms?search=${encodeURIComponent(q)}`) }];
    }
    if (user?.role === 'WARDEN') {
      return [{ id: 'room-search', label: `Find “${q}” in rooms`, group: 'Search', icon: HiOutlineMagnifyingGlass,
        run: () => router.push('/dashboard/warden/rooms') }];
    }
    return [];
  }, [user?.role, router]);

  if (isLoading || !isAuthenticated || roleRedirect) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="icon-box icon-box-lg"
          style={{ background: 'conic-gradient(from 0deg, #2563eb, #059669, #2563eb)', padding: 3 }}
        >
          <div className="icon-box" style={{ width: '100%', height: '100%', background: 'var(--color-bg)', borderRadius: 13 }}>
            <HiOutlineCpuChip size={22} color="var(--color-primary-light)" />
          </div>
        </motion.div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading your workspace…</p>
      </div>
    );
  }

  const currentPage = [...menus, PROFILE_ITEM].find((m) => m.href === pathname);
  const bottomTabs = menus.slice(0, 4);
  const sidebarWidth = sidebarOpen ? 260 : 72;

  const auroraModifier = {
    SUPER_ADMIN: 'aurora-bg--management',
    WARDEN:      'aurora-bg--warden',
    STUDENT:     'aurora-bg--student',
    STAFF:       'aurora-bg--warden',
  }[user?.role] || '';

  return (
    <div className={`aurora-bg ${auroraModifier} grain-overlay`} style={{ display: 'flex', minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} />
      {(user?.role === 'STUDENT') && <div className="aurora-blob-extra" aria-hidden="true" />}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} queryItems={queryItems} />

      <div className={`mobile-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="glass hide-mobile"
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40,
          display: 'flex', flexDirection: 'column', overflow: 'visible',
          borderRight: '1px solid rgba(37,99,235,0.08)',
        }}
      >
        <SidebarContent collapsed={!sidebarOpen} menus={menus} pathname={pathname} user={user}
          onClose={null} onLogout={handleLogout} onToggle={toggleSidebar} pillId="nav-pill-desktop" />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -290 }} animate={{ x: 0 }} exit={{ x: -290 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            drag="x"
            dragConstraints={{ left: -290, right: 0 }}
            dragElastic={0.05}
            onDragEnd={(_, info) => { if (info.offset.x < -80) setMobileOpen(false); }}
            className="glass show-mobile"
            style={{
              position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40,
              width: 270, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              borderRight: '1px solid rgba(37,99,235,0.08)',
            }}
          >
            <SidebarContent collapsed={false} menus={menus} pathname={pathname} user={user}
              onClose={() => setMobileOpen(false)} onLogout={handleLogout} pillId="nav-pill-mobile" />
          </motion.aside>
        )}
      </AnimatePresence>

      <main style={{ flex: 1, marginLeft: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Desktop Top Bar */}
        <header className="glass hide-mobile"
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            padding: '10px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(37,99,235,0.06)',
            marginLeft: sidebarWidth,
            transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={toggleSidebar} className="icon-btn" aria-label="Toggle sidebar">
              <HiOutlineBars3 size={20} />
            </button>
            <AnimatePresence mode="wait">
              <motion.div key={pathname}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                style={{ minWidth: 0 }}
              >
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  {user?.role?.replace('_', ' ')}
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{currentPage?.label || 'Dashboard'}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
            <HiOutlineMagnifyingGlass size={16} />
            <span style={{ flex: 1 }}>Search or jump to…</span>
            <kbd>Ctrl</kbd><kbd>K</kbd>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot connected={Boolean(socketState.isConnected)} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <NotificationsMenu socketState={socketState} role={user?.role} />
            <AccountMenu user={user} theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} />
          </div>
        </header>

        {/* Mobile Top Bar */}
        <header className="glass mobile-topbar" style={{ zIndex: 36, borderBottom: '1px solid rgba(37,99,235,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div className="icon-box icon-box-sm" style={{ background: 'linear-gradient(135deg, #2563eb, #059669)' }}>
              <HiOutlineCpuChip size={16} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap' }}>{currentPage?.label || 'SHMS'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="icon-btn" aria-label="Search" onClick={() => setPaletteOpen(true)}>
              <HiOutlineMagnifyingGlass size={18} />
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <NotificationsMenu socketState={socketState} role={user?.role} />
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '20px 16px', marginLeft: 0, position: 'relative', zIndex: 1 }}
          className="dashboard-content">
          <style>{`
            @media (min-width: 1024px) {
              .dashboard-content {
                padding: 24px !important;
                margin-left: ${sidebarWidth}px !important;
                transition: margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              }
            }
            @media (max-width: 1023px) {
              .dashboard-content { margin-left: 0 !important; }
            }
          `}</style>
          <motion.div key={pathname}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="bottom-tabs glass" aria-label="Quick navigation">
        {bottomTabs.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`bottom-tab${active ? ' active' : ''}`}>
              {active && (
                <motion.span layoutId="bottom-tab-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(37,99,235,0.16)' }} />
              )}
              <motion.span animate={{ y: active ? -2 : 0, scale: active ? 1.1 : 1 }} style={{ display: 'flex', position: 'relative' }}>
                <Icon size={20} />
              </motion.span>
              <span style={{ position: 'relative', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" className="bottom-tab" onClick={() => setMobileOpen(true)} aria-label="Open full menu">
          <HiOutlineEllipsisHorizontal size={20} style={{ position: 'relative' }} />
          <span style={{ position: 'relative' }}>More</span>
        </button>
      </nav>
    </div>
  );
}
