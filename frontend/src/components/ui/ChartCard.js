export default function ChartCard({ title, subtitle, children }) {
  return (
    <section className="glass" style={{ padding: 20, borderRadius: 16, minWidth: 0 }}>
      <h3 style={{ fontSize: 15, marginBottom: 4 }}>{title}</h3>
      {subtitle && <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 12 }}>{subtitle}</p>}
      <div className="chart-responsive" style={{ width: '100%', minHeight: 220 }}>{children}</div>
    </section>
  );
}
