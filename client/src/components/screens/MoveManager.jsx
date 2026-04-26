import { useMemo, useState } from 'react';

/**
 * MoveManager — equip / unequip moves between fights.
 *
 * Rules:
 *   - At most MAX_EQUIPPED_MOVES (default 4) equipped at once.
 *   - At least 1 move must stay equipped.
 *   - Click a known move to toggle it (equip if space; unequip unless
 *     it's the last remaining one).
 *
 * The component is fully controlled: it takes a working copy of the
 * hero's equipped list, lets the player edit it, and only writes back
 * to game state when "Save" is pressed. "Cancel" discards changes.
 */
export default function MoveManager({
  hero,
  moves,
  maxEquipped = 4,
  onSave,
  onBack,
}) {
  const [equipped, setEquipped] = useState(() => [...hero.equippedMoves]);

  const known = useMemo(
    () => hero.knownMoves.map((id) => moves[id]).filter(Boolean),
    [hero.knownMoves, moves]
  );

  const isEquipped = (id) => equipped.includes(id);

  const toggle = (id) => {
    if (isEquipped(id)) {
      if (equipped.length <= 1) return; // must keep at least 1
      setEquipped((xs) => xs.filter((x) => x !== id));
    } else {
      if (equipped.length >= maxEquipped) return;
      setEquipped((xs) => [...xs, id]);
    }
  };

  const save = () => {
    onSave(equipped);
  };

  const dirty = useMemo(() => {
    if (equipped.length !== hero.equippedMoves.length) return true;
    const setA = new Set(equipped);
    return hero.equippedMoves.some((id) => !setA.has(id));
  }, [equipped, hero.equippedMoves]);

  return (
    <div className="screen manager">
      <header className="manager__header">
        <h2>Move Manager</h2>
        <p className="manager__subtitle">
          Equipped {equipped.length} / {maxEquipped}. At least 1 move must stay equipped.
        </p>
      </header>

      <div className="manager__grid">
        {known.map((m) => {
          const on = isEquipped(m.id);
          const canToggle = on ? equipped.length > 1 : equipped.length < maxEquipped;
          return (
            <button
              key={m.id}
              type="button"
              className={`manager__card manager__card--${m.type} ${on ? 'is-equipped' : ''}`}
              onClick={() => toggle(m.id)}
              disabled={!canToggle}
              title={m.description}
            >
              <div className="manager__card-top">
                <span className="manager__card-name">{m.name}</span>
                <span className={`manager__card-type manager__card-type--${m.type}`}>
                  {m.type}
                </span>
              </div>
              <div className="manager__card-desc">{m.description}</div>
              <div className="manager__card-footer">
                {on ? '✓ Equipped' : canToggle ? 'Tap to equip' : 'Slots full'}
              </div>
            </button>
          );
        })}
      </div>

      <footer className="manager__footer">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={save}
          disabled={!dirty || equipped.length === 0}
        >
          Save Loadout
        </button>
      </footer>
    </div>
  );
}
