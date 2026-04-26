import { useEffect } from 'react';
import MoveButton from '../ui/MoveButton.jsx';
import Sprite from '../ui/Sprite.jsx';
import BattleLog from '../ui/BattleLog.jsx';
import useBattle from '../../hooks/useBattle.js';

/**
 * BattleScreen — Ninja-Saga-style arena.
 *
 * Phase 3 additions:
 *   - Full scrollable BattleLog panel pinned to the arena.
 *   - Status chips (bleed/poison/burn) under each fighter's HP bar.
 *   - Move buttons have real hover tooltips (handled in MoveButton).
 */
export default function BattleScreen({ hero, monster, moves, onBattleEnd }) {
  const battle = useBattle({ hero, monster, moves });

  useEffect(() => {
    if (battle.isOver) {
      const t = setTimeout(() => {
        onBattleEnd({
          outcome: battle.outcome,
          monsterId: monster.id,
          heroEndHealth: battle.heroState.currentHealth,
          xpReward: monster.xpReward ?? 0,
          monsterMoves: monster.moves ?? [],
        });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [
    battle.isOver,
    battle.outcome,
    battle.heroState.currentHealth,
    monster.id,
    monster.xpReward,
    monster.moves,
    onBattleEnd,
  ]);

  return (
    <div className="screen arena-screen">
      <div className="arena">
        <div className="arena__sky" />
        <div className="arena__mountains" />
        <div className="arena__floor" />
        <div className="arena__pillar arena__pillar--left" />
        <div className="arena__pillar arena__pillar--right" />

        <Nameplate
          side="left"
          name={battle.heroState.name}
          level={hero.level}
          subtitle="Hero"
          spriteId={hero.id}
          hp={battle.heroState.currentHealth}
          hpMax={battle.heroState.stats.health}
          buffs={battle.heroState.buffs}
          statuses={battle.heroState.statuses}
        />
        <Nameplate
          side="right"
          name={battle.monsterState.name}
          level={null}
          subtitle="Foe"
          spriteId={monster.id}
          hp={battle.monsterState.currentHealth}
          hpMax={battle.monsterState.stats.health}
          buffs={battle.monsterState.buffs}
          statuses={battle.monsterState.statuses}
        />

        <div className="arena__fighter arena__fighter--hero">
          <Sprite kind="character" id={hero.id} size={160} facing="right" />
          <div className="arena__fighter-shadow" />
        </div>
        <div className="arena__fighter arena__fighter--monster">
          <Sprite kind="character" id={monster.id} size={160} facing="left" />
          <div className="arena__fighter-shadow" />
        </div>

        <div className="arena__vs">VS</div>
        {battle.isOver && (
          <div
            className={`arena__outcome arena__outcome--${
              battle.outcome === 'victory' ? 'win' : 'lose'
            }`}
          >
            {battle.outcome === 'victory' ? 'VICTORY' : 'DEFEAT'}
          </div>
        )}

        <BattleLog entries={battle.log} />

        <div className="arena__toolbar">
          <div className="arena__toolbar-label">Abilities</div>
          <div className="arena__moves">
            {battle.equippedMoves.map((m) => (
              <MoveButton
                key={m.id}
                move={m}
                onClick={battle.playTurn}
                disabled={battle.isProcessing || battle.isOver}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_ICON = { bleed: '🩸', poison: '☠', burn: '🔥' };
const STATUS_LABEL = { bleed: 'Bleed', poison: 'Poison', burn: 'Burn' };

function Nameplate({ side, name, level, subtitle, spriteId, hp, hpMax, buffs, statuses }) {
  const pct = hpMax > 0 ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : 0;
  let tier = 'hp-high';
  if (pct <= 25) tier = 'hp-low';
  else if (pct <= 50) tier = 'hp-mid';

  return (
    <div className={`nameplate nameplate--${side}`}>
      <div className="nameplate__portrait">
        <Sprite kind="character" id={spriteId} size={56} />
      </div>
      <div className="nameplate__body">
        <div className="nameplate__top">
          <span className="nameplate__name">{name}</span>
          {level != null ? (
            <span className="nameplate__level">Lv {level}</span>
          ) : (
            <span className="nameplate__tag">{subtitle}</span>
          )}
        </div>
        <div className="nameplate__hp-row">
          <div className="nameplate__hp">
            <div className={`nameplate__hp-fill ${tier}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="nameplate__hp-nums">
            {Math.max(0, Math.round(hp))}/{hpMax}
          </span>
        </div>
        <ul className="nameplate__buffs">
          {(buffs ?? []).map((b, i) => {
            const positive = b.multiplier > 1;
            return (
              <li
                key={`${b.stat}-${i}`}
                className={`nameplate__buff ${
                  positive ? 'nameplate__buff--up' : 'nameplate__buff--down'
                }`}
                title={`${b.stat} ${positive ? '↑' : '↓'} x${b.multiplier}`}
              >
                {b.stat.slice(0, 3).toUpperCase()}
                {positive ? '↑' : '↓'}
                <span className="nameplate__buff-turns">{b.turnsRemaining}</span>
              </li>
            );
          })}
        </ul>
        {statuses && statuses.length > 0 && (
          <div className="nameplate__status-row">
            {statuses.map((s, i) => (
              <span
                key={`${s.kind}-${i}`}
                className={`status-chip status-chip--${s.kind}`}
                title={`${STATUS_LABEL[s.kind] ?? s.kind} — ${s.damage} dmg/turn`}
              >
                {STATUS_ICON[s.kind] ?? '•'}
                {STATUS_LABEL[s.kind] ?? s.kind}
                <span className="status-chip__turns">{s.turnsRemaining}t</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
