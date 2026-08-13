'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

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
} from 'react-icons/hi2';

/* ── Role-based sidebar menus ─────────────────────────────────────────────── */
const roleMenus = {
  SUPER_ADMIN: [
    { href: '/dashboard/admin',            icon: HiOutlineHome,                label: 'Dashboard',       badge: null },
    { href: '/dashboard/admin/hostels',    icon: HiOutlineBuildingOffice2,     label: 'Hostels & Rooms', badge: null },
    { href: '/dashboard/admin/users',      icon: HiOutlineUsers,               label: 'Users',           badge: null },
    { href: '/dashboard/admin/complaints', icon: HiOutlineExclamationTriangle, label: 'Complaints',      badge: null },
    { href: '/dashboard/admin/fees',       icon: HiOutlineBanknotes,           label: 'Fees',            badge: null },
    { href: '/dashboard/admin/analytics',  icon: HiOutlineChartBarSquare,      label: 'AI Analytics',    badge: 'AI'  },
  ],
  WARDEN: [
    { href: '/dashboard/warden',               icon: HiOutlineHome,                label: 'Dashboard',        badge: null },
    { href: '/dashboard/warden/rooms',         icon: HiOutlineSquares2X2,          label: 'Rooms',            badge: null },
    { href: '/dashboard/warden/allocation',    icon: HiOutlineClipboardDocumentList, label: 'Room Allocation', badge: null },
    { href: '/dashboard/warden/attendance',    icon: HiOutlineCalendarDays,        label: 'Attendance',       badge: null },
    { href: '/dashboard/warden/complaints',    icon: HiOutlineExclamationTriangle, label: 'Complaints',       badge: null },
    { href: '/dashboard/warden/gatepasses',    icon: HiOutlineDocumentText,        label: 'Gate Passes',      badge: null },
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
    { href: '/dashboard/staff',                icon: HiOutlineHome,                     label: 'Dashboard',     badge: null },
    { href: '/dashboard/staff/complaints',     icon: HiOutlineClipboardDocumentList,    label: 'Assigned Tasks',badge: null },
    { href: '/dashboard/staff/gatepasses',     icon: HiOutlineShieldCheck,              label: 'Gate Passes',   badge: null },
  ],
};

