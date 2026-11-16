import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Backpack,
  Code2,
  Layers,
  Map,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DialogueBox } from './components/DialogueBox';
import { InventoryModal } from './components/InventoryModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { MiniMapHud } from './components/MiniMapHud';
import { SettingsModal } from './components/SettingsModal';
import { TouchControls } from './components/TouchControls';
import { UnityCodeModal } from './components/UnityCodeModal';
import { WorldMapModal } from './components/WorldMapModal';
import { soundEngine } from './game/audio';
import { COMBAT_STYLE_SPECS, getStyleSpec } from './game/combat';
import { GameEngine } from './game/engine';
import type { VirtualAction } from './game/input';
import {
  DEFAULT_MOVEMENT_CONFIG,
  type GameSettings,
  type HudSnapshot,
  type LevelPreset,
  type MovementConfig,
} from './game/types';

const SETTINGS_KEY = 'mossgrotto_settings_v1';

const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  screenShake: true,
  touchControls: 'auto',
};

function loadInitialSettings(): { settings: GameSettings; volume: number } {
  if (typeof window === 'undefined') {
    return { settings: DEFAULT_SETTINGS, volume: 0.8 };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { settings: DEFAULT_SETTINGS, volume: 0.8 };
    const parsed = JSON.parse(raw) as Partial<GameSettings> & { volume?: number };
    return {
      settings: {
        muted: Boolean(parsed.muted),
        screenShake: parsed.screenShake !== false,
        touchControls:
          parsed.touchControls === 'on' || parsed.touchControls === 'off'
            ? parsed.touchControls
            : 'auto',
      },
      volume:
        typeof parsed.volume === 'number'
          ? Math.max(0, Math.min(1, parsed.volume))
          : 0.8,
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, volume: 0.8 };
  }
}

