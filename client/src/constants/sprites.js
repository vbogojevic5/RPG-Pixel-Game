/**
 * Central sprite registry.
 *
 * A sprite entry is one of:
 *   { image: '/path.png', emoji, tint }
 *       Single-image sprite. Rendered as <img>. Falls back to emoji.
 *
 *   { sheet: '/sheet.png', sx, sy, size, emoji, tint }
 *       One cell from a sprite sheet (32rogues style). Rendered as a
 *       <div> with background-image + background-position so the same
 *       sheet file is reused across many sprites.
 *
 * All paths are relative to `/client/public/` (Vite serves that as the
 * site root). If the file is missing the emoji + color chip is used so
 * the UI always remains readable.
 *
 * NOTE on 32rogues license: assets are licensed for commercial/
 * non-commercial use EXCEPT generative AI projects. The player has
 * downloaded these themselves and accepted that constraint.
 */

// The zip was extracted under /client/public/assets/32rogues/32rogues/
const ROGUES_SHEET   = '/assets/32rogues/32rogues/rogues.png';
const MONSTERS_SHEET = '/assets/32rogues/32rogues/monsters.png';
const TILES_SHEET    = '/assets/32rogues/32rogues/tiles.png';

// Sprite cell size on the original sheet (32×32 pixels).
const CELL = 32;

// Helper: pack a sheet + grid cell into a sprite entry.
const sheetCell = (sheet, col, row, extra = {}) => ({
  sheet,
  sx: col * CELL,
  sy: row * CELL,
  size: CELL,
  ...extra,
});

/**
 * Character sprite coordinates based on 32rogues 0.5.0 sheet legends
 * (see /client/public/assets/32rogues/32rogues/rogues.txt and
 * monsters.txt). Rows are 0-indexed from the top of the sheet; columns
 * are 0-indexed from the left. Feel free to retune these if a
 * different pose fits the game better — just edit this file.
 */
export const CHARACTER_SPRITES = {
  // Hero — Knight (rogues.png row "2" = y index 1, col "a" = 0)
  knight: {
    ...sheetCell(ROGUES_SHEET, 0, 1),
    emoji: '🛡️',
    tint: '#c8a24a',
  },

  // ---- Monsters (monsters.png) ----
  // Goblin Warrior — "goblin brute" (row 1, col h)
  goblin_warrior: {
    ...sheetCell(MONSTERS_SHEET, 7, 0),
    emoji: '👺',
    tint: '#7aa64a',
  },
  // Giant Spider — "giant spider" (row 7, col i)
  giant_spider: {
    ...sheetCell(MONSTERS_SHEET, 8, 6),
    emoji: '🕷️',
    tint: '#6a4a8d',
  },
  // Goblin Mage — "goblin mage" (row 1, col g)
  goblin_mage: {
    ...sheetCell(MONSTERS_SHEET, 6, 0),
    emoji: '🧙',
    tint: '#4a7aa6',
  },
  // Witch — "hag/witch" (row 6, col e)
  witch: {
    ...sheetCell(MONSTERS_SHEET, 4, 5),
    emoji: '🧙‍♀️',
    tint: '#a24a8d',
  },
  // Dragon — "dragon" (row 9, col c)
  dragon: {
    ...sheetCell(MONSTERS_SHEET, 2, 8),
    emoji: '🐉',
    tint: '#c03848',
  },
};

/**
 * Tiles are pulled from tiles.png. Currently only used in a couple of
 * cosmetic spots on the journey map; the ninja-saga arena uses pure
 * CSS for its background rather than tiling these.
 */
export const TILE_SPRITES = {
  grass:       { ...sheetCell(TILES_SHEET, 1, 7),  emoji: '🌿', color: '#2f4a2a' },
  path:        { ...sheetCell(TILES_SHEET, 1, 8),  emoji: '·',  color: '#5a4636' },
  wall:        { ...sheetCell(TILES_SHEET, 0, 2),  emoji: '▓',  color: '#3a2f4f' },
  tree:        { ...sheetCell(TILES_SHEET, 2, 25), emoji: '🌲', color: '#1f3520' },
  stone_floor: { ...sheetCell(TILES_SHEET, 1, 9),  emoji: '◻', color: '#2a2a30' },
};

export const TILE_SIZE = 40; // default on-screen size (scaled up from 32)

export function characterSprite(id) {
  return CHARACTER_SPRITES[id] ?? { image: null, emoji: '❓', tint: '#888' };
}

export function tileSprite(id) {
  return TILE_SPRITES[id] ?? TILE_SPRITES.grass;
}
