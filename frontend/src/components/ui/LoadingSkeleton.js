export function LoadingSkeleton({ height = 120, width = '100%', radius = 16 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

export function CardSkeletonGrid({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass" style={{ padding: 20, borderRadius: 16 }}>
          <LoadingSkeleton height={18} width="55%" />
          <div style={{ height: 12 }} />
          <LoadingSkeleton height={14} width="30%" />
          <div style={{ height: 20 }} />
          <LoadingSkeleton height={8} />
        </div>
      ))}
    </div>
  );
}
