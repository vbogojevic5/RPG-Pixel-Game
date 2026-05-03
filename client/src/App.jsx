import { useCallback, useEffect, useMemo, useState } from 'react';
import { RUN_SESSION_STORAGE_KEY, SCREENS } from './constants/gameConstants.js';
import { MUSIC_CONTEXTS } from './constants/audio.js';
import { mapNodes } from './constants/overworld.js';
import useRunConfig from './hooks/useRunConfig.js';
import useGameState from './hooks/useGameState.js';
import useAuth from './hooks/useAuth.js';
import useSaves from './hooks/useSaves.js';
import useAudio from './hooks/useAudio.js';
import { recordBattleResult } from './services/api.js';
import AuthScreen from './components/screens/AuthScreen.jsx';
import MainMenu from './components/screens/MainMenu.jsx';
import CharacterSelect from './components/screens/CharacterSelect.jsx';
import LoadGameScreen from './components/screens/LoadGameScreen.jsx';
import SaveGameModal from './components/screens/SaveGameModal.jsx';
import LeaveRunModal from './components/screens/LeaveRunModal.jsx';
import RunMap from './components/screens/RunMap.jsx';
import BattleScreen from './components/screens/BattleScreen.jsx';
import PostBattle from './components/screens/PostBattle.jsx';
import Configure from './components/screens/Configure.jsx';
import Shop from './components/screens/Shop.jsx';
import VictoryScreen from './components/screens/VictoryScreen.jsx';
import AudioControls from './components/ui/AudioControls.jsx';
import StatChoiceModal from './components/ui/StatChoiceModal.jsx';

/** Mid-run screens: warn before main menu / tab close (hero is set). */
const SCREENS_WITH_ACTIVE_RUN = new Set([
  SCREENS.RUN_MAP,
  SCREENS.BATTLE,
  SCREENS.POST_BATTLE,
  SCREENS.MOVE_MANAGER,
  SCREENS.INVENTORY,
  SCREENS.SHOP,
  SCREENS.VICTORY,
]);

