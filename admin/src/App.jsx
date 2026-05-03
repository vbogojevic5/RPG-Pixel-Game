import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './services/api.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'saves', label: 'Saves' },
  { id: 'battles', label: 'Battle Logs' },
  { id: 'tuning', label: 'Tuning' },
];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'n/a';
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeHeroMoveSlots(existingIds, movesMap, slotCount = 4) {
  const keys = Object.keys(movesMap ?? {});
  const fallback = keys[0] ?? '';
  const src = [...(existingIds ?? [])];
  const out = [];
  for (let i = 0; i < slotCount; i++) {
    const id = src[i];
    out.push(id && movesMap?.[id] ? id : fallback);
  }
  return out;
}

function nextMonsterDraft(config) {
  const monsters = config?.monsters ?? [];
  const firstMonster = monsters[0] ?? {};
  const firstMoves = Object.keys(config?.moves ?? {}).slice(0, 4);
  const maxOrder = monsters.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
  return {
    id: 'new_monster',
    name: 'New Monster',
    order: Math.max(1, maxOrder + 1),
    xpReward: firstMonster.xpReward ?? 100,
    sprite: '',
    stats: { health: 90, mana: 0, attack: 12, defense: 10, magic: 8 },
    moves: firstMonster.moves?.slice(0, 4) ?? firstMoves,
  };
}

/**
 * Insert a battle node into MAP_CONFIG and link it from one or more parents (edges drawn on the journey map).
 */
const MAX_MAP_PARENT_SLOTS = 6;

function getMapSnapshot(config) {
  const raw = config?.constants?.MAP_CONFIG ?? config?.mapConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  try {
    return structuredClone(raw);
  } catch {
    return JSON.parse(JSON.stringify(raw));
  }
}

function computeMapParents(nodes, childNodeId) {
  const out = [];
  for (const n of nodes ?? []) {
    if ((n.children ?? []).includes(childNodeId)) out.push(n.id);
  }
  return out;
}

function mapNodeSelectLabel(node, ctx) {
  const merchants = new Map((ctx?.merchants ?? []).map((m) => [m.id, m]));
  const monstersById = new Map((ctx?.monsters ?? []).map((m) => [m.id, m]));
  if (node.type === 'shop') {
    const merch = merchants.get(node.merchantId);
    return `${node.label ?? node.id} — ${merch?.name ?? 'Shop'} (shop)`;
  }
  const m = monstersById.get(node.monsterId);
  return `${node.label ?? node.id} — ${m?.name ?? node.monsterId} (${titleCase(node.type)})`;
}

function addMonsterNodeToMap(mapConfig, { nodeId, monsterId, parentIds, label, type = 'battle', biomeId = 'forest', x = 52, y = 55 }) {
  const base =
    mapConfig && typeof mapConfig === 'object' && !Array.isArray(mapConfig)
      ? { ...mapConfig, nodes: [...(mapConfig.nodes ?? [])] }
      : { version: 1, nodes: [], startNodeIds: [], bossNodeId: null };
  const nodes = base.nodes.map((n) => ({ ...n, children: [...(n.children ?? [])] }));
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.has(nodeId)) {
    throw new Error(`Map node id "${nodeId}" already exists. Use a unique monster id or remove the existing map node first.`);
  }
  for (const pid of parentIds) {
    if (!ids.has(pid)) throw new Error(`Unknown map parent node "${pid}".`);
  }
  nodes.push({
    id: nodeId,
    type,
    label: label || nodeId,
    biomeId,
    monsterId,
    x,
    y,
    children: [],
  });
  for (const pid of parentIds) {
    const parent = nodes.find((n) => n.id === pid);
    if (parent && !parent.children.includes(nodeId)) parent.children.push(nodeId);
  }
  return { ...base, nodes };
}

function relinkMonsterMapParents(mapConfig, encounterNodeId, newParentIds) {
  const base =
    mapConfig && typeof mapConfig === 'object' && !Array.isArray(mapConfig)
      ? { ...mapConfig, nodes: [...(mapConfig.nodes ?? [])] }
      : { version: 1, nodes: [], startNodeIds: [], bossNodeId: null };
  const nodes = base.nodes.map((n) => ({ ...n, children: [...(n.children ?? [])] }));
  const ids = new Set(nodes.map((n) => n.id));
  if (!ids.has(encounterNodeId)) {
    throw new Error(`Map node "${encounterNodeId}" was not found in MAP_CONFIG.`);
  }
  const parentIds = [...new Set(newParentIds.filter(Boolean))];
  for (const pid of parentIds) {
    if (!ids.has(pid)) throw new Error(`Unknown map parent node "${pid}".`);
    if (pid === encounterNodeId) throw new Error('A node cannot be its own parent.');
  }
  for (const n of nodes) {
    n.children = (n.children ?? []).filter((c) => c !== encounterNodeId);
  }
  for (const pid of parentIds) {
    const parent = nodes.find((n) => n.id === pid);
    if (parent && !parent.children.includes(encounterNodeId)) parent.children.push(encounterNodeId);
  }
  return { ...base, nodes };
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return (
    <div className="empty-state">
      <p>{children}</p>
    </div>
  );
}

function NumberField({ label, value, min = 0, max = 200, onChange }) {
  const numericValue = Number.isFinite(value) ? value : 0;
  return (
    <label className="field">
      <span>{label}</span>
      <div className="range-row">
        <input
          type="range"
          min={min}
          max={max}
          value={numericValue}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          value={numericValue}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </label>
  );
}

