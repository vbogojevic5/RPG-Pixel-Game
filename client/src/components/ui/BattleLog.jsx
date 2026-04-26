import { useEffect, useRef, useState } from 'react';

/**
 * BattleLog — scrollable log panel pinned to the bottom-right of the
 * arena. Replaces the inline last-4 in Phase 2.
 *
 * Auto-scrolls to the bottom on new entries. Clickable header collapses
 * to a minimal pill so the log can be hidden when the player wants to
 * focus on the fight.
 */
export default function BattleLog({ entries }) {
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (collapsed) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, collapsed]);

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

  if (collapsed) {
    return (
      <div className="battle-log battle-log--collapsed">
        <div className="battle-log__header">
          <h4 className="battle-log__title">Log</h4>
          <button
            type="button"
            className="battle-log__toggle"
            onClick={() => setCollapsed(false)}
          >
            show
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="battle-log">
      <div className="battle-log__header">
        <h4 className="battle-log__title">Battle Log</h4>
        <button
          type="button"
          className="battle-log__toggle"
          onClick={() => setCollapsed(true)}
        >
          hide
        </button>
      </div>
      <ul className="battle-log__list" ref={listRef}>
        {entries.map((line, i) => (
          <li
            key={i}
            className={`battle-log__entry battle-log__entry--${classify(line)}`}
          >
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
