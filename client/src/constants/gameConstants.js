/** UI flow defaults; tunable gameplay values should come from `/run/config`. */

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

/** In-run UI restore after F5 (session tab only). Cleared on main menu / logout. */
export const RUN_SESSION_STORAGE_KEY = 'rpg_run_session_v1';

export const MAX_EQUIPPED_MOVES = 4;
