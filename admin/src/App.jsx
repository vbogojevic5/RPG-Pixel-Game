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

function ConfirmModal({ user, busy, onCancel, onConfirm }) {
  if (!user) return null;
  return (
    <div className="modal-backdrop">
      <section className="confirm-modal">
        <p className="eyebrow">Confirm Deletion</p>
        <h2>Delete {user.username}?</h2>
        <p>
          This removes the player account and cascades their saves and battle history. This action
          should only be used for test accounts or moderation cleanup.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </section>
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
        <button type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
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
            {(users ?? []).slice(0, 5).map((user) => (
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
            {(saves ?? []).slice(0, 5).map((save) => (
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
            {(data?.recentBattles ?? []).map((battle) => (
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
            {(data?.recentAudits ?? []).map((audit) => (
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

function Users({ users, currentUserId, onDeleteUser }) {
  return (
    <Card title="Users">
      <div className="stack">
        {users.map((user) => (
          <article className="row-card row-card--with-actions" key={user.id}>
            <div>
              <strong>{user.username} <span className={`pill pill--${user.role}`}>{titleCase(user.role)}</span></strong>
              <span>
                Saves: {user.saveCount} - Battles: {user.battleRunCount} - Joined: {formatDate(user.createdAt)}
              </span>
            </div>
            <button
              type="button"
              className="danger-button"
              onClick={() => onDeleteUser(user)}
              disabled={user.id === currentUserId}
              title={user.id === currentUserId ? 'You cannot delete your own admin account.' : 'Delete user'}
            >
              Delete
            </button>
          </article>
        ))}
        {users.length === 0 && <EmptyState>No users found.</EmptyState>}
      </div>
    </Card>
  );
}

function Saves({ saves }) {
  return (
    <Card title="Saves">
      <div className="stack">
        {saves.map((save) => (
          <article className="row-card" key={save.id}>
            <strong>{save.name} by {save.player?.username ?? 'unknown'}</strong>
            <span>
              Level {save.heroState?.level ?? '?'} - Cleared {save.defeatedMonsterIds?.length ?? 0}/5 - Updated {formatDate(save.updatedAt)}
            </span>
          </article>
        ))}
        {saves.length === 0 && <EmptyState>No saves found.</EmptyState>}
      </div>
    </Card>
  );
}

function Battles({ battles, selectedBattle, onSelectBattle, onRefresh }) {
  const activeBattle = selectedBattle ?? battles[0] ?? null;

  return (
    <div className="split">
      <Card title="Battle Runs">
        <div className="section-toolbar">
          <p>Inspect stored battle summaries and full transcripts.</p>
          <button type="button" className="secondary compact-button" onClick={onRefresh}>Refresh</button>
        </div>
        <div className="stack">
          {battles.map((battle) => (
            <button className="row-card row-card--button" key={battle.id} onClick={() => onSelectBattle(battle.id)}>
              <strong>{battle.player?.username ?? 'Unknown'} vs {battle.monsterName}</strong>
              <span>{titleCase(battle.outcome)} - XP {battle.xpGained} - {formatDate(battle.endedAt)}</span>
            </button>
          ))}
          {battles.length === 0 && (
            <EmptyState>No battle logs yet. Start and finish a battle in the game client, then refresh.</EmptyState>
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
  const [name, setName] = useState(hero?.name ?? '');
  const [sprite, setSprite] = useState(hero?.sprite ?? '');
  const [baseStats, setBaseStats] = useState(hero?.baseStats ?? {});
  const [defaultMoves, setDefaultMoves] = useState(hero?.defaultMoves ?? []);
  const [levelUpGrowth, setLevelUpGrowth] = useState(hero?.levelUpGrowth ?? {
    health: 0,
    mana: 0,
    attack: 0,
    defense: 0,
    magic: 0,
  });

  const toggleMove = (id) => {
    setDefaultMoves((list) => (
      list.includes(id) ? list.filter((moveId) => moveId !== id) : [...list, id]
    ));
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
      <div className="checkbox-grid">
        {Object.values(moves ?? {}).map((move) => (
          <label className="check-card" key={move.id}>
            <input
              type="checkbox"
              checked={defaultMoves.includes(move.id)}
              onChange={() => toggleMove(move.id)}
            />
            <span>{move.name}</span>
          </label>
        ))}
      </div>
    </form>
  );
}

function MonsterTuningForm({ monster, moves, busy, onSave }) {
  const moveOptions = Object.values(moves ?? {});
  const [name, setName] = useState(monster?.name ?? '');
  const [order, setOrder] = useState(monster?.order ?? 1);
  const [xpReward, setXpReward] = useState(monster?.xpReward ?? 0);
  const [sprite, setSprite] = useState(monster?.sprite ?? '');
  const [stats, setStats] = useState(monster?.stats ?? {});
  const [monsterMoves, setMonsterMoves] = useState(monster?.moves ?? []);

  const updateMoveSlot = (index, value) => {
    setMonsterMoves((list) => list.map((moveId, slot) => (slot === index ? value : moveId)));
  };

  return (
    <form
      className="tuning-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(monster.id, {
          name,
          order,
          xpReward,
          sprite: sprite || null,
          stats,
          moves: monsterMoves,
        });
      }}
    >
      <div className="tuning-card__header">
        <div>
          <p className="eyebrow">Monster</p>
          <h2>{monster.name}</h2>
        </div>
        <button type="submit" disabled={busy}>Save Monster</button>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <NumberField label="Order" value={order} min={1} max={10} onChange={setOrder} />
        <NumberField label="XP Reward" value={xpReward} min={0} max={500} onChange={setXpReward} />
        <label className="field">
          <span>Sprite ID</span>
          <input value={sprite ?? ''} onChange={(event) => setSprite(event.target.value)} />
        </label>
      </div>
      <StatFields stats={stats} onChange={setStats} />
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

function ConfigValueEditor({ label, value, onChange }) {
  if (Array.isArray(value)) {
    return (
      <div className="array-grid">
        {value.map((item, index) => (
          <ConfigValueEditor
            key={`${label}-${index}`}
            label={`${label} ${index + 1}`}
            value={item}
            onChange={(nextValue) => onChange(value.map((current, i) => (i === index ? nextValue : current)))}
          />
        ))}
      </div>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <div className="nested-config">
        {Object.entries(value).map(([key, item]) => (
          <div className="nested-config__item" key={key}>
            <p className="nested-config__label">{titleCase(key)}</p>
            <ConfigValueEditor
              label={key}
              value={item}
              onChange={(nextValue) => onChange({ ...value, [key]: nextValue })}
            />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'number') {
    return <NumberField label={titleCase(label)} value={value} min={0} max={2000} onChange={onChange} />;
  }

  if (typeof value === 'boolean') {
    return (
      <label className="check-card check-card--wide">
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
        <span>{titleCase(label)}</span>
      </label>
    );
  }

  return (
    <label className="field">
      <span>{titleCase(label)}</span>
      <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ConstantTuningForm({ name, value, busy, onSave }) {
  const [draft, setDraft] = useState(value);

  return (
    <form
      className="tuning-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(name, draft);
      }}
    >
      <div className="tuning-card__header">
        <div>
          <p className="eyebrow">Constant</p>
          <h2>{titleCase(name)}</h2>
        </div>
        <button type="submit" disabled={busy}>Save Constant</button>
      </div>
      <ConfigValueEditor label={name} value={draft} onChange={setDraft} />
    </form>
  );
}

function Tuning({ config, onSaveMonster, onSaveMove, onSaveHero, onSaveConstant, busy }) {
  const heroClasses = Object.values(config?.heroClasses ?? (config?.hero ? { [config.hero.id]: config.hero } : {}));
  const monsterIds = (config?.monsters ?? []).map((monster) => monster.id);
  const moveIds = Object.keys(config?.moves ?? {});
  const constantKeys = Object.keys(config?.constants ?? {});
  const [heroId, setHeroId] = useState(heroClasses[0]?.id ?? '');
  const [monsterId, setMonsterId] = useState(monsterIds[0] ?? '');
  const [moveId, setMoveId] = useState(moveIds[0] ?? '');
  const [constantKey, setConstantKey] = useState(constantKeys[0] ?? '');
  const selectedHero = heroClasses.find((hero) => hero.id === heroId) ?? heroClasses[0];
  const selectedMonster = config?.monsters?.find((monster) => monster.id === monsterId) ?? config?.monsters?.[0];
  const selectedMove = config?.moves?.[moveId] ?? config?.moves?.[moveIds[0]];
  const selectedConstantKey = constantKeys.includes(constantKey) ? constantKey : constantKeys[0];

  return (
    <div className="tuning-layout">
      <div className="tuning-selector-row">
        <label className="field">
          <span>Hero Class</span>
          <select value={selectedHero?.id ?? ''} onChange={(event) => setHeroId(event.target.value)}>
            {heroClasses.map((heroClass) => (
              <option value={heroClass.id} key={heroClass.id}>{heroClass.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Monster</span>
          <select value={selectedMonster?.id ?? ''} onChange={(event) => setMonsterId(event.target.value)}>
            {config.monsters.map((monster) => (
              <option value={monster.id} key={monster.id}>{monster.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Move</span>
          <select value={selectedMove?.id ?? ''} onChange={(event) => setMoveId(event.target.value)}>
            {moveIds.map((id) => (
              <option value={id} key={id}>{config.moves[id].name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Constant</span>
          <select value={selectedConstantKey ?? ''} onChange={(event) => setConstantKey(event.target.value)}>
            {constantKeys.map((key) => (
              <option value={key} key={key}>{titleCase(key)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="tuning-grid">
        {selectedHero && (
          <HeroTuningForm
            key={`hero-${selectedHero.id}`}
            hero={selectedHero}
            moves={config?.moves}
            onSave={onSaveHero}
            busy={busy}
          />
        )}
        {selectedMonster && (
          <MonsterTuningForm
            key={`monster-${selectedMonster.id}`}
            monster={selectedMonster}
            moves={config.moves}
            onSave={onSaveMonster}
            busy={busy}
          />
        )}
        {selectedMove && (
          <MoveTuningForm
            key={`move-${selectedMove.id}`}
            move={selectedMove}
            onSave={onSaveMove}
            busy={busy}
          />
        )}
        {selectedConstantKey && (
          <ConstantTuningForm
            key={`constant-${selectedConstantKey}`}
            name={selectedConstantKey}
            value={config.constants[selectedConstantKey]}
            onSave={onSaveConstant}
            busy={busy}
          />
        )}
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
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setLoadError(null);
    try {
      await api.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const refreshConfig = useCallback(async () => {
    const config = await api.fetchConfig();
    setData((prev) => ({ ...prev, config }));
  }, []);

  const tuningHandlers = useMemo(() => ({
    saveMonster: async (id, payload) => {
      setBusy(true);
      try {
        await api.updateMonster(id, payload);
        await refreshConfig();
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
    saveConstant: async (key, value) => {
      setBusy(true);
      try {
        await api.updateConstant(key, value);
        await refreshConfig();
      } finally {
        setBusy(false);
      }
    },
  }), [refreshConfig]);

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
              className={activeTab === tab.id ? 'active' : ''}
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
        {activeTab === 'users' && (
          <Users
            users={data.users ?? []}
            currentUserId={player.id}
            onDeleteUser={setDeleteTarget}
          />
        )}
        {activeTab === 'saves' && <Saves saves={data.saves ?? []} />}
        {activeTab === 'battles' && (
          <Battles
            battles={data.battleRuns ?? []}
            selectedBattle={selectedBattle}
            onSelectBattle={selectBattle}
            onRefresh={refreshData}
          />
        )}
        {activeTab === 'tuning' && (
          <Tuning
            config={data.config}
            busy={busy}
            onSaveMonster={tuningHandlers.saveMonster}
            onSaveMove={tuningHandlers.saveMove}
            onSaveHero={tuningHandlers.saveHero}
            onSaveConstant={tuningHandlers.saveConstant}
          />
        )}
      </section>
      <ConfirmModal
        user={deleteTarget}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      />
    </main>
  );
}
