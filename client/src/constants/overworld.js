/**
 * Static "journey map" layout.
 *
 * The map is a fixed illustrated scene, not a walkable grid. Five
 * monster nodes are placed along one winding path that the player
 * follows from Goblin Warrior to Dragon. Clicking a node enters the
 * battle for that monster — there is no movement.
 *
 * Node positions are expressed in percentages of the map viewport so
 * the layout scales cleanly with the container. The path is drawn via
 * SVG and routes smoothly through the node points.
 */

export const MAP_SIZE = { width: 960, height: 440 };

export const JOURNEY_NODES = [
  { id: 'goblin_warrior', x:  9, y: 78, label: 'Forest Outskirts' },
  { id: 'giant_spider',   x: 27, y: 32, label: 'Webbed Grove' },
  { id: 'goblin_mage',    x: 48, y: 70, label: 'Cursed Ruins' },
  { id: 'witch',          x: 70, y: 28, label: 'Hag\'s Hut' },
  { id: 'dragon',         x: 91, y: 62, label: "Dragon's Peak" },
];

/**
 * SVG path (in the same 0-100 percentage space) that connects the five
 * nodes. Uses cubic segments for a "parchment trail" feel.
 */
export const JOURNEY_PATH_D =
  // Move through each node with gentle curves.
  'M 9 78 ' +
  'C 16 60, 20 44, 27 32 ' +
  'C 36 22, 40 58, 48 70 ' +
  'C 56 82, 63 40, 70 28 ' +
  'C 78 18, 84 50, 91 62';
