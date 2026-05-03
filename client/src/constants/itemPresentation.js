const GAME_ICONS_BASE = 'https://game-icons.net/icons/ffffff/transparent/1x1';

const ITEM_ICON_SOURCES = {
  minorHealthPotion: `${GAME_ICONS_BASE}/lorc/health-potion.svg`,
  manaVial: `${GAME_ICONS_BASE}/lorc/round-bottom-flask.svg`,
  cleansingSalt: `${GAME_ICONS_BASE}/lorc/salt-shaker.svg`,
  guardTonic: `${GAME_ICONS_BASE}/lorc/drink-me.svg`,
  fireBomb: `${GAME_ICONS_BASE}/lorc/bombing-run.svg`,
  ironSword: `${GAME_ICONS_BASE}/lorc/crossed-swords.svg`,
  apprenticeWand: `${GAME_ICONS_BASE}/lorc/fairy-wand.svg`,
  chainVest: `${GAME_ICONS_BASE}/lorc/chain-mail.svg`,
  hunterCloak: `${GAME_ICONS_BASE}/delapouite/cloak.svg`,
  silverRing: `${GAME_ICONS_BASE}/lorc/ring.svg`,
  luckyCoin: `${GAME_ICONS_BASE}/lorc/two-coins.svg`,
  bloodstone: `${GAME_ICONS_BASE}/lorc/heart-stone.svg`,
  wardSigil: `${GAME_ICONS_BASE}/lorc/rune-stone.svg`,
};

const ITEM_FALLBACK_ICONS = {
  consumable: '!',
  equipment: '#',
  relic: '*',
};

/** game-icons.net fallbacks when an item id has no dedicated art yet */
const ITEM_CATEGORY_ICON_SRC = {
  consumable: `${GAME_ICONS_BASE}/lorc/health-potion.svg`,
  equipment: `${GAME_ICONS_BASE}/lorc/backpack.svg`,
  relic: `${GAME_ICONS_BASE}/lorc/rune-stone.svg`,
};

export function itemIconSrc(item) {
  if (!item) return null;
  return ITEM_ICON_SOURCES[item.id] ?? ITEM_CATEGORY_ICON_SRC[item.category] ?? null;
}

export function itemIcon(item) {
  return ITEM_FALLBACK_ICONS[item?.category] ?? '?';
}

export function itemCategoryLabel(item) {
  if (!item) return 'Item';
  if (item.category === 'equipment') return item.slot ? `Equipment - ${item.slot}` : 'Equipment';
  if (item.category === 'relic') return 'Passive Relic';
  return 'Consumable';
}

/** Under shop icon: stat boosts only (no category or effect — those belong in the description column). */
export function getShopIconStatLines(item) {
  if (!item) return [];
  return Object.entries(item.statModifiers ?? {}).map(
    ([stat, value]) => `+${value} ${stat.toUpperCase()}`,
  );
}

/** Lines for shop/inventory cards: category, then each stat or effect on its own row. */
export function getItemStatLines(item) {
  if (!item) return [];
  const lines = [itemCategoryLabel(item)];
  const statEntries = Object.entries(item.statModifiers ?? {});
  if (statEntries.length > 0) {
    statEntries.forEach(([stat, value]) => lines.push(`+${value} ${stat.toUpperCase()}`));
    return lines;
  }
  const effect = formatItemEffect(item);
  if (effect) {
    if (effect.includes(',')) {
      effect.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => lines.push(s));
    } else {
      lines.push(effect);
    }
  }
  return lines;
}

export function formatItemEffect(item) {
  if (!item) return '';
  const stats = Object.entries(item.statModifiers ?? {})
    .map(([stat, value]) => `+${value} ${stat.toUpperCase()}`);
  if (stats.length > 0) return stats.join(', ');
  if (item.passive?.kind === 'coinMultiplier') {
    return `Coins x${item.passive.multiplier}`;
  }
  if (item.effect?.kind === 'heal') return `Restore ${item.effect.amount} HP`;
  if (item.effect?.kind === 'restoreMana') return `Restore ${item.effect.amount} MANA`;
  if (item.effect?.kind === 'directDamage') return `${item.effect.amount} damage`;
  if (item.effect?.kind === 'temporaryBuff') {
    return `${item.effect.stat.toUpperCase()} x${item.effect.multiplier} (${item.effect.turns}t)`;
  }
  if (item.effect?.kind === 'cleanseStatuses') return 'Cleanse statuses';
  return item.rarity ?? '';
}
