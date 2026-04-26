import Sprite from '../ui/Sprite.jsx';

/**
 * PostBattle — shows the outcome of a fight and the rewards from it.
 *
 * Phase 3 changes:
 *   - Level-ups are no longer auto-applied; the stat-choice modal owned
 *     by App.jsx runs first. While `pendingLevelUps > 0`, the Continue
 *     button is disabled and the hint nudges the player to pick a boost.
 */
export default function PostBattle({
  outcome,
  monster,
  moves,
  summary,
  pendingLevelUps = 0,
  onContinue,
}) {
  const isWin = outcome === 'victory';
  const learnedMove = summary?.learnedMove ? moves[summary.learnedMove] : null;
  const waitingOnLevelUp = pendingLevelUps > 0;

  return (
    <div className="screen post-battle">
      <div className={`post-battle__card ${isWin ? 'is-win' : 'is-lose'}`}>
        <div className="post-battle__portrait">
          <Sprite kind="character" id={monster?.id} size={80} />
        </div>
        <h2 className="post-battle__title">
          {isWin ? 'Victory!' : 'Defeat…'}
        </h2>
        <p className="post-battle__subtitle">
          {isWin
            ? `You bested the ${monster?.name ?? 'monster'}.`
            : `The ${monster?.name ?? 'monster'} overwhelmed you.`}
        </p>

        {summary && summary.xpGained > 0 && (
          <div className="post-battle__xp">
            +{summary.xpGained} XP
          </div>
        )}

        {summary?.leveledUp && pendingLevelUps === 0 && (
          <div className="levelup">
            <div className="levelup__header">Level Up!</div>
            <div className="levelup__level">Stat boosts applied.</div>
          </div>
        )}

        {isWin && learnedMove && (
          <div className="post-battle__learned">
            <div className="post-battle__learned-label">
              {summary?.alreadyKnown ? 'No new move learned' : 'You learned a move!'}
            </div>
            <div className="post-battle__learned-move">
              <div className="post-battle__learned-name">{learnedMove.name}</div>
              <div className="post-battle__learned-type">{learnedMove.type}</div>
              <div className="post-battle__learned-desc">
                {learnedMove.description}
              </div>
            </div>
            {summary?.alreadyKnown && (
              <p className="post-battle__learned-note">
                You already mastered every move in this moveset.
              </p>
            )}
          </div>
        )}

        {!isWin && (
          <p className="post-battle__note">
            Your HP has been restored so you can try again.
          </p>
        )}

        <button
          type="button"
          className="btn btn--primary"
          onClick={onContinue}
          disabled={waitingOnLevelUp}
        >
          {waitingOnLevelUp ? 'Choose your level-up boost…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
