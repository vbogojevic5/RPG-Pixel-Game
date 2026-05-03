import { useMemo, useState } from 'react';
import ChampionStatsPanel from '../ui/ChampionStatsPanel.jsx';
import { getMoveStatLines, moveIcon, moveIconSrc } from '../../constants/movePresentation.js';
import { getShopIconStatLines, itemCategoryLabel, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

function ItemIcon({ item }) {
  const src = itemIconSrc(item);
  return (
    <span className="inventory__icon" aria-hidden>
      {src ? <img src={src} alt="" draggable={false} /> : itemIcon(item)}
    </span>
  );
}

function MovesTab({ hero, moves, maxEquipped, onSave }) {
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
  const dirty = useMemo(() => {
    if (equipped.length !== hero.equippedMoves.length) return true;
    const setA = new Set(equipped);
    return hero.equippedMoves.some((id) => !setA.has(id));
  }, [equipped, hero.equippedMoves]);

  return (
    <>
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
      <div className="run-layout__panel-scroll">
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
                  </div>
                  <p className="manager__card-mana">Mana: {m.cost?.mana ?? 0}</p>
                </div>
                <div className="manager__card-desc">{m.description}</div>
                {!on && (
                  <div className="manager__card-footer manager__card-footer--known-move">
                    <span className={`manager__card-type manager__card-type--${m.type}`}>{m.type}</span>
                    {canEquip && (
                      <span className="manager__card-footer-equip-hint">Click to equip</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <button
        type="button"
        className="btn btn--primary configure__save"
        onClick={() => onSave(equipped)}
        disabled={!dirty || equipped.length === 0}
        data-sfx="saveConfirm"
      >
        Save Loadout
      </button>
    </>
  );
}

function InventoryTab({ hero, items, constants, onEquip, onUnequip }) {
  const maxSlots = constants?.MAX_INVENTORY_SLOTS ?? 8;
  const equipmentSlots = constants?.EQUIPMENT_SLOTS ?? ['weapon', 'armor', 'accessory'];
  const relics = hero.equippedItems?.relics ?? [];
  const maxRelics = constants?.MAX_RELIC_SLOTS ?? 3;

  return (
    <>
      <p className="manager__subtitle manager__inventory-hint configure__inventory-note">
        <span className="manager__inventory-hint-text">Consumables can only be used in battle.</span>
        <span
          className="manager__inventory-slots"
          title={`${hero.inventory?.length ?? 0} of ${maxSlots} inventory slots used`}
        >
          {hero.inventory?.length ?? 0}/{maxSlots} slots used
        </span>
      </p>
      <section className="inventory__equipped">
        {equipmentSlots.map((slot) => {
          const item = items?.[hero.equippedItems?.[slot]];
          return (
            <article className="inventory__slot" key={slot}>
              <p className="manager__eyebrow">{slot}</p>
              {item ? (
                <>
                  <ItemIcon item={item} />
                  <strong>{item.name}</strong>
                  <span className="inventory__equipped-category">{itemCategoryLabel(item)}</span>
                  <button type="button" className="btn btn--ghost" onClick={() => onUnequip(slot)}>
                    Unequip
                  </button>
                </>
              ) : (
                <span className="inventory__empty">Empty</span>
              )}
            </article>
          );
        })}
        <article className="inventory__slot inventory__slot--relics">
          <p className="manager__eyebrow">Relics {relics.length}/{maxRelics}</p>
          {relics.length > 0 ? relics.map((id) => {
            const item = items?.[id];
            return (
              <div className="inventory__relic" key={id}>
                <ItemIcon item={item} />
                <span>{item?.name}</span>
                <button type="button" className="btn btn--ghost" onClick={() => onUnequip(id)}>
                  Unequip
                </button>
              </div>
            );
          }) : <span className="inventory__empty">No relics equipped</span>}
        </article>
      </section>

      <div className="manager__section-title">Carried Items</div>
      <div className="run-layout__panel-scroll">
        <div className="manager__grid">
        {(hero.inventory ?? []).map((entry, index) => {
          const item = items?.[entry.itemId];
          if (!item) return null;
          const canEquip = item.category === 'equipment' || item.category === 'relic';
          const iconSrc = itemIconSrc(item);
          const iconStatLines = getShopIconStatLines(item);
          return (
            <article
              className={`manager__card inventory__card inventory__card--${item.category} shop__item-card`}
              key={`${entry.itemId}-${index}`}
            >
              <div className="shop__item-main">
                <div className="manager__card-move-col--media">
                  <div className="manager__card-move-lead">
                    <span className="manager__card-icon" aria-hidden>
                      {iconSrc ? <img src={iconSrc} alt="" draggable={false} /> : itemIcon(item)}
                    </span>
                    <span className="inventory__stack-under-icon">×{entry.quantity}</span>
                    {iconStatLines.length > 0 && (
                      <ul className="manager__card-stat-list" aria-label="Stat modifiers">
                        {iconStatLines.map((line, i) => (
                          <li key={`${entry.itemId}-line-${i}`}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="manager__card-move-col--body">
                  <div className="manager__card-top">
                    <span className="manager__card-name">{item.name}</span>
                    <span className="manager__card-type">{item.rarity}</span>
                  </div>
                  <p className="shop__item-category">{itemCategoryLabel(item)}</p>
                  {item.category !== 'consumable' && (
                    <div className="manager__card-desc">{item.description}</div>
                  )}
                </div>
              </div>
              <div className="shop__buy-row">
                {canEquip ? (
                  <button type="button" className="btn" onClick={() => onEquip(item.id)}>
                    Equip
                  </button>
                ) : (
                  <span className="inventory__battle-only">Battle only</span>
                )}
              </div>
            </article>
          );
        })}
        {(hero.inventory ?? []).length === 0 && (
          <p className="manager__subtitle">No carried items yet. Win fights or visit merchants to fill your pack.</p>
        )}
        </div>
      </div>
    </>
  );
}

export default function Configure({
  hero,
  moves,
  items,
  constants,
  xpThreshold,
  maxEquipped = 4,
  onSaveMoves,
  onEquip,
  onUnequip,
  onBack,
}) {
  const [tab, setTab] = useState('moves');

  return (
    <div className="screen manager configure run-layout">
      <header className="run-layout__page-heading">
        <div className="run-layout__title">
          <h2 className="screen-page-title">Champion Setup</h2>
        </div>
      </header>

      <div className="run-layout__body">
        <aside className="run-layout__sidebar">
          <ChampionStatsPanel hero={hero} xpThreshold={xpThreshold} compact />
          <div className="run-layout__sidebar-actions">
            <button type="button" className="btn btn--primary" onClick={onBack}>
              Back to Map
            </button>
          </div>
        </aside>
        <main className="run-layout__main run-layout__main--panel">
          <div className="configure__tabs" role="tablist" aria-label="Setup tabs">
            <button type="button" className={tab === 'moves' ? 'is-active' : ''} onClick={() => setTab('moves')}>
              Moves
            </button>
            <button type="button" className={tab === 'inventory' ? 'is-active' : ''} onClick={() => setTab('inventory')}>
              Inventory
            </button>
          </div>
          <div className="run-layout__panel-body">
            {tab === 'moves' ? (
              <MovesTab hero={hero} moves={moves} maxEquipped={maxEquipped} onSave={onSaveMoves} />
            ) : (
              <InventoryTab hero={hero} items={items} constants={constants} onEquip={onEquip} onUnequip={onUnequip} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
