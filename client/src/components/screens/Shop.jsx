import { useState } from 'react';
import { formatItemEffect, itemCategoryLabel, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

function priceFor(item, merchant) {
  return Math.ceil((item?.price ?? 0) * (merchant?.priceMultiplier ?? 1));
}

export default function Shop({ hero, items, merchant, constants, onBuy, onBack }) {
  const maxSlots = constants?.MAX_INVENTORY_SLOTS ?? 8;
  const [message, setMessage] = useState(null);

  return (
    <div className="screen manager shop">
      <header className="manager__header">
        <span className="manager__eyebrow">Merchant</span>
        <h2>{merchant?.name ?? 'Merchant'}</h2>
        <p className="manager__subtitle">
          {hero.coins ?? 0} Crowns · Inventory {hero.inventory?.length ?? 0}/{maxSlots}
        </p>
      </header>

      <div className="manager__grid">
        {(merchant?.stock ?? []).map((itemId) => {
          const item = items?.[itemId];
          if (!item) return null;
          const iconSrc = itemIconSrc(item);
          const price = priceFor(item, merchant);
          const canBuy = (hero.coins ?? 0) >= price;
          return (
            <article className={`manager__card inventory__card inventory__card--${item.category}`} key={item.id}>
              <span className="inventory__icon" aria-hidden>
                {iconSrc ? <img src={iconSrc} alt="" draggable={false} /> : itemIcon(item)}
              </span>
              <div className="manager__card-top">
                <span className="manager__card-name">{item.name}</span>
                <span className="manager__card-type">{item.rarity}</span>
              </div>
              <div className="manager__card-stat">{itemCategoryLabel(item)} · {formatItemEffect(item)}</div>
              <div className="manager__card-desc">{item.description}</div>
              <div className="manager__card-footer">
                <span>{price} Crowns</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const result = onBuy(item.id, price);
                    setMessage(result?.ok ? `${item.name} added to inventory.` : 'Not enough coins or inventory space.');
                  }}
                  disabled={!canBuy}
                >
                  Buy
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {message && <p className="manager__subtitle">{message}</p>}

      <footer className="manager__footer">
        <button type="button" className="btn btn--primary" onClick={onBack}>
          Back to Map
        </button>
      </footer>
    </div>
  );
}
