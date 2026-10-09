'use client';
import { useEffect } from 'react';

const SPOTLIGHT_SELECTOR = '.glass';
const RIPPLE_SELECTOR = '.btn-primary, .btn-secondary, .btn-teal, .nav-link, .icon-btn, .bottom-tab, .ripple';

export default function InteractionLayer() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    let frame = 0;
    let lastEvent = null;
    let lastCard = null;

    const paintSpotlight = () => {
      frame = 0;
      const e = lastEvent;
      if (!e) return;
      const card = e.target instanceof Element ? e.target.closest(SPOTLIGHT_SELECTOR) : null;
      if (lastCard && lastCard !== card) {
        lastCard.style.removeProperty('--mx');
        lastCard.style.removeProperty('--my');
      }
      lastCard = card;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    };

    const onPointerMove = (e) => {
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(paintSpotlight);
    };

    const onPointerDown = (e) => {
      const host = e.target instanceof Element ? e.target.closest(RIPPLE_SELECTOR) : null;
      if (!host || host.disabled) return;
      const rect = host.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ink = document.createElement('span');
      ink.className = 'ripple-ink';
      ink.style.width = ink.style.height = `${size}px`;
      ink.style.left = `${e.clientX - rect.left - size / 2}px`;
      ink.style.top = `${e.clientY - rect.top - size / 2}px`;
      host.appendChild(ink);
      ink.addEventListener('animationend', () => ink.remove(), { once: true });
    };

    if (finePointer && !reduced) document.addEventListener('pointermove', onPointerMove, { passive: true });
    if (!reduced) document.addEventListener('pointerdown', onPointerDown, { passive: true });

    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
