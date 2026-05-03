import { useCallback, useMemo, useRef, useState } from 'react';
import {
  canAffordMove,
  regenMana,
  resolveItem,
  resolveMove,
  tickBuffs,
  tickStatuses,
  tickStatusDurations,
} from '../game/battleLogic.js';
import { getMonsterMove } from '../services/api.js';
import {
  itemEffectKey,
  moveEffectKey,
  statusBurstKey,
} from '../constants/spellEffects.js';

const ACTION_MS = 520;
const TICK_MS = 320;
const MONSTER_THINK_MS = 1200;
const BURST_LIFETIME_MS = 950;
const STATUS_BURST_LIFETIME_MS = 700;
const SHAKE_LIFETIME_MS = 380;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function damageTier(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (amount >= 30) return 'heavy';
  if (amount >= 15) return 'medium';
  return 'light';
}

function damageIntensity(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 1;
  if (amount >= 30) return 1.6;
  if (amount >= 15) return 1.25;
  return 1;
}

function maxDamageFromEvents(events) {
  let max = 0;
  for (const e of events ?? []) {
    if (!e?.text) continue;
    const m = String(e.text).match(/-(\d+)/);
    if (!m) continue;
    if (e.kind === 'damage' || e.kind === 'magic') {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

/** Battle hook: hero/monster HP, buffs, statuses, server-chosen monster moves. */

export default function useBattle({ hero, monster, moves, items, constants }) {
  const [heroState, setHeroState] = useState(() => {
    const stats = hero.stats ?? hero.baseStats;
    return {
      id: hero.id,
      name: hero.name,
      stats,
      currentHealth: stats.health,
      currentMana: stats.mana ?? 0,
      buffs: [],
      statuses: [],
      equippedMoves: hero.equippedMoves ?? hero.defaultMoves ?? [],
      inventory: hero.inventory ?? [],
    };
  });

  const [monsterState, setMonsterState] = useState(() => ({
    id: monster.id,
    name: monster.name,
    stats: monster.stats,
    currentHealth: monster.stats.health,
    buffs: [],
    statuses: [],
    availableMoves: monster.moves,
  }));

  const [log, setLog] = useState([`A wild ${monster.name} appears!`]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outcome, setOutcome] = useState(null); // null | 'victory' | 'defeat'
  const [animation, setAnimation] = useState(null);
  const [floaters, setFloaters] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [shake, setShake] = useState(null);
  const [currentTurn, setCurrentTurn] = useState('hero');

  const isOver = outcome !== null;
  const burstSeq = useRef(0);

  const pushBurst = useCallback(({ side, effectKey, intensity = 1, lifetimeMs = BURST_LIFETIME_MS }) => {
    if (!effectKey) return;
    burstSeq.current += 1;
    const id = `burst-${burstSeq.current}`;
    setBursts((prev) => [...prev, { id, side, effectKey, intensity, lifetimeMs }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, lifetimeMs);
  }, []);

  const triggerShake = useCallback((tier) => {
    if (!tier) return;
    const id = `shake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setShake({ tier, id });
    setTimeout(() => {
      setShake((prev) => (prev && prev.id === id ? null : prev));
    }, SHAKE_LIFETIME_MS);
  }, []);

  const showFloaters = useCallback((events, attackerSide, defenderSide) => {
    if (!events || events.length === 0) return;
    const now = Date.now();
    const next = events.map((event, index) => {
      const text = String(event.text ?? '');
      const m = text.match(/[-+](\d+)/);
      const magnitude = m ? Number(m[1]) : 0;
      let size = 'small';
      if (event.kind === 'damage' || event.kind === 'magic') {
        const tier = damageTier(magnitude);
        size = tier === 'heavy' ? 'huge' : tier === 'medium' ? 'big' : 'small';
      } else if (event.kind === 'heal' && magnitude >= 15) {
        size = 'big';
      }
      return {
        id: `${now}-${index}-${event.text}`,
        side: event.side ?? (event.role === 'attacker' ? attackerSide : defenderSide),
        kind: event.kind,
        text: event.text,
        size,
      };
    });
    setFloaters((prev) => [...prev, ...next].slice(-12));
    for (const floater of next) {
      setTimeout(() => {
        setFloaters((prev) => prev.filter((item) => item.id !== floater.id));
      }, 1100);
    }
  }, []);

  const burstStatusEvents = useCallback(
    (events, defaultSide) => {
      for (const e of events ?? []) {
        const key = statusBurstKey(e.kind);
        if (!key) continue;
        const side = e.side ?? defaultSide ?? 'monster';
        pushBurst({
          side,
          effectKey: key,
          intensity: 0.7,
          lifetimeMs: STATUS_BURST_LIFETIME_MS,
        });
      }
    },
    [pushBurst]
  );

  const playTurn = useCallback(
    async (moveId) => {
      if (isProcessing || isOver) return;
      const heroMove = moves[moveId];
      if (!heroMove) return;
      if (!canAffordMove(heroMove, heroState)) {
        setLog((prev) => [...prev, `${heroState.name} does not have enough resources for ${heroMove.name}.`]);
        return;
      }

      setIsProcessing(true);
      try {
        let nextHero = heroState;
        let nextMonster = monsterState;

        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextHero, 'hero', turnLog);
          nextHero = combatant;
          if (events.length > 0) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            burstStatusEvents(events, 'hero');
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, `${nextHero.name} was defeated!`]);
            setOutcome('defeat');
            return;
          }
        }

        {
          const turnLog = [];
          const heroEffect = moveEffectKey(heroMove);
          setAnimation({
            actor: 'hero',
            target: 'monster',
            type: heroMove.type,
            effectKey: heroEffect,
            moveId: heroMove.id,
            id: Date.now(),
          });
          setCurrentTurn('hero');
          const result = resolveMove(heroMove, nextHero, nextMonster, turnLog);
          nextHero = result.attacker;
          nextMonster = result.defender;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'hero', 'monster');

          const dmg = maxDamageFromEvents(result.events);
          const intensity = damageIntensity(dmg);
          const burstSide =
            heroMove.type === 'heal' || heroMove.type === 'buff' ? 'hero' : 'monster';
          pushBurst({ side: burstSide, effectKey: heroEffect, intensity });
          burstStatusEvents(result.events, 'monster');
          if (dmg >= 15) triggerShake(damageTier(dmg));
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        if (nextMonster.currentHealth <= 0) {
          const turnLog = [`${nextMonster.name} was defeated!`];
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          setOutcome('victory');
          return;
        }

        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextMonster, 'monster', turnLog);
          nextMonster = combatant;
          if (events.length > 0) {
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            burstStatusEvents(events, 'monster');
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, `${nextMonster.name} was defeated!`]);
            setOutcome('victory');
            return;
          }
        }

        const battleState = {
          monsterId: nextMonster.id,
          monsterStats: nextMonster.stats,
          monsterBuffs: nextMonster.buffs,
          heroStats: nextHero.stats,
          heroBuffs: nextHero.buffs,
          heroCurrentHealth: nextHero.currentHealth,
          heroCurrentMana: nextHero.currentMana,
          heroStatuses: nextHero.statuses,
          monsterCurrentHealth: nextMonster.currentHealth,
          monsterStatuses: nextMonster.statuses,
          availableMoves: nextMonster.availableMoves,
        };
        const { move: monsterMoveId } = await getMonsterMove(battleState);
        const monsterMove = moves[monsterMoveId];
        if (!monsterMove) {
          throw new Error(`Unknown monster move: ${monsterMoveId}`);
        }

        setCurrentTurn('monster');
        await sleep(MONSTER_THINK_MS);

        {
          const turnLog = [];
          const monsterEffect = moveEffectKey(monsterMove);
          setAnimation({
            actor: 'monster',
            target: 'hero',
            type: monsterMove.type,
            effectKey: monsterEffect,
            moveId: monsterMove.id,
            id: Date.now(),
          });
          const result = resolveMove(monsterMove, nextMonster, nextHero, turnLog);
          nextMonster = result.attacker;
          nextHero = result.defender;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'monster', 'hero');

          const dmg = maxDamageFromEvents(result.events);
          const intensity = damageIntensity(dmg);
          const burstSide =
            monsterMove.type === 'heal' || monsterMove.type === 'buff' ? 'monster' : 'hero';
          pushBurst({ side: burstSide, effectKey: monsterEffect, intensity });
          burstStatusEvents(result.events, 'hero');
          if (dmg >= 15) triggerShake(damageTier(dmg));
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        if (nextHero.currentHealth <= 0) {
          const turnLog = [`${nextHero.name} was defeated!`];
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          setOutcome('defeat');
          return;
        }

        nextHero = tickStatusDurations(tickBuffs(nextHero));
        nextHero = regenMana(nextHero, constants?.MANA_REGEN_PER_TURN ?? 0);
        nextMonster = tickStatusDurations(tickBuffs(nextMonster));

        setHeroState(nextHero);
        setMonsterState(nextMonster);
        setCurrentTurn('hero');
      } catch (err) {
        setLog((prev) => [...prev, `Error: ${err.message}`]);
      } finally {
        setAnimation(null);
        if (!isOver) setCurrentTurn('hero');
        setIsProcessing(false);
      }
    },
    [
      heroState,
      monsterState,
      isProcessing,
      isOver,
      moves,
      showFloaters,
      constants,
      pushBurst,
      burstStatusEvents,
      triggerShake,
    ]
  );

  const useItemTurn = useCallback(
    async (itemId) => {
      if (isProcessing || isOver) return;
      const item = items?.[itemId];
      if (!item || item.category !== 'consumable') return;
      if (!(heroState.inventory ?? []).some((entry) => entry.itemId === itemId && entry.quantity > 0)) return;

      setIsProcessing(true);
      try {
        let nextHero = heroState;
        let nextMonster = monsterState;

        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextHero, 'hero', turnLog);
          nextHero = combatant;
          if (events.length > 0) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            burstStatusEvents(events, 'hero');
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, `${nextHero.name} was defeated!`]);
            setOutcome('defeat');
            return;
          }
        }

        {
          const turnLog = [];
          const targetSide = item.effect?.kind === 'directDamage' ? 'monster' : 'hero';
          const itemEffect = itemEffectKey(item);
          setAnimation({
            actor: 'hero',
            target: targetSide,
            type: 'item',
            effectKey: itemEffect,
            moveId: item.id,
            id: Date.now(),
          });
          setCurrentTurn('hero');
          const result = resolveItem(item, nextHero, nextMonster, turnLog);
          nextHero = result.user;
          nextMonster = result.target;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'hero', targetSide);
          pushBurst({ side: targetSide, effectKey: itemEffect, intensity: 1.1 });
          if (item.effect?.kind === 'directDamage') {
            const dmg = maxDamageFromEvents(result.events);
            if (dmg >= 15) triggerShake(damageTier(dmg));
          }
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        if (nextMonster.currentHealth <= 0) {
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, `${nextMonster.name} was defeated!`]);
          setOutcome('victory');
          return;
        }

        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextMonster, 'monster', turnLog);
          nextMonster = combatant;
          if (events.length > 0) {
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            burstStatusEvents(events, 'monster');
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, `${nextMonster.name} was defeated!`]);
            setOutcome('victory');
            return;
          }
        }

        const battleState = {
          monsterId: nextMonster.id,
          monsterStats: nextMonster.stats,
          monsterBuffs: nextMonster.buffs,
          heroStats: nextHero.stats,
          heroBuffs: nextHero.buffs,
          heroCurrentHealth: nextHero.currentHealth,
          heroCurrentMana: nextHero.currentMana,
          heroStatuses: nextHero.statuses,
          monsterCurrentHealth: nextMonster.currentHealth,
          monsterStatuses: nextMonster.statuses,
          availableMoves: nextMonster.availableMoves,
        };
        const { move: monsterMoveId } = await getMonsterMove(battleState);
        const monsterMove = moves[monsterMoveId];
        if (!monsterMove) throw new Error(`Unknown monster move: ${monsterMoveId}`);

        setCurrentTurn('monster');
        await sleep(MONSTER_THINK_MS);

        {
          const turnLog = [];
          const monsterEffect = moveEffectKey(monsterMove);
          setAnimation({
            actor: 'monster',
            target: 'hero',
            type: monsterMove.type,
            effectKey: monsterEffect,
            moveId: monsterMove.id,
            id: Date.now(),
          });
          const result = resolveMove(monsterMove, nextMonster, nextHero, turnLog);
          nextMonster = result.attacker;
          nextHero = result.defender;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'monster', 'hero');

          const dmg = maxDamageFromEvents(result.events);
          const intensity = damageIntensity(dmg);
          const burstSide =
            monsterMove.type === 'heal' || monsterMove.type === 'buff' ? 'monster' : 'hero';
          pushBurst({ side: burstSide, effectKey: monsterEffect, intensity });
          burstStatusEvents(result.events, 'hero');
          if (dmg >= 15) triggerShake(damageTier(dmg));
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        if (nextHero.currentHealth <= 0) {
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, `${nextHero.name} was defeated!`]);
          setOutcome('defeat');
          return;
        }

        nextHero = tickStatusDurations(tickBuffs(nextHero));
        nextHero = regenMana(nextHero, constants?.MANA_REGEN_PER_TURN ?? 0);
        nextMonster = tickStatusDurations(tickBuffs(nextMonster));

        setHeroState(nextHero);
        setMonsterState(nextMonster);
        setCurrentTurn('hero');
      } catch (err) {
        setLog((prev) => [...prev, `Error: ${err.message}`]);
      } finally {
        setAnimation(null);
        if (!isOver) setCurrentTurn('hero');
        setIsProcessing(false);
      }
    },
    [
      heroState,
      monsterState,
      isProcessing,
      isOver,
      items,
      moves,
      showFloaters,
      constants,
      pushBurst,
      burstStatusEvents,
      triggerShake,
    ]
  );

  const equippedMoveObjects = useMemo(
    () => heroState.equippedMoves.map((id) => moves[id]).filter(Boolean),
    [heroState.equippedMoves, moves]
  );

  const battleItems = useMemo(
    () => (heroState.inventory ?? [])
      .map((entry) => ({ ...items?.[entry.itemId], quantity: entry.quantity }))
      .filter((item) => item.id && item.category === 'consumable'),
    [heroState.inventory, items]
  );

  const canAfford = useCallback(
    (move) => canAffordMove(move, heroState),
    [heroState]
  );

  return {
    heroState,
    monsterState,
    equippedMoves: equippedMoveObjects,
    battleItems,
    log,
    animation,
    floaters,
    bursts,
    shake,
    currentTurn,
    isProcessing,
    outcome,
    isOver,
    playTurn,
    useItemTurn,
    canAfford,
  };
}
