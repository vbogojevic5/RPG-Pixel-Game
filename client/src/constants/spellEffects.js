/**
 * Spell / item visual effect registry.
 *
 * Each move and battle item is mapped to an "effect key" that the battle scene
 * uses to pick a tsparticles emitter preset (and CSS impact theme). Falls back
 * to the move type when nothing more specific is registered.
 */

const MOVE_EFFECT_KEYS = {
  // Knight
  slash: 'slash',
  shieldUp: 'shield',
  battleCry: 'rage',
  secondWind: 'heal',

  // Witch
  shadowBolt: 'shadow',
  drainLife: 'drain',
  curse: 'curse',
  darkPact: 'shadow',

  // Spider
  bite: 'fang',
  webThrow: 'web',
  pounce: 'fang',
  skitter: 'shield',

  // Dragon
  flameBreath: 'fire',
  clawSwipe: 'slash',
  intimidate: 'rage',
  dragonScales: 'shield',

  // Goblin Warrior
  rustyBlade: 'slash',
  dirtyKick: 'dust',
  frenzy: 'rage',
  headbutt: 'impact',

  // Goblin Mage
  firebolt: 'fire',
  arcaneSurge: 'arcane',
  manaDrain: 'arcane',
  hexShield: 'shield',

  // Ranger
  arrowShot: 'arrow',
  huntersMark: 'arcane',

  // Mage / extras
  stoneFist: 'impact',
  graniteSkin: 'shield',
};

const ITEM_EFFECT_KEYS = {
  minorHealthPotion: 'heal',
  manaVial: 'mana',
  cleansingSalt: 'cleanse',
  guardTonic: 'shield',
  fireBomb: 'fire',
};

const TYPE_EFFECT_FALLBACK = {
  physical: 'slash',
  magic: 'arcane',
  heal: 'heal',
  buff: 'shield',
  debuff: 'curse',
  item: 'mana',
};

const STATUS_EFFECT_KEYS = {
  burn: 'fire',
  poison: 'poison',
  bleed: 'blood',
};

export function moveEffectKey(move) {
  if (!move) return 'arcane';
  return MOVE_EFFECT_KEYS[move.id] ?? TYPE_EFFECT_FALLBACK[move.type] ?? 'arcane';
}

export function itemEffectKey(item) {
  if (!item) return 'mana';
  if (ITEM_EFFECT_KEYS[item.id]) return ITEM_EFFECT_KEYS[item.id];
  if (item.effect?.kind === 'heal') return 'heal';
  if (item.effect?.kind === 'restoreMana') return 'mana';
  if (item.effect?.kind === 'cleanseStatuses') return 'cleanse';
  if (item.effect?.kind === 'temporaryBuff') return 'shield';
  if (item.effect?.kind === 'directDamage') return 'fire';
  return 'mana';
}

export function statusBurstKey(kind) {
  return STATUS_EFFECT_KEYS[kind] ?? null;
}

/**
 * tsparticles emitter presets keyed by effect kind.
 *
 * Each preset is a complete `options` object compatible with the slim bundle.
 * They are tuned for short bursts (~600ms) and self-destruct via a single
 * emitter with a small life duration. Emitters render absolutely positioned
 * inside the arena via the consumer.
 */
