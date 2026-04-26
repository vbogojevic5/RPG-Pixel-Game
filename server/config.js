/**
 * Single source of truth for all game data.
 * Named exports: `hero`, `monsters`, `moves`, `constants`.
 *
 * Game Designer: tweak the numbers here to rebalance the game.
 * No client rebuild needed — client fetches this from GET /run/config.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const constants = {
  MAX_EQUIPPED_MOVES: 4,
  BUFF_DEFAULT_DURATION: 2,
  XP_LEVEL_THRESHOLDS: [0, 100, 250, 450, 700, 1000],
  LEVEL_UP_STAT_GAINS: { health: 10, attack: 2, defense: 2, magic: 2 },
};

// ---------------------------------------------------------------------------
// Moves
//
// Each move has:
//   id            — unique key
//   name          — display name
//   type          — 'physical' | 'magic' | 'heal' | 'buff' | 'debuff'
//   baseValue     — raw power (damage / heal amount / buff magnitude)
//   description   — tooltip text
//   effect        — extra data (self/target buffs, self-damage cost, lifesteal, etc.)
//   statusEffect  — optional DoT applied to the target:
//                   { kind: 'bleed'|'poison'|'burn', chance: 0..1, damage: n, turns: n }
// ---------------------------------------------------------------------------
export const moves = {
  // ---- Knight (hero defaults) ----
  slash: {
    id: 'slash',
    name: 'Slash',
    type: 'physical',
    baseValue: 20,
    description: 'A swift sword slash. Scales with Attack, reduced by Defense.',
  },
  shieldUp: {
    id: 'shieldUp',
    name: 'Shield Up',
    type: 'buff',
    baseValue: 0,
    description: "Raise the knight's Defense by 50% for 2 turns.",
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },
  battleCry: {
    id: 'battleCry',
    name: 'Battle Cry',
    type: 'buff',
    baseValue: 0,
    description: "Raise the knight's Attack by 50% for 2 turns.",
    effect: { target: 'self', stat: 'attack', multiplier: 1.5, turns: 2 },
  },
  secondWind: {
    id: 'secondWind',
    name: 'Second Wind',
    type: 'heal',
    baseValue: 25,
    description: 'Restore HP. Scales with Magic.',
  },

  // ---- Witch ----
  shadowBolt: {
    id: 'shadowBolt',
    name: 'Shadow Bolt',
    type: 'magic',
    baseValue: 28,
    description: 'A dark projectile. Heavy magic damage. 30% chance to poison.',
    statusEffect: { kind: 'poison', chance: 0.3, damage: 4, turns: 3 },
  },
  drainLife: {
    id: 'drainLife',
    name: 'Drain Life',
    type: 'magic',
    baseValue: 14,
    description: 'Drain vitality — heals the caster for the damage dealt.',
    effect: { lifesteal: 1.0 },
  },
  curse: {
    id: 'curse',
    name: 'Curse',
    type: 'debuff',
    baseValue: 0,
    description: "Lower the target's Attack by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'attack', multiplier: 0.7, turns: 2 },
  },
  darkPact: {
    id: 'darkPact',
    name: 'Dark Pact',
    type: 'buff',
    baseValue: 0,
    description: 'Sacrifice 10 HP to raise Magic by 50% for 2 turns.',
    effect: { target: 'self', stat: 'magic', multiplier: 1.5, turns: 2, selfDamage: 10 },
  },

  // ---- Giant Spider ----
  bite: {
    id: 'bite',
    name: 'Bite',
    type: 'physical',
    baseValue: 18,
    description: 'Venomous bite. Moderate damage and 40% chance to poison.',
    statusEffect: { kind: 'poison', chance: 0.4, damage: 3, turns: 3 },
  },
  webThrow: {
    id: 'webThrow',
    name: 'Web Throw',
    type: 'physical',
    baseValue: 10,
    description: "Light damage and lowers target's Defense by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'defense', multiplier: 0.7, turns: 2 },
  },
  pounce: {
    id: 'pounce',
    name: 'Pounce',
    type: 'physical',
    baseValue: 26,
    description: 'Heavy pouncing attack with a 25% chance to cause bleeding.',
    statusEffect: { kind: 'bleed', chance: 0.25, damage: 4, turns: 2 },
  },
  skitter: {
    id: 'skitter',
    name: 'Skitter',
    type: 'buff',
    baseValue: 0,
    description: 'Raises Defense by 50% for 2 turns.',
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },

  // ---- Dragon ----
  flameBreath: {
    id: 'flameBreath',
    name: 'Flame Breath',
    type: 'magic',
    baseValue: 32,
    description: 'Searing flames. Heavy magic damage and 50% chance to burn.',
    statusEffect: { kind: 'burn', chance: 0.5, damage: 5, turns: 2 },
  },
  clawSwipe: {
    id: 'clawSwipe',
    name: 'Claw Swipe',
    type: 'physical',
    baseValue: 22,
    description: 'A swipe with razor claws. 30% chance to cause bleeding.',
    statusEffect: { kind: 'bleed', chance: 0.3, damage: 4, turns: 2 },
  },
  intimidate: {
    id: 'intimidate',
    name: 'Intimidate',
    type: 'debuff',
    baseValue: 0,
    description: "Lower the target's Attack by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'attack', multiplier: 0.7, turns: 2 },
  },
  dragonScales: {
    id: 'dragonScales',
    name: 'Dragon Scales',
    type: 'buff',
    baseValue: 0,
    description: 'Harden scales. Raises Defense by 50% for 2 turns.',
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },

  // ---- Goblin Warrior ----
  rustyBlade: {
    id: 'rustyBlade',
    name: 'Rusty Blade',
    type: 'physical',
    baseValue: 16,
    description: 'A swing with a rusted sword. Moderate physical damage.',
  },
  dirtyKick: {
    id: 'dirtyKick',
    name: 'Dirty Kick',
    type: 'physical',
    baseValue: 8,
    description: "Light damage and lowers target's Defense by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'defense', multiplier: 0.7, turns: 2 },
  },
  frenzy: {
    id: 'frenzy',
    name: 'Frenzy',
    type: 'buff',
    baseValue: 0,
    description: 'Raises Attack by 50% for 2 turns.',
    effect: { target: 'self', stat: 'attack', multiplier: 1.5, turns: 2 },
  },
  headbutt: {
    id: 'headbutt',
    name: 'Headbutt',
    type: 'physical',
    baseValue: 22,
    description: 'A reckless headbutt. Heavy damage, 20% chance to cause bleeding.',
    statusEffect: { kind: 'bleed', chance: 0.2, damage: 3, turns: 2 },
  },

  // ---- Goblin Mage ----
  firebolt: {
    id: 'firebolt',
    name: 'Firebolt',
    type: 'magic',
    baseValue: 20,
    description: 'A bolt of fire. Moderate magic damage, 35% chance to burn.',
    statusEffect: { kind: 'burn', chance: 0.35, damage: 4, turns: 2 },
  },
  arcaneSurge: {
    id: 'arcaneSurge',
    name: 'Arcane Surge',
    type: 'buff',
    baseValue: 0,
    description: 'Raises Magic by 50% for 2 turns.',
    effect: { target: 'self', stat: 'magic', multiplier: 1.5, turns: 2 },
  },
  manaDrain: {
    id: 'manaDrain',
    name: 'Mana Drain',
    type: 'magic',
    baseValue: 10,
    description: "Light magic damage and lowers target's Magic by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'magic', multiplier: 0.7, turns: 2 },
  },
  hexShield: {
    id: 'hexShield',
    name: 'Hex Shield',
    type: 'buff',
    baseValue: 0,
    description: 'Raises Defense by 50% for 2 turns.',
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },
};

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export const hero = {
  id: 'knight',
  name: 'Knight',
  baseStats: { health: 100, attack: 15, defense: 10, magic: 8 },
  defaultMoves: ['slash', 'shieldUp', 'battleCry', 'secondWind'],
  sprite: 'knight.png',
};

// ---------------------------------------------------------------------------
// Monsters (ordered easiest -> hardest)
// ---------------------------------------------------------------------------
export const monsters = {
  goblin_warrior: {
    id: 'goblin_warrior',
    name: 'Goblin Warrior',
    order: 1,
    stats: { health: 60, attack: 12, defense: 6, magic: 3 },
    moves: ['rustyBlade', 'dirtyKick', 'frenzy', 'headbutt'],
    xpReward: 50,
    sprite: 'goblin_warrior.png',
  },
  giant_spider: {
    id: 'giant_spider',
    name: 'Giant Spider',
    order: 2,
    stats: { health: 75, attack: 14, defense: 8, magic: 4 },
    moves: ['bite', 'webThrow', 'pounce', 'skitter'],
    xpReward: 75,
    sprite: 'giant_spider.png',
  },
  goblin_mage: {
    id: 'goblin_mage',
    name: 'Goblin Mage',
    order: 3,
    stats: { health: 80, attack: 8, defense: 8, magic: 16 },
    moves: ['firebolt', 'arcaneSurge', 'manaDrain', 'hexShield'],
    xpReward: 100,
    sprite: 'goblin_mage.png',
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    order: 4,
    stats: { health: 90, attack: 9, defense: 9, magic: 18 },
    moves: ['shadowBolt', 'drainLife', 'curse', 'darkPact'],
    xpReward: 150,
    sprite: 'witch.png',
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    order: 5,
    stats: { health: 130, attack: 18, defense: 14, magic: 16 },
    moves: ['flameBreath', 'clawSwipe', 'intimidate', 'dragonScales'],
    xpReward: 250,
    sprite: 'dragon.png',
  },
};
