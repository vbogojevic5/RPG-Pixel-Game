import ChampionStatsPanel from '../ui/ChampionStatsPanel.jsx';
import { getShopIconStatLines, itemCategoryLabel, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

function ItemIcon({ item }) {
  const src = itemIconSrc(item);
  return (
    <span className="inventory__icon" aria-hidden>
      {src ? <img src={src} alt="" draggable={false} /> : itemIcon(item)}
    </span>
  );
}

export default function Inventory({ hero, items, constants, xpThreshold, onEquip, onUnequip, onBack }) {
  const maxSlots = constants?.MAX_INVENTORY_SLOTS ?? 8;
  const equipmentSlots = constants?.EQUIPMENT_SLOTS ?? ['weapon', 'armor', 'accessory'];
  const relics = hero.equippedItems?.relics ?? [];
  const maxRelics = constants?.MAX_RELIC_SLOTS ?? 3;

  return (
    <div className="screen manager inventory run-layout">
      <header className="run-layout__page-heading">
        <div className="run-layout__title">
          <p className="manager__eyebrow inventory__page-eyebrow">Run Inventory</p>
          <h2 className="screen-page-title">Items & Gear</h2>
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
          <div className="run-layout__panel-body run-layout__panel-body--inventory">
            <p className="manager__subtitle manager__inventory-hint">
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
          </div>
        </main>
      </div>
    </div>
  );
}
