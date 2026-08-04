'use client';
import { useEffect, useRef, useState } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { useReducedMotion } from './useReducedMotion';

/**
 * useCountUp — animates a numeric KPI from 0 to `target` on mount.
 *
 * @param {number} target   The final number to display
 * @param {number} duration Animation duration in seconds (default 0.8)
 * @returns {string}        Formatted integer string for display
 *
 * Respects prefers-reduced-motion: if enabled, returns target immediately.
 * Uses framer-motion's useMotionValue + animate (no extra deps).
 */
export function useCountUp(target, duration = 0.8) {
  const reduced = useReducedMotion();
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState(reduced ? target : 0);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (reduced) {
      setDisplay(target);
      return;
    }

    // Only animate if target changed or on first mount
    const controls = animate(motionVal, target, {
      duration,
      ease: [0.16, 1, 0.3, 1], // --ease-out-expo
      onUpdate: (v) => setDisplay(Math.round(v)),
    });

    prevTarget.current = target;
    return () => controls.stop();
  }, [target, reduced, duration, motionVal]);

  return typeof target === 'number' ? display.toLocaleString() : target;
}
