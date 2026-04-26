/**
 * HPBar — displays a character's HP as a numeric value and a fill bar.
 * Turns yellow below 50% HP, red below 25%.
 */
export default function HPBar({ current, max, label }) {
  const pct = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  let tier = 'hp-high';
  if (pct <= 25) tier = 'hp-low';
  else if (pct <= 50) tier = 'hp-mid';

  return (
    <div className="hpbar">
      <div className="hpbar__label">
        <span>{label ?? 'HP'}</span>
        <span className="hpbar__numbers">
          {Math.max(0, Math.round(current))} / {max}
        </span>
      </div>
      <div className="hpbar__track">
        <div
          className={`hpbar__fill ${tier}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.max(0, Math.round(current))}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