const INITIAL_HUD: HudSnapshot = {
  status: 'TITLE_MENU',
  sceneTheme: 'crystal',
  hp: 5,
  maxHp: 5,
  soul: 33,
  maxSoul: 100,
  essence: 0,
  level: 1,
  levelTitle: 'Beginner Knight',
  abilityLabel: 'Basic Horizontal Slash',
  activeAttackName: 'Basic Horizontal Slash',
  activeAttackLevel: 1,
  activeStyle: 'hunter',
  activeStyleLabel: 'Hunter',
  activeHoldName: 'Twin Needle Barrage',
  activePogoName: 'Piercing Needle Pogo',
  chargeProgress: 0,
  unlockedStyles: ['hunter'],
  comboStep: 0,
  xp: 0,
  xpIntoLevel: 0,
  xpForNextLevel: 25,
  xpProgress: 0,
  unlockedAbilities: {
    walkJump: true,
    swordAttack: false,
    dash: false,
    wallJump: false,
    doubleJump: false,
    energyAttack: false,
    shadowDash: false,
    strongMagic: false,
    combatCombo: false,
    ultimateAbility: false,
  },
  levelUpBanner: null,
  zoneName: 'Frozen Rim Entry',
  currentRoomId: 'ice-entry',
  roomX: 0,
  roomY: 0,
  biomeTransitionLabel: null,
  worldWidth: 3400,
  worldHeight: 2150,
  playerNormX: 0.15,
  playerNormY: 0.55,
  rooms: [],
  secretWallsBroken: 0,
  totalSecretWalls: 2,
  bossActive: false,
  bossName: 'Mosslight Warden',
  bossHp: 18,
  bossMaxHp: 18,
  elapsedSeconds: 0,
  enemiesDefeated: 0,
  pogoChains: 0,
  canHeal: false,
  dashReady: true,
  inventory: [],
  nearbySpeaker: null,
  activeDialogue: null,
  hasSaveData: false,
};

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const initialPrefs = useRef(loadInitialSettings());

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>(initialPrefs.current.settings);
  const [volume, setVolume] = useState<number>(initialPrefs.current.volume);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [levelSelectOpen, setLevelSelectOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [tuning, setTuning] = useState<MovementConfig>({ ...DEFAULT_MOVEMENT_CONFIG });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detectTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    detectTouch();
    window.addEventListener('touchstart', detectTouch, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', detectTouch);
  }, []);

  useEffect(() => {
    soundEngine.setMuted(settings.muted);
    soundEngine.setVolume(volume);
    engineRef.current?.setScreenShakeEnabled(settings.screenShake);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, volume }));
    } catch {
      // Ignore storage errors
    }
  }, [settings, volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(
      canvas,
      (nextHud) => {
        setHud(nextHud);
      },
      () => {
        setMapOpen((prev) => !prev);
      },
      () => {
        setInventoryOpen((prev) => !prev);
      }
    );
    engine.setScreenShakeEnabled(initialPrefs.current.settings.screenShake);
    soundEngine.setMuted(initialPrefs.current.settings.muted);
    soundEngine.setVolume(initialPrefs.current.volume);
    engineRef.current = engine;
    engine.mount();

    return () => {
      engine.unmount();
      engineRef.current = null;
    };
  }, []);

  const anyModalOpen =
    mapOpen || codeModalOpen || settingsOpen || levelSelectOpen || inventoryOpen;

  useEffect(() => {
    engineRef.current?.setExternalHold(anyModalOpen);
  }, [anyModalOpen]);

  useEffect(() => {
    if (!anyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (settingsOpen) setSettingsOpen(false);
        else if (levelSelectOpen) setLevelSelectOpen(false);
        else if (inventoryOpen) setInventoryOpen(false);
        else if (codeModalOpen) setCodeModalOpen(false);
        else if (mapOpen) setMapOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anyModalOpen, settingsOpen, levelSelectOpen, inventoryOpen, codeModalOpen, mapOpen]);

  const focusCanvas = useCallback(() => {
    requestAnimationFrame(() => {
      canvasRef.current?.focus();
    });
  }, []);

  const handleStartGame = useCallback(() => {
    setLevelSelectOpen(false);
    setSettingsOpen(false);
    setInventoryOpen(false);
    engineRef.current?.startNewGame();
    focusCanvas();
  }, [focusCanvas]);

  const handleContinueGame = useCallback(() => {
    setLevelSelectOpen(false);
    setSettingsOpen(false);
    engineRef.current?.continueSavedGame();
    focusCanvas();
  }, [focusCanvas]);

  const handleSelectPreset = useCallback((preset: LevelPreset) => {
    setLevelSelectOpen(false);
    engineRef.current?.startAtPreset(preset);
    focusCanvas();
  }, [focusCanvas]);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
    focusCanvas();
  }, [focusCanvas]);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleRespawn = useCallback(() => {
    engineRef.current?.respawnAtCheckpoint();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setInventoryOpen(false);
    setSettingsOpen(false);
    setMapOpen(false);
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const handleToggleScreenShake = useCallback(() => {
    setSettings((prev) => ({ ...prev, screenShake: !prev.screenShake }));
  }, []);

  const handleTouchControlsChange = useCallback((mode: GameSettings['touchControls']) => {
    setSettings((prev) => ({ ...prev, touchControls: mode }));
  }, []);

  const handleVirtualAction = useCallback((action: VirtualAction, active: boolean) => {
    engineRef.current?.setVirtualInput(action, active);
  }, []);

  const handleTuningChange = useCallback((key: keyof MovementConfig, value: number) => {
    setTuning((prev) => {
      const updated = { ...prev, [key]: value };
      engineRef.current?.updateMovementConfig({ [key]: value });
      return updated;
    });
  }, []);

  const handleResetTuning = useCallback(() => {
    const fresh = { ...DEFAULT_MOVEMENT_CONFIG };
    setTuning(fresh);
    engineRef.current?.updateMovementConfig(fresh);
  }, []);

  // Enter / Space shortcut on Title Screen
  useEffect(() => {
    if (hud.status !== 'TITLE_MENU' || anyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleStartGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.status, anyModalOpen, handleStartGame]);

  const soulPct = Math.round((hud.soul / hud.maxSoul) * 100);
  const showTouchControls =
    hud.status === 'PLAYING' &&
    !anyModalOpen &&
    (settings.touchControls === 'on' || (settings.touchControls === 'auto' && isTouchDevice));

  return (
    <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-[#040b0d]">
      {/* Isolated Full-Viewport Game Canvas */}
      <div className="h-full w-full">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onMouseDown={() => canvasRef.current?.focus()}
          className="block h-full w-full cursor-crosshair outline-none"
        />
      </div>

      {/* === ACTIVE GAMEPLAY HUD (Pointer-events-none wrapper, zero backdrop-blur, >=85% unobstructed) === */}
      {hud.status === 'PLAYING' && (
        <div className="safe-hud pointer-events-none fixed inset-0 z-10 flex flex-col justify-between md:p-6">
          {/* Top Perimeter Row */}
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left: Soul Vessel + Mask HP + Zone Readout */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
              {/* Custom SVG Soul Vessel */}
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
                <svg
                  viewBox="0 0 64 64"
                  className="h-12 w-12 overflow-visible sm:h-14 sm:w-14"
                  aria-label={`Soul ${soulPct}%`}
                >
                  <defs>
                    <clipPath id="soul-vessel-clip">
                      <circle cx="32" cy="32" r="23" />
                    </clipPath>
                  </defs>
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="#071315"
                    stroke={hud.canHeal ? '#a7f3d0' : '#335c54'}
                    strokeWidth="2.5"
                  />
                  <g clipPath="url(#soul-vessel-clip)">
                    <rect
                      x="6"
                      y={55 - (soulPct / 100) * 46}
                      width="52"
                      height="52"
                      fill={hud.canHeal ? '#6ee7b7' : '#3b8e78'}
                    />
                  </g>
                  <circle cx="32" cy="32" r="23" fill="none" stroke="rgba(236, 253, 245, 0.25)" strokeWidth="1" />
                </svg>
                <span className="font-mono-code absolute text-[11px] font-medium text-[#ecfdf5] tabular-nums drop-shadow">
                  {hud.soul}
                </span>
              </div>

              {/* Masks & Quiet Metadata */}
              <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5" aria-label={`Health ${hud.hp} of ${hud.maxHp}`}>
                  {Array.from({ length: hud.maxHp }).map((_, idx) => {
                    const active = idx < hud.hp;
                    return (
                      <svg key={idx} viewBox="0 0 28 32" className="h-6 w-5 sm:h-7 sm:w-6">
                        <path
                          d="M6 10 L4 3 L10 8 L18 8 L24 3 L22 10 C25 14 24 24 14 29 C4 24 3 14 6 10 Z"
                          fill={active ? '#eef7f3' : '#0b191b'}
                          stroke={active ? '#74c69d' : '#2a4944'}
                          strokeWidth="1.8"
                        />
                        {active && (
                          <>
                            <ellipse cx="10.5" cy="17" rx="1.6" ry="2.4" fill="#081314" />
                            <ellipse cx="17.5" cy="17" rx="1.6" ry="2.4" fill="#081314" />
                          </>
                        )}
                      </svg>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#a3c4b9] sm:text-xs">
                  <span className="truncate font-medium text-[#d8f3dc]">{hud.zoneName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-code tabular-nums">{hud.essence} Essence</span>
                  {hud.canHeal && (
                    <>
                      <span className="hidden sm:inline" aria-hidden="true">·</span>
                      <span className="hidden text-[#6ee7b7] sm:inline">F to Focus</span>
                    </>
                  )}
                </div>
                {/* Level Name & XP Progress Bar */}
                <div className="mt-0.5 flex max-w-[260px] flex-col gap-1 sm:max-w-[300px]">
                  <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
                    <span className="truncate font-semibold text-[#eef7f3]">
                      Level {hud.level}: {hud.levelTitle}
                    </span>
                    <span className="font-mono-code shrink-0 text-[#95d5b2] tabular-nums">
                      {hud.level >= 10 ? 'MAX' : `${hud.xpIntoLevel}/${hud.xpForNextLevel} XP`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full border border-[#24443f] bg-[#071315]">
                    <div
                      className="h-full origin-left bg-[#52b788] transition-transform duration-200 ease-out"
                      style={{ transform: `scaleX(${Math.max(0.02, hud.xpProgress)})` }}
                    />
                  </div>
                  <div className="truncate text-[10px] text-[#83a69b]">
                    Active Attack:{' '}
                    <span className="font-semibold text-[#fde047]">
                      Level {hud.activeAttackLevel} {hud.activeAttackName}
                    </span>
                    {hud.level >= 9 && (
                      <span className="ml-1.5 font-mono-code text-[10px] text-[#67e8f9]">
                        [{hud.comboStep + 1}/3]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top-Right: Timer, Utility Buttons & Compact Mini-Map HUD */}
            <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                <span className="font-mono-code mr-1 hidden text-xs text-[#93b7ac] tabular-nums sm:inline">
                  {formatTime(hud.elapsedSeconds)}
                </span>
                <button
                  type="button"
                  onClick={() => setInventoryOpen(true)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#24443f] bg-[#081618]/90 text-[#cbe5dc] transition-colors hover:bg-[#112a2c] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4]"
                  aria-label="Open inventory"
                  title="Inventory (I)"
                >
                  <Backpack className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#24443f] bg-[#081618]/90 text-[#cbe5dc] transition-colors hover:bg-[#112a2c] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4]"
                  aria-label="Open cavern map"
                  title="Open Map (M)"
                >
                  <Map className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#24443f] bg-[#081618]/90 text-[#cbe5dc] transition-colors hover:bg-[#112a2c] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4] sm:flex"
                  aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
                  title={settings.muted ? 'Unmute audio' : 'Mute audio'}
                >
                  {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#24443f] bg-[#081618]/90 text-[#cbe5dc] transition-colors hover:bg-[#112a2c] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4]"
                  aria-label="Pause game"
                  title="Pause (Esc)"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>

              <div className="origin-top-right scale-90 sm:scale-100">
                <MiniMapHud
                  sceneTheme={hud.sceneTheme}
                  rooms={hud.rooms}
                  currentRoomId={hud.currentRoomId}
                  roomX={hud.roomX}
                  roomY={hud.roomY}
                  worldWidth={hud.worldWidth}
                  worldHeight={hud.worldHeight}
                  playerNormX={hud.playerNormX}
                  playerNormY={hud.playerNormY}
                  onOpenFullMap={() => setMapOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Physical Biome Gateway Transition Banner */}
          {hud.biomeTransitionLabel && !hud.levelUpBanner && (
            <div className="mx-auto mt-1 max-w-md rounded-xl border border-[#5eead4]/50 bg-[#081618]/95 px-5 py-2.5 text-center shadow-2xl">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-[#74c69d] uppercase">
                Entering Region
              </div>
              <div className="font-display mt-0.5 text-base font-semibold tracking-wider text-[#eef7f3]">
                {hud.biomeTransitionLabel}
              </div>
            </div>
          )}

          {/* On-Screen Level-Up Notification Banner */}
          {hud.levelUpBanner && (
            <div className="mx-auto mt-1 max-w-md rounded-xl border border-[#fde047]/60 bg-[#081618]/95 px-5 py-2.5 text-center shadow-2xl">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-[#fde047] uppercase">
                NEW ABILITY UNLOCKED: {hud.levelUpBanner.abilityLabel.toUpperCase()}!
              </div>
              <div className="font-display mt-0.5 text-sm font-semibold text-[#eef7f3]">
                Level {hud.levelUpBanner.level}: {hud.levelUpBanner.title}
              </div>
            </div>
          )}

          {/* Bottom Boss Bar (Only active inside Warden's Sanctum during boss fight) */}
          {hud.bossActive && (
            <div
              className={`mx-auto w-full max-w-lg px-4 ${
                showTouchControls ? 'mb-36 sm:mb-40 md:mb-2' : 'mb-2'
              }`}
            >
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="font-display text-sm font-semibold tracking-wider text-[#e2f5ec]">
                  {hud.bossName}
                </span>
                <span className="font-mono-code text-xs text-[#9ec2b6] tabular-nums">
                  {hud.bossHp} / {hud.bossMaxHp}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-[#2b4d46] bg-[#071314]">
                <div
                  className="h-full origin-left bg-[#52b788] transition-transform duration-150 ease-out"
                  style={{ transform: `scaleX(${Math.max(0, hud.bossHp / hud.bossMaxHp)})` }}
                />
              </div>
            </div>
          )}

          {/* NPC / Lore Tablet Dialogue Card & Proximity Prompt */}
          {!anyModalOpen && (
            <DialogueBox
              activeDialogue={hud.activeDialogue}
              nearbySpeaker={hud.nearbySpeaker}
              touchActive={showTouchControls}
              onInteract={() => engineRef.current?.interactWithNearbySpeaker()}
              onAdvance={() => engineRef.current?.advanceDialogue()}
              onClose={() => engineRef.current?.closeDialogue()}
            />
          )}

          {/* Bottom-Left: 7-Style Crest Switcher & Hold-Charge Bar */}
          {!anyModalOpen && !hud.activeDialogue && (
            <div
              className={`pointer-events-auto flex max-w-full flex-col gap-1.5 self-start ${
                showTouchControls ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#24443f]/90 bg-[#061214]/90 p-1">
                {COMBAT_STYLE_SPECS.map((spec) => {
                  const active = hud.activeStyle === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => {
                        engineRef.current?.selectCombatStyle(spec.id);
                        focusCanvas();
                      }}
                      title={`Press [${spec.hotkey}] for ${spec.holdAttackName} · [${spec.index + 1}] Select ${spec.label} · Pogo (S+J): ${spec.pogoAttackName}`}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-[#122e31] text-[#f8fafc] ring-1 ring-white/40'
                          : 'text-[#a3c4b9] hover:bg-[#0d2224] hover:text-white'
                      }`}
                    >
                      <span
                        className="font-mono-code rounded border border-white/15 bg-[#091a1c] px-1 text-[10px] font-bold"
                        style={{ color: spec.color }}
                      >
                        {spec.hotkey}
                      </span>
                      <span>{spec.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    engineRef.current?.cycleCombatStyle();
                    focusCanvas();
                  }}
                  title="Cycle active style (T)"
                  className="ml-0.5 inline-flex items-center gap-1 rounded-md border border-[#24443f] bg-[#0a1d1f] px-2 py-1 text-[10px] font-medium text-[#95d5b2] transition-colors hover:bg-[#133033] hover:text-white whitespace-nowrap"
                >
                  <span className="font-mono-code text-[#fde047]">T</span>
                  <span>Cycle</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[#9ec2b6]">
                <span
                  className="font-semibold"
                  style={{ color: getStyleSpec(hud.activeStyle).color }}
                >
                  [{getStyleSpec(hud.activeStyle).hotkey}] {hud.activeStyleLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  Combo Key / Hold J: <span className="text-[#eef7f3]">{hud.activeHoldName}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  S+J Pogo: <span className="text-[#eef7f3]">{hud.activePogoName}</span>
                </span>
                {hud.chargeProgress > 0.05 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full border border-[#24443f] bg-[#071315]">
                      <div
                        className="h-full origin-left transition-transform duration-75"
                        style={{
                          transform: `scaleX(${Math.min(1, hud.chargeProgress)})`,
                          backgroundColor:
                            hud.chargeProgress >= 1 ? '#ffffff' : getStyleSpec(hud.activeStyle).color,
                        }}
                      />
                    </div>
                    <span className="font-mono-code text-[10px] tabular-nums text-[#eef7f3]">
                      {hud.chargeProgress >= 1 ? 'READY' : `${Math.round(hud.chargeProgress * 100)}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === RESPONSIVE VIRTUAL TOUCH CONTROLS === */}
      {!hud.activeDialogue && (
        <TouchControls
          visible={showTouchControls}
          canHeal={hud.canHeal}
          hasSpeakerNearby={Boolean(hud.nearbySpeaker)}
          unlockedAbilities={hud.unlockedAbilities}
          onAction={handleVirtualAction}
        />
      )}

      {/* === TITLE SCREEN === */}
      {hud.status === 'TITLE_MENU' && (
        <div className="safe-hud fixed inset-0 z-20 flex flex-col justify-between overflow-y-auto bg-gradient-to-t from-[#03090a]/80 via-[#040d0f]/35 to-[#03090a]/65 md:p-10">
          {/* Top-right settings + mute */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#284a44] bg-[#081618]/90 text-[#cbe5dc] transition-colors hover:bg-[#122d2f] hover:text-white"
              aria-label="Open settings"
              title="Settings"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#284a44] bg-[#081618]/90 text-[#cbe5dc] transition-colors hover:bg-[#122d2f] hover:text-white"
              aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            >
              {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Center Title Lockup over calm negative space */}
          <div className="mx-auto my-auto flex w-full max-w-2xl flex-col items-center py-4 text-center">
            {/* Bespoke Inline SVG Title Crest */}
            <svg viewBox="0 0 380 120" className="w-60 sm:w-72 md:w-96" aria-hidden="true">
              <path
                d="M190 12 C180 28 175 40 190 54 C205 40 200 28 190 12 Z"
                fill="none"
                stroke="#95d5b2"
                strokeWidth="1.8"
              />
              <path
                d="M168 38 C164 22 170 12 178 8 M212 38 C216 22 210 12 202 8"
                fill="none"
                stroke="#d8f3dc"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line x1="42" y1="68" x2="148" y2="68" stroke="#366258" strokeWidth="1" />
              <line x1="232" y1="68" x2="338" y2="68" stroke="#366258" strokeWidth="1" />
              <circle cx="190" cy="68" r="3.5" fill="#74c69d" />
            </svg>

            <h1 className="font-display -mt-4 text-4xl font-semibold tracking-[0.18em] text-[#eef7f3] sm:text-5xl md:text-6xl">
              MOSSGROTTO
            </h1>
            <p className="mt-3 max-w-md px-2 text-xs leading-relaxed text-[#a8cabf] sm:text-sm">
              Ascend the sunken moss caverns, master downward pogo leaps across thorn chasms, and vanquish the Mosslight Warden.
            </p>

            {/* Primary & Secondary Action Stack (vertical on portrait mobile, horizontal on tablet/desktop) */}
            <div className="mt-7 flex w-full max-w-xs flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={handleStartGame}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-lg bg-[#52b788] px-8 text-sm font-semibold text-[#04100d] transition-colors hover:bg-[#74c69d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d8f3dc] whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Game</span>
              </button>

              {hud.hasSaveData && (
                <button
                  type="button"
                  onClick={handleContinueGame}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#3d7a69] bg-[#0e2624]/95 px-6 text-sm font-semibold text-[#ecfdf5] transition-colors hover:bg-[#163834] whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5 text-[#74c69d]" />
                  <span>Continue</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setLevelSelectOpen(true)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#2d544c] bg-[#091a1c]/90 px-5 text-sm font-medium text-[#cbe4db] transition-colors hover:bg-[#112c2f] hover:text-white whitespace-nowrap"
              >
                <Layers className="h-4 w-4 text-[#74c69d]" />
                <span>Select Zone</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#2d544c] bg-[#091a1c]/90 px-5 text-sm font-medium text-[#cbe4db] transition-colors hover:bg-[#112c2f] hover:text-white whitespace-nowrap"
              >
                <SlidersHorizontal className="h-4 w-4 text-[#74c69d]" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setCodeModalOpen(true)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#2d544c] bg-[#091a1c]/90 px-5 text-sm font-medium text-[#cbe4db] transition-colors hover:bg-[#112c2f] hover:text-white whitespace-nowrap"
              >
                <Code2 className="h-4 w-4 text-[#74c69d]" />
                <span>Unity C# Scripts</span>
              </button>
            </div>
          </div>

          {/* Single flat control-hint line */}
          <div className="pt-2 text-center text-[11px] tracking-wide text-[#88aba0] sm:text-xs">
            A / D Move · Space / Z Jump · J / X Slash (S+J Pogo · W+J Up) · Q R G B Y U N 7 Distinct Combo Attacks · V Special · K / Shift Dash · F Heal · M Map
          </div>
        </div>
      )}

      {/* === PAUSE MODAL (Includes live MovementData Physics Tuning + Unity Scripts) === */}
      {hud.status === 'PAUSED' && (
        <div className="safe-modal fixed inset-0 z-30 flex items-center justify-center bg-[#03090a]/85">
          <div className="modal-scroll w-full max-w-xl rounded-xl border border-[#284b44] bg-[#081517] p-5 text-[#e6f0ec] shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-[#193330] pb-4">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-wider text-[#eef7f3]">
                  Paused
                </h2>
                <p className="mt-0.5 text-xs text-[#89aba0]">
                  {hud.zoneName} · {formatTime(hud.elapsedSeconds)} · {hud.essence} Essence
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#264741] bg-[#0c1f21] text-[#cbe5dc] hover:bg-[#143033]"
                  aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
                >
                  {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Live MovementData Physics Tuning */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-[#a7cabf]">
                  MovementData Physics Tuning
                </span>
                <button
                  type="button"
                  onClick={handleResetTuning}
                  className="min-h-[36px] px-2 text-xs text-[#74c69d] hover:underline"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-[#9dc0b5]">
                  <div className="flex justify-between">
                    <span>Max Run Speed</span>
                    <span className="font-mono-code tabular-nums text-[#e6f0ec]">{tuning.maxRunSpeed} px/s</span>
                  </div>
                  <input
                    type="range"
                    min={240}
                    max={520}
                    step={10}
                    value={tuning.maxRunSpeed}
                    onChange={(e) => handleTuningChange('maxRunSpeed', Number(e.target.value))}
                    className="h-6 cursor-pointer accent-[#52b788]"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-[#9dc0b5]">
                  <div className="flex justify-between">
                    <span>Coyote Time</span>
                    <span className="font-mono-code tabular-nums text-[#e6f0ec]">{tuning.coyoteTime.toFixed(2)} s</span>
                  </div>
                  <input
                    type="range"
                    min={0.04}
                    max={0.22}
                    step={0.01}
                    value={tuning.coyoteTime}
                    onChange={(e) => handleTuningChange('coyoteTime', Number(e.target.value))}
                    className="h-6 cursor-pointer accent-[#52b788]"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-[#9dc0b5]">
                  <div className="flex justify-between">
                    <span>Jump Buffer</span>
                    <span className="font-mono-code tabular-nums text-[#e6f0ec]">{tuning.jumpBufferTime.toFixed(2)} s</span>
                  </div>
                  <input
                    type="range"
                    min={0.02}
                    max={0.2}
                    step={0.01}
                    value={tuning.jumpBufferTime}
                    onChange={(e) => handleTuningChange('jumpBufferTime', Number(e.target.value))}
                    className="h-6 cursor-pointer accent-[#52b788]"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-[#9dc0b5]">
                  <div className="flex justify-between">
                    <span>Silk Dash Speed</span>
                    <span className="font-mono-code tabular-nums text-[#e6f0ec]">{tuning.dashSpeed} px/s</span>
                  </div>
                  <input
                    type="range"
                    min={620}
                    max={1150}
                    step={20}
                    value={tuning.dashSpeed}
                    onChange={(e) => handleTuningChange('dashSpeed', Number(e.target.value))}
                    className="h-6 cursor-pointer accent-[#52b788]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#193330] pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResume}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#52b788] px-5 text-sm font-semibold text-[#04100d] hover:bg-[#74c69d] whitespace-nowrap sm:flex-none"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Resume</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryOpen(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#2c524a] bg-[#0e2325] px-3.5 text-sm font-medium text-[#cbe4db] hover:bg-[#153336] whitespace-nowrap"
                >
                  <Backpack className="h-4 w-4 text-[#74c69d]" />
                  <span>Inventory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#2c524a] bg-[#0e2325] px-3.5 text-sm font-medium text-[#cbe4db] hover:bg-[#153336] whitespace-nowrap"
                >
                  <SlidersHorizontal className="h-4 w-4 text-[#74c69d]" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCodeModalOpen(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#2c524a] bg-[#0e2325] px-3.5 text-sm font-medium text-[#cbe4db] hover:bg-[#153336] whitespace-nowrap"
                >
                  <Code2 className="h-4 w-4 text-[#74c69d]" />
                  <span>Unity C#</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#26453f] bg-[#0c1d1f] px-4 text-sm text-[#a8cabf] hover:bg-[#142d30] hover:text-white whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restart</span>
                </button>
                <button
                  type="button"
                  onClick={handleReturnTitle}
                  className="inline-flex min-h-[44px] items-center rounded-lg px-3.5 text-sm text-[#89aba0] hover:text-white whitespace-nowrap"
                >
                  Title
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === GAME OVER MODAL === */}
      {hud.status === 'GAME_OVER' && (
        <div className="safe-modal fixed inset-0 z-30 flex items-center justify-center bg-[#03090a]/88">
          <div className="modal-scroll w-full max-w-md rounded-xl border border-[#3d2932] bg-[#0b1316] p-7 text-center text-[#e6f0ec] shadow-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-wider text-[#f3e8ec]">
              Vessel Shattered
            </h2>
            <p className="mt-2 text-sm text-[#9ab4ac]">
              Fell in {hud.zoneName} · {hud.enemiesDefeated} foes vanquished · {hud.essence} Essence
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleRespawn}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#52b788] px-6 text-sm font-semibold text-[#04100d] hover:bg-[#74c69d] whitespace-nowrap"
              >
                <span>Respawn at Bench</span>
              </button>
              <button
                type="button"
                onClick={handleStartGame}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#2a4a44] bg-[#0f2224] px-5 text-sm font-medium text-[#cbe4db] hover:bg-[#173336] whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Play Again</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === VICTORY MODAL === */}
      {hud.status === 'VICTORY' && (
        <div className="safe-modal fixed inset-0 z-30 flex items-center justify-center bg-[#03090a]/88">
          <div className="modal-scroll w-full max-w-lg rounded-xl border border-[#326154] bg-[#081618] p-7 text-center text-[#e6f0ec] shadow-2xl sm:p-8">
            <h2 className="font-display text-3xl font-semibold tracking-wider text-[#eef7f3]">
              Sanctum Cleared
            </h2>
            <p className="mt-2 text-sm text-[#a6c9be]">
              You overcame the Thorn Chasm, scaled the Verdant Ascent, and claimed the Ancient Silk Seal.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4 border-y border-[#1b3934] py-4">
              <div>
                <div className="text-xs text-[#83a69b]">Clear Time</div>
                <div className="font-mono-code mt-1 text-lg font-semibold tabular-nums text-[#ecfdf5]">
                  {formatTime(hud.elapsedSeconds)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#83a69b]">Essence</div>
                <div className="font-mono-code mt-1 text-lg font-semibold tabular-nums text-[#74c69d]">
                  {hud.essence}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#83a69b]">Foes Defeated</div>
                <div className="font-mono-code mt-1 text-lg font-semibold tabular-nums text-[#ecfdf5]">
                  {hud.enemiesDefeated}
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <button
                type="button"
                onClick={handleStartGame}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#52b788] px-7 text-sm font-semibold text-[#04100d] hover:bg-[#74c69d] whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Play Again</span>
              </button>
              <button
                type="button"
                onClick={() => setLevelSelectOpen(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#2d544c] bg-[#0d2224] px-5 text-sm font-medium text-[#cbe4db] hover:bg-[#143235] whitespace-nowrap"
              >
                <Layers className="h-4 w-4 text-[#74c69d]" />
                <span>Select Zone</span>
              </button>
              <button
                type="button"
                onClick={() => setCodeModalOpen(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#2d544c] bg-[#0d2224] px-5 text-sm font-medium text-[#cbe4db] hover:bg-[#143235] whitespace-nowrap"
              >
                <Code2 className="h-4 w-4 text-[#74c69d]" />
                <span>Unity C# Scripts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === INTERACTIVE WORLD MAP MODAL === */}
      <WorldMapModal
        open={mapOpen}
        sceneTheme={hud.sceneTheme}
        rooms={hud.rooms}
        currentRoomId={hud.currentRoomId}
        worldWidth={hud.worldWidth}
        worldHeight={hud.worldHeight}
        playerNormX={hud.playerNormX}
        playerNormY={hud.playerNormY}
        secretWallsBroken={hud.secretWallsBroken}
        totalSecretWalls={hud.totalSecretWalls}
        onClose={() => setMapOpen(false)}
      />

      {/* === INVENTORY MODAL === */}
      <InventoryModal
        open={inventoryOpen}
        items={hud.inventory}
        hp={hud.hp}
        maxHp={hud.maxHp}
        soul={hud.soul}
        maxSoul={hud.maxSoul}
        essence={hud.essence}
        level={hud.level}
        levelTitle={hud.levelTitle}
        xp={hud.xp}
        unlockedAbilities={hud.unlockedAbilities}
        secretWallsBroken={hud.secretWallsBroken}
        totalSecretWalls={hud.totalSecretWalls}
        onClose={() => setInventoryOpen(false)}
      />

      {/* === LEVEL SELECTION MODAL === */}
      <LevelSelectModal
        open={levelSelectOpen}
        onSelectPreset={handleSelectPreset}
        onClose={() => setLevelSelectOpen(false)}
      />

      {/* === SETTINGS MODAL === */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        volume={volume}
        onVolumeChange={setVolume}
        onToggleMute={handleToggleMute}
        onToggleScreenShake={handleToggleScreenShake}
        onTouchControlsChange={handleTouchControlsChange}
        onClose={() => setSettingsOpen(false)}
      />

      {/* === UNITY C# ARCHITECTURE MODAL === */}
      <UnityCodeModal open={codeModalOpen} onClose={() => setCodeModalOpen(false)} />
    </div>
  );
}
