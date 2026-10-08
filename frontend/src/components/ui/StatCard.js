'use client';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCountUp } from '@/hooks/useCountUp';

export default function StatCard({ icon: Icon, label, value, hint, delay = 0 }) {
  const reduced = useReducedMotion();
  const numeric = typeof value === 'number' ? value : null;
  const display = useCountUp(numeric ?? 0, 0.7);
  return (
    <motion.article
      className="glass card-hover"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: reduced ? 0.01 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ padding: 20, borderRadius: 'var(--radius-lg)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{numeric == null ? value : display}</p>
          {hint && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>{hint}</p>}
        </div>
        {Icon && (
          <div className="icon-box icon-box-md" style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--color-primary-light)' }}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </motion.article>
  );
}
