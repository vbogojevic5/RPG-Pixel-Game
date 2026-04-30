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
  MAX_INVENTORY_SLOTS: 8,
  EQUIPMENT_SLOTS: ['weapon', 'armor', 'accessory'],
  MAX_RELIC_SLOTS: 3,
  COIN_LABEL: 'Crowns',
  BUFF_DEFAULT_DURATION: 2,
  MANA_REGEN_PER_TURN: 4,
  MANA_RESETS_EACH_BATTLE: true,
  MONSTERS_USE_MANA: false,
  XP_LEVEL_THRESHOLDS: [0, 100, 250, 450, 700, 1000],
  LEVEL_UP_STAT_GAINS: { health: 10, mana: 5, attack: 2, defense: 2, magic: 2 },
  STATUS_EFFECTS: {
    bleed: {
      label: 'Bleed',
      tickVerb: 'bleeds',
      defaultDamage: 3,
      defaultTurns: 2,
      stackMode: 'refresh',
    },
    poison: {
      label: 'Poison',
      tickVerb: 'suffers from poison',
      defaultDamage: 3,
      defaultTurns: 3,
      stackMode: 'refresh',
    },
    burn: {
      label: 'Burn',
      tickVerb: 'burns',
      defaultDamage: 4,
      defaultTurns: 2,
      stackMode: 'refresh',
    },
  },
  EFFECT_TYPES: {
    status: 'Damage-over-time status applied on hit.',
    statModifier: 'Timed stat multiplier for buffs and debuffs.',
    damageIncrease: 'Outgoing damage multiplier.',
    damageReduction: 'Incoming damage multiplier.',
    lifesteal: 'Heal the attacker for a percent of damage dealt.',
  },
};

// ---------------------------------------------------------------------------
// Items, Drops & Shops
// ---------------------------------------------------------------------------
export const items = {
  minorHealthPotion: {
    id: 'minorHealthPotion',
    name: 'Minor Health Potion',
    category: 'consumable',
    rarity: 'common',
    maxStack: 3,
    price: 35,
    description: 'Restore 35 HP during battle. Uses your turn.',
    effect: { kind: 'heal', amount: 35 },
  },
  manaVial: {
    id: 'manaVial',
    name: 'Mana Vial',
    category: 'consumable',
    rarity: 'common',
    maxStack: 3,
    price: 30,
    description: 'Restore 20 MP during battle. Uses your turn.',
    effect: { kind: 'restoreMana', amount: 20 },
  },
  cleansingSalt: {
    id: 'cleansingSalt',
    name: 'Cleansing Salt',
    category: 'consumable',
    rarity: 'uncommon',
    maxStack: 2,
    price: 45,
    description: 'Remove bleed, poison, and burn during battle. Uses your turn.',
    effect: { kind: 'cleanseStatuses' },
  },
  guardTonic: {
    id: 'guardTonic',
    name: 'Guard Tonic',
    category: 'consumable',
    rarity: 'uncommon',
    maxStack: 2,
    price: 55,
    description: 'Raise Defense by 25% for 2 turns during battle. Uses your turn.',
    effect: { kind: 'temporaryBuff', stat: 'defense', multiplier: 1.25, turns: 2 },
  },
  fireBomb: {
    id: 'fireBomb',
    name: 'Fire Bomb',
    category: 'consumable',
    rarity: 'rare',
    maxStack: 2,
    price: 75,
    description: 'Deal 24 direct damage during battle. Uses your turn.',
    effect: { kind: 'directDamage', amount: 24 },
  },
  ironSword: {
    id: 'ironSword',
    name: 'Iron Sword',
    category: 'equipment',
    slot: 'weapon',
    rarity: 'common',
    price: 70,
    description: 'A reliable blade. +3 DMG.',
    statModifiers: { attack: 3 },
  },
  apprenticeWand: {
    id: 'apprenticeWand',
    name: 'Apprentice Wand',
    category: 'equipment',
    slot: 'weapon',
    rarity: 'uncommon',
    price: 90,
    description: 'A focus for spellcasters. +4 MAG, +8 MP.',
    statModifiers: { magic: 4, mana: 8 },
  },
  chainVest: {
    id: 'chainVest',
    name: 'Chain Vest',
    category: 'equipment',
    slot: 'armor',
    rarity: 'common',
    price: 80,
    description: 'Reinforced links. +15 HP, +3 DEF.',
    statModifiers: { health: 15, defense: 3 },
  },
  hunterCloak: {
    id: 'hunterCloak',
    name: 'Hunter Cloak',
    category: 'equipment',
    slot: 'accessory',
    rarity: 'uncommon',
    price: 85,
    description: 'Light, quiet, practical. +1 DMG, +1 DEF.',
    statModifiers: { attack: 1, defense: 1 },
  },
  silverRing: {
    id: 'silverRing',
    name: 'Silver Ring',
    category: 'equipment',
    slot: 'accessory',
    rarity: 'rare',
    price: 115,
    description: 'A simple ring humming with power. +10 MP, +1 MAG.',
    statModifiers: { mana: 10, magic: 1 },
  },
  luckyCoin: {
    id: 'luckyCoin',
    name: 'Lucky Coin',
    category: 'relic',
    rarity: 'uncommon',
    price: 120,
    description: 'A passive charm. Victory coin rewards are increased by 25%.',
    passive: { kind: 'coinMultiplier', multiplier: 1.25 },
  },
  bloodstone: {
    id: 'bloodstone',
    name: 'Bloodstone',
    category: 'relic',
    rarity: 'rare',
    price: 140,
    description: 'A passive charm. +8 HP and +2 DMG.',
    statModifiers: { health: 8, attack: 2 },
  },
  wardSigil: {
    id: 'wardSigil',
    name: 'Ward Sigil',
    category: 'relic',
    rarity: 'rare',
    price: 150,
    description: 'A passive charm. +2 DEF and +2 MAG.',
    statModifiers: { defense: 2, magic: 2 },
  },
};