export const SPELL_EFFECT_PRESETS = {
  fire: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#ffd24d', '#ff8a3c', '#ff4422', '#7a1a08'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.45, max: 1 },
        animation: { enable: true, speed: 1.4, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 6 },
        animation: { enable: true, speed: 5, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.45, max: 0.9 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: -160 },
        speed: { min: 5, max: 10 },
        direction: 'top',
        outModes: { default: 'destroy' },
        decay: 0.04,
      },
    },
    emitters: [
      {
        direction: 'top',
        startCount: 36,
        size: { width: 8, height: 0, mode: 'precise' },
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 70 },
      },
    ],
  },
  shadow: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#7c4dff', '#3a1d80', '#bca2ff', '#1a0a3a'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 0.9 },
        animation: { enable: true, speed: 1.6, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 3, max: 8 },
        animation: { enable: true, speed: 4, startValue: 'min', destroy: 'max' },
      },
      life: { duration: { value: { min: 0.4, max: 0.85 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 3, max: 8 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        direction: 'none',
        startCount: 30,
        size: { width: 0, height: 0, mode: 'precise' },
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  arcane: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#79e6ff', '#b9a4ff', '#ffffff', '#5a8cff'] },
      shape: { type: 'star', options: { star: { sides: 4 } } },
      rotate: {
        value: { min: 0, max: 360 },
        animation: { enable: true, speed: 35, sync: false },
      },
      opacity: {
        value: { min: 0.5, max: 1 },
        animation: { enable: true, speed: 1.5, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 6 },
        animation: { enable: true, speed: 4, startValue: 'min', destroy: 'max' },
      },
      life: { duration: { value: { min: 0.4, max: 0.85 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 4, max: 10 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.04,
      },
    },
    emitters: [
      {
        startCount: 28,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  heal: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#9affc0', '#4fae7a', '#ffffff', '#a8f0c2'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.5, max: 1 },
        animation: { enable: true, speed: 1.4, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.6, max: 1.1 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: -90 },
        speed: { min: 1.5, max: 4 },
        direction: 'top',
        outModes: { default: 'destroy' },
        decay: 0.02,
      },
    },
    emitters: [
      {
        direction: 'top',
        startCount: 30,
        size: { width: 22, height: 12, mode: 'precise' },
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 80 },
      },
    ],
  },
  mana: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#7fc8ff', '#3368d8', '#cfe9ff'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 1 },
        animation: { enable: true, speed: 1.6, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.55, max: 1 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: -100 },
        speed: { min: 2, max: 5 },
        direction: 'top',
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        direction: 'top',
        startCount: 28,
        size: { width: 18, height: 10, mode: 'precise' },
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 80 },
      },
    ],
  },
  shield: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#f2cf72', '#c8a24a', '#fff5d2'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 0.9 },
        animation: { enable: true, speed: 2, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.4, max: 0.7 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 2, max: 5 },
        direction: 'outside',
        outModes: { default: 'destroy' },
        decay: 0.04,
      },
    },
    emitters: [
      {
        startCount: 26,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 60 },
      },
    ],
  },
  curse: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#a24a6b', '#5a1f3a', '#e07ab4'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 0.9 },
        animation: { enable: true, speed: 1.5, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 6 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.5, max: 1 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: 60 },
        speed: { min: 2, max: 5 },
        direction: 'bottom',
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        startCount: 24,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 30 },
      },
    ],
  },
  poison: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#9bd87f', '#34562e', '#cdf07a'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.45, max: 1 },
        animation: { enable: true, speed: 1.4, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 3, max: 7 },
        animation: { enable: true, speed: 3, startValue: 'min', destroy: 'max' },
      },
      life: { duration: { value: { min: 0.5, max: 1 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: -60 },
        speed: { min: 1.5, max: 4 },
        direction: 'top',
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        startCount: 24,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 60 },
      },
    ],
  },
  blood: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#e85a6d', '#8a2636', '#c0384b'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.55, max: 1 },
        animation: { enable: true, speed: 1.7, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.4, max: 0.75 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: 240 },
        speed: { min: 4, max: 9 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.02,
      },
    },
    emitters: [
      {
        startCount: 26,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  slash: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#fff7d9', '#f2cf72', '#ffae5c'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 0.95 },
        animation: { enable: true, speed: 2.4, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 1, max: 3 },
        animation: { enable: true, speed: 4, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.25, max: 0.55 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 7, max: 14 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.05,
      },
    },
    emitters: [
      {
        startCount: 22,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  impact: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#fff5d2', '#c8a24a', '#825e2a', '#3a2a14'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 0.95 },
        animation: { enable: true, speed: 2, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.35, max: 0.7 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 5, max: 11 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.04,
      },
    },
    emitters: [
      {
        startCount: 24,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  fang: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#e85a6d', '#fff7d9', '#9c2c3a'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 0.95 },
        animation: { enable: true, speed: 2, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 4 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.3, max: 0.6 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 6, max: 12 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.04,
      },
    },
    emitters: [
      {
        startCount: 22,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  web: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#dfe9ff', '#a3b0d0', '#6f7a99'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.3, max: 0.85 },
        animation: { enable: true, speed: 1.4, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 1, max: 3 },
        animation: { enable: true, speed: 2, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.5, max: 0.95 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 1.5, max: 4 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        startCount: 22,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  rage: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#ff8a3c', '#c0384b', '#ffd24d'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 1 },
        animation: { enable: true, speed: 1.7, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.4, max: 0.85 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: -110 },
        speed: { min: 2, max: 5 },
        direction: 'top',
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        direction: 'top',
        startCount: 24,
        size: { width: 12, height: 0, mode: 'precise' },
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 70 },
      },
    ],
  },
  drain: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#e85a6d', '#7c4dff', '#3a1d80'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.5, max: 1 },
        animation: { enable: true, speed: 1.5, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.45, max: 0.9 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 3, max: 7 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        startCount: 24,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  cleanse: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#ffffff', '#fff7d9', '#d8e1ff'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.5, max: 1 },
        animation: { enable: true, speed: 2, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 1, max: 4 },
        animation: { enable: true, speed: 4, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.45, max: 0.85 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: -120 },
        speed: { min: 2, max: 5 },
        direction: 'top',
        outModes: { default: 'destroy' },
        decay: 0.03,
      },
    },
    emitters: [
      {
        direction: 'top',
        startCount: 30,
        size: { width: 24, height: 4, mode: 'precise' },
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 80 },
      },
    ],
  },
  arrow: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#dfe9ff', '#9fd0ff', '#fff7d9'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.5, max: 1 },
        animation: { enable: true, speed: 2.2, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 1, max: 3 },
        animation: { enable: true, speed: 4, startValue: 'max', destroy: 'min' },
      },
      life: { duration: { value: { min: 0.25, max: 0.5 } }, count: 1 },
      move: {
        enable: true,
        speed: { min: 8, max: 14 },
        direction: 'none',
        random: true,
        outModes: { default: 'destroy' },
        decay: 0.05,
      },
    },
    emitters: [
      {
        startCount: 18,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 50 },
      },
    ],
  },
  dust: {
    fpsLimit: 60,
    fullScreen: { enable: false },
    detectRetina: true,
    particles: {
      number: { value: 0 },
      color: { value: ['#c8b58a', '#a09064', '#665535'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.3, max: 0.75 },
        animation: { enable: true, speed: 1.6, startValue: 'max', destroy: 'min' },
      },
      size: {
        value: { min: 2, max: 5 },
        animation: { enable: true, speed: 3, startValue: 'min', destroy: 'max' },
      },
      life: { duration: { value: { min: 0.4, max: 0.85 } }, count: 1 },
      move: {
        enable: true,
        gravity: { enable: true, acceleration: -50 },
        speed: { min: 2, max: 5 },
        direction: 'top',
        outModes: { default: 'destroy' },
        decay: 0.04,
      },
    },
    emitters: [
      {
        startCount: 22,
        rate: { quantity: 0, delay: 0 },
        life: { count: 1, duration: 0.05 },
        position: { x: 50, y: 80 },
      },
    ],
  },
};

export function getEffectPreset(key) {
  return SPELL_EFFECT_PRESETS[key] ?? SPELL_EFFECT_PRESETS.arcane;
}
