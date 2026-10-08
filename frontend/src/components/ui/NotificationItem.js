export default function NotificationItem({ title, message, time }) {
  return (
    <article className="badge-ping" style={{ padding: 12, borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      {message && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{message}</p>}
      {time && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>{time}</p>}
    </article>
  );
}
