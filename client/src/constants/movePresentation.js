const MOVE_TYPE_ICONS = {
  physical: '⚔',
  magic: '✦',
  heal: '✚',
  buff: '▲',
  debuff: '▼',
};

const GAME_ICONS_BASE = 'https://game-icons.net/icons/ffffff/transparent/1x1';

const MOVE_NAME_ICONS = {
  slash: '⚔',
  shieldUp: '🛡',
  battleCry: '!',
  secondWind: '✚',
  shadowBolt: '☾',
  drainLife: '◇',
  curse: '☠',
  darkPact: '◆',
  bite: '☣',
  webThrow: '⌁',
  pounce: '♞',
  skitter: '⬢',
  flameBreath: '🔥',
  clawSwipe: '///',
  intimidate: '!',
  dragonScales: '◆',
  rustyBlade: '⚔',
  dirtyKick: '➤',
  frenzy: '▲',
  headbutt: '●',
  firebolt: '🔥',
  arcaneSurge: '✦',
  manaDrain: '◇',
  hexShield: '⬡',
};

const MOVE_NAME_ICON_SOURCES = {
  slash: `${GAME_ICONS_BASE}/lorc/broadsword.svg`,
  shieldUp: `${GAME_ICONS_BASE}/lorc/checked-shield.svg`,
  battleCry: `${GAME_ICONS_BASE}/lorc/screaming.svg`,
  secondWind: `${GAME_ICONS_BASE}/zeromancer/heart-plus.svg`,
  shadowBolt: `${GAME_ICONS_BASE}/lorc/cursed-star.svg`,
  drainLife: `${GAME_ICONS_BASE}/lorc/bleeding-heart.svg`,
  curse: `${GAME_ICONS_BASE}/lorc/fanged-skull.svg`,
  darkPact: `${GAME_ICONS_BASE}/lorc/crystal-ball.svg`,
  bite: `${GAME_ICONS_BASE}/lorc/fangs.svg`,
  webThrow: `${GAME_ICONS_BASE}/lorc/cobweb.svg`,
  pounce: `${GAME_ICONS_BASE}/lorc/angular-spider.svg`,
  skitter: `${GAME_ICONS_BASE}/lorc/angular-spider.svg`,
  flameBreath: `${GAME_ICONS_BASE}/lorc/fire-breath.svg`,
  clawSwipe: `${GAME_ICONS_BASE}/lorc/claw-slashes.svg`,
  intimidate: `${GAME_ICONS_BASE}/lorc/screaming.svg`,
  dragonScales: `${GAME_ICONS_BASE}/lorc/energy-shield.svg`,
  rustyBlade: `${GAME_ICONS_BASE}/lorc/broadsword.svg`,
  dirtyKick: `${GAME_ICONS_BASE}/lorc/boot-kick.svg`,
  frenzy: `${GAME_ICONS_BASE}/delapouite/enrage.svg`,
  headbutt: `${GAME_ICONS_BASE}/lorc/bull-horns.svg`,
  firebolt: `${GAME_ICONS_BASE}/lorc/fire-spell-cast.svg`,
  arcaneSurge: `${GAME_ICONS_BASE}/lorc/magic-swirl.svg`,
  manaDrain: `${GAME_ICONS_BASE}/lorc/crystal-ball.svg`,
  hexShield: `${GAME_ICONS_BASE}/lorc/energy-shield.svg`,
};

const STAT_LABELS = {
  health: 'HP',
  mana: 'MP',
  attack: 'DMG',
  defense: 'DEF',
  magic: 'MAG',
};

export function moveIcon(move) {
  return MOVE_NAME_ICONS[move?.id] ?? MOVE_TYPE_ICONS[move?.type] ?? '?';
}

export function moveIconSrc(move) {
  return MOVE_NAME_ICON_SOURCES[move?.id] ?? null;
}

export function statLabel(stat) {
  return STAT_LABELS[stat] ?? stat;
}

export function formatMoveStat(move) {
  if (!move) return null;
  const costs = [];
  if (move.cost?.mana) costs.push(`${move.cost.mana} MP`);
  if (move.cost?.health) costs.push(`${move.cost.health} HP`);
  const costText = costs.length > 0 ? ` · ${costs.join(' ')}` : '';
  if (move.type === 'physical') return `DMG ${move.baseValue}`;
  if (move.type === 'magic') return `MAG ${move.baseValue}${costText}`;
  if (move.type === 'heal') return `HEAL ${move.baseValue}${costText}`;
  if (move.effect?.stat) {
    const direction = move.effect.multiplier > 1 ? '+' : '-';
    const pct = Math.round(Math.abs(move.effect.multiplier - 1) * 100);
    return `${statLabel(move.effect.stat)} ${direction}${pct}%${costText}`;
  }
  return move.baseValue > 0 ? `PWR ${move.baseValue}${costText}` : `UTILITY${costText}`;
}
