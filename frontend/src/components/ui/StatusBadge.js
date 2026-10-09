const MAP = {
  PRESENT: 'badge-present',
  ABSENT: 'badge-absent',
  ON_LEAVE: 'badge-leave',
  LATE: 'badge-late',
  AVAILABLE: 'badge-available',
  Available: 'badge-available',
  available: 'badge-available',
  FULL: 'badge-full',
  Full: 'badge-full',
  full: 'badge-full',
  OCCUPIED: 'badge-occupied',
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  RESOLVED: 'badge-resolved',
  CLOSED: 'badge-resolved',
  PAID: 'badge-paid',
  OPEN: 'badge-open',
  IN_PROGRESS: 'badge-progress',
  ESCALATED: 'badge-critical',
  CRITICAL: 'badge-critical',
  MAINTENANCE: 'badge-maintenance',
  Maintenance: 'badge-maintenance',
};

export default function StatusBadge({ status, children }) {
  const label = children || status || '—';
  const key = String(status || children || '');
  return (
    <span className={`badge ${MAP[key] || 'badge-pending'}`} aria-label={`Status ${label}`}>
      {label}
    </span>
  );
}