/** Root router: auth, menu, run map, battle, shop, saves. */
export default function App() {
  const [screen, setScreen] = useState(SCREENS.MAIN_MENU);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [activeMonsterId, setActiveMonsterId] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [lastSummary, setLastSummary] = useState(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [leaveRunModalOpen, setLeaveRunModalOpen] = useState(false);
  const [levelUpQueue, setLevelUpQueue] = useState(0);
  const [levelUpSeed, setLevelUpSeed] = useState(0);
  const [lastBattleLog, setLastBattleLog] = useState([]);
  const [runBattleLog, setRunBattleLog] = useState([]);
  const [activeMerchantId, setActiveMerchantId] = useState(null);

  const auth = useAuth();
  const saves = useSaves({ isAuthenticated: auth.isAuthenticated });
  const audio = useAudio();

  const { config, loading, error, load, reset } = useRunConfig();
  const {
    hero,
    defeatedMonsterIds,
    mapProgress,
    runStats,
    xpThreshold,
    startRun,
    loadRun,
    endRun,
    fullHealHero,
    updateEquippedMoves,
    applyBattleOutcome,
    applyLevelUpChoice,
    buyItem,
    shopPurchasedSlots,
    markMapNodeVisited,
    setJourneyMapPageIndex,
    clearMapNode,
    equipItem,
    unequipItem,
    snapshotForSave,
  } = useGameState();

  const maxEquipped = config?.constants?.MAX_EQUIPPED_MOVES ?? 4;

  useEffect(() => {
    if (!auth.isAuthenticated || auth.checking) return;
    const raw = sessionStorage.getItem(RUN_SESSION_STORAGE_KEY);
    if (!raw) {
      queueMicrotask(() => setSessionHydrated(true));
      return;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(RUN_SESSION_STORAGE_KEY);
      queueMicrotask(() => setSessionHydrated(true));
      return;
    }
    if (data.playerId != null && data.playerId !== auth.player?.id) {
      sessionStorage.removeItem(RUN_SESSION_STORAGE_KEY);
      queueMicrotask(() => setSessionHydrated(true));
      return;
    }
    if (data.screen === SCREENS.MAIN_MENU) {
      sessionStorage.removeItem(RUN_SESSION_STORAGE_KEY);
      queueMicrotask(() => setSessionHydrated(true));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const cfg = await load();
        if (cancelled) return;
        if (data.save) {
          loadRun(data.save, cfg);
        }
        if (data.screen) setScreen(data.screen);
        if ('activeMonsterId' in data) setActiveMonsterId(data.activeMonsterId ?? null);
        if ('activeNodeId' in data) setActiveNodeId(data.activeNodeId ?? null);
        if ('lastOutcome' in data) setLastOutcome(data.lastOutcome ?? null);
        if ('lastSummary' in data) setLastSummary(data.lastSummary ?? null);
        if (typeof data.levelUpQueue === 'number') setLevelUpQueue(data.levelUpQueue);
        setRunBattleLog(Array.isArray(data.runBattleLog) ? data.runBattleLog : []);
        if (Array.isArray(data.lastBattleLog)) setLastBattleLog(data.lastBattleLog);
        if ('activeMerchantId' in data) setActiveMerchantId(data.activeMerchantId ?? null);
        if (typeof data.saveModalOpen === 'boolean') setSaveModalOpen(data.saveModalOpen);
      } catch (e) {
        console.warn('[session] restore failed', e);
        sessionStorage.removeItem(RUN_SESSION_STORAGE_KEY);
      } finally {
        setSessionHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    auth.isAuthenticated,
    auth.checking,
    auth.player?.id,
    load,
    loadRun,
  ]);

  useEffect(() => {
    if (!sessionHydrated || !auth.isAuthenticated) return;
    if (screen === SCREENS.MAIN_MENU) {
      sessionStorage.removeItem(RUN_SESSION_STORAGE_KEY);
      return;
    }
    if (screen === SCREENS.CLASS_SELECT || screen === SCREENS.LOAD_GAME) {
      const payload = {
        v: 1,
        playerId: auth.player?.id ?? null,
        screen,
        activeMonsterId: null,
        activeNodeId: null,
        lastOutcome: null,
        lastSummary: null,
        levelUpQueue: 0,
        runBattleLog: [],
        lastBattleLog: [],
        activeMerchantId: null,
        saveModalOpen: false,
      };
      sessionStorage.setItem(RUN_SESSION_STORAGE_KEY, JSON.stringify(payload));
      return;
    }
    if (!hero) return;
    const snap = snapshotForSave('__session__');
    if (!snap) return;
    sessionStorage.setItem(
      RUN_SESSION_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        playerId: auth.player?.id ?? null,
        screen,
        activeMonsterId,
        activeNodeId,
        lastOutcome,
        lastSummary,
        levelUpQueue,
        runBattleLog,
        lastBattleLog,
        activeMerchantId,
        saveModalOpen,
        save: {
          heroState: snap.heroState,
          defeatedMonsterIds: snap.defeatedMonsterIds,
          runStats: snap.runStats,
          shopPurchasedSlots: snap.shopPurchasedSlots ?? [],
        },
      })
    );
  }, [
    sessionHydrated,
    auth.isAuthenticated,
    auth.player?.id,
    screen,
    hero,
    activeMonsterId,
    activeNodeId,
    lastOutcome,
    lastSummary,
    levelUpQueue,
    runBattleLog,
    lastBattleLog,
    activeMerchantId,
    saveModalOpen,
    snapshotForSave,
  ]);

  useEffect(() => {
    let context = MUSIC_CONTEXTS.TITLE;
    if (auth.isAuthenticated) {
      if (
        screen === SCREENS.RUN_MAP ||
        screen === SCREENS.MOVE_MANAGER ||
        screen === SCREENS.INVENTORY ||
        screen === SCREENS.SHOP ||
        screen === SCREENS.LOAD_GAME
      ) {
        context = MUSIC_CONTEXTS.JOURNEY;
      } else if (screen === SCREENS.BATTLE) {
        context = MUSIC_CONTEXTS.BATTLE;
      } else if (screen === SCREENS.POST_BATTLE) {
        context = lastOutcome === 'defeat' ? MUSIC_CONTEXTS.DEFEAT : MUSIC_CONTEXTS.VICTORY;
      } else if (screen === SCREENS.VICTORY) {
        context = MUSIC_CONTEXTS.VICTORY;
      }
    }
    audio.playMusic(context);
  }, [audio, auth.isAuthenticated, lastOutcome, screen]);

  /* Browser tab close / refresh: native prompt only (custom UI not allowed here). */
  useEffect(() => {
    if (!hero || !SCREENS_WITH_ACTIVE_RUN.has(screen)) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hero, screen]);

  const openClassSelect = useCallback(async () => {
    try {
      await load();
      setScreen(SCREENS.CLASS_SELECT);
    } catch {
      /* useRunConfig exposes error */
    }
  }, [load]);

  const startGame = useCallback((heroClassId) => {
    if (!config) return;
    startRun(config, heroClassId);
    setRunBattleLog([]);
    setLastBattleLog([]);
    setScreen(SCREENS.RUN_MAP);
  }, [config, startRun]);

  const openLoadGame = useCallback(() => {
    saves.refresh();
    setScreen(SCREENS.LOAD_GAME);
  }, [saves]);

  const loadSavedGame = useCallback(
    async (save) => {
      try {
        const fresh = await load();
        loadRun(save, fresh);
        setRunBattleLog([]);
        setLastBattleLog([]);
        setScreen(SCREENS.RUN_MAP);
      } catch {
        /* useRunConfig exposes error */
      }
    },
    [load, loadRun]
  );

  const backToMenu = useCallback(() => {
    setLeaveRunModalOpen(false);
    reset();
    endRun();
    setActiveMonsterId(null);
    setActiveNodeId(null);
    setLastOutcome(null);
    setLastSummary(null);
    setActiveMerchantId(null);
    setSaveModalOpen(false);
    setRunBattleLog([]);
    setLastBattleLog([]);
    setScreen(SCREENS.MAIN_MENU);
  }, [reset, endRun]);

  const requestLeaveToMenu = useCallback(() => {
    if (hero && SCREENS_WITH_ACTIVE_RUN.has(screen)) {
      setLeaveRunModalOpen(true);
      return;
    }
    backToMenu();
  }, [hero, screen, backToMenu]);

  const openSaveFromLeavePrompt = useCallback(() => {
    setLeaveRunModalOpen(false);
    saves.refresh();
    setSaveModalOpen(true);
  }, [saves]);

  const selectNode = useCallback((node) => {
    setActiveNodeId(node.id);
    setActiveMonsterId(node.monsterId);
    setScreen(SCREENS.BATTLE);
  }, []);

  const onBattleEnd = useCallback(
    (payload) => {
      const summary = applyBattleOutcome(payload);
      const endedMonster = config?.monsters?.find((m) => m.id === payload.monsterId);
      recordBattleResult({
        monsterId: payload.monsterId,
        monsterName: endedMonster?.name,
        outcome: payload.outcome,
        xpGained: summary.xpGained ?? 0,
        battleLog: payload.battleLog ?? [],
        mapNodeId: payload.mapNodeId,
        nodeType: payload.nodeType,
        biomeId: payload.biomeId,
        startedAt: payload.battleStartedAt,
        endedAt: payload.battleEndedAt,
      }).catch((err) => {
        console.warn('[battle-results] failed to persist battle log:', err.message);
      });
      setLastOutcome(payload.outcome);
      setLastSummary(summary);
      setLastBattleLog(payload.battleLog ?? []);
      setRunBattleLog((log) => [
        ...log,
        `--- ${payload.outcome === 'victory' ? 'Victory' : 'Defeat'} vs ${endedMonster?.name ?? payload.monsterId} ---`,
        ...(payload.battleLog ?? []),
      ]);
      setLevelUpQueue(summary.pendingLevelUps ?? 0);
      setLevelUpSeed(Math.random());
      setScreen(SCREENS.POST_BATTLE);
    },
    [applyBattleOutcome, config]
  );

  const onPickLevelUp = useCallback(
    (gains) => {
      applyLevelUpChoice(gains);
      setLevelUpQueue((n) => Math.max(0, n - 1));
      setLevelUpSeed(Math.random());
    },
    [applyLevelUpChoice]
  );

  const onPostBattleContinue = useCallback(() => {
    const allCleared = Boolean(mapProgress?.bossDefeated);

    if (lastOutcome === 'defeat') {
      fullHealHero();
    }

    setActiveMonsterId(null);
    setActiveNodeId(null);
    setLastOutcome(null);
    setLastSummary(null);

    if (allCleared) {
      setRunBattleLog((log) => {
        if (log.length > 0) return log;
        if (!lastBattleLog?.length) return log;
        return [
          '— Run log was missing from memory; showing the last battle only —',
          ...lastBattleLog,
        ];
      });
      setScreen(SCREENS.VICTORY);
    } else {
      setScreen(SCREENS.RUN_MAP);
    }
  }, [mapProgress?.bossDefeated, lastOutcome, fullHealHero, lastBattleLog]);

  const leaveBattleToMap = useCallback(() => {
    fullHealHero();
    setActiveMonsterId(null);
    setActiveNodeId(null);
    setScreen(SCREENS.RUN_MAP);
  }, [fullHealHero]);

  const openConfigure = useCallback(() => setScreen(SCREENS.MOVE_MANAGER), []);
  const closeConfigure = useCallback(() => setScreen(SCREENS.RUN_MAP), []);
  const openShop = useCallback((merchantId, nodeId = null) => {
    if (nodeId) {
      setActiveNodeId(nodeId);
      markMapNodeVisited(nodeId);
      clearMapNode(nodeId);
    }
    setActiveMerchantId(merchantId);
    setScreen(SCREENS.SHOP);
  }, [clearMapNode, markMapNodeVisited]);
  const closeShop = useCallback(() => {
    setActiveMerchantId(null);
    setActiveNodeId(null);
    setScreen(SCREENS.RUN_MAP);
  }, []);
  const saveMoveLoadout = useCallback(
    (equipped) => {
      updateEquippedMoves(equipped);
      setScreen(SCREENS.RUN_MAP);
    },
    [updateEquippedMoves]
  );

  const openSaveModal = useCallback(() => setSaveModalOpen(true), []);
  const closeSaveModal = useCallback(() => setSaveModalOpen(false), []);

  const createSave = useCallback(
    async (name) => {
      const payload = snapshotForSave(name);
      if (!payload) return;
      await saves.create(payload);
      setSaveModalOpen(false);
    },
    [snapshotForSave, saves]
  );

  const overwriteSave = useCallback(
    async (save) => {
      const payload = snapshotForSave(save.name);
      if (!payload) return;
      await saves.update(save.id, payload);
      setSaveModalOpen(false);
    },
    [snapshotForSave, saves]
  );

  const currentMapNodes = useMemo(() => (config ? mapNodes(config) : []), [config]);
  const activeMonster = config?.monsters?.find((m) => m.id === activeMonsterId);
  const activeNode = currentMapNodes.find((node) => node.id === activeNodeId) ?? null;
  const activeBiome = activeNode?.biomeId ? config?.biomeConfig?.[activeNode.biomeId] : null;
  const activeArenaTheme = activeBiome?.arenaTheme ? config?.arenaThemes?.[activeBiome.arenaTheme] : null;
  const activeMerchant = config?.shopConfig?.merchants?.find((merchant) => merchant.id === activeMerchantId);
  const defeatedMonstersInOrder = useMemo(() => {
    if (!config) return [];
    const runMonsterIds = new Set(currentMapNodes.map((node) => node.monsterId).filter(Boolean));
    return config.monsters
      .filter((m) => runMonsterIds.has(m.id) && defeatedMonsterIds.includes(m.id))
      .sort((a, b) => a.order - b.order);
  }, [config, currentMapNodes, defeatedMonsterIds]);

  /** Full-run log for victory; fall back to last fight if aggregate was lost (e.g. old session). */
  const victoryBattleLog = useMemo(() => {
    if (runBattleLog.length > 0) return runBattleLog;
    if (lastBattleLog.length > 0) return lastBattleLog;
    return [];
  }, [runBattleLog, lastBattleLog]);

  const suggestedSaveName = useMemo(() => {
    if (!hero) return '';
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `Level ${hero.level} - ${dd}/${mm}/${yyyy}`;
  }, [hero]);

  if (auth.checking) {
    return (
      <div className="app">
        <div className="screen auth-screen">
          <div className="auth-card">
            <p className="auth-card__hint">Checking session…</p>
          </div>
        </div>
      </div>
    );
  }

  if (auth.isAuthenticated && !sessionHydrated) {
    return (
      <div className="app">
        <div className="screen auth-screen">
          <div className="auth-card">
            <p className="auth-card__hint">Restoring run…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="app">
        <AudioControls audio={audio} />
        <AuthScreen
          onLogin={auth.login}
          onRegister={auth.register}
          submitting={auth.submitting}
          error={auth.error}
          clearError={auth.clearError}
        />
      </div>
    );
  }

  const runShellLayout =
    screen === SCREENS.RUN_MAP ||
    screen === SCREENS.MOVE_MANAGER ||
    screen === SCREENS.INVENTORY;

  return (
    <div className={`app${runShellLayout ? ' app--run-shell' : ''}`}>
      <AudioControls audio={audio} />
      {screen === SCREENS.MAIN_MENU && (
        <MainMenu
          player={auth.player}
          saveCount={saves.saves.length}
          loading={loading}
          error={error}
          onStartGame={openClassSelect}
          onLoadGame={openLoadGame}
          onLogout={() => {
            reset();
            endRun();
            sessionStorage.removeItem(RUN_SESSION_STORAGE_KEY);
            auth.logout();
          }}
        />
      )}

      {screen === SCREENS.CLASS_SELECT && config && (
        <CharacterSelect
          config={config}
          loading={loading}
          error={error}
          onChooseClass={startGame}
          onBack={requestLeaveToMenu}
        />
      )}

      {screen === SCREENS.LOAD_GAME && (
        <LoadGameScreen
          saves={saves.saves}
          loading={saves.loading}
          busy={saves.busy || loading}
          error={saves.error ?? error}
          onLoad={loadSavedGame}
          onDelete={saves.remove}
          onBack={() => setScreen(SCREENS.MAIN_MENU)}
        />
      )}

      {screen === SCREENS.RUN_MAP && config && hero && (
        <RunMap
          config={config}
          hero={hero}
          defeatedMonsterIds={defeatedMonsterIds}
          mapProgress={mapProgress}
          mapPageIndex={mapProgress?.lastMapPageIndex ?? 0}
          onMapPageChange={setJourneyMapPageIndex}
          xpThreshold={xpThreshold}
          onSelectNode={selectNode}
          onOpenConfigure={openConfigure}
          onOpenShop={openShop}
          onOpenSave={openSaveModal}
          onBackToMenu={requestLeaveToMenu}
        />
      )}

      {screen === SCREENS.BATTLE && activeMonster && hero && (
        <BattleScreen
          key={`${activeNode?.id ?? activeMonster.id}-${defeatedMonsterIds.length}`}
          hero={hero}
          monster={activeMonster}
          moves={config.moves}
          items={config.items}
          constants={config.constants}
          node={activeNode}
          biome={activeBiome}
          arenaTheme={activeArenaTheme}
          audio={audio}
          onBattleEnd={onBattleEnd}
          onExitBattle={leaveBattleToMap}
        />
      )}

      {screen === SCREENS.POST_BATTLE && activeMonster && (
        <PostBattle
          outcome={lastOutcome}
          monster={activeMonster}
          moves={config.moves}
          items={config.items}
          summary={lastSummary}
          battleLog={lastBattleLog}
          pendingLevelUps={levelUpQueue}
          onContinue={onPostBattleContinue}
        />
      )}

      {screen === SCREENS.MOVE_MANAGER && hero && config && (
        <Configure
          hero={hero}
          moves={config.moves}
          items={config.items}
          constants={config.constants}
          xpThreshold={xpThreshold}
          maxEquipped={maxEquipped}
          onSaveMoves={saveMoveLoadout}
          onEquip={equipItem}
          onUnequip={unequipItem}
          onBack={closeConfigure}
        />
      )}

      {screen === SCREENS.SHOP && hero && config && activeMerchant && (
        <Shop
          hero={hero}
          items={config.items}
          merchant={activeMerchant}
          constants={config.constants}
          shopPurchasedSlots={shopPurchasedSlots}
          onBuy={buyItem}
          onBack={closeShop}
        />
      )}

      {screen === SCREENS.VICTORY && hero && config && (
        <VictoryScreen
          hero={hero}
          moves={config.moves}
          runStats={runStats}
          battleLog={victoryBattleLog}
          defeatedMonsters={defeatedMonstersInOrder}
          onBackToMenu={requestLeaveToMenu}
        />
      )}

      {leaveRunModalOpen && (
        <LeaveRunModal
          onSaveFirst={openSaveFromLeavePrompt}
          onLeaveWithoutSaving={backToMenu}
          onDismiss={() => setLeaveRunModalOpen(false)}
        />
      )}

      {saveModalOpen && (
        <SaveGameModal
          saves={saves.saves}
          busy={saves.busy}
          error={saves.error}
          suggestedName={suggestedSaveName}
          onCreate={createSave}
          onOverwrite={overwriteSave}
          onClose={closeSaveModal}
        />
      )}

      {screen === SCREENS.POST_BATTLE && levelUpQueue > 0 && hero && (
        <StatChoiceModal
          queueRemaining={levelUpQueue}
          rngSeed={levelUpSeed}
          onChoose={onPickLevelUp}
        />
      )}
    </div>
  );
}
