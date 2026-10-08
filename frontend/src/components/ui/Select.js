export default function Select({ label, id, children, ...props }) {
  const fieldId = id || props.name;
  return (
    <label htmlFor={fieldId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'var(--color-text-muted)' }}>{label}</span>}
      <select id={fieldId} className="input-field" {...props}>{children}</select>
    </label>
  );
}