export const dropTables = {
  goblin_warrior: { coins: { min: 18, max: 28 }, itemChance: 0.1, itemPool: ['minorHealthPotion', 'ironSword'] },
  giant_spider: { coins: { min: 24, max: 36 }, itemChance: 0.1, itemPool: ['cleansingSalt', 'hunterCloak'] },
  goblin_mage: { coins: { min: 30, max: 45 }, itemChance: 0.1, itemPool: ['manaVial', 'apprenticeWand'] },
  witch: { coins: { min: 40, max: 58 }, itemChance: 0.1, itemPool: ['guardTonic', 'silverRing', 'luckyCoin'] },
  dragon: { coins: { min: 60, max: 85 }, itemChance: 0.1, itemPool: ['fireBomb', 'bloodstone', 'wardSigil'] },
  bandit_archer: { coins: { min: 44, max: 62 }, itemChance: 0.1, itemPool: ['hunterCloak', 'luckyCoin'] },
  stone_golem: { coins: { min: 68, max: 92 }, itemChance: 0.1, itemPool: ['chainVest', 'wardSigil'] },
};

export const shopConfig = {
  merchants: [
    {
      id: 'roadside_merchant',
      name: 'Roadside Merchant',
      unlockAfterCompleted: 2,
      stock: ['minorHealthPotion', 'manaVial', 'cleansingSalt', 'ironSword', 'chainVest', 'hunterCloak'],
      priceMultiplier: 1,
    },
    {
      id: 'relic_broker',
      name: 'Relic Broker',
      unlockAfterCompleted: 4,
      stock: ['guardTonic', 'fireBomb', 'apprenticeWand', 'silverRing', 'luckyCoin', 'bloodstone', 'wardSigil'],
      priceMultiplier: 1.1,
    },
  ],
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
//   cost          — optional resource cost { mana, health }
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
    cost: { mana: 4 },
    description: "Raise the knight's Defense by 50% for 2 turns.",
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },
  battleCry: {
    id: 'battleCry',
    name: 'Battle Cry',
    type: 'buff',
    baseValue: 0,
    cost: { mana: 4 },
    description: "Raise the knight's Attack by 50% for 2 turns.",
    effect: { target: 'self', stat: 'attack', multiplier: 1.5, turns: 2 },
  },
  secondWind: {
    id: 'secondWind',
    name: 'Second Wind',
    type: 'heal',
    baseValue: 25,
    cost: { mana: 8 },
    description: 'Restore HP. Scales with Magic.',
  },

  // ---- Witch ----
  shadowBolt: {
    id: 'shadowBolt',
    name: 'Shadow Bolt',
    type: 'magic',
    baseValue: 28,
    cost: { mana: 10 },
    description: 'A dark projectile. Heavy magic damage. 30% chance to poison.',
    statusEffect: { kind: 'poison', chance: 0.3, damage: 4, turns: 3 },
  },
  drainLife: {
    id: 'drainLife',
    name: 'Drain Life',
    type: 'magic',
    baseValue: 14,
    cost: { mana: 8 },
    description: 'Drain vitality — heals the caster for the damage dealt.',
    effect: { lifesteal: 1.0 },
  },
  curse: {
    id: 'curse',
    name: 'Curse',
    type: 'debuff',
    baseValue: 0,
    cost: { mana: 6 },
    description: "Lower the target's Attack by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'attack', multiplier: 0.7, turns: 2 },
  },
  darkPact: {
    id: 'darkPact',
    name: 'Dark Pact',
    type: 'buff',
    baseValue: 0,
    cost: { mana: 5, health: 10 },
    description: 'Spend 10 HP to raise Magic by 50% for 2 turns.',
    effect: { target: 'self', stat: 'magic', multiplier: 1.5, turns: 2 },
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
    cost: { mana: 4 },
    description: 'Raises Defense by 50% for 2 turns.',
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },

  // ---- Dragon ----
  flameBreath: {
    id: 'flameBreath',
    name: 'Flame Breath',
    type: 'magic',
    baseValue: 32,
    cost: { mana: 12 },
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
    cost: { mana: 6 },
    description: "Lower the target's Attack by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'attack', multiplier: 0.7, turns: 2 },
  },
  dragonScales: {
    id: 'dragonScales',
    name: 'Dragon Scales',
    type: 'buff',
    baseValue: 0,
    cost: { mana: 6 },
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
    cost: { mana: 4 },
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
    cost: { mana: 8 },
    description: 'A bolt of fire. Moderate magic damage, 35% chance to burn.',
    statusEffect: { kind: 'burn', chance: 0.35, damage: 4, turns: 2 },
  },
  arcaneSurge: {
    id: 'arcaneSurge',
    name: 'Arcane Surge',
    type: 'buff',
    baseValue: 0,
    cost: { mana: 6 },
    description: 'Raises Magic by 50% for 2 turns.',
    effect: { target: 'self', stat: 'magic', multiplier: 1.5, turns: 2 },
  },
  manaDrain: {
    id: 'manaDrain',
    name: 'Mana Drain',
    type: 'magic',
    baseValue: 10,
    cost: { mana: 7 },
    description: "Light magic damage and lowers target's Magic by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'magic', multiplier: 0.7, turns: 2 },
  },
  hexShield: {
    id: 'hexShield',
    name: 'Hex Shield',
    type: 'buff',
    baseValue: 0,
    cost: { mana: 5 },
    description: 'Raises Defense by 50% for 2 turns.',
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },

  // ---- Phase 7 expansion enemies ----
  arrowShot: {
    id: 'arrowShot',
    name: 'Arrow Shot',
    type: 'physical',
    baseValue: 18,
    description: 'A precise ranged attack. Moderate physical damage.',
  },
  huntersMark: {
    id: 'huntersMark',
    name: "Hunter's Mark",
    type: 'debuff',
    baseValue: 0,
    description: "Marks the target, lowering Defense by 30% for 2 turns.",
    effect: { target: 'enemy', stat: 'defense', multiplier: 0.7, turns: 2 },
  },
  stoneFist: {
    id: 'stoneFist',
    name: 'Stone Fist',
    type: 'physical',
    baseValue: 24,
    description: 'A crushing stone blow. Heavy physical damage.',
  },
  graniteSkin: {
    id: 'graniteSkin',
    name: 'Granite Skin',
    type: 'buff',
    baseValue: 0,
    description: 'Hardens the caster, raising Defense by 50% for 2 turns.',
    effect: { target: 'self', stat: 'defense', multiplier: 1.5, turns: 2 },
  },
};

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export const heroClasses = {
  knight: {
    id: 'knight',
    name: 'Knight',
    baseStats: { health: 110, mana: 30, attack: 15, defense: 12, magic: 8 },
    defaultMoves: ['slash', 'shieldUp', 'battleCry', 'secondWind'],
    levelUpGrowth: { health: 12, mana: 4, attack: 2, defense: 3, magic: 1 },
    sprite: 'knight.png',
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    baseStats: { health: 85, mana: 35, attack: 18, defense: 8, magic: 10 },
    defaultMoves: ['slash', 'dirtyKick', 'pounce', 'secondWind'],
    levelUpGrowth: { health: 8, mana: 5, attack: 4, defense: 1, magic: 1 },
    sprite: 'rogue.png',
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    baseStats: { health: 75, mana: 55, attack: 8, defense: 7, magic: 20 },
    defaultMoves: ['firebolt', 'arcaneSurge', 'manaDrain', 'secondWind'],
    levelUpGrowth: { health: 6, mana: 10, attack: 1, defense: 1, magic: 4 },
    sprite: 'mage.png',
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    baseStats: { health: 95, mana: 40, attack: 16, defense: 9, magic: 12 },
    defaultMoves: ['rustyBlade', 'webThrow', 'battleCry', 'secondWind'],
    levelUpGrowth: { health: 10, mana: 6, attack: 3, defense: 2, magic: 2 },
    sprite: 'ranger.png',
  },
};

export const hero = heroClasses.knight;

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
  bandit_archer: {
    id: 'bandit_archer',
    name: 'Bandit Archer',
    order: 6,
    stats: { health: 95, attack: 17, defense: 10, magic: 6 },
    moves: ['arrowShot', 'huntersMark', 'dirtyKick', 'secondWind'],
    xpReward: 160,
    sprite: 'bandit_archer.png',
  },
  stone_golem: {
    id: 'stone_golem',
    name: 'Stone Golem',
    order: 7,
    stats: { health: 150, attack: 17, defense: 18, magic: 5 },
    moves: ['stoneFist', 'graniteSkin', 'headbutt', 'dragonScales'],
    xpReward: 275,
    sprite: 'stone_golem.png',
  },
};
