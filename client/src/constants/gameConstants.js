/**
 * Client-side constants.
 * Anything that also lives in the server's config.js should ideally come
 * from `/run/config` so the Game Designer can tweak it without a rebuild.
 * Values here are purely UI / flow-control defaults.
 */

export const SCREENS = {
  AUTH: 'auth',
  MAIN_MENU: 'main_menu',
  CLASS_SELECT: 'class_select',
  LOAD_GAME: 'load_game',
  RUN_MAP: 'run_map',
  BATTLE: 'battle',
  POST_BATTLE: 'post_battle',
  MOVE_MANAGER: 'move_manager',
  INVENTORY: 'inventory',
  SHOP: 'shop',
  VICTORY: 'victory',
};

export const TURN_OWNER = {
  HERO: 'hero',
  MONSTER: 'monster',
};

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const AUTH_STORAGE_KEY = 'rpg_auth_v1';

export const MAX_EQUIPPED_MOVES = 4;
