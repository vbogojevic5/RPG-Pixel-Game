const AUDIO_BASE = '/assets/audio';

export const MUSIC_CONTEXTS = {
  TITLE: 'title',
  JOURNEY: 'journey',
  BATTLE: 'battle',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
};

export const MUSIC_TRACKS = {
  [MUSIC_CONTEXTS.TITLE]: {
    src: `${AUDIO_BASE}/music/glizzy-elf-forest/forest-loop.wav`,
    loop: true,
    volume: 0.42,
  },
  [MUSIC_CONTEXTS.JOURNEY]: {
    src: `${AUDIO_BASE}/music/glizzy-elf-forest/forest-loop.wav`,
    loop: true,
    volume: 0.5,
  },
  [MUSIC_CONTEXTS.BATTLE]: {
    src: `${AUDIO_BASE}/music/glizzy-elf-forest/battle-loop.wav`,
    loop: true,
    volume: 0.46,
  },
  [MUSIC_CONTEXTS.VICTORY]: {
    src: `${AUDIO_BASE}/music/glizzy-elf-forest/victory-loop.wav`,
    loop: true,
    volume: 0.5,
  },
  [MUSIC_CONTEXTS.DEFEAT]: {
    src: `${AUDIO_BASE}/music/glizzy-elf-forest/battle-loop.wav`,
    loop: true,
    volume: 0.25,
  },
};

const SFX_BASE = `${AUDIO_BASE}/sfx/kenney-rpg-audio/OGG`;

export const SFX = {
  buttonHover: { src: `${SFX_BASE}/cloth1.ogg`, volume: 0.25 },
  buttonClick: { src: `${SFX_BASE}/metalClick.ogg`, volume: 0.45 },
  abilityClick: { src: `${SFX_BASE}/drawKnife1.ogg`, volume: 0.5 },
  saveConfirm: { src: `${SFX_BASE}/handleCoins.ogg`, volume: 0.55 },
  loadConfirm: { src: `${SFX_BASE}/bookOpen.ogg`, volume: 0.5 },
  equip: { src: `${SFX_BASE}/clothBelt.ogg`, volume: 0.5 },
  unequip: { src: `${SFX_BASE}/dropLeather.ogg`, volume: 0.5 },
  modalOpen: { src: `${SFX_BASE}/bookFlip1.ogg`, volume: 0.35 },
  modalClose: { src: `${SFX_BASE}/bookClose.ogg`, volume: 0.35 },
  physicalHit: { src: `${SFX_BASE}/knifeSlice.ogg`, volume: 0.55 },
  magicCast: { src: `${SFX_BASE}/chop.ogg`, volume: 0.4 },
  heal: { src: `${SFX_BASE}/cloth2.ogg`, volume: 0.42 },
  buff: { src: `${SFX_BASE}/metalLatch.ogg`, volume: 0.4 },
  debuff: { src: `${SFX_BASE}/creak2.ogg`, volume: 0.45 },
  statusTick: { src: `${SFX_BASE}/creak3.ogg`, volume: 0.35 },
  victory: { src: `${SFX_BASE}/handleCoins2.ogg`, volume: 0.6 },
  defeat: { src: `${SFX_BASE}/doorClose_2.ogg`, volume: 0.5 },
};

export const AUDIO_STORAGE_KEY = 'rpg_audio_prefs_v1';
