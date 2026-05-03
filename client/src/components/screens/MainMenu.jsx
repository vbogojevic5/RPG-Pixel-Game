/** Authenticated hub: start run, load save, log out. */
export default function MainMenu({
  player,
  onStartGame,
  onLoadGame,
  onLogout,
  saveCount,
  loading,
  error,
}) {
  return (
    <div className="screen main-menu">
      <div className="main-menu__card">
        <h1 className="main-menu__title">Knight's Gauntlet</h1>
        <p className="main-menu__subtitle">
          Face monsters. Learn their moves. Survive the gauntlet.
        </p>

        <p className="main-menu__hello">
          Signed in as <strong>{player?.username}</strong>
        </p>

        <div className="main-menu__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onStartGame}
            disabled={loading}
          >
            <i className="fa-solid fa-play btn__fa" aria-hidden />
            {loading ? 'Loading run…' : 'Start New Run'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onLoadGame}
            disabled={saveCount === 0}
            title={saveCount === 0 ? 'No saved runs yet' : undefined}
          >
            <i className="fa-solid fa-folder-open btn__fa" aria-hidden />
            Load Game{saveCount > 0 ? ` (${saveCount})` : ''}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onLogout}>
            <i className="fa-solid fa-right-from-bracket btn__fa" aria-hidden />
            Log out
          </button>
        </div>

        {error && <p className="main-menu__error">{error}</p>}
      </div>
    </div>
  );
}
