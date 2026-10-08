export default function LiveDot({ connected, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
        fontSize: 11,
        fontWeight: 700,
        color: connected ? 'var(--color-accent)' : 'var(--color-text-muted)',
      }}
      aria-live="polite"
    >
      <span className={connected ? 'live-monitor-dot' : ''} style={{
        width: 8, height: 8, borderRadius: '50%',
        background: connected ? 'var(--color-accent)' : 'var(--color-text-muted)',
        display: 'inline-block',
      }} />
      {label || (connected ? 'Live' : 'Offline')}
    </span>
  );
}
