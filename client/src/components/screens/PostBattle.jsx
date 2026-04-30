import Sprite from '../ui/Sprite.jsx';
import BattleLog from '../ui/BattleLog.jsx';
import { formatItemEffect, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

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
  items,
  summary,
  battleLog = [],
  pendingLevelUps = 0,
  onContinue,
}) {
  const isWin = outcome === 'victory';
  const learnedMove = summary?.learnedMove ? moves[summary.learnedMove] : null;
  const droppedItem = summary?.itemDrop ? items?.[summary.itemDrop] : null;
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

        {summary && summary.xpGained > 0 && (
          <div className="post-battle__xp">
            +{summary.xpGained} XP
          </div>
        )}

        {isWin && summary?.coinsGained > 0 && (
          <div className="post-battle__coins">
            +{summary.coinsGained} Crowns
          </div>
        )}

        {isWin && droppedItem && (
          <div className="post-battle__item-drop">
            <div className="post-battle__item-icon">
              {itemIconSrc(droppedItem)
                ? <img src={itemIconSrc(droppedItem)} alt="" draggable={false} />
                : itemIcon(droppedItem)}
            </div>
            <div>
              <div className="post-battle__learned-label">
                {summary.itemDropAdded ? 'Item found!' : 'Item dropped, but inventory is full'}
              </div>
              <div className="post-battle__learned-name">{droppedItem.name}</div>
              <div className="post-battle__learned-desc">{formatItemEffect(droppedItem)}</div>
            </div>
          </div>
        )}

        {summary?.leveledUp && pendingLevelUps === 0 && (
          <div className="levelup">
            <div className="levelup__header">Level Up!</div>
            <div className="levelup__level">Stat boosts applied.</div>
          </div>
        )}

        {isWin && learnedMove && (
          <div>
            <div className="post-battle__learned-label">
              {summary?.alreadyKnown ? 'No new move learned' : 'You learned a move!'}
            </div>
            <div className="post-battle__learned">
            <div className="post-battle__learned-move">
              <div className="post-battle__learned-head">
                <div className="post-battle__learned-name">{learnedMove.name}</div>
                <div className="post-battle__learned-type">{learnedMove.type}</div>
              </div>
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
          </div>
        )}

        {!isWin && (
          <>
            <p className="post-battle__note">
              Your HP has been restored so you can try again.
            </p>
            {battleLog.length > 0 && (
              <div className="post-battle__log-action">
                <BattleLog entries={battleLog} />
              </div>
            )}
          </>
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
