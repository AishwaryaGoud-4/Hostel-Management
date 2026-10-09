'use client';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function TiltCard({ children, max = 8, className = '', style, as = 'div', ...rest }) {
  const reduced = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springX = useSpring(px, { stiffness: 220, damping: 20 });
  const springY = useSpring(py, { stiffness: 220, damping: 20 });
  const rotateX = useTransform(springY, [0, 1], [max, -max]);
  const rotateY = useTransform(springX, [0, 1], [-max, max]);
  const Component = motion[as] || motion.div;

  const onMove = (e) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const onLeave = () => { px.set(0.5); py.set(0.5); };

  return (
    <Component
      className={className}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d', ...style }}
      {...rest}
    >
      {children}
    </Component>
  );
}
