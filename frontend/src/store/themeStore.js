'use client';
import { create } from 'zustand';

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme !== 'light');
}

export const useThemeStore = create((set, get) => ({
  theme: 'dark',
  init: () => {
    const saved = localStorage.getItem('dhm-theme') || 'dark';
    applyTheme(saved);
    set({ theme: saved });
  },
  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('dhm-theme', next);
    applyTheme(next);
    set({ theme: next });
  },
}));