function StatFields({ stats, onChange, max = 220 }) {
  return (
    <div className="stat-grid">
      {['health', 'mana', 'attack', 'defense', 'magic'].map((stat) => (
        <NumberField
          key={stat}
          label={titleCase(stat)}
          value={stats?.[stat] ?? 0}
          max={stat === 'health' ? max : stat === 'mana' ? 140 : 80}
          onChange={(value) => onChange({ ...stats, [stat]: value })}
        />
      ))}
    </div>
  );
}

function LoginScreen({ onLogin, error, busy }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="login-page">
      <form
        className="login-card"
        onSubmit={(event) => {
          event.preventDefault();
          onLogin(username, password);
        }}
      >
        <p className="eyebrow">Knight's Gauntlet</p>
        <h1>Admin Console</h1>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="login-card__actions">
          <button type="submit" className="login-card__submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </main>
  );
}

function Overview({ data, users, saves }) {
  const stats = data?.stats ?? {};
  const winRate = stats.battles ? Math.round(((stats.wins ?? 0) / stats.battles) * 100) : 0;
  const statCards = [
    ['Total Users', stats.users ?? 0],
    ['Saved Runs', stats.saves ?? 0],
    ['Battle Runs', stats.battles ?? 0],
    ['Win Rate', `${winRate}%`],
    ['Monsters', stats.monsters ?? 0],
    ['Moves', stats.moves ?? 0],
  ];

  return (
    <div className="overview-layout">
      <div className="metric-grid">
        {statCards.map(([label, value]) => (
          <Card title={label} key={label} className="metric-card">
            <p className="metric">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid grid--two">
        <Card title="Recent Users">
          <div className="stack">
            {(users ?? []).slice(0, 3).map((user) => (
              <article className="row-card" key={user.id}>
                <strong>{user.username}</strong>
                <span>{titleCase(user.role)} - {formatDate(user.createdAt)}</span>
              </article>
            ))}
            {(users ?? []).length === 0 && <EmptyState>No users found yet.</EmptyState>}
          </div>
        </Card>
        <Card title="Recent Saves">
          <div className="stack">
            {(saves ?? []).slice(0, 3).map((save) => (
              <article className="row-card" key={save.id}>
                <strong>{save.name}</strong>
                <span>{save.player?.username ?? 'Unknown'} - {formatDate(save.updatedAt)}</span>
              </article>
            ))}
            {(saves ?? []).length === 0 && <EmptyState>No save slots have been created.</EmptyState>}
          </div>
        </Card>
        <Card title="Recent Battles">
          <div className="stack">
            {(data?.recentBattles ?? []).slice(0, 3).map((battle) => (
              <article className="row-card" key={battle.id}>
                <strong>{battle.player?.username ?? 'Unknown'} vs {battle.monsterName}</strong>
                <span>{titleCase(battle.outcome)} - {battle.turns} Turns - {formatDate(battle.endedAt)}</span>
              </article>
            ))}
            {(data?.recentBattles ?? []).length === 0 && (
              <EmptyState>No battle logs yet. Finish a fight in the game client to populate this.</EmptyState>
            )}
          </div>
        </Card>
        <Card title="Recent Admin Changes">
          <div className="stack">
            {(data?.recentAudits ?? []).slice(0, 3).map((audit) => (
              <article className="row-card" key={audit.id}>
                <strong>{titleCase(audit.entityType)}: {audit.entityId}</strong>
                <span>{audit.admin?.username ?? 'Admin'} - {formatDate(audit.createdAt)}</span>
              </article>
            ))}
            {(data?.recentAudits ?? []).length === 0 && <EmptyState>No tuning changes recorded yet.</EmptyState>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Users({ users }) {
  return (
    <Card title="Users">
      <div className="stack">
        {users.map((user) => (
          <article className="row-card" key={user.id}>
            <strong>{user.username}</strong>
            <span className="users-list__meta">
              <span className={`pill pill--${user.role}`}>{titleCase(user.role)}</span>
              <span className="users-list__joined">{formatDate(user.createdAt)}</span>
            </span>
          </article>
        ))}
        {users.length === 0 && <EmptyState>No users found.</EmptyState>}
      </div>
    </Card>
  );
}

function Saves({ saves }) {
  const [userFilter, setUserFilter] = useState('');
  const filteredSaves = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return saves;
    return saves.filter((s) => (s.player?.username ?? '').toLowerCase().includes(q));
  }, [saves, userFilter]);

  return (
    <Card title="Saves">
      <label className="field battles-filter">
        <span>Filter by username</span>
        <input
          type="search"
          value={userFilter}
          onChange={(event) => setUserFilter(event.target.value)}
          placeholder="Type to match player name…"
          autoComplete="off"
        />
      </label>
      <div className="stack">
        {filteredSaves.map((save) => (
          <article className="row-card" key={save.id}>
            <strong>{save.name} by {save.player?.username ?? 'unknown'}</strong>
            <span>
              Level {save.heroState?.level ?? '?'} - Cleared {save.heroState?.mapProgress?.clearedNodeIds?.length ?? save.defeatedMonsterIds?.length ?? 0} nodes - Updated {formatDate(save.updatedAt)}
            </span>
          </article>
        ))}
        {saves.length === 0 && <EmptyState>No saves found.</EmptyState>}
        {saves.length > 0 && filteredSaves.length === 0 && (
          <EmptyState>No saves match this username filter.</EmptyState>
        )}
      </div>
    </Card>
  );
}

function Battles({ battles, selectedBattle, onSelectBattle, onClearSelectedBattle, onRefresh }) {
  const [userFilter, setUserFilter] = useState('');
  const filteredBattles = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return battles;
    return battles.filter((b) => (b.player?.username ?? '').toLowerCase().includes(q));
  }, [battles, userFilter]);

  useEffect(() => {
    if (!selectedBattle) return;
    if (!filteredBattles.some((b) => b.id === selectedBattle.id)) {
      onClearSelectedBattle?.();
    }
  }, [filteredBattles, selectedBattle, onClearSelectedBattle]);

  const activeBattle = selectedBattle;

  return (
    <div className="split split--battles">
      <Card title="Battle Runs">
        <div className="section-toolbar">
          <p>Inspect stored battle summaries and full transcripts.</p>
          <button type="button" className="secondary compact-button" onClick={onRefresh}>Refresh</button>
        </div>
        <label className="field battles-filter">
          <span>Filter by username</span>
          <input
            type="search"
            value={userFilter}
            onChange={(event) => setUserFilter(event.target.value)}
            placeholder="Type to match player name…"
            autoComplete="off"
          />
        </label>
        <div className="stack">
          {filteredBattles.map((battle) => (
            <button className="row-card row-card--button" key={battle.id} onClick={() => onSelectBattle(battle.id)}>
              <strong>{battle.player?.username ?? 'Unknown'} vs {battle.monsterName}</strong>
              <span>{titleCase(battle.outcome)} - XP {battle.xpGained} - {formatDate(battle.endedAt)}</span>
            </button>
          ))}
          {battles.length === 0 && (
            <EmptyState>No battle logs yet. Start and finish a battle in the game client, then refresh.</EmptyState>
          )}
          {battles.length > 0 && filteredBattles.length === 0 && (
            <EmptyState>No battles match this username filter.</EmptyState>
          )}
        </div>
      </Card>
      <Card title="Transcript">
        {activeBattle ? (
          <ol className="transcript">
            {(activeBattle.battleLog ?? []).map((entry, index) => (
              <li key={`${index}-${entry}`}>{entry}</li>
            ))}
            {(activeBattle.battleLog ?? []).length === 0 && <li>No transcript entries were saved.</li>}
          </ol>
        ) : (
          <p>Select a battle to inspect its log.</p>
        )}
      </Card>
    </div>
  );
}

function HeroTuningForm({ hero, moves, busy, onSave }) {
  const moveOptions = Object.values(moves ?? {});
  const [name, setName] = useState(hero?.name ?? '');
  const [sprite, setSprite] = useState(hero?.sprite ?? '');
  const [baseStats, setBaseStats] = useState(hero?.baseStats ?? {});
  const [defaultMoves, setDefaultMoves] = useState(() => normalizeHeroMoveSlots(hero?.defaultMoves, moves));
  const [levelUpGrowth, setLevelUpGrowth] = useState(hero?.levelUpGrowth ?? {
    health: 0,
    mana: 0,
    attack: 0,
    defense: 0,
    magic: 0,
  });

  const updateMoveSlot = (index, value) => {
    setDefaultMoves((list) => list.map((moveId, slot) => (slot === index ? value : moveId)));
  };

  return (
    <form
      className="tuning-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(hero.id, { name, sprite: sprite || null, baseStats, defaultMoves, levelUpGrowth });
      }}
    >
      <div className="tuning-card__header">
        <div>
          <p className="eyebrow">Hero Class</p>
          <h2>{hero?.name ?? 'Hero Config'}</h2>
        </div>
        <button type="submit" disabled={busy}>Save Class</button>
      </div>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Sprite ID</span>
        <input value={sprite ?? ''} onChange={(event) => setSprite(event.target.value)} />
      </label>
      <p className="eyebrow">Base Stats</p>
      <StatFields stats={baseStats} onChange={setBaseStats} />
      <p className="eyebrow">Level-Up Growth</p>
      <StatFields stats={levelUpGrowth} onChange={setLevelUpGrowth} max={40} />
      <p className="eyebrow">Default moves</p>
      <div className="move-slot-grid">
        {defaultMoves.map((moveId, index) => (
          <label className="field" key={`${hero.id}-slot-${index}`}>
            <span>Move slot {index + 1}</span>
            <select value={moveId} onChange={(event) => updateMoveSlot(index, event.target.value)}>
              {moveOptions.map((move) => (
                <option value={move.id} key={move.id}>{move.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </form>
  );
}

function CreateHeroForm({ moves, busy, onCreate }) {
  const moveOptions = Object.values(moves ?? {});
  const [id, setId] = useState('new_hero');
  const [name, setName] = useState('New Hero Class');
  const [sprite, setSprite] = useState('');
  const [baseStats, setBaseStats] = useState({
    health: 100,
    mana: 40,
    attack: 14,
    defense: 12,
    magic: 10,
  });
  const [defaultMoves, setDefaultMoves] = useState(() =>
    normalizeHeroMoveSlots(Object.keys(moves ?? {}).slice(0, 4), moves),
  );
  const [levelUpGrowth, setLevelUpGrowth] = useState({
    health: 6,
    mana: 2,
    attack: 1,
    defense: 1,
    magic: 1,
  });

  const updateMoveSlot = (index, value) => {
    setDefaultMoves((list) => list.map((moveId, slot) => (slot === index ? value : moveId)));
  };

  return (
    <form
      className="tuning-card"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate({
          id: id.trim(),
          name,
          sprite: sprite || null,
          baseStats,
          defaultMoves,
          levelUpGrowth,
        });
      }}
    >
      <div className="tuning-card__header">
        <div>
          <p className="eyebrow">Hero Class</p>
          <h2>Create hero</h2>
        </div>
        <button type="submit" disabled={busy}>Create class</button>
      </div>
      <label className="field">
        <span>Class ID (lowercase_snake)</span>
        <input value={id} onChange={(event) => setId(event.target.value)} />
      </label>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Sprite ID</span>
        <input value={sprite} onChange={(event) => setSprite(event.target.value)} />
      </label>
      <p className="eyebrow">Base Stats</p>
      <StatFields stats={baseStats} onChange={setBaseStats} />
      <p className="eyebrow">Level-Up Growth</p>
      <StatFields stats={levelUpGrowth} onChange={setLevelUpGrowth} max={40} />
      <p className="eyebrow">Default moves</p>
      <div className="move-slot-grid">
        {defaultMoves.map((moveId, index) => (
          <label className="field" key={`new-hero-slot-${index}`}>
            <span>Move slot {index + 1}</span>
            <select value={moveId} onChange={(event) => updateMoveSlot(index, event.target.value)}>
              {moveOptions.map((move) => (
                <option value={move.id} key={move.id}>{move.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </form>
  );
}

function CreateMoveForm({ busy, onCreate }) {
  const [id, setId] = useState('new_move');
  const [name, setName] = useState('New Move');
  const [type, setType] = useState('physical');
  const [baseValue, setBaseValue] = useState(10);
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState({ mana: 0, health: 0 });
  const [statusEnabled, setStatusEnabled] = useState(false);
  const [statusEffect, setStatusEffect] = useState({
    kind: 'bleed',
    chance: 0.25,
    damage: 3,
    turns: 2,
  });

  const updateStatus = (key, value) => setStatusEffect((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="tuning-card"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate({
          id: id.trim(),
          name,
          type,
          baseValue,
          description,
          cost: {
            mana: Math.max(0, Number(cost.mana ?? 0)),
            health: Math.max(0, Number(cost.health ?? 0)),
          },
          effect: null,
          statusEffect: statusEnabled ? statusEffect : null,
        });
      }}
    >
      <div className="tuning-card__header">
        <div>
          <p className="eyebrow">Move</p>
          <h2>Create move</h2>
        </div>
        <button type="submit" disabled={busy}>Create move</button>
      </div>
      <label className="field">
        <span>Move ID (lowercase_snake)</span>
        <input value={id} onChange={(event) => setId(event.target.value)} />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {['physical', 'magic', 'heal', 'buff', 'debuff'].map((item) => (
              <option value={item} key={item}>{titleCase(item)}</option>
            ))}
          </select>
        </label>
      </div>
      <NumberField label="Base Value" value={baseValue} min={0} max={80} onChange={setBaseValue} />
      <div className="form-grid">
        <NumberField
          label="Mana Cost"
          value={cost.mana ?? 0}
          min={0}
          max={40}
          onChange={(value) => setCost((current) => ({ ...current, mana: value }))}
        />
        <NumberField
          label="HP Cost"
          value={cost.health ?? 0}
          min={0}
          max={50}
          onChange={(value) => setCost((current) => ({ ...current, health: value }))}
        />
      </div>
      <label className="field">
        <span>Description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="check-card check-card--wide">
        <input
          type="checkbox"
          checked={statusEnabled}
          onChange={(event) => setStatusEnabled(event.target.checked)}
        />
        <span>Applies Status Effect</span>
      </label>
      {statusEnabled && (
        <div className="form-grid">
          <label className="field">
            <span>Status Kind</span>
            <select value={statusEffect.kind} onChange={(event) => updateStatus('kind', event.target.value)}>
              {['bleed', 'poison', 'burn'].map((kind) => (
                <option value={kind} key={kind}>{titleCase(kind)}</option>
              ))}
            </select>
          </label>
          <NumberField
            label="Chance %"
            value={Math.round((statusEffect.chance ?? 0) * 100)}
            min={0}
            max={100}
            onChange={(value) => updateStatus('chance', value / 100)}
          />
          <NumberField label="Tick Damage" value={statusEffect.damage ?? 1} min={1} max={25} onChange={(value) => updateStatus('damage', value)} />
          <NumberField label="Turns" value={statusEffect.turns ?? 1} min={1} max={6} onChange={(value) => updateStatus('turns', value)} />
        </div>
      )}
    </form>
  );
}

function MonsterFields({
  monster,
  moves,
  busy,
  submitLabel,
  onSave,
  mapLinkMode = 'off',
  mapNodeOptions = [],
  encounterMapNodeId = null,
  initialMapParentIds = [],
  mapConfigSnapshot = null,
  parentLabelContext = { monsters: [], merchants: [] },
}) {
  const moveOptions = Object.values(moves ?? {});
  const [name, setName] = useState(monster?.name ?? '');
  const [id, setId] = useState(monster?.id ?? '');
  const [order, setOrder] = useState(monster?.order ?? 1);
  const [xpReward, setXpReward] = useState(monster?.xpReward ?? 0);
  const [sprite, setSprite] = useState(monster?.sprite ?? '');
  const [stats, setStats] = useState(monster?.stats ?? {});
  const [monsterMoves, setMonsterMoves] = useState(monster?.moves ?? []);
  const parentsKey = (initialMapParentIds ?? []).slice().sort().join('|');
  const [parentSlots, setParentSlots] = useState(() => {
    if (mapLinkMode === 'edit' && initialMapParentIds?.length) {
      return [...new Set(initialMapParentIds)];
    }
    return [''];
  });
  const [mapLinkError, setMapLinkError] = useState(null);

  useEffect(() => {
    if (mapLinkMode !== 'edit') return;
    const next = initialMapParentIds?.length ? [...new Set(initialMapParentIds)] : [''];
    setParentSlots(next);
  }, [mapLinkMode, encounterMapNodeId, parentsKey]);

  const showMapCreate = mapLinkMode === 'create' && mapNodeOptions.length > 0;
  const showMapEdit = mapLinkMode === 'edit' && Boolean(encounterMapNodeId) && mapNodeOptions.length > 0;

  const parentChoices = mapNodeOptions.filter((n) => !encounterMapNodeId || n.id !== encounterMapNodeId);

  const updateMoveSlot = (index, value) => {
    setMonsterMoves((list) => list.map((moveId, slot) => (slot === index ? value : moveId)));
  };

  const setParentSlot = (index, nodeId) => {
    setParentSlots((rows) => rows.map((v, i) => (i === index ? nodeId : v)));
  };

  const addParentRow = () => {
    setParentSlots((rows) => (rows.length < MAX_MAP_PARENT_SLOTS ? [...rows, ''] : rows));
  };

  return (
    <form
      className="tuning-card"
      onSubmit={(event) => {
        event.preventDefault();
        const mapParentIds = [...new Set(parentSlots.filter(Boolean))];
        if (showMapCreate && mapParentIds.length === 0) {
          setMapLinkError('Select at least one parent from the dropdowns (or add another parent row).');
          return;
        }
        if (showMapEdit && mapParentIds.length === 0) {
          setMapLinkError('This encounter must keep at least one parent on the journey map.');
          return;
        }
        if ((showMapCreate || showMapEdit) && !mapConfigSnapshot) {
          setMapLinkError('MAP_CONFIG snapshot missing — refresh admin data and try again.');
          return;
        }
        setMapLinkError(null);
        onSave(monster.id, {
          id,
          name,
          order,
          xpReward,
          sprite: sprite || null,
          stats,
          moves: monsterMoves,
          ...(showMapCreate ? { mapParentIds, mapConfigSnapshot } : {}),
          ...(showMapEdit ? { mapParentIds, encounterMapNodeId, mapConfigSnapshot } : {}),
        });
      }}
    >
      <div className="tuning-card__header">
        <div>
          <p className="eyebrow">Monster</p>
          <h2>{monster.name}</h2>
        </div>
        <button type="submit" disabled={busy}>{submitLabel}</button>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Monster ID</span>
          <input value={id} onChange={(event) => setId(event.target.value)} disabled={Boolean(monster.persisted)} />
        </label>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <NumberField label="Order" value={order} min={1} max={999} onChange={setOrder} />
        <NumberField label="XP Reward" value={xpReward} min={0} max={500} onChange={setXpReward} />
        <label className="field">
          <span>Sprite ID</span>
          <input value={sprite ?? ''} onChange={(event) => setSprite(event.target.value)} />
        </label>
      </div>
      <StatFields stats={stats} onChange={setStats} />
      {(showMapCreate || showMapEdit) && (
        <div className="map-parent-picker">
          <p className="eyebrow">Journey map parents</p>
          <p className="map-parent-picker__hint">
            Each dropdown is one parent. Paths are drawn from every parent you pick; the node unlocks when any parent is cleared.
            {showMapEdit && ' Editing saves MAP_CONFIG on the server.'}
          </p>
          {mapLinkError && <p className="error">{mapLinkError}</p>}
          <div className="map-parent-rows">
            {parentSlots.map((selectedId, idx) => (
              <div key={`parent-slot-${idx}`} className="map-parent-row">
                <label className="field map-parent-row__field">
                  <span>{idx === 0 ? 'Parent' : `Parent ${idx + 1}`}</span>
                  <select
                    value={selectedId}
                    onChange={(e) => setParentSlot(idx, e.target.value)}
                  >
                    <option value="">— Select map node —</option>
                    {parentChoices.map((node) => (
                      <option value={node.id} key={node.id}>{mapNodeSelectLabel(node, parentLabelContext)}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
          {parentSlots.length < MAX_MAP_PARENT_SLOTS && (
            <button type="button" className="secondary compact-button map-parent-add" onClick={addParentRow}>
              Add another parent
            </button>
          )}
        </div>
      )}
      <div className="move-slot-grid">
        {monsterMoves.map((moveId, index) => (
          <label className="field" key={`${monster.id}-slot-${index}`}>
            <span>Move Slot {index + 1}</span>
            <select value={moveId} onChange={(event) => updateMoveSlot(index, event.target.value)}>
              {moveOptions.map((move) => (
                <option value={move.id} key={move.id}>{move.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </form>
  );
}

function MonsterTuningForm({ monster, moves, busy, onSave, config }) {
  const nodes = config?.mapConfig?.nodes ?? [];
  const encounter = nodes.find((n) => n.monsterId === monster.id && n.type !== 'shop');
  const initialParents = encounter ? computeMapParents(nodes, encounter.id) : [];
  return (
    <MonsterFields
      monster={{ ...monster, persisted: true }}
      moves={moves}
      busy={busy}
      submitLabel="Save Monster"
      mapLinkMode={encounter ? 'edit' : 'off'}
      mapNodeOptions={nodes}
      encounterMapNodeId={encounter?.id ?? null}
      initialMapParentIds={initialParents}
      mapConfigSnapshot={getMapSnapshot(config)}
      parentLabelContext={{ monsters: config?.monsters ?? [], merchants: config?.shopConfig?.merchants ?? [] }}
      onSave={(id, payload) => onSave(id, payload)}
    />
  );
}

function CreateMonsterForm({ config, busy, onCreate }) {
  const draft = useMemo(() => nextMonsterDraft(config), [config]);
  return (
    <MonsterFields
      key={`new-${draft.order}-${Object.keys(config?.moves ?? {}).length}`}
      monster={draft}
      moves={config?.moves}
      busy={busy}
      submitLabel="Create Monster"
      mapLinkMode="create"
      mapNodeOptions={config?.mapConfig?.nodes ?? []}
      mapConfigSnapshot={getMapSnapshot(config)}
      parentLabelContext={{ monsters: config?.monsters ?? [], merchants: config?.shopConfig?.merchants ?? [] }}
      onSave={(_id, payload) => onCreate(payload)}
    />
  );
}

function MoveTuningForm({ move, busy, onSave }) {
  const [name, setName] = useState(move?.name ?? '');
  const [type, setType] = useState(move?.type ?? 'physical');
  const [baseValue, setBaseValue] = useState(move?.baseValue ?? 0);
  const [description, setDescription] = useState(move?.description ?? '');
  const [cost, setCost] = useState(move?.cost ?? {});
  const [statusEnabled, setStatusEnabled] = useState(Boolean(move?.statusEffect));
  const [statusEffect, setStatusEffect] = useState(move?.statusEffect ?? {
    kind: 'bleed',
    chance: 0.25,
    damage: 3,
    turns: 2,
  });

  const updateStatus = (key, value) => setStatusEffect((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="tuning-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(move.id, {
          name,
          type,
          baseValue,
          description,
          cost: {
            mana: Math.max(0, Number(cost.mana ?? 0)),
            health: Math.max(0, Number(cost.health ?? 0)),
          },
          effect: move.effect ?? null,
          statusEffect: statusEnabled ? statusEffect : null,
        });
      }}
    >
      <div className="tuning-card__header">
        <div>
          <p className="eyebrow">Move</p>
          <h2>{move.name}</h2>
        </div>
        <button type="submit" disabled={busy}>Save Move</button>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {['physical', 'magic', 'heal', 'buff', 'debuff'].map((item) => (
              <option value={item} key={item}>{titleCase(item)}</option>
            ))}
          </select>
        </label>
      </div>
      <NumberField label="Base Value" value={baseValue} min={0} max={80} onChange={setBaseValue} />
      <div className="form-grid">
        <NumberField
          label="Mana Cost"
          value={cost.mana ?? 0}
          min={0}
          max={40}
          onChange={(value) => setCost((current) => ({ ...current, mana: value }))}
        />
        <NumberField
          label="HP Cost"
          value={cost.health ?? 0}
          min={0}
          max={50}
          onChange={(value) => setCost((current) => ({ ...current, health: value }))}
        />
      </div>
      <label className="field">
        <span>Description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="check-card check-card--wide">
        <input
          type="checkbox"
          checked={statusEnabled}
          onChange={(event) => setStatusEnabled(event.target.checked)}
        />
        <span>Applies Status Effect</span>
      </label>
      {statusEnabled && (
        <div className="form-grid">
          <label className="field">
            <span>Status Kind</span>
            <select value={statusEffect.kind} onChange={(event) => updateStatus('kind', event.target.value)}>
              {['bleed', 'poison', 'burn'].map((kind) => (
                <option value={kind} key={kind}>{titleCase(kind)}</option>
              ))}
            </select>
          </label>
          <NumberField
            label="Chance %"
            value={Math.round((statusEffect.chance ?? 0) * 100)}
            min={0}
            max={100}
            onChange={(value) => updateStatus('chance', value / 100)}
          />
          <NumberField label="Tick Damage" value={statusEffect.damage ?? 1} min={1} max={25} onChange={(value) => updateStatus('damage', value)} />
          <NumberField label="Turns" value={statusEffect.turns ?? 1} min={1} max={6} onChange={(value) => updateStatus('turns', value)} />
        </div>
      )}
    </form>
  );
}

function Tuning({
  config,
  onCreateMonster,
  onCreateHero,
  onCreateMove,
  onSaveMonster,
  onSaveMove,
  onSaveHero,
  busy,
}) {
  const heroClasses = Object.values(config?.heroClasses ?? (config?.hero ? { [config.hero.id]: config.hero } : {}));
  const monsterIds = (config?.monsters ?? []).map((monster) => monster.id);
  const moveIds = Object.keys(config?.moves ?? {});
  const [heroMode, setHeroMode] = useState('edit');
  const [monsterMode, setMonsterMode] = useState('edit');
  const [moveMode, setMoveMode] = useState('edit');
  const [heroId, setHeroId] = useState(heroClasses[0]?.id ?? '');
  const [monsterId, setMonsterId] = useState(monsterIds[0] ?? '');
  const [moveId, setMoveId] = useState(moveIds[0] ?? '');
  const selectedHero = heroClasses.find((hero) => hero.id === heroId) ?? heroClasses[0];
  const selectedMonster = config?.monsters?.find((monster) => monster.id === monsterId) ?? config?.monsters?.[0];
  const selectedMove = config?.moves?.[moveId] ?? config?.moves?.[moveIds[0]];

  const handleCreateMonster = async (payload) => {
    await onCreateMonster(payload);
    setMonsterMode('edit');
    setMonsterId(payload.id);
  };

  const handleCreateHero = async (payload) => {
    await onCreateHero(payload);
    setHeroMode('edit');
    setHeroId(payload.id);
  };

  const handleCreateMove = async (payload) => {
    await onCreateMove(payload);
    setMoveMode('edit');
    setMoveId(payload.id);
  };

  return (
    <div className="tuning-layout">
      <div className="tuning-three">
        <section className="tuning-section">
          <h3 className="tuning-three__heading">Heroes</h3>
          <div className="tuning-three__toolbar">
            <label className="field tuning-toolbar__select">
              <span>Edit class</span>
              <select
                value={heroMode === 'create' ? '' : (heroId || selectedHero?.id || '')}
                onChange={(event) => {
                  const v = event.target.value;
                  if (!v) return;
                  setHeroMode('edit');
                  setHeroId(v);
                }}
              >
                <option value="" disabled>
                  {heroMode === 'create' ? 'Creating… or choose a class' : 'Choose class…'}
                </option>
                {heroClasses.map((heroClass) => (
                  <option value={heroClass.id} key={heroClass.id}>{heroClass.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`secondary compact-button tuning-toolbar__create${heroMode === 'create' ? ' is-active' : ''}`}
              onClick={() => setHeroMode('create')}
            >
              Create new
            </button>
          </div>
          {heroMode === 'create' ? (
            <CreateHeroForm
              key={`create-hero-${moveIds.length}`}
              moves={config?.moves}
              busy={busy}
              onCreate={handleCreateHero}
            />
          ) : selectedHero ? (
            <HeroTuningForm
              key={`hero-${selectedHero.id}`}
              hero={selectedHero}
              moves={config?.moves}
              onSave={onSaveHero}
              busy={busy}
            />
          ) : (
            <EmptyState>No hero classes configured.</EmptyState>
          )}
        </section>
        <section className="tuning-section">
          <h3 className="tuning-three__heading">Monsters</h3>
          <div className="tuning-three__toolbar">
            <label className="field tuning-toolbar__select">
              <span>Edit monster</span>
              <select
                value={monsterMode === 'create' ? '' : (monsterId || selectedMonster?.id || '')}
                onChange={(event) => {
                  const v = event.target.value;
                  if (!v) return;
                  setMonsterMode('edit');
                  setMonsterId(v);
                }}
              >
                <option value="" disabled>
                  {monsterMode === 'create' ? 'Creating… or choose a monster' : 'Choose monster…'}
                </option>
                {(config?.monsters ?? []).map((monster) => (
                  <option value={monster.id} key={monster.id}>{monster.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`secondary compact-button tuning-toolbar__create${monsterMode === 'create' ? ' is-active' : ''}`}
              onClick={() => setMonsterMode('create')}
            >
              Create new
            </button>
          </div>
          {monsterMode === 'create' ? (
            <CreateMonsterForm config={config} busy={busy} onCreate={handleCreateMonster} />
          ) : selectedMonster ? (
            <MonsterTuningForm
              key={`monster-${selectedMonster.id}`}
              monster={selectedMonster}
              moves={config.moves}
              config={config}
              onSave={onSaveMonster}
              busy={busy}
            />
          ) : (
            <EmptyState>No monsters configured.</EmptyState>
          )}
        </section>
        <section className="tuning-section">
          <h3 className="tuning-three__heading">Moves</h3>
          <div className="tuning-three__toolbar">
            <label className="field tuning-toolbar__select">
              <span>Edit move</span>
              <select
                value={moveMode === 'create' ? '' : (moveId || selectedMove?.id || '')}
                onChange={(event) => {
                  const v = event.target.value;
                  if (!v) return;
                  setMoveMode('edit');
                  setMoveId(v);
                }}
              >
                <option value="" disabled>
                  {moveMode === 'create' ? 'Creating… or choose a move' : 'Choose move…'}
                </option>
                {moveIds.map((id) => (
                  <option value={id} key={id}>{config.moves[id].name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`secondary compact-button tuning-toolbar__create${moveMode === 'create' ? ' is-active' : ''}`}
              onClick={() => setMoveMode('create')}
            >
              Create new
            </button>
          </div>
          {moveMode === 'create' ? (
            <CreateMoveForm busy={busy} onCreate={handleCreateMove} />
          ) : selectedMove ? (
            <MoveTuningForm
              key={`move-${selectedMove.id}`}
              move={selectedMove}
              onSave={onSaveMove}
              busy={busy}
            />
          ) : (
            <EmptyState>No moves configured.</EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => api.readSession());
  const [checking, setChecking] = useState(Boolean(session?.token));
  const [loginError, setLoginError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({});
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const player = session?.player ?? null;
  const isAdmin = player?.role === 'admin';

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoadError(null);
    const [overview, users, saves, battleRuns, config] = await Promise.all([
      api.fetchOverview(),
      api.fetchUsers(),
      api.fetchSaves(),
      api.fetchBattleRuns(),
      api.fetchConfig(),
    ]);
    setData({ overview, users: users.users, saves: saves.saves, battleRuns: battleRuns.battleRuns, config });
  }, [isAdmin]);

  const refreshData = useCallback(async () => {
    try {
      await loadAll();
    } catch (err) {
      setLoadError(err.message);
    }
  }, [loadAll]);

  useEffect(() => {
    let cancelled = false;
    const current = api.readSession();
    if (!current?.token) return;
    api.fetchMe()
      .then((result) => {
        if (cancelled) return;
        const next = { ...current, player: result.player };
        api.writeSession(next);
        setSession(next);
      })
      .catch(() => {
        if (cancelled) return;
        api.writeSession(null);
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checking && isAdmin) {
      let cancelled = false;
      Promise.resolve()
        .then(loadAll)
        .catch((err) => {
          if (!cancelled) setLoadError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [checking, isAdmin, loadAll]);

  const login = async (username, password) => {
    setBusy(true);
    setLoginError(null);
    try {
      const next = await api.login(username, password);
      setSession(next);
      if (next.player?.role !== 'admin') {
        setLoginError('This account is not an admin.');
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    api.writeSession(null);
    setSession(null);
    setData({});
  };

  const refreshConfig = useCallback(async () => {
    const config = await api.fetchConfig();
    setData((prev) => ({ ...prev, config }));
  }, []);

  const tuningHandlers = useMemo(() => ({
    createMonster: async (payload) => {
      const { mapParentIds, mapConfigSnapshot, ...monsterPayload } = payload;
      setBusy(true);
      setLoadError(null);
      try {
        await api.createMonster(monsterPayload);
        if (Array.isArray(mapParentIds) && mapParentIds.length > 0 && mapConfigSnapshot) {
          const clone =
            typeof structuredClone === 'function'
              ? structuredClone(mapConfigSnapshot)
              : JSON.parse(JSON.stringify(mapConfigSnapshot));
          const nextMap = addMonsterNodeToMap(clone, {
            nodeId: monsterPayload.id,
            monsterId: monsterPayload.id,
            parentIds: mapParentIds,
            label: monsterPayload.name,
            type: 'battle',
            biomeId: 'forest',
          });
          await api.updateConstant('MAP_CONFIG', nextMap);
        }
        await refreshConfig();
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setBusy(false);
      }
    },
    createHero: async (payload) => {
      setBusy(true);
      try {
        await api.createHero(payload);
        await refreshConfig();
      } finally {
        setBusy(false);
      }
    },
    createMove: async (payload) => {
      setBusy(true);
      try {
        await api.createMove(payload);
        await refreshConfig();
      } finally {
        setBusy(false);
      }
    },
    saveMonster: async (id, payload) => {
      const { mapParentIds, encounterMapNodeId, mapConfigSnapshot, ...monsterPayload } = payload;
      setBusy(true);
      setLoadError(null);
      try {
        await api.updateMonster(id, monsterPayload);
        if (
          encounterMapNodeId &&
          Array.isArray(mapParentIds) &&
          mapParentIds.length > 0 &&
          mapConfigSnapshot
        ) {
          const clone =
            typeof structuredClone === 'function'
              ? structuredClone(mapConfigSnapshot)
              : JSON.parse(JSON.stringify(mapConfigSnapshot));
          const nextMap = relinkMonsterMapParents(clone, encounterMapNodeId, mapParentIds);
          await api.updateConstant('MAP_CONFIG', nextMap);
        }
        await refreshConfig();
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setBusy(false);
      }
    },
    saveMove: async (id, payload) => {
      setBusy(true);
      try {
        await api.updateMove(id, payload);
        await refreshConfig();
      } finally {
        setBusy(false);
      }
    },
    saveHero: async (id, payload) => {
      setBusy(true);
      try {
        await api.updateHero(id, payload);
        await refreshConfig();
      } finally {
        setBusy(false);
      }
    },
  }), [refreshConfig]);

  const clearSelectedBattle = useCallback(() => setSelectedBattle(null), []);

  const selectBattle = async (id) => {
    const result = await api.fetchBattleRun(id);
    setSelectedBattle(result.battleRun);
  };

  if (checking) {
    return <main className="login-page"><p>Checking admin session...</p></main>;
  }

  if (!session || !isAdmin) {
    return <LoginScreen onLogin={login} error={loginError} busy={busy} />;
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <p className="eyebrow">Admin Console</p>
          <h1>Knight's Gauntlet</h1>
          <p>Signed in as <strong>{player.username}</strong></p>
        </div>
        <nav>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`secondary${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <button type="button" className="secondary" onClick={logout}>Sign Out</button>
        </div>
      </aside>
      <section className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">{TABS.find((tab) => tab.id === activeTab)?.label ?? 'Admin'}</p>
            <h1>{TABS.find((tab) => tab.id === activeTab)?.label ?? 'Admin'}</h1>
          </div>
          <button type="button" className="secondary" onClick={refreshData} disabled={busy}>Refresh Data</button>
        </header>
        {loadError && <p className="error">{loadError}</p>}
        {activeTab === 'overview' && (
          <Overview data={data.overview} users={data.users ?? []} saves={data.saves ?? []} />
        )}
        {activeTab === 'users' && <Users users={data.users ?? []} />}
        {activeTab === 'saves' && <Saves saves={data.saves ?? []} />}
        {activeTab === 'battles' && (
          <Battles
            battles={data.battleRuns ?? []}
            selectedBattle={selectedBattle}
            onSelectBattle={selectBattle}
            onClearSelectedBattle={clearSelectedBattle}
            onRefresh={refreshData}
          />
        )}
        {activeTab === 'tuning' && (
          <Tuning
            config={data.config}
            busy={busy}
            onCreateMonster={tuningHandlers.createMonster}
            onCreateHero={tuningHandlers.createHero}
            onCreateMove={tuningHandlers.createMove}
            onSaveMonster={tuningHandlers.saveMonster}
            onSaveMove={tuningHandlers.saveMove}
            onSaveHero={tuningHandlers.saveHero}
          />
        )}
      </section>
    </main>
  );
}
