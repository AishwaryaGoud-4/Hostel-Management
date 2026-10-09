export default function ProgressRing({ value = 0, label = 'Progress' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} role="img" aria-label={`${label} ${pct}%`}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 36 36)" style={{ transition: 'stroke-dashoffset 400ms ease' }} />
        <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{Math.round(pct)}%</text>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}
