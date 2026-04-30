import { useEffect, useRef } from 'react';
import MoveButton from '../ui/MoveButton.jsx';
import Sprite from '../ui/Sprite.jsx';
import BattleLog from '../ui/BattleLog.jsx';
import useBattle from '../../hooks/useBattle.js';
import { statLabel } from '../../constants/movePresentation.js';
import { formatItemEffect, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

/**
 * BattleScreen — Ninja-Saga-style arena.
 *
 * Phase 3 additions:
 *   - Full scrollable BattleLog panel pinned to the arena.
 *   - Status chips (bleed/poison/burn) under each fighter's HP bar.
 *   - Move buttons have real hover tooltips (handled in MoveButton).
 */
export default function BattleScreen({ hero, monster, moves, items, constants, audio, onBattleEnd, onExitBattle }) {
  const battle = useBattle({ hero, monster, moves, items, constants });
  const battleStartedAt = useRef(new Date().toISOString());
  const outcomeSfxPlayed = useRef(false);
  const heardFloaters = useRef(new Set());

  useEffect(() => {
    if (battle.isOver) {
      const t = setTimeout(() => {
        onBattleEnd({
          outcome: battle.outcome,
          monsterId: monster.id,
          heroEndHealth: battle.heroState.currentHealth,
          heroEndInventory: battle.heroState.inventory,
          xpReward: monster.xpReward ?? 0,
          monsterMoves: monster.moves ?? [],
          battleLog: battle.log,
          battleStartedAt: battleStartedAt.current,
          battleEndedAt: new Date().toISOString(),
        });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [
    battle.isOver,
    battle.outcome,
    battle.heroState.currentHealth,
    battle.heroState.inventory,
    battle.log,
    monster.id,
    monster.xpReward,
    monster.moves,
    onBattleEnd,
  ]);

  useEffect(() => {
    if (!battle.animation) return;
    const sfxByType = {
      physical: 'physicalHit',
      magic: 'magicCast',
      heal: 'heal',
      buff: 'buff',
      debuff: 'debuff',
    };
    audio?.playSfx(sfxByType[battle.animation.type] ?? 'abilityClick');
  }, [audio, battle.animation]);

  useEffect(() => {
    if (!battle.outcome || outcomeSfxPlayed.current) return;
    outcomeSfxPlayed.current = true;
    audio?.playSfx(battle.outcome === 'victory' ? 'victory' : 'defeat');
  }, [audio, battle.outcome]);

  useEffect(() => {
    for (const floater of battle.floaters) {
      if (heardFloaters.current.has(floater.id)) continue;
      heardFloaters.current.add(floater.id);
      if (['bleed', 'poison', 'burn'].includes(floater.kind)) {
        audio?.playSfx('statusTick');
      }
    }
  }, [audio, battle.floaters]);

  return (
    <div className="screen arena-screen">
      <div className="arena">
        <div className="arena__sky" />
        <div className="arena__forest arena__forest--back" />
        <div className="arena__moon" />
        <div className="arena__mist arena__mist--one" />
        <div className="arena__mist arena__mist--two" />
        <div className="arena__forest arena__forest--front" />
        <div className="arena__floor" />
        <div className="arena__ruins arena__ruins--left" />
        <div className="arena__ruins arena__ruins--right" />
        <div className="arena__torch arena__torch--left" />
        <div className="arena__torch arena__torch--right" />
        <div className="arena__grass arena__grass--left" />
        <div className="arena__grass arena__grass--right" />
        <div className="arena__pillar arena__pillar--left" />
        <div className="arena__pillar arena__pillar--right" />

        <Nameplate
          side="left"
          name={battle.monsterState.name}
          level={null}
          subtitle="Foe"
          spriteId={monster.id}
          hp={battle.monsterState.currentHealth}
          hpMax={battle.monsterState.stats.health}
          buffs={battle.monsterState.buffs}
          statuses={battle.monsterState.statuses}
          active={battle.currentTurn === 'monster'}
        />
        <Nameplate
          side="right"
          name={battle.heroState.name}
          level={hero.level}
          subtitle="Hero"
          spriteId={hero.id}
          hp={battle.heroState.currentHealth}
          hpMax={battle.heroState.stats.health}
          mana={battle.heroState.currentMana}
          manaMax={battle.heroState.stats.mana}
          buffs={battle.heroState.buffs}
          statuses={battle.heroState.statuses}
          active={battle.currentTurn === 'hero'}
        />

        <div
          className={`arena__fighter arena__fighter--hero ${
            battle.animation?.actor === 'hero' ? 'arena__fighter--acting' : ''
          } ${battle.animation?.target === 'hero' ? 'arena__fighter--hit' : ''}`}
        >
          <Sprite kind="character" id={hero.id} size={160} facing="right" />
          <div className="arena__fighter-shadow" />
        </div>
        <div
          className={`arena__fighter arena__fighter--monster ${
            battle.animation?.actor === 'monster' ? 'arena__fighter--acting' : ''
          } ${battle.animation?.target === 'monster' ? 'arena__fighter--hit' : ''}`}
        >
          <Sprite kind="character" id={monster.id} size={160} facing="left" />
          <div className="arena__fighter-shadow" />
        </div>

        {battle.animation && (
          <div
            className={`arena__impact arena__impact--${battle.animation.target} arena__impact--${battle.animation.type}`}
          />
        )}

        {battle.floaters.map((floater) => (
          <div
            key={floater.id}
            className={`arena__floater arena__floater--${floater.side} arena__floater--${floater.kind}`}
          >
            {floater.text}
          </div>
        ))}

        {battle.isOver && (
          <div
            className={`arena__outcome arena__outcome--${
              battle.outcome === 'victory' ? 'win' : 'lose'
            }`}
          >
            {battle.outcome === 'victory' ? 'VICTORY' : 'DEFEAT'}
          </div>
        )}

        <div className="arena__top-controls">
          <button
            type="button"
            className="arena__control-btn arena__control-btn--menu"
            onClick={onExitBattle}
            disabled={battle.isOver}
            data-sfx="modalClose"
          >
            Menu
          </button>
          <BattleLog entries={battle.log} contained />
        </div>

      </div>

      <div className="arena__toolbar">
        <div className="arena__toolbar-label">Abilities</div>
        <div className="arena__moves">
          {battle.equippedMoves.map((m) => (
            <MoveButton
              key={m.id}
              move={m}
              onClick={battle.playTurn}
              disabled={battle.isProcessing || battle.isOver}
              affordable={battle.canAfford(m)}
            />
          ))}
        </div>
        {battle.battleItems.length > 0 && (
          <>
            <div className="arena__toolbar-label arena__toolbar-label--items">Battle Items</div>
            <div className="arena__moves arena__items">
              {battle.battleItems.map((item) => (
                <button
                  type="button"
                  className="item-btn"
                  key={item.id}
                  onClick={() => battle.useItemTurn(item.id)}
                  disabled={battle.isProcessing || battle.isOver}
                  title={item.description}
                >
                  <span className="item-btn__icon" aria-hidden>
                    {itemIconSrc(item) ? <img src={itemIconSrc(item)} alt="" draggable={false} /> : itemIcon(item)}
                  </span>
                  <span className="item-btn__body">
                    <span className="item-btn__name">{item.name}</span>
                    <span className="item-btn__meta">
                      {formatItemEffect(item)} · x{item.quantity}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_ICON = { bleed: '🩸', poison: '☠', burn: '🔥' };
const STATUS_LABEL = { bleed: 'Bleed', poison: 'Poison', burn: 'Burn' };

function Nameplate({ side, name, level, subtitle, spriteId, hp, hpMax, mana, manaMax, buffs, statuses, active }) {
  const pct = hpMax > 0 ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : 0;
  const manaPct = manaMax > 0 ? Math.max(0, Math.min(100, (mana / manaMax) * 100)) : 0;
  let tier = 'hp-high';
  if (pct <= 25) tier = 'hp-low';
  else if (pct <= 50) tier = 'hp-mid';

  return (
    <div className={`nameplate nameplate--${side} ${active ? 'is-active-turn' : ''}`}>
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
        {manaMax > 0 && (
          <div className="nameplate__mana-row">
            <div className="nameplate__mana">
              <div className="nameplate__mana-fill" style={{ width: `${manaPct}%` }} />
            </div>
            <span className="nameplate__mana-nums">
              {Math.max(0, Math.round(mana))}/{manaMax} MP
            </span>
          </div>
        )}
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
                {statLabel(b.stat)}
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
