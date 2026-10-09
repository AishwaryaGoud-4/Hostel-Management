export default function DashboardCard({ title, children, action }) {
  return (
    <section className="glass" style={{ padding: 20, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        {title && <h3 style={{ fontSize: 16 }}>{title}</h3>}
        {action}
      </div>
      {children}
    </section>
  );
}
