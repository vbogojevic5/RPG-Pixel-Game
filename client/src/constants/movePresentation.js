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
  arrowShot: '➹',
  huntersMark: '◎',
  stoneFist: '✊',
  graniteSkin: '▣',
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
  firebolt: `${GAME_ICONS_BASE}/delapouite/fire-spell-cast.svg`,
  arcaneSurge: `${GAME_ICONS_BASE}/lorc/magic-swirl.svg`,
  manaDrain: `${GAME_ICONS_BASE}/lorc/crystal-ball.svg`,
  hexShield: `${GAME_ICONS_BASE}/lorc/energy-shield.svg`,
  arrowShot: `${GAME_ICONS_BASE}/lorc/high-shot.svg`,
  huntersMark: `${GAME_ICONS_BASE}/lorc/target-arrows.svg`,
  stoneFist: `${GAME_ICONS_BASE}/lorc/fist.svg`,
  graniteSkin: `${GAME_ICONS_BASE}/lorc/stone-wall.svg`,
};

const STAT_LABELS = {
  health: 'HP',
  mana: 'MANA',
  attack: 'DMG',
  defense: 'DEF',
  magic: 'MAG',
};

export function moveIcon(move) {
  return MOVE_NAME_ICONS[move?.id] ?? MOVE_TYPE_ICONS[move?.type] ?? '?';
}

const MOVE_TYPE_ICON_SRC = {
  physical: `${GAME_ICONS_BASE}/lorc/broadsword.svg`,
  magic: `${GAME_ICONS_BASE}/lorc/magic-swirl.svg`,
  heal: `${GAME_ICONS_BASE}/zeromancer/heart-plus.svg`,
  buff: `${GAME_ICONS_BASE}/lorc/checked-shield.svg`,
  debuff: `${GAME_ICONS_BASE}/lorc/fanged-skull.svg`,
};

export function moveIconSrc(move) {
  if (!move) return null;
  return MOVE_NAME_ICON_SOURCES[move.id] ?? MOVE_TYPE_ICON_SRC[move.type] ?? null;
}

export function statLabel(stat) {
  return STAT_LABELS[stat] ?? stat;
}

/** One string per line: power/heal/buff line, then HP cost only (mana is shown under the name in cards). */
export function getMoveStatLines(move) {
  if (!move) return [];
  const lines = [];
  if (move.type === 'physical') {
    lines.push(`DMG ${move.baseValue}`);
  } else if (move.type === 'magic') {
    lines.push(`MAG ${move.baseValue}`);
  } else if (move.type === 'heal') {
    lines.push(`HEAL ${move.baseValue}`);
  } else if (move.effect?.stat) {
    const direction = move.effect.multiplier > 1 ? '+' : '-';
    const pct = Math.round(Math.abs(move.effect.multiplier - 1) * 100);
    lines.push(`${statLabel(move.effect.stat)} ${direction}${pct}%`);
  } else if (move.baseValue > 0) {
    lines.push(`PWR ${move.baseValue}`);
  } else {
    lines.push('UTILITY');
  }
  if (move.cost?.health) lines.push(`${move.cost.health} HP`);
  return lines;
}

export function formatMoveStat(move) {
  const lines = getMoveStatLines(move);
  if (lines.length === 0) return null;
  return lines.join(' · ');
}
