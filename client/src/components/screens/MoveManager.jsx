import { useMemo, useState } from 'react';
import { getMoveStatLines, moveIcon, moveIconSrc } from '../../constants/movePresentation.js';

/**
 * MoveManager — equip / unequip moves between fights.
 *
 * Rules:
 *   - At most MAX_EQUIPPED_MOVES (default 4) equipped at once.
 *   - At least 1 move must stay equipped.
 *   - Click a known move to equip it if there is room.
 *   - Click an equipped slot to remove it back to the known-moves pool.
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

  const equip = (id) => {
    if (isEquipped(id) || equipped.length >= maxEquipped) return;
    setEquipped((xs) => [...xs, id]);
  };

  const unequip = (id) => {
    if (!isEquipped(id) || equipped.length <= 1) return;
    setEquipped((xs) => xs.filter((x) => x !== id));
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
        <span className="manager__eyebrow">Knight's Loadout</span>
        <h2>Move Arsenal</h2>
        <p className="manager__subtitle">
          Equipped {equipped.length} / {maxEquipped}. At least 1 move must stay equipped.
        </p>
      </header>

      <section className="manager__loadout" aria-label="Equipped moves">
        {Array.from({ length: maxEquipped }).map((_, index) => {
          const move = moves[equipped[index]];
          const iconSrc = moveIconSrc(move);
          return (
            <button
              type="button"
              key={index}
              className={`manager__slot ${move ? `manager__slot--${move.type} is-filled` : ''}`}
              onClick={() => move && unequip(move.id)}
              disabled={!move || equipped.length <= 1}
              title={move ? `Remove ${move.name} from loadout` : 'Empty slot'}
              data-sfx={move ? 'unequip' : undefined}
            >
              {move ? (
                <>
                  <span className="manager__slot-icon">
                    {iconSrc ? <img src={iconSrc} alt="" draggable={false} /> : moveIcon(move)}
                  </span>
                  <span className="manager__slot-name">{move.name}</span>
                  <span className="manager__slot-action">Click to remove</span>
                </>
              ) : (
                <span className="manager__slot-empty">Empty</span>
              )}
            </button>
          );
        })}
      </section>

      <div className="manager__section-title">Known Moves</div>
      <div className="manager__grid manager__known-moves-grid">
        {known.map((m) => {
          const on = isEquipped(m.id);
          const canEquip = !on && equipped.length < maxEquipped;
          const iconSrc = moveIconSrc(m);
          return (
            <button
              key={m.id}
              type="button"
              className={`manager__card manager__card--move manager__card--${m.type} ${on ? 'is-equipped' : ''}`}
              onClick={() => equip(m.id)}
              disabled={on || !canEquip}
              title={m.description}
              data-sfx="equip"
            >
              <div className="manager__card-move-col manager__card-move-col--media">
                <div className="manager__card-move-lead">
                  <span className="manager__card-icon" aria-hidden>
                    {iconSrc ? <img src={iconSrc} alt="" draggable={false} /> : moveIcon(m)}
                  </span>
                  <ul className="manager__card-stat-list" aria-label="Move stats">
                    {getMoveStatLines(m).map((line, i) => (
                      <li key={`${m.id}-stat-${i}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="manager__card-move-col manager__card-move-col--body">
                <div className="manager__card-move-head">
                  <div className="manager__card-top">
                    <span className="manager__card-name">{m.name}</span>
                    <span className={`manager__card-type manager__card-type--${m.type}`}>
                      {m.type}
                    </span>
                  </div>
                  <p className="manager__card-mana">Mana: {m.cost?.mana ?? 0}</p>
                </div>
                <div className="manager__card-desc">{m.description}</div>
                {!on && (
                  <div className="manager__card-footer">
                    {canEquip ? 'Click to equip' : 'Slots full'}
                  </div>
                )}
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
          data-sfx="saveConfirm"
        >
          Save Loadout
        </button>
      </footer>
    </div>
  );
}