/* ─── Sidebar Nav Item ────────────────────────────────────────────────────── */
function NavItem({ item, isActive, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`nav-link${isActive ? ' active' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <Icon size={20} style={{ minWidth: 20, flexShrink: 0 }} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && item.badge && (
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 700,
          padding: '2px 6px', borderRadius: 6,
          background: 'rgba(226,114,91,0.2)', color: '#f2a679',
          letterSpacing: 0.5,
        }}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

/* ─── Sidebar Content (shared between desktop & mobile) ───────────────────── */
function SidebarContent({ collapsed, menus, pathname, user, onClose, onLogout }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: '18px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(226,114,91,0.08)',
      }}>
        <div className="icon-box icon-box-sm" style={{ background: 'linear-gradient(135deg, #e2725b, #2a9d8f)', flexShrink: 0 }}>
          <HiOutlineCpuChip size={18} color="white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap' }} className="gradient-text">
                SHMS
              </span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(42,157,143,0.18)', color: '#5fc9ba', fontWeight: 700, letterSpacing: 0.5 }}>
                v2.0
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile close */}
        {onClose && (
          <button onClick={onClose} className="touch-btn"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <HiOutlineXMark size={22} />
          </button>
        )}
      </div>

      {/* Role badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '10px 14px 0' }}
          >
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--color-primary)',
              textTransform: 'uppercase', padding: '4px 10px',
              background: 'rgba(226,114,91,0.12)', borderRadius: 6,
              display: 'inline-block',
            }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav menu */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {menus.map((item) => (
          <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} onClick={onClose} />
        ))}

        {/* Divider + Profile link */}
        <div style={{ borderTop: '1px solid rgba(226,114,91,0.08)', margin: '8px 0' }} />
        <NavItem
          item={{ href: '/dashboard/profile', icon: HiOutlineUserCircle, label: 'Profile', badge: null }}
          isActive={pathname === '/dashboard/profile'}
          collapsed={collapsed}
          onClick={onClose}
        />
      </nav>

      {/* User & Logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(226,114,91,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, marginBottom: 4 }}>
          <div className="icon-box icon-box-sm"
            style={{ background: 'linear-gradient(135deg, #e2725b, #2a9d8f)', fontWeight: 700, color: 'white', fontSize: 13 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={onLogout} className="nav-link"
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#e15554' }}
          title={collapsed ? 'Logout' : undefined}
        >
          <HiOutlineArrowRightOnRectangle size={20} style={{ minWidth: 20, flexShrink: 0 }} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ whiteSpace: 'nowrap' }}>
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}

/* ─── Layout ──────────────────────────────────────────────────────────────── */
export default function DashboardLayout({ children }) {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    checkAuth().then((ok) => { if (!ok) router.push('/login'); });
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    );
  }

  const menus        = roleMenus[user?.role] || roleMenus.STUDENT;
  const handleLogout = async () => { await logout(); router.push('/login'); };

  /* Role-specific aurora modifier class */
  const auroraModifier = {
    SUPER_ADMIN: 'aurora-bg--management',
    WARDEN:      'aurora-bg--warden',
    STUDENT:     'aurora-bg--student',
    STAFF:       'aurora-bg--warden', /* Staff shares warden's "monitoring" personality */
  }[user?.role] || '';

  return (
    <div className={`aurora-bg ${auroraModifier} grain-overlay`} style={{ display: 'flex', minHeight: '100dvh', background: 'var(--color-bg)' }}>
      {/* Extra blob for student aurora variant (3rd blob) */}
      {(user?.role === 'STUDENT') && <div className="aurora-blob-extra" aria-hidden="true" />}

      {/* Mobile overlay backdrop */}
      <div className={`mobile-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
        className="glass hide-mobile"
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRight: '1px solid rgba(226,114,91,0.08)',
        }}
      >
        <SidebarContent collapsed={!sidebarOpen} menus={menus} pathname={pathname} user={user} onClose={null} onLogout={handleLogout} />
      </motion.aside>

      {/* Mobile Sidebar (slide-in drawer) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="glass show-mobile"
            style={{
              position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40,
              width: 260, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              borderRight: '1px solid rgba(226,114,91,0.08)',
            }}
          >
            <SidebarContent collapsed={false} menus={menus} pathname={pathname} user={user}
              onClose={() => setMobileOpen(false)} onLogout={handleLogout} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Desktop Top Bar */}
        <header className="glass hide-mobile"
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            padding: '12px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(226,114,91,0.06)',
            marginLeft: sidebarOpen ? 260 : 72,
            transition: 'margin-left 0.28s ease',
          }}
        >
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="touch-btn"
            style={{ background: 'rgba(226,114,91,0.06)', border: '1px solid rgba(226,114,91,0.1)', borderRadius: 10, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <HiOutlineBars3 size={20} />
          </button>

          {/* Breadcrumb */}
          <div style={{ flex: 1, marginLeft: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i}>
                <span style={{ color: i === arr.length - 1 ? 'var(--color-text)' : 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  {seg.replace('-', ' ')}
                </span>
                {i < arr.length - 1 && <span style={{ margin: '0 6px' }}>›</span>}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="touch-btn"
              style={{ background: 'rgba(226,114,91,0.06)', border: '1px solid rgba(226,114,91,0.1)', borderRadius: 10, cursor: 'pointer', color: 'var(--color-text-muted)', position: 'relative' }}>
              <HiOutlineBell size={20} />
              <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#e15554', border: '2px solid var(--color-bg)' }} />
            </button>

            <Link href="/dashboard/profile">
              <div className="icon-box icon-box-sm"
                style={{ background: 'linear-gradient(135deg, #e2725b, #2a9d8f)', fontWeight: 700, color: 'white', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile Top Bar */}
        <header className="glass mobile-topbar"
          style={{ zIndex: 36, borderBottom: '1px solid rgba(226,114,91,0.06)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMobileOpen(true)} className="touch-btn"
              style={{ background: 'rgba(226,114,91,0.06)', border: '1px solid rgba(226,114,91,0.1)', borderRadius: 10, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
              <HiOutlineBars3 size={20} />
            </button>
            <div className="icon-box icon-box-sm" style={{ background: 'linear-gradient(135deg, #e2725b, #2a9d8f)' }}>
              <HiOutlineCpuChip size={16} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16 }} className="gradient-text">SHMS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="touch-btn"
              style={{ background: 'rgba(226,114,91,0.06)', border: '1px solid rgba(226,114,91,0.1)', borderRadius: 10, cursor: 'pointer', color: 'var(--color-text-muted)', position: 'relative' }}>
              <HiOutlineBell size={20} />
              <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#e15554', border: '2px solid var(--color-bg)' }} />
            </button>
            <Link href="/dashboard/profile">
              <div className="icon-box icon-box-sm"
                style={{ background: 'linear-gradient(135deg, #e2725b, #2a9d8f)', fontWeight: 700, color: 'white', fontSize: 12 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '20px 16px', marginLeft: 0, transition: 'margin-left 0.28s ease', position: 'relative', zIndex: 1 }}
          className="dashboard-content">
          <style>{`
            @media (min-width: 1024px) {
              .dashboard-content {
                padding: 24px !important;
                margin-left: ${sidebarOpen ? '260px' : '72px'} !important;
              }
            }
            @media (max-width: 1023px) {
              .dashboard-content { margin-left: 0 !important; }
            }
          `}</style>
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
