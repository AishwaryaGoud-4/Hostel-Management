'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCountUp } from '@/hooks/useCountUp';
import TiltCard from './TiltCard';

export default function StatCard({ icon: Icon, label, value, hint, delay = 0 }) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const numeric = typeof value === 'number' ? value : null;
  const display = useCountUp(numeric ?? 0, 0.9);
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: reduced ? 0.01 : 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <TiltCard
        as="article"
        className="glass card-hover"
        max={6}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        style={{ padding: 20, borderRadius: 'var(--radius-lg)', height: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{numeric == null ? value : display}</p>
            {hint && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>{hint}</p>}
          </div>
          {Icon && (
            <motion.div
              className="icon-box icon-box-md"
              animate={hover && !reduced ? { rotate: [0, -10, 8, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--color-primary-light)' }}
            >
              <Icon size={20} />
            </motion.div>
          )}
        </div>
      </TiltCard>
    </motion.div>
  );
}
