'use client';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function AnimatedCard({ children, delay = 0, className = '', style }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`glass card-hover ${className}`.trim()}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={reduced ? undefined : { y: -4 }}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ delay, duration: reduced ? 0.01 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderRadius: 16, ...style }}
    >
      {children}
    </motion.div>
  );
}
