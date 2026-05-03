import { getShopIconStatLines, itemCategoryLabel, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

function priceFor(item, merchant) {
  return Math.ceil((item?.price ?? 0) * (merchant?.priceMultiplier ?? 1));
}

function shopSlotKey(merchantId, itemId) {
  return `${merchantId}:${itemId}`;
}

export default function Shop({ hero, items, merchant, constants, shopPurchasedSlots, onBuy, onBack }) {
  const maxSlots = constants?.MAX_INVENTORY_SLOTS ?? 8;
  const merchantId = merchant?.id ?? '';

  return (
    <div className="screen manager shop">
      <header className="manager__header">
        <span className="manager__eyebrow">Shop</span>
        <h2>{merchant?.name ?? 'Merchant'}</h2>
        <p className="manager__subtitle">
          {hero.coins ?? 0} Coins · Inventory {hero.inventory?.length ?? 0}/{maxSlots}
        </p>
      </header>

      <div className="manager__grid">
        {(merchant?.stock ?? []).slice(0, 4).map((itemId) => {
          const item = items?.[itemId];
          if (!item) return null;
          const iconSrc = itemIconSrc(item);
          const price = priceFor(item, merchant);
          const canBuy = (hero.coins ?? 0) >= price;
          const alreadyBought = (shopPurchasedSlots ?? []).includes(shopSlotKey(merchantId, item.id));
          const iconStatLines = getShopIconStatLines(item);
          return (
            <article
              className={`manager__card inventory__card inventory__card--${item.category} shop__item-card`}
              key={item.id}
            >
              <div className="shop__item-main">
                <div className="manager__card-move-col--media">
                  <div className="manager__card-move-lead">
                    <span className="manager__card-icon" aria-hidden>
                      {iconSrc ? <img src={iconSrc} alt="" draggable={false} /> : itemIcon(item)}
                    </span>
                    <span className="shop__price shop__price--under-icon">{price} Coins</span>
                    {iconStatLines.length > 0 && (
                      <ul className="manager__card-stat-list" aria-label="Stat modifiers">
                        {iconStatLines.map((line, i) => (
                          <li key={`${item.id}-line-${i}`}>{line}</li>
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
                  <div className="manager__card-desc">{item.description}</div>
                </div>
              </div>
              <div className="shop__buy-row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => onBuy(item.id, price, merchantId)}
                  disabled={!canBuy || alreadyBought}
                >
                  Buy
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="manager__footer shop__footer">
        <button type="button" className="btn btn--primary" onClick={onBack}>
          Back to Map
        </button>
      </footer>
    </div>
  );
}
