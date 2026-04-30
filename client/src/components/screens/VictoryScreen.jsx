import Sprite from '../ui/Sprite.jsx';
import BattleLog from '../ui/BattleLog.jsx';

/**
 * VictoryScreen — shown after the hero defeats all 5 monsters in the run.
 *
 * Displays a summary of the run:
 *   - Hero level reached
 *   - All moves learned during the run (not just the default 4)
 *   - Number of battles fought / won / lost
 *
 * Phase 2 ends here with a "Back to Menu" button. Future phases could
 * add a leaderboard, NG+, or localStorage-save of the run history.
 */
export default function VictoryScreen({
  hero,
  moves,
  runStats,
  battleLog = [],
  defeatedMonsters,
  onBackToMenu,
}) {
  const learned = hero.knownMoves.map((id) => moves[id]).filter(Boolean);

  return (
    <div className="screen victory">
      <div className="victory__card">
        <div className="victory__banner">
          <Sprite kind="character" id={hero.id} size={96} />
          <h1 className="victory__title">The Gauntlet Falls!</h1>
        </div>
        <p className="victory__subtitle">
          {hero.name} has vanquished every challenger.
        </p>

        <div className="victory__summary">
          <div className="victory__stat">
            <div className="victory__stat-label">Final Level</div>
            <div className="victory__stat-value">{hero.level}</div>
          </div>
          <div className="victory__stat">
            <div className="victory__stat-label">Battles Fought</div>
            <div className="victory__stat-value">{runStats.battlesFought}</div>
          </div>
          <div className="victory__stat">
            <div className="victory__stat-label">Victories</div>
            <div className="victory__stat-value">{runStats.battlesWon}</div>
          </div>
          <div className="victory__stat">
            <div className="victory__stat-label">Defeats Survived</div>
            <div className="victory__stat-value">{runStats.battlesLost}</div>
          </div>
        </div>

        <section className="victory__section">
          <h3>Monsters Defeated</h3>
          <ul className="victory__monsters">
            {defeatedMonsters.map((m) => (
              <li key={m.id} className="victory__monster">
                <Sprite kind="character" id={m.id} size={40} />
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="victory__section">
          <h3>Moves Mastered ({learned.length})</h3>
          <ul className="victory__moves">
            {learned.map((m) => (
              <li key={m.id} className={`victory__move victory__move--${m.type}`}>
                <span className="victory__move-name">{m.name}</span>
                <span className="victory__move-type">{m.type}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="victory__actions">
          {battleLog.length > 0 && <BattleLog entries={battleLog} />}
          <button type="button" className="btn btn--primary" onClick={onBackToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
