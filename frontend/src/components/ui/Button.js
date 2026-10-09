export default function Button({ children, variant = 'primary', type = 'button', ...props }) {
  const cls = variant === 'secondary' ? 'btn-secondary' : variant === 'accent' ? 'btn-teal' : 'btn-primary';
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}
