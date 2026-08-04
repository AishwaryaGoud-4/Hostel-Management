'use client';
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * useReducedMotion — wraps framer-motion's built-in hook.
 *
 * Usage:
 *   const reduced = useReducedMotion();
 *   // If true → collapse transforms to opacity-only fades, skip stagger loops.
 *
 * Respects `prefers-reduced-motion: reduce` at the OS level.
 * CSS-side handling is separate (globals.css @media block).
 */
export function useReducedMotion() {
  return useFramerReducedMotion() ?? false;
}
