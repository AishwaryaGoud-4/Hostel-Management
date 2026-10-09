'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function Modal({ open, title, subtitle, onClose, children }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'rgba(2, 8, 23, 0.62)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={reduced ? { duration: 0.01 } : { type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass"
            style={{ width: '100%', maxWidth: 520, borderRadius: 20, padding: 24, maxHeight: '86vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18 }}>{title}</h3>
                {subtitle && <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
              </div>
              <motion.button
                type="button"
                className="icon-btn"
                onClick={onClose}
                aria-label="Close dialog"
                whileHover={reduced ? undefined : { rotate: 90 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <HiOutlineXMark size={18} />
              </motion.button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
