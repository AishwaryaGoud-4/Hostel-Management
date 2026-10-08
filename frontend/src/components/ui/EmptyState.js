export default function EmptyState({ title, message, action }) {
  return (
    <div className="glass" style={{ padding: '48px 24px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 420, margin: '0 auto' }}>{message}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
