'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineArrowTurnDownLeft } from 'react-icons/hi2';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function score(label, query) {
  if (!query) return 1;
  const text = label.toLowerCase();
  const q = query.toLowerCase();
  if (text.startsWith(q)) return 3;
  if (text.includes(q)) return 2;
  let i = 0;
  for (const ch of text) if (ch === q[i]) i += 1;
  return i === q.length ? 1 : 0;
}

function PaletteBody({ onClose, items, queryItems }) {
  const reduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim();
    const ranked = items
      .map((item) => ({ item, s: score(item.label, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.item);
    const extra = q && queryItems ? queryItems(q) : [];
    return [...ranked, ...extra];
  }, [items, query, queryItems]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const runItem = (item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runItem(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onClick={(e) => e.stopPropagation()}
      className="glass"
      style={{ width: '100%', maxWidth: 580, borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <HiOutlineMagnifyingGlass size={18} color="var(--color-text-muted)" />
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder="Search pages, actions, rooms…"
          aria-label="Search commands"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 15 }}
        />
        <kbd>Esc</kbd>
      </div>

      <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
        {results.length === 0 && (
          <p style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
            No matches for “{query}”
          </p>
        )}
        {results.map((item, index) => {
          const showGroup = item.group !== lastGroup;
          lastGroup = item.group;
          const Icon = item.icon;
          const isActive = index === active;
          return (
            <div key={item.id}>
              {showGroup && <div className="palette-group">{item.group}</div>}
              <button
                type="button"
                className="palette-item"
                data-index={index}
                data-active={isActive}
                onMouseMove={() => setActive(index)}
                onClick={() => runItem(item)}
              >
                {isActive && (
                  <motion.span
                    layoutId="palette-active"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(37, 99, 235, 0.14)', border: '1px solid rgba(96, 165, 250, 0.25)' }}
                  />
                )}
                {Icon && <Icon size={18} style={{ position: 'relative', flexShrink: 0 }} />}
                <span style={{ position: 'relative', flex: 1 }}>{item.label}</span>
                {item.hint && <span style={{ position: 'relative', fontSize: 11, color: 'var(--color-text-muted)' }}>{item.hint}</span>}
                {isActive && <HiOutlineArrowTurnDownLeft size={14} style={{ position: 'relative', color: 'var(--color-text-muted)' }} />}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '10px 16px', borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)' }}>
        <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> open</span>
        <span style={{ marginLeft: 'auto' }}><kbd>Ctrl</kbd> <kbd>K</kbd> toggle</span>
      </div>
    </motion.div>
  );
}

/**
 * items: [{ id, label, group, icon, hint, run }]
 * queryItems(query) → extra items built from the typed text (e.g. "Search rooms for …")
 */
export default function CommandPalette({ open, onClose, items, queryItems }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          role="presentation"
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(2, 8, 23, 0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: '12vh 16px 16px',
          }}
        >
          <PaletteBody onClose={onClose} items={items} queryItems={queryItems} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
