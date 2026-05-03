import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Collapsible battle log; optional portal overlay when not `contained`. */
export default function BattleLog({
  entries,
  contained = false,
  triggerClassName = 'arena__control-btn battle-log__button',
}) {
  const lines = Array.isArray(entries) ? entries : [];
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  const classify = (line) => {
    const lower = line.toLowerCase();
    if (
      lower.includes('bleeds') ||
      lower.includes('poison') ||
      lower.includes('burn') ||
      lower.includes('is now')
    ) return 'status';
    if (lower.startsWith('a wild')) return 'system';
    if (lower.includes('was defeated')) return 'system';
    return 'hero';
  };

  const panel = open ? (
    <div className={`battle-log__panel ${contained ? 'battle-log__panel--contained' : ''}`}>
      <div className="battle-log__header">
        <h4 className="battle-log__title">Battle Log</h4>
        <button
          type="button"
          className="battle-log__toggle"
          onClick={() => setOpen(false)}
          aria-label="Close battle log"
        >
          <span className="battle-log__close-icon" aria-hidden>×</span>
        </button>
      </div>
      <ul className="battle-log__list" ref={listRef}>
        {entries.map((line, i) => (
          <li
            key={i}
            className={`battle-log__entry battle-log__entry--${classify(line)} ${
              i === entries.length - 1 ? 'is-latest' : ''
            }`}
          >
            <span className="battle-log__entry-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="battle-log__entry-text">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <>
      <div className={`battle-log ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen((value) => !value)}
        data-sfx="buttonClick"
      >
        <i className="fa-solid fa-scroll btn__fa" aria-hidden />
        Battle Log
      </button>
      </div>
      {panel ? (contained ? panel : createPortal(panel, document.body)) : null}
    </>
  );
}
