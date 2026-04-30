import { useCallback, useEffect, useMemo, useState } from 'react';
import { SCREENS } from './constants/gameConstants.js';
import { MUSIC_CONTEXTS } from './constants/audio.js';
import { JOURNEY_NODES } from './constants/overworld.js';
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
import RunMap from './components/screens/RunMap.jsx';
import BattleScreen from './components/screens/BattleScreen.jsx';
import PostBattle from './components/screens/PostBattle.jsx';
import MoveManager from './components/screens/MoveManager.jsx';
import Inventory from './components/screens/Inventory.jsx';
import Shop from './components/screens/Shop.jsx';
import VictoryScreen from './components/screens/VictoryScreen.jsx';
import AudioControls from './components/ui/AudioControls.jsx';
import StatChoiceModal from './components/ui/StatChoiceModal.jsx';

/**
 * Top-level component. Phase 3 wiring:
 *
 *   [not logged in] AuthScreen
 *          └─ login/register ──▶ MainMenu
 *
 *   MainMenu
 *      ├─ Start New Run  ─▶ fetch /run/config ─▶ Overworld
 *      ├─ Load Game      ─▶ LoadGameScreen ─▶ Overworld
 *      └─ Log out        ─▶ AuthScreen
 *
 *   Overworld (RunMap)
 *      ├─ click monster ─▶ Battle ─▶ PostBattle
 *      │                            └─ last kill ▶ Victory
 *      ├─ Moves         ─▶ MoveManager
 *      └─ Save          ─▶ SaveGameModal (overlay)
 */
export default function App() {
  const [screen, setScreen] = useState(SCREENS.MAIN_MENU);
  const [activeMonsterId, setActiveMonsterId] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [lastSummary, setLastSummary] = useState(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
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
    equipItem,
    unequipItem,
    snapshotForSave,
  } = useGameState();

  const maxEquipped = config?.constants?.MAX_EQUIPPED_MOVES ?? 4;

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

  // --- Run lifecycle -------------------------------------------------------

  const openClassSelect = useCallback(async () => {
    try {
      await load();
      setScreen(SCREENS.CLASS_SELECT);
    } catch {
      // error surfaced via the hook
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
        // error surfaced via hook
      }
    },
    [load, loadRun]
  );

  const backToMenu = useCallback(() => {
    reset();
    endRun();
    setActiveMonsterId(null);
    setLastOutcome(null);
    setLastSummary(null);
    setActiveMerchantId(null);
    setSaveModalOpen(false);
    setRunBattleLog([]);
    setLastBattleLog([]);
    setScreen(SCREENS.MAIN_MENU);
  }, [reset, endRun]);

  // --- Battle --------------------------------------------------------------

  const selectMonster = useCallback((monsterId) => {
    setActiveMonsterId(monsterId);
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
    const runMonsterIds = new Set(JOURNEY_NODES.map((node) => node.id));
    const allCleared =
      config &&
      config.monsters
        .filter((m) => runMonsterIds.has(m.id))
        .every((m) => defeatedMonsterIds.includes(m.id));

    if (lastOutcome === 'defeat') {
      fullHealHero();
    }

    setActiveMonsterId(null);
    setLastOutcome(null);
    setLastSummary(null);

    if (allCleared) {
      setScreen(SCREENS.VICTORY);
    } else {
      setScreen(SCREENS.RUN_MAP);
    }
  }, [config, defeatedMonsterIds, lastOutcome, fullHealHero]);

  const leaveBattleToMap = useCallback(() => {
    fullHealHero();
    setActiveMonsterId(null);
    setScreen(SCREENS.RUN_MAP);
  }, [fullHealHero]);

  // --- Move manager --------------------------------------------------------

  const openMoveManager = useCallback(() => setScreen(SCREENS.MOVE_MANAGER), []);
  const closeMoveManager = useCallback(() => setScreen(SCREENS.RUN_MAP), []);
  const openInventory = useCallback(() => setScreen(SCREENS.INVENTORY), []);
  const closeInventory = useCallback(() => setScreen(SCREENS.RUN_MAP), []);
  const openShop = useCallback((merchantId) => {
    setActiveMerchantId(merchantId);
    setScreen(SCREENS.SHOP);
  }, []);
  const closeShop = useCallback(() => {
    setActiveMerchantId(null);
    setScreen(SCREENS.RUN_MAP);
  }, []);
  const saveMoveLoadout = useCallback(
    (equipped) => {
      updateEquippedMoves(equipped);
      setScreen(SCREENS.RUN_MAP);
    },
    [updateEquippedMoves]
  );

  // --- Save / Load ---------------------------------------------------------

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

  // --- Derived -------------------------------------------------------------

  const activeMonster = config?.monsters?.find((m) => m.id === activeMonsterId);
  const activeMerchant = config?.shopConfig?.merchants?.find((merchant) => merchant.id === activeMerchantId);
  const defeatedMonstersInOrder = useMemo(() => {
    if (!config) return [];
    const runMonsterIds = new Set(JOURNEY_NODES.map((node) => node.id));
    return config.monsters
      .filter((m) => runMonsterIds.has(m.id) && defeatedMonsterIds.includes(m.id))
      .sort((a, b) => a.order - b.order);
  }, [config, defeatedMonsterIds]);

  const suggestedSaveName = useMemo(() => {
    if (!auth.player || !hero) return '';
    return `${auth.player.username} Lv${hero.level} · ${defeatedMonsterIds.length}/5`;
  }, [auth.player, hero, defeatedMonsterIds.length]);

  // --- Render --------------------------------------------------------------

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

  return (
    <div className="app">
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
          onBack={backToMenu}
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
          xpThreshold={xpThreshold}
          onSelectMonster={selectMonster}
          onOpenMoveManager={openMoveManager}
          onOpenInventory={openInventory}
          onOpenShop={openShop}
          onOpenSave={openSaveModal}
          onBackToMenu={backToMenu}
        />
      )}

      {screen === SCREENS.BATTLE && activeMonster && hero && (
        <BattleScreen
          key={activeMonster.id + '-' + defeatedMonsterIds.length}
          hero={hero}
          monster={activeMonster}
          moves={config.moves}
          items={config.items}
          constants={config.constants}
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
        <MoveManager
          hero={hero}
          moves={config.moves}
          maxEquipped={maxEquipped}
          onSave={saveMoveLoadout}
          onBack={closeMoveManager}
        />
      )}

      {screen === SCREENS.INVENTORY && hero && config && (
        <Inventory
          hero={hero}
          items={config.items}
          constants={config.constants}
          onEquip={equipItem}
          onUnequip={unequipItem}
          onBack={closeInventory}
        />
      )}

      {screen === SCREENS.SHOP && hero && config && activeMerchant && (
        <Shop
          hero={hero}
          items={config.items}
          merchant={activeMerchant}
          constants={config.constants}
          onBuy={buyItem}
          onBack={closeShop}
        />
      )}

      {screen === SCREENS.VICTORY && hero && config && (
        <VictoryScreen
          hero={hero}
          moves={config.moves}
          runStats={runStats}
          battleLog={runBattleLog}
          defeatedMonsters={defeatedMonstersInOrder}
          onBackToMenu={backToMenu}
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
          levelNumber={hero.level + 1}
          queueRemaining={levelUpQueue}
          rngSeed={levelUpSeed}
          classGrowth={hero.levelUpGrowth}
          onChoose={onPickLevelUp}
        />
      )}
    </div>
  );
}
