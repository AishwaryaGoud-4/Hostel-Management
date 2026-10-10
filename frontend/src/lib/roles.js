export const ROLE_HOME = {
  SUPER_ADMIN: '/dashboard/admin',
  WARDEN: '/dashboard/warden',
  STUDENT: '/dashboard/student',
  STAFF: '/dashboard/staff',
};

const SHARED_DASHBOARD_PATHS = ['/dashboard/profile'];

export const homeFor = (role) => ROLE_HOME[role] || '/login';

const NOTIFICATION_PAGES = {
  STUDENT: { COMPLAINT: 'complaints', GATE_PASS: 'gatepass', FEE: 'fees', ATTENDANCE: 'attendance', ROOM: 'room' },
  WARDEN: { COMPLAINT: 'complaints', EMERGENCY: 'complaints', GATE_PASS: 'gatepasses', ATTENDANCE: 'attendance', ROOM: 'allocation' },
  STAFF: { COMPLAINT: 'complaints', EMERGENCY: 'complaints', GATE_PASS: 'gatepasses' },
  SUPER_ADMIN: { COMPLAINT: 'complaints', EMERGENCY: 'complaints', FEE: 'fees', ROOM: 'users', SYSTEM: 'users' },
};

export function notificationHref(role, type) {
  const page = NOTIFICATION_PAGES[role]?.[type];
  return page ? `${homeFor(role)}/${page}` : homeFor(role);
}

/** Returns where a user should be sent if they are not allowed on `pathname`, else null. */
export function redirectForRole(role, pathname) {
  if (!pathname?.startsWith('/dashboard')) return null;
  if (SHARED_DASHBOARD_PATHS.some((p) => pathname.startsWith(p))) return null;
  const home = homeFor(role);
  if (pathname === home || pathname.startsWith(`${home}/`)) return null;
  return home;
}
