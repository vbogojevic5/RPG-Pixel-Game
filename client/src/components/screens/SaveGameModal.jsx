import { useMemo, useState } from 'react';

/**
 * SaveGameModal — popup shown from the journey map when the player
 * wants to save. Two tabs:
 *   - New slot  : picks a name, POSTs a new save
 *   - Overwrite : lists existing saves, PUT updates the chosen one
 */
export default function SaveGameModal({
  saves,
  busy,
  error,
  suggestedName,
  onCreate,
  onOverwrite,
  onClose,
}) {
  const [mode, setMode] = useState('new');
  const [name, setName] = useState(suggestedName ?? '');
  const [localError, setLocalError] = useState(null);

  const ordered = useMemo(
    () =>
      [...saves].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [saves]
  );

  const displayError = localError ?? error;

  const handleCreate = async (event) => {
    event.preventDefault();
    setLocalError(null);
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setLocalError('Name the save slot.');
      return;
    }
    if (trimmed.length > 40) {
      setLocalError('Name too long (max 40).');
      return;
    }
    try {
      await onCreate(trimmed);
    } catch {
      // error surfaces via hook
    }
  };

  const handleOverwrite = async (save) => {
    setLocalError(null);
    if (!window.confirm(`Overwrite "${save.name}" with the current run?`)) return;
    try {
      await onOverwrite(save);
    } catch {
      // error surfaces via hook
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal__header">
          <h3 className="modal__title">Save Run</h3>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <div className="modal__tabs">
          <button
            type="button"
            className={`modal__tab ${mode === 'new' ? 'is-active' : ''}`}
            onClick={() => setMode('new')}
          >
            New slot
          </button>
          <button
            type="button"
            className={`modal__tab ${mode === 'overwrite' ? 'is-active' : ''}`}
            onClick={() => setMode('overwrite')}
            disabled={ordered.length === 0}
          >
            Overwrite ({ordered.length})
          </button>
        </div>

        {mode === 'new' && (
          <form className="modal__body" onSubmit={handleCreate}>
            <label className="modal__label">
              <span>Save name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="e.g. After goblins"
                autoFocus
              />
            </label>
            <div className="modal__actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
            {displayError && <p className="modal__error">{displayError}</p>}
          </form>
        )}

        {mode === 'overwrite' && (
          <div className="modal__body">
            <ul className="save-list save-list--compact">
              {ordered.map((save) => (
                <li key={save.id} className="save-slot">
                  <div className="save-slot__main">
                    <div className="save-slot__name">{save.name}</div>
                    <div className="save-slot__meta">
                      Lv {save.heroState?.level ?? 1} · {save.defeatedMonsterIds?.length ?? 0}/5 defeated
                    </div>
                    <div className="save-slot__stamp">
                      {new Date(save.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="save-slot__actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleOverwrite(save)}
                      disabled={busy}
                    >
                      Overwrite
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {displayError && <p className="modal__error">{displayError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
