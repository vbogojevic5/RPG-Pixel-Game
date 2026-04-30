import { useMemo } from 'react';

/**
 * LoadGameScreen — pick an existing save to resume, or delete one.
 * Only reachable when the player is authenticated and has at least
 * one save.
 */
export default function LoadGameScreen({
  saves,
  loading,
  busy,
  error,
  onLoad,
  onDelete,
  onBack,
}) {
  const sorted = useMemo(
    () =>
      [...saves].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [saves]
  );

  return (
    <div className="screen load-screen">
      <div className="load-card">
        <div className="load-card__header">
          <h2 className="load-card__title">Continue a Run</h2>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
        </div>

        {loading && <p className="load-card__note">Loading your saves…</p>}
        {error && <p className="load-card__error">{error}</p>}

        {!loading && sorted.length === 0 && (
          <p className="load-card__empty">
            No saved runs yet. Start a new run and save it from the journey map.
          </p>
        )}

        <ul className="save-list">
          {sorted.map((save) => {
            const hero = save.heroState || {};
            const stats = save.runStats || {};
            return (
              <li key={save.id} className="save-slot">
                <div className="save-slot__main">
                  <div className="save-slot__name">{save.name}</div>
                  <div className="save-slot__meta">
                    Lv {hero.level ?? 1} · HP {hero.currentHealth ?? '?'}/
                    {hero.stats?.health ?? '?'} · {save.defeatedMonsterIds?.length ?? 0}/5 defeated
                  </div>
                  <div className="save-slot__meta">
                    Battles: {stats.battlesFought ?? 0}
                    {' · '}W: {stats.battlesWon ?? 0}
                    {' · '}L: {stats.battlesLost ?? 0}
                  </div>
                  <div className="save-slot__stamp">
                    Updated {new Date(save.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="save-slot__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onLoad(save)}
                    disabled={busy}
                    data-sfx="loadConfirm"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      if (window.confirm(`Delete save "${save.name}"? This cannot be undone.`)) {
                        onDelete(save.id);
                      }
                    }}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
