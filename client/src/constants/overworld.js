/**
 * Static "journey map" layout.
 *
 * The map is a fixed illustrated scene, not a walkable grid. Five
 * monster nodes are placed along one winding path that the player
 * follows from Goblin Warrior to Dragon. Clicking a node enters the
 * battle for that monster — there is no movement.
 *
 * Node positions in config use x/y in 0–100 space. For long runs the
 * client splits nodes into pages (see MAP_PAGE_SIZE), lays them out on
 * one continuous scroll with global gx in 0–(100 * numPages), and snaps
 * the viewport with arrow paging.
 */

export const MAP_SIZE = { width: 960, height: 440 };

/** Max battle/shop nodes visible per map page (arrow navigation). */
export const MAP_PAGE_SIZE = 5;

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

export const JOURNEY_PATH_SEGMENTS = [
  { from: 'goblin_warrior', to: 'giant_spider', d: 'M 9 78 C 16 60, 20 44, 27 32' },
  { from: 'giant_spider', to: 'goblin_mage', d: 'M 27 32 C 36 22, 40 58, 48 70' },
  { from: 'goblin_mage', to: 'witch', d: 'M 48 70 C 56 82, 63 40, 70 28' },
  { from: 'witch', to: 'dragon', d: 'M 70 28 C 78 18, 84 50, 91 62' },
];

export function mapNodes(config) {
  return Array.isArray(config?.mapConfig?.nodes) && config.mapConfig.nodes.length > 0
    ? config.mapConfig.nodes
    : JOURNEY_NODES.map((node) => ({
      ...node,
      type: node.id === 'dragon' ? 'boss' : 'battle',
      monsterId: node.id,
      biomeId: 'forest',
      children: JOURNEY_PATH_SEGMENTS
        .filter((segment) => segment.from === node.id)
        .map((segment) => segment.to),
    }));
}

export function mapSize(config) {
  return config?.mapConfig?.size ?? MAP_SIZE;
}

export function mapBossNode(config) {
  const nodes = mapNodes(config);
  return nodes.find((node) => node.id === config?.mapConfig?.bossNodeId)
    ?? nodes.find((node) => node.type === 'boss')
    ?? nodes[nodes.length - 1]
    ?? null;
}

export function mapParents(nodes) {
  const parents = new Map(nodes.map((node) => [node.id, []]));
  for (const node of nodes) {
    for (const childId of node.children ?? []) {
      parents.set(childId, [...(parents.get(childId) ?? []), node.id]);
    }
  }
  return parents;
}

/**
 * Map nodes the player can interact with (battles + shops), using the full graph.
 * @param {object[]} monsters - from run config (valid monster ids)
 */
export function playableMapNodeIds(worldNodes, monsters = []) {
  const monsterIds = new Set((monsters ?? []).map((m) => m.id));
  const ids = new Set();
  for (const node of worldNodes) {
    if (node.type === 'shop') {
      ids.add(node.id);
      continue;
    }
    if (node.monsterId && monsterIds.has(node.monsterId)) {
      ids.add(node.id);
    }
  }
  return ids;
}

/**
 * A node is unlocked when it is not cleared and (it is a graph root, OR any single parent
 * is cleared). Shops and battles use the same rule — no "all parents" requirement.
 * After a shop is cleared, its direct playable children are always unlocked (covers edge cases
 * where graph/parent data and rendered nodes could drift).
 */
export function computeAvailableMapNodeIds(worldNodes, clearedNodeIds, monsters = []) {
  const cleared = new Set(clearedNodeIds ?? []);
  const parentsByNode = mapParents(worldNodes);
  const playable = playableMapNodeIds(worldNodes, monsters);
  const available = new Set();

  for (const id of playable) {
    if (cleared.has(id)) continue;
    const parents = parentsByNode.get(id) ?? [];
    if (parents.length === 0 || parents.some((pid) => cleared.has(pid))) {
      available.add(id);
    }
  }

  for (const node of worldNodes) {
    if (node.type !== 'shop' || !cleared.has(node.id)) continue;
    for (const childId of node.children ?? []) {
      if (cleared.has(childId)) continue;
      if (playable.has(childId)) available.add(childId);
    }
  }

  return available;
}

export function mapSegments(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const segments = [];
  for (const from of nodes) {
    for (const childId of from.children ?? []) {
      const to = byId.get(childId);
      if (!to) continue;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 8;
      segments.push({
        from: from.id,
        to: to.id,
        d: `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`,
      });
    }
  }
  return segments;
}

/**
 * Reachable node order from start ids (BFS). Unreachable nodes append in
 * config order so nothing is dropped on odd graphs.
 */
export function orderMapNodesBfs(nodes, startNodeIds) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = [];
  const seen = new Set();
  const queue = [...(startNodeIds ?? []).filter((id) => byId.has(id))];
  if (queue.length === 0 && nodes[0]) {
    queue.push(nodes[0].id);
  }
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const n = byId.get(id);
    if (!n) continue;
    out.push(n);
    for (const c of n.children ?? []) {
      if (!seen.has(c)) queue.push(c);
    }
  }
  for (const n of nodes) {
    if (!seen.has(n.id)) out.push(n);
  }
  return out;
}

/**
 * Chunk BFS order into pages of at most `maxPerPage`; assign x within
 * each page (spread by original x) and gx across the full scroll.
 */
export function layoutMapPages(orderedNodes, maxPerPage = MAP_PAGE_SIZE) {
  const pages = [];
  for (let i = 0; i < orderedNodes.length; i += maxPerPage) {
    pages.push(orderedNodes.slice(i, i + maxPerPage));
  }
  if (pages.length === 0) {
    return { nodesWithLayout: [], numPages: 1 };
  }
  const enriched = [];
  pages.forEach((chunk, pageIndex) => {
    const sortedChunk = [...chunk].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
    const k = sortedChunk.length;
    sortedChunk.forEach((node, rank) => {
      const rel = k === 1 ? 0.5 : rank / (k - 1);
      const xPage = 12 + rel * 76;
      const gx = pageIndex * 100 + xPage;
      const gy = node.y ?? 50;
      enriched.push({
        ...node,
        pageIndex,
        xPage,
        gx,
        gy,
      });
    });
  });
  return { nodesWithLayout: enriched, numPages: Math.max(1, pages.length) };
}

/** Path segments in global coordinates (viewBox 0 0 100*numPages 100). */
export function mapSegmentsGlobal(layoutNodes) {
  const byId = new Map(layoutNodes.map((node) => [node.id, node]));
  const segments = [];
  for (const from of layoutNodes) {
    for (const childId of from.children ?? []) {
      const to = byId.get(childId);
      if (!to) continue;
      const midX = (from.gx + to.gx) / 2;
      const midY = (from.gy + to.gy) / 2 - 8;
      segments.push({
        from: from.id,
        to: to.id,
        d: `M ${from.gx} ${from.gy} Q ${midX} ${midY} ${to.gx} ${to.gy}`,
      });
    }
  }
  return segments;
}
