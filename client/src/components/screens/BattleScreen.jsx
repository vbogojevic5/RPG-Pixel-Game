import { useEffect, useRef, useState } from 'react';
import MoveButton from '../ui/MoveButton.jsx';
import Sprite from '../ui/Sprite.jsx';
import BattleLog from '../ui/BattleLog.jsx';
import SpellBurst, { ensureParticleEngine } from '../ui/SpellBurst.jsx';
import StatusOverlay from '../ui/StatusOverlay.jsx';
import useBattle from '../../hooks/useBattle.js';
import { statLabel } from '../../constants/movePresentation.js';
import { formatItemEffect, itemIcon, itemIconSrc } from '../../constants/itemPresentation.js';

function BattleItemIcon({ item }) {
  const [failed, setFailed] = useState(false);
  const src = itemIconSrc(item);
  if (src && !failed) {
    return <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />;
  }
  return itemIcon(item);
}

/** Arena battle UI: sprites, move bar, battle log, floating combat text. */
export default function BattleScreen({
  hero,
  monster,
  moves,
  items,
  constants,
  node,
  biome,
  arenaTheme,
  audio,
  onBattleEnd,
  onExitBattle,
}) {
  const battle = useBattle({ hero, monster, moves, items, constants });
  const battleStartedAt = useRef(new Date().toISOString());
  const outcomeSfxPlayed = useRef(false);
  const heardFloaters = useRef(new Set());

  useEffect(() => {
    ensureParticleEngine();
  }, []);

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
          mapNodeId: node?.id ?? null,
          nodeType: node?.type ?? null,
          biomeId: biome?.id ?? node?.biomeId ?? null,
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
    node,
    biome,
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

  const arenaShakeClass = battle.shake ? `arena--shake-${battle.shake.tier}` : '';

  return (
    <div className={`screen arena-screen ${arenaTheme?.className ?? 'arena-theme--forest'}`}>
      <div className={`arena ${arenaShakeClass}`}>
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
          subtitle={null}
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
          <div className="arena__fighter-stack">
            <Sprite kind="character" id={hero.id} size={160} facing="right" />
            <StatusOverlay statuses={battle.heroState.statuses} />
          </div>
          <div className="arena__fighter-shadow" />
        </div>
        <div
          className={`arena__fighter arena__fighter--monster ${
            battle.animation?.actor === 'monster' ? 'arena__fighter--acting' : ''
          } ${battle.animation?.target === 'monster' ? 'arena__fighter--hit' : ''}`}
        >
          <div className="arena__fighter-stack">
            <Sprite kind="character" id={monster.id} size={160} facing="left" />
            <StatusOverlay statuses={battle.monsterState.statuses} />
          </div>
          <div className="arena__fighter-shadow" />
        </div>

        {battle.animation && (
          <div
            className={`arena__impact arena__impact--${battle.animation.target} arena__impact--${battle.animation.type} arena__impact--effect-${battle.animation.effectKey ?? battle.animation.type}`}
          />
        )}

        {battle.bursts.map((burst) => (
          <SpellBurst
            key={burst.id}
            burstId={burst.id}
            side={burst.side}
            effectKey={burst.effectKey}
            intensity={burst.intensity}
            lifetimeMs={burst.lifetimeMs}
          />
        ))}

        {battle.floaters.map((floater) => (
          <div
            key={floater.id}
            className={`arena__floater arena__floater--${floater.side} arena__floater--${floater.kind} arena__floater--size-${floater.size ?? 'small'}`}
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
                    <BattleItemIcon item={item} />
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
          ) : subtitle ? (
            <span className="nameplate__tag">{subtitle}</span>
          ) : null}
        </div>
        <div className="nameplate__hp-row">
          <div className="nameplate__bar nameplate__bar--hp">
            <div className={`nameplate__hp-fill ${tier}`} style={{ width: `${pct}%` }} />
            <span className="nameplate__bar-label">
              {Math.max(0, Math.round(hp))}/{hpMax}
            </span>
          </div>
        </div>
        {manaMax > 0 && (
          <div className="nameplate__mana-row">
            <div className="nameplate__bar nameplate__bar--mana">
              <div className="nameplate__mana-fill" style={{ width: `${manaPct}%` }} />
              <span className="nameplate__bar-label nameplate__bar-label--mana">
                {Math.max(0, Math.round(mana))}/{manaMax}
              </span>
            </div>
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
