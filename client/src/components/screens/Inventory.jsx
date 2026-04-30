import { formatItemEffect, itemCategoryLabel, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

function ItemIcon({ item }) {
  const src = itemIconSrc(item);
  return (
    <span className="inventory__icon" aria-hidden>
      {src ? <img src={src} alt="" draggable={false} /> : itemIcon(item)}
    </span>
  );
}

export default function Inventory({ hero, items, constants, onEquip, onUnequip, onBack }) {
  const maxSlots = constants?.MAX_INVENTORY_SLOTS ?? 8;
  const equipmentSlots = constants?.EQUIPMENT_SLOTS ?? ['weapon', 'armor', 'accessory'];
  const relics = hero.equippedItems?.relics ?? [];
  const maxRelics = constants?.MAX_RELIC_SLOTS ?? 3;

  return (
    <div className="screen manager inventory">
      <header className="manager__header">
        <span className="manager__eyebrow">Run Inventory</span>
        <h2>Items & Gear</h2>
        <p className="manager__subtitle">
          {hero.coins ?? 0} Crowns · {hero.inventory?.length ?? 0}/{maxSlots} slots used.
          Consumables can only be used in battle.
        </p>
      </header>

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
                  <span>{formatItemEffect(item)}</span>
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
      <div className="manager__grid">
        {(hero.inventory ?? []).map((entry, index) => {
          const item = items?.[entry.itemId];
          if (!item) return null;
          const canEquip = item.category === 'equipment' || item.category === 'relic';
          return (
            <article className={`manager__card inventory__card inventory__card--${item.category}`} key={`${entry.itemId}-${index}`}>
              <ItemIcon item={item} />
              <div className="manager__card-top">
                <span className="manager__card-name">{item.name}</span>
                <span className="manager__card-type">{item.rarity}</span>
              </div>
              <div className="manager__card-stat">{itemCategoryLabel(item)} · {formatItemEffect(item)}</div>
              <div className="manager__card-desc">{item.description}</div>
              <div className="manager__card-footer">
                x{entry.quantity}
                {canEquip ? (
                  <button type="button" className="btn" onClick={() => onEquip(item.id)}>
                    Equip
                  </button>
                ) : (
                  <span>Battle only</span>
                )}
              </div>
            </article>
          );
        })}
        {(hero.inventory ?? []).length === 0 && (
          <p className="manager__subtitle">No carried items yet. Win fights or visit merchants to fill your pack.</p>
        )}
      </div>

      <footer className="manager__footer">
        <button type="button" className="btn btn--primary" onClick={onBack}>
          Back to Map
        </button>
      </footer>
    </div>
  );
}
