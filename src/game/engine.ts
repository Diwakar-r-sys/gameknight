import { AnimationController } from './animation';
import { soundEngine } from './audio';
import { COMBAT_STYLE_SPECS, PlayerCombat, getStyleSpec } from './combat';
import { InputHandler, type InputSnapshot, type VirtualAction } from './input';
import { ProgressionManager, gameState } from './progression';
import { renderGameFrame, type PlayerRenderState } from './renderer';
import { RoomManager } from './roomManager';
import {
  DEFAULT_MOVEMENT_CONFIG,
  type AfterImage,
  type BiomeMemorySnapshot,
  type BiomePortal,
  type CombatStyleId,
  type DialogueSpeaker,
  type Enemy,
  type FloatingText,
  type GameStatus,
  type HitPoint,
  type HudSnapshot,
  type InventoryItem,
  type LevelPreset,
  type LevelUpBanner,
  type MovementConfig,
  type Particle,
  type Rect,
  type SaveStateData,
  type SceneTheme,
  type Shockwave,
  type SlashDirection,
  type SporeProjectile,
} from './types';
import { createWorld, getZoneName, type WorldData } from './world';

const PARTICLE_POOL_SIZE = 260;
const AFTERIMAGE_POOL_SIZE = 14;
const PROJECTILE_POOL_SIZE = 24;
const SAVE_KEY = 'mossgrotto_save_v1';

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleIntersectsRect(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= r * r;
}

function computeHitPoint(originX: number, originY: number, rect: Rect): HitPoint {
  return {
    x: Math.max(rect.x, Math.min(originX, rect.x + rect.w)),
    y: Math.max(rect.y, Math.min(originY, rect.y + rect.h)),
  };
}

const BIOME_ORDER: SceneTheme[] = ['crystal', 'swamp', 'grotto'];

export class MapManager {
  private activeTheme: SceneTheme;

  constructor(initial: SceneTheme = 'crystal') {
    this.activeTheme = initial;
  }

  public getTheme(): SceneTheme {
    return this.activeTheme;
  }

  public setTheme(theme: SceneTheme): SceneTheme {
    this.activeTheme = BIOME_ORDER.includes(theme) ? theme : 'crystal';
    return this.activeTheme;
  }

  public cycleTheme(): SceneTheme {
    const idx = BIOME_ORDER.indexOf(this.activeTheme);
    this.activeTheme = BIOME_ORDER[(idx + 1) % BIOME_ORDER.length];
    return this.activeTheme;
  }
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input = new InputHandler();
  private onHudChange: (hud: HudSnapshot) => void;
  private onMapToggleRequest?: () => void;
  private onInventoryToggleRequest?: () => void;

  public config: MovementConfig = { ...DEFAULT_MOVEMENT_CONFIG };
  private mapManager = new MapManager('crystal');
  private sceneTheme: SceneTheme = 'crystal';
  private world: WorldData = createWorld('crystal');
  private status: GameStatus = 'TITLE_MENU';
  private titleMousePan = 0.5;
  private externalHold = false;
  private screenShakeEnabled = true;

  private rafId = 0;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private runTime = 0;
  private hitstopTimer = 0;

  // Viewport & Camera
  private viewW = 1280;
  private viewH = 720;
  private camX = 0;
  private camY = 480;
  private shakeTime = 0;
  private shakeMag = 0;

  // Player Physics & Combat State
  private px = 160;
  private py = 860;
  private pw = 28;
  private ph = 46;
  private pvx = 0;
  private pvy = 0;
  private facing: 1 | -1 = 1;
  private grounded = false;
  private wasGrounded = false;
  private wasInWater = false;
  private wallDir: -1 | 0 | 1 = 0;
  private wallSliding = false;

  // Dash vector (supports horizontal & diagonal Silk Dash!)
  private dashDirX = 1;
  private dashDirY = 0;

  // Tolerance windows & ability timers
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private wallJumpLockTimer = 0;
  private playerRecoilTimer = 0;
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private airDashAvailable = true;
  private airJumpsRemaining = 1;
  private dyingTimer = 0;
  private invulnTimer = 0;
  private healTimer = 0;
  private hitFlashTimer = 0;
  private afterImageEmitTimer = 0;

  // Visual Juice & Animation State Machine
  private anim = new AnimationController();
  private combat = new PlayerCombat();
  private squashX = 1;
  private squashY = 1;
  private runCycle = 0;
  private footstepTimer = 0;

  // Stats, Progression, Map & Checkpoints
  private roomManager = new RoomManager();
  private progression = new ProgressionManager();
  private levelUpBanner: LevelUpBanner | null = null;
  private levelUpBannerTimer = 0;
  private biomeTransitionLabel: string | null = null;
  private biomeTransitionTimer = 0;
  private portalCooldownTimer = 0;
  private biomeMemory: Partial<Record<SceneTheme, BiomeMemorySnapshot>> = {};
  private lockedCalloutCooldown = 0;
  private visitedXpRoomIds = new Set<string>(['ice-entry']);
  private hp = 5;
  private maxHp = 5;
  private soul = 33;
  private maxSoul = 100;
  private essence = 0;
  private enemiesDefeated = 0;
  private pogoChains = 0;
  private bossDefeated = false;
  private bossEngaged = false;
  private respawnX = 160;
  private respawnY = 860;
  private safeGroundX = 160;
  private safeGroundY = 860;
  private currentRoomId = 'ice-entry';
  private mapVersion = 0;
  private collectedItemIds = new Set<string>(['pale-needle', 'pogo-art', 'silk-dash', 'focus-mend']);
  private nearbySpeaker: DialogueSpeaker | null = null;
  private activeDialogue: {
    speakerName: string;
    speakerTitle: string;
    lines: string[];
    lineIndex: number;
  } | null = null;

  private particles: Particle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 3,
    life: 0,
    maxLife: 0.4,
    color: '#a7f3d0',
    gravity: 0,
    glow: false,
  }));

  private afterImages: AfterImage[] = Array.from({ length: AFTERIMAGE_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    facing: 1,
    alpha: 0,
  }));

  private projectiles: SporeProjectile[] = Array.from({ length: PROJECTILE_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 7,
    life: 0,
  }));

  private shockwaves: Shockwave[] = [];
  private floatingTexts: FloatingText[] = [];

  private lastHudKey = '';

  constructor(
    canvas: HTMLCanvasElement,
    onHudChange: (hud: HudSnapshot) => void,
    onMapToggleRequest?: () => void,
    onInventoryToggleRequest?: () => void
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D canvas context');
    }
    this.ctx = context;
    this.onHudChange = onHudChange;
    this.onMapToggleRequest = onMapToggleRequest;
    this.onInventoryToggleRequest = onInventoryToggleRequest;
    this.resetWorldState('TITLE_MENU');
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.titleMousePan = Math.max(0, Math.min(1, e.clientX / Math.max(1, window.innerWidth)));
  };

  public mount(): void {
    this.input.attach(this.canvas);
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.onMouseMove);
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    this.emitHud(true);
  }

  public unmount(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.input.detach();
    soundEngine.stopAmbientDrone();
  }

  private handleResize = (): void => {
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = Math.max(320, w);
    this.viewH = Math.max(240, h);
    this.canvas.width = Math.floor(this.viewW * dpr);
    this.canvas.height = Math.floor(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  public startNewGame(): void {
    this.externalHold = false;
    this.resetWorldState('PLAYING');
    this.saveProgress();
    soundEngine.startAmbientDrone();
    this.emitHud(true);
  }

  public startAtPreset(preset: LevelPreset): void {
    this.externalHold = false;
    this.sceneTheme = this.mapManager.setTheme(preset.recommendedTheme);
    this.resetWorldState('PLAYING');
    const presetXp =
      preset.difficulty === 'Boss'
        ? 600
        : preset.difficulty === 'Depths'
          ? 360
          : preset.difficulty === 'Ascent'
            ? 180
            : preset.difficulty === 'Trial'
              ? 115
              : 0;
    this.progression.reset(presetXp);
    this.px = preset.spawnX;
    this.py = preset.spawnY;
    this.respawnX = preset.spawnX;
    this.respawnY = preset.spawnY;
    this.safeGroundX = preset.spawnX;
    this.safeGroundY = preset.spawnY;
    this.roomManager.reset(this.world.rooms, this.px, this.py, this.pw, this.ph);
    this.updateMapDiscovery(0);
    const cam = this.roomManager.computeImmediateCamera(
      this.world.rooms,
      this.px,
      this.py,
      this.pw,
      this.ph,
      this.viewW,
      this.viewH,
      this.world.width,
      this.world.height
    );
    this.camX = cam.x;
    this.camY = cam.y;
    this.saveProgress();
    soundEngine.startAmbientDrone();
    this.emitHud(true);
  }

  private captureCurrentBiomeMemory(): BiomeMemorySnapshot {
    return {
      visitedRoomIds: this.world.rooms.filter((r) => r.visited).map((r) => r.id),
      discoveredRoomIds: this.world.rooms.filter((r) => r.discovered).map((r) => r.id),
      brokenWallIds: this.world.secretWalls.filter((w) => w.broken).map((w) => w.id),
      collectedOrbIds: this.world.xpOrbs.filter((o) => o.collected).map((o) => o.id),
      collectedRelicIds: this.world.relics.filter((r) => r.collected).map((r) => r.id),
      defeatedEnemyIds: this.world.enemies.filter((e) => !e.alive).map((e) => e.id),
      activatedBenchIds: this.world.benches.filter((b) => b.activated).map((b) => b.id),
      bossDefeated: this.bossDefeated,
    };
  }

  private applyBiomeMemory(mem: BiomeMemorySnapshot | undefined): void {
    if (!mem) return;
    const visited = new Set(mem.visitedRoomIds ?? []);
    const discovered = new Set(mem.discoveredRoomIds ?? []);
    for (const r of this.world.rooms) {
      if (visited.has(r.id)) {
        r.visited = true;
        this.visitedXpRoomIds.add(r.id);
      }
      if (discovered.has(r.id)) {
        r.discovered = true;
      }
    }
    const broken = new Set(mem.brokenWallIds ?? []);
    for (const sw of this.world.secretWalls) {
      if (broken.has(sw.id)) sw.broken = true;
    }
    const orbs = new Set(mem.collectedOrbIds ?? []);
    for (const orb of this.world.xpOrbs) {
      if (orbs.has(orb.id)) orb.collected = true;
    }
    const relicIds = new Set(mem.collectedRelicIds ?? []);
    for (const rel of this.world.relics) {
      if (relicIds.has(rel.id) || this.collectedItemIds.has(rel.itemId)) {
        rel.collected = true;
      }
    }
    const deadEnemies = new Set(mem.defeatedEnemyIds ?? []);
    for (const enemy of this.world.enemies) {
      if (deadEnemies.has(enemy.id)) enemy.alive = false;
    }
    const benches = new Set(mem.activatedBenchIds ?? []);
    for (const bench of this.world.benches) {
      if (benches.has(bench.id)) bench.activated = true;
    }
    this.bossDefeated = Boolean(mem.bossDefeated);
  }

  public hasSaveData(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(window.localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }

  public saveProgress(): void {
    if (typeof window === 'undefined') return;
    try {
      this.biomeMemory[this.sceneTheme] = this.captureCurrentBiomeMemory();
      const data: SaveStateData = {
        sceneTheme: this.sceneTheme,
        respawnX: this.respawnX,
        respawnY: this.respawnY,
        hp: Math.max(1, this.hp),
        maxHp: this.maxHp,
        soul: this.soul,
        essence: this.essence,
        xp: gameState.currentXP,
        collectedOrbIds: this.world.xpOrbs.filter((o) => o.collected).map((o) => o.id),
        zoneName: getZoneName(this.px + this.pw * 0.5, this.py + this.ph * 0.5, this.world.rooms),
        collectedItemIds: Array.from(this.collectedItemIds),
        equippedItemIds: Array.from(this.collectedItemIds),
        visitedRoomIds: this.world.rooms.filter((r) => r.visited).map((r) => r.id),
        discoveredRoomIds: this.world.rooms.filter((r) => r.discovered).map((r) => r.id),
        brokenWallIds: this.world.secretWalls.filter((w) => w.broken).map((w) => w.id),
        biomeMemory: { ...this.biomeMemory },
        savedAt: Date.now(),
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }

  public continueSavedGame(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw) as SaveStateData;
      this.externalHold = false;
      const restoredTheme: SceneTheme =
        saved.sceneTheme === 'swamp' || saved.sceneTheme === 'grotto' ? saved.sceneTheme : 'crystal';
      this.sceneTheme = this.mapManager.setTheme(restoredTheme);
      this.resetWorldState('PLAYING');
      this.maxHp = Math.max(5, saved.maxHp ?? 5);
      this.hp = Math.min(this.maxHp, Math.max(1, saved.hp ?? this.maxHp));
      this.soul = Math.max(0, Math.min(this.maxSoul, saved.soul ?? 33));
      this.essence = Math.max(0, saved.essence ?? 0);
      this.progression.reset(saved.xp ?? 0);
      this.respawnX = saved.respawnX ?? this.world.spawnX;
      this.respawnY = saved.respawnY ?? this.world.spawnY;
      this.px = this.respawnX;
      this.py = this.respawnY;
      this.safeGroundX = this.respawnX;
      this.safeGroundY = this.respawnY;
      this.biomeMemory = { ...(saved.biomeMemory ?? {}) };

      this.collectedItemIds = new Set<string>([
        'pale-needle',
        'pogo-art',
        'silk-dash',
        'focus-mend',
        ...(saved.collectedItemIds ?? []),
      ]);

      this.applyBiomeMemory(this.biomeMemory[this.sceneTheme]);

      for (const relic of this.world.relics) {
        if (this.collectedItemIds.has(relic.itemId)) {
          relic.collected = true;
        }
      }

      const collectedOrbs = new Set(saved.collectedOrbIds ?? []);
      for (const orb of this.world.xpOrbs) {
        if (collectedOrbs.has(orb.id)) {
          orb.collected = true;
        }
      }

      const defaultRoomId = this.world.rooms[0]?.id ?? 'ice-entry';
      const visited = new Set(saved.visitedRoomIds ?? [defaultRoomId]);
      this.visitedXpRoomIds = new Set([...this.visitedXpRoomIds, ...visited]);
      const discovered = new Set(saved.discoveredRoomIds ?? []);
      for (const r of this.world.rooms) {
        if (visited.has(r.id)) r.visited = true;
        if (discovered.has(r.id)) r.discovered = true;
      }

      const broken = new Set(saved.brokenWallIds ?? []);
      for (const sw of this.world.secretWalls) {
        if (broken.has(sw.id)) {
          sw.broken = true;
        }
      }

      this.roomManager.reset(this.world.rooms, this.px, this.py, this.pw, this.ph);
      this.updateMapDiscovery(0);
      const cam = this.roomManager.computeImmediateCamera(
        this.world.rooms,
        this.px,
        this.py,
        this.pw,
        this.ph,
        this.viewW,
        this.viewH,
        this.world.width,
        this.world.height
      );
      this.camX = cam.x;
      this.camY = cam.y;
      soundEngine.startAmbientDrone();
      this.emitHud(true);
      return true;
    } catch {
      return false;
    }
  }

  public setVirtualInput(action: VirtualAction, active: boolean): void {
    this.input.setVirtualAction(action, active);
  }

  public setScreenShakeEnabled(enabled: boolean): void {
    this.screenShakeEnabled = enabled;
    if (!enabled) {
      this.shakeTime = 0;
      this.shakeMag = 0;
    }
  }

  public interactWithNearbySpeaker(): void {
    if (!this.nearbySpeaker) return;
    const firstRead = !this.nearbySpeaker.read;
    this.nearbySpeaker.read = true;
    this.activeDialogue = {
      speakerName: this.nearbySpeaker.name,
      speakerTitle: this.nearbySpeaker.title,
      lines: this.nearbySpeaker.lines,
      lineIndex: 0,
    };
    soundEngine.playBench();
    if (firstRead) {
      this.awardXP(30, this.nearbySpeaker.x, this.nearbySpeaker.y - 44);
    }
    this.emitHud(true);
  }

  public advanceDialogue(): void {
    if (!this.activeDialogue) return;
    if (this.activeDialogue.lineIndex + 1 < this.activeDialogue.lines.length) {
      this.activeDialogue = {
        ...this.activeDialogue,
        lineIndex: this.activeDialogue.lineIndex + 1,
      };
    } else {
      this.activeDialogue = null;
    }
    this.emitHud(true);
  }

  public closeDialogue(): void {
    if (!this.activeDialogue) return;
    this.activeDialogue = null;
    this.emitHud(true);
  }

  public resumeGame(): void {
    if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      soundEngine.startAmbientDrone();
      this.emitHud(true);
    }
  }

  public pauseGame(): void {
    if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      soundEngine.stopAmbientDrone();
      this.emitHud(true);
    }
  }

  public setExternalHold(held: boolean): void {
    this.externalHold = held;
  }

  public returnToTitle(): void {
    this.externalHold = false;
    this.resetWorldState('TITLE_MENU');
    soundEngine.stopAmbientDrone();
    this.emitHud(true);
  }

  public updateMovementConfig(partial: Partial<MovementConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public toggleSceneTheme(): void {
    this.sceneTheme = this.mapManager.cycleTheme();
    this.applyThemeWorldSwitch();
    this.emitHud(true);
  }

  public setSceneTheme(theme: SceneTheme): void {
    const nextTheme = this.mapManager.setTheme(theme);
    if (nextTheme === this.sceneTheme) {
      this.emitHud(true);
      return;
    }
    this.sceneTheme = nextTheme;
    this.applyThemeWorldSwitch();
    this.emitHud(true);
  }

  private transitionThroughPortal(portal: BiomePortal): void {
    this.biomeMemory[this.sceneTheme] = this.captureCurrentBiomeMemory();

    this.sceneTheme = this.mapManager.setTheme(portal.targetTheme);
    this.world = createWorld(this.sceneTheme);
    this.px = portal.spawnX;
    this.py = portal.spawnY;
    this.respawnX = portal.spawnX;
    this.respawnY = portal.spawnY;
    this.safeGroundX = portal.spawnX;
    this.safeGroundY = portal.spawnY;
    this.grounded = false;
    this.wasGrounded = false;
    this.wasInWater = false;
    this.wallDir = 0;
    this.wallSliding = false;
    this.playerRecoilTimer = 0;
    this.dashTimer = 0;
    this.airDashAvailable = true;
    this.airJumpsRemaining = 1;
    this.bossEngaged = false;
    this.bossDefeated = false;
    this.nearbySpeaker = null;
    this.activeDialogue = null;
    this.portalCooldownTimer = 1.25;
    this.combat.reset();
    this.shockwaves = [];
    for (const p of this.particles) p.active = false;
    for (const a of this.afterImages) a.active = false;
    for (const pr of this.projectiles) pr.active = false;

    this.applyBiomeMemory(this.biomeMemory[this.sceneTheme]);

    for (const relic of this.world.relics) {
      if (this.collectedItemIds.has(relic.itemId)) {
        relic.collected = true;
      }
    }

    this.roomManager.reset(this.world.rooms, this.px, this.py, this.pw, this.ph);
    this.mapVersion += 1;
    this.updateMapDiscovery(0);

    const cam = this.roomManager.computeImmediateCamera(
      this.world.rooms,
      this.px,
      this.py,
      this.pw,
      this.ph,
      this.viewW,
      this.viewH,
      this.world.width,
      this.world.height
    );
    this.camX = cam.x;
    this.camY = cam.y;

    this.biomeTransitionLabel = this.world.mapTitle;
    this.biomeTransitionTimer = 2.4;
    soundEngine.playBench();
    this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 22, '#67e8f9', 220, -40);
    this.spawnFloatingText(this.px + this.pw * 0.5, this.py - 22, this.world.mapTitle, '#7ae7ff');
    this.saveProgress();
    this.emitHud(true);
  }

  private applyThemeWorldSwitch(): void {
    this.biomeMemory[this.sceneTheme] = this.captureCurrentBiomeMemory();
    this.world = createWorld(this.sceneTheme);
    this.px = this.world.spawnX;
    this.py = this.world.spawnY;
    this.pvx = 0;
    this.pvy = 0;
    this.respawnX = this.world.spawnX;
    this.respawnY = this.world.spawnY;
    this.safeGroundX = this.world.spawnX;
    this.safeGroundY = this.world.spawnY;
    this.grounded = false;
    this.wasGrounded = false;
    this.wasInWater = false;
    this.wallDir = 0;
    this.wallSliding = false;
    this.playerRecoilTimer = 0;
    this.dashTimer = 0;
    this.airDashAvailable = true;
    this.airJumpsRemaining = 1;
    this.bossEngaged = false;
    this.bossDefeated = false;
    this.nearbySpeaker = null;
    this.activeDialogue = null;
    this.combat.reset();
    this.shockwaves = [];
    for (const p of this.particles) p.active = false;
    for (const a of this.afterImages) a.active = false;
    for (const pr of this.projectiles) pr.active = false;

    this.applyBiomeMemory(this.biomeMemory[this.sceneTheme]);

    for (const relic of this.world.relics) {
      if (this.collectedItemIds.has(relic.itemId)) {
        relic.collected = true;
      }
    }

    this.roomManager.reset(this.world.rooms, this.px, this.py, this.pw, this.ph);
    this.currentRoomId = this.roomManager.currentRoomId;
    this.mapVersion += 1;
    this.updateMapDiscovery(0);

    const cam = this.roomManager.computeImmediateCamera(
      this.world.rooms,
      this.px,
      this.py,
      this.pw,
      this.ph,
      this.viewW,
      this.viewH,
      this.world.width,
      this.world.height
    );
    this.camX = cam.x;
    this.camY = cam.y;

    if (this.status === 'PLAYING') {
      this.spawnFloatingText(this.px + this.pw * 0.5, this.py - 22, this.world.mapTitle, '#7ae7ff');
      this.saveProgress();
    }
  }

  private resetWorldState(nextStatus: GameStatus): void {
    this.world = createWorld(this.sceneTheme);
    this.status = nextStatus;
    this.px = this.world.spawnX;
    this.py = this.world.spawnY;
    this.pvx = 0;
    this.pvy = 0;
    this.facing = 1;
    this.grounded = false;
    this.wasGrounded = false;
    this.wasInWater = false;
    this.wallDir = 0;
    this.wallSliding = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallJumpLockTimer = 0;
    this.playerRecoilTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.airDashAvailable = true;
    this.airJumpsRemaining = 1;
    this.dyingTimer = 0;
    this.invulnTimer = 0;
    this.healTimer = 0;
    this.hitFlashTimer = 0;
    this.hitstopTimer = 0;
    this.anim.reset();
    this.combat.reset();
    this.squashX = 1;
    this.squashY = 1;

    this.progression.reset(0);
    this.levelUpBanner = null;
    this.levelUpBannerTimer = 0;
    this.biomeTransitionLabel = null;
    this.biomeTransitionTimer = 0;
    this.portalCooldownTimer = 0;
    this.biomeMemory = {};
    this.lockedCalloutCooldown = 0;
    const startRoomId = this.world.rooms[0]?.id ?? 'ice-entry';
    this.visitedXpRoomIds = new Set<string>([startRoomId]);
    this.hp = 5;
    this.maxHp = 5;
    this.soul = 33;
    this.essence = 0;
    this.enemiesDefeated = 0;
    this.pogoChains = 0;
    this.bossDefeated = false;
    this.bossEngaged = false;
    this.runTime = 0;
    this.respawnX = this.world.spawnX;
    this.respawnY = this.world.spawnY;
    this.safeGroundX = this.world.spawnX;
    this.safeGroundY = this.world.spawnY;
    this.roomManager.reset(this.world.rooms, this.px, this.py, this.pw, this.ph);
    this.currentRoomId = this.roomManager.currentRoomId || startRoomId;
    this.mapVersion += 1;
    this.updateMapDiscovery(0);
    this.collectedItemIds = new Set<string>(['pale-needle', 'pogo-art', 'silk-dash', 'focus-mend']);
    this.nearbySpeaker = null;
    this.activeDialogue = null;

    this.shockwaves = [];
    this.floatingTexts = [];
    for (const p of this.particles) p.active = false;
    for (const a of this.afterImages) a.active = false;
    for (const pr of this.projectiles) pr.active = false;

    const cam = this.roomManager.computeImmediateCamera(
      this.world.rooms,
      this.px,
      this.py,
      this.pw,
      this.ph,
      this.viewW,
      this.viewH,
      this.world.width,
      this.world.height
    );
    this.camX = cam.x;
    this.camY = cam.y;
  }

  private loop = (timestamp: number): void => {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(Math.max(rawDt, 0), 0.05);
    this.elapsedTime += dt;

    const input = this.input.consumeFrame();

    if (input.mapPressed && this.status === 'PLAYING' && !this.activeDialogue && this.onMapToggleRequest) {
      this.onMapToggleRequest();
    }

    if (
      input.inventoryPressed &&
      this.status === 'PLAYING' &&
      !this.activeDialogue &&
      !this.externalHold &&
      this.onInventoryToggleRequest
    ) {
      this.onInventoryToggleRequest();
    }

    if (input.pausePressed && !this.externalHold) {
      if (this.activeDialogue) {
        this.closeDialogue();
      } else if (this.status === 'PLAYING') {
        this.pauseGame();
      } else if (this.status === 'PAUSED') {
        this.resumeGame();
      }
    }

    if (this.status === 'TITLE_MENU') {
      this.updateTitlePan(dt, input);
    } else if (this.status === 'PLAYING' && !this.externalHold) {
      if (this.dyingTimer > 0) {
        if (this.shakeTime > 0) {
          this.shakeTime = Math.max(0, this.shakeTime - dt);
        }
        this.dyingTimer -= dt;
        this.anim.update(dt, {
          vx: 0,
          vy: 0,
          grounded: this.grounded,
          wallSliding: false,
          dashing: false,
          healing: false,
          maxRunSpeed: this.config.maxRunSpeed,
          justLanded: false,
        });
        this.updateParticles(dt);
        this.updateMossTufts(dt);
        this.updateHangingRopes(dt);
        if (this.dyingTimer <= 0) {
          this.dyingTimer = 0;
          this.status = 'GAME_OVER';
          soundEngine.stopAmbientDrone();
          this.emitHud(true);
        }
      } else if (this.activeDialogue) {
        if (input.interactPressed || input.jumpPressed || input.attackPressed) {
          this.advanceDialogue();
        }
        this.anim.update(dt, {
          vx: 0,
          vy: 0,
          grounded: this.grounded,
          wallSliding: false,
          dashing: false,
          healing: false,
          maxRunSpeed: this.config.maxRunSpeed,
          justLanded: false,
        });
        this.updateMossTufts(dt);
        this.updateHangingRopes(dt);
      } else {
        this.runTime += dt;
        if (this.shakeTime > 0) {
          this.shakeTime = Math.max(0, this.shakeTime - dt);
        }
        if (this.hitstopTimer > 0) {
          this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
        } else {
          this.stepSimulation(dt, input);
        }
      }
      this.emitHud(false);
    }

    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateTitlePan(dt: number, input: InputSnapshot): void {
    if (input.moveX !== 0) {
      this.titleMousePan = Math.max(0, Math.min(1, this.titleMousePan + input.moveX * dt * 0.45));
    }
    const autoDrift = 0.5 + 0.5 * Math.sin(this.elapsedTime * 0.14 - Math.PI * 0.5);
    const blendPan = autoDrift * 0.45 + this.titleMousePan * 0.55;
    const maxCamX = Math.max(0, this.world.width - this.viewW);
    const maxCamY = Math.max(0, this.world.height - this.viewH);
    const targetCamX = Math.min(maxCamX, 40 + blendPan * Math.min(1150, maxCamX));
    const baseCamY = Math.max(0, Math.min(maxCamY, this.world.spawnY - this.viewH * 0.45));
    const targetCamY = Math.max(0, Math.min(maxCamY, baseCamY + Math.sin(this.elapsedTime * 0.22) * 30));
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 3.5);
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 3.5);
    this.updateMossTufts(dt);
    this.updateHangingRopes(dt);
  }

  private awardXP(amount: number, sourceX?: number, sourceY?: number): void {
    if (amount <= 0) return;
    const unlocked = this.progression.addXP(amount);
    if (sourceX !== undefined && sourceY !== undefined) {
      this.spawnFloatingText(sourceX, sourceY, `+${amount} XP`, '#fde047');
    }
    if (unlocked.length > 0) {
      const top = unlocked[unlocked.length - 1];
      this.levelUpBanner = {
        level: top.level,
        title: top.title,
        abilityLabel: top.abilityLabel,
      };
      this.levelUpBannerTimer = 3.4;
      soundEngine.playBench();
      this.triggerShake(4.2, 0.16);
      this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 30, '#fde047', 260, -80);
      this.emitHud(true);
    }
  }

  private showLockedHint(label: string): void {
    if (this.lockedCalloutCooldown > 0) return;
    this.lockedCalloutCooldown = 0.65;
    this.spawnFloatingText(this.px + this.pw * 0.5, this.py - 14, label, '#94a3b8');
  }

  private updateXpOrbs(): void {
    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const orb of this.world.xpOrbs) {
      if (orb.collected) continue;
      if (circleIntersectsRect(orb.x, orb.y, 18, playerRect)) {
        orb.collected = true;
        this.essence += Math.round(orb.xpValue * 0.5);
        soundEngine.playBench();
        this.spawnBurst(orb.x, orb.y, 18, '#fde047', 190, -50);
        this.awardXP(orb.xpValue, orb.x, orb.y - 12);
        this.saveProgress();
      }
    }
  }

  private stepSimulation(dt: number, input: InputSnapshot): void {
    if (this.levelUpBannerTimer > 0) {
      this.levelUpBannerTimer -= dt;
      if (this.levelUpBannerTimer <= 0) {
        this.levelUpBannerTimer = 0;
        this.levelUpBanner = null;
      }
    }
    if (this.biomeTransitionTimer > 0) {
      this.biomeTransitionTimer -= dt;
      if (this.biomeTransitionTimer <= 0) {
        this.biomeTransitionTimer = 0;
        this.biomeTransitionLabel = null;
      }
    }
    if (this.portalCooldownTimer > 0) {
      this.portalCooldownTimer = Math.max(0, this.portalCooldownTimer - dt);
    }
    if (this.lockedCalloutCooldown > 0) {
      this.lockedCalloutCooldown = Math.max(0, this.lockedCalloutCooldown - dt);
    }

    this.combat.updateTimers(dt, this.dashTimer > 0, gameState.currentLevel);

    if (input.cycleStylePressed) {
      this.cycleCombatStyle();
    } else if (input.selectStyleIndex !== null) {
      const targetSpec = COMBAT_STYLE_SPECS[input.selectStyleIndex];
      if (targetSpec) {
        this.selectCombatStyle(targetSpec.id);
      }
    }

    this.updatePlayer(dt, input);
    this.updateBouncePads(dt);
    this.updateSlash(dt);
    this.updatePlayerNeedles(dt);
    this.updateCombatTraps(dt);
    this.updateSpecialWaves(dt);
    this.updateSecretWalls(dt);
    this.updateHangingRopes(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateShockwaves(dt);
    this.updateSporeBulbs(dt);
    this.updateXpOrbs();
    this.updateRelics();
    this.updateBenches();
    this.updateDialogueProximity(input);
    this.updateMapDiscovery(dt);
    this.updateBiomePortals();
    this.updateAltar();
    this.updateMossTufts(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateAfterImages(dt);
    this.updateCamera(dt);
  }

  private updateBiomePortals(): void {
    if (this.portalCooldownTimer > 0) return;
    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const portal of this.world.portals) {
      if (rectsOverlap(playerRect, portal)) {
        this.transitionThroughPortal(portal);
        return;
      }
    }
  }

  private updateBouncePads(dt: number): void {
    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const pad of this.world.bouncePads) {
      if (pad.bounceTimer > 0) {
        pad.bounceTimer = Math.max(0, pad.bounceTimer - dt);
      }
      if (this.pvy >= -60 && rectsOverlap(playerRect, pad)) {
        this.py = pad.y - this.ph;
        this.pvy = pad.boostVelocity;
        this.grounded = false;
        this.dashTimer = 0;
        this.airDashAvailable = true;
        this.airJumpsRemaining = 1;
        pad.bounceTimer = 0.25;
        this.squashX = 0.74;
        this.squashY = 1.32;
        soundEngine.playPogo();
        this.triggerShake(3.8, 0.12);
        this.spawnBurst(pad.x + pad.w * 0.5, pad.y, 16, '#bef264', 210, -90);
      }
    }
  }

  private updatePlayer(dt: number, input: InputSnapshot): void {
    const cfg = this.config;

    if (this.coyoteTimer > 0) this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.wallJumpLockTimer > 0) this.wallJumpLockTimer = Math.max(0, this.wallJumpLockTimer - dt);
    if (this.playerRecoilTimer > 0) this.playerRecoilTimer = Math.max(0, this.playerRecoilTimer - dt);
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);

    this.squashX += (1 - this.squashX) * Math.min(1, dt * 16);
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 16);

    if (input.jumpPressed) {
      this.jumpBufferTimer = cfg.jumpBufferTime;
    }

    // 2.15 Focus Heal
    if (
      input.healPressed &&
      this.grounded &&
      this.dashTimer <= 0 &&
      this.healTimer <= 0 &&
      this.soul >= 33 &&
      this.hp < this.maxHp
    ) {
      this.healTimer = 0.36;
      this.pvx = 0;
      soundEngine.playHeal();
      this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 16, '#a7f3d0', 180, -40);
    }

    if (this.healTimer > 0) {
      this.healTimer -= dt;
      this.pvx *= 0.8;
      if (this.healTimer <= 0) {
        this.soul = Math.max(0, this.soul - 33);
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.triggerShake(4, 0.14);
        this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 24, '#ecfdf5', 260, -80);
      }
      this.anim.update(dt, {
        vx: this.pvx,
        vy: this.pvy,
        grounded: this.grounded,
        wallSliding: false,
        dashing: false,
        healing: this.healTimer > 0,
        maxRunSpeed: cfg.maxRunSpeed,
        justLanded: false,
      });
      return;
    }

    // 2.8 8-Directional / Horizontal Silk Dash (Level 3: Dash, Level 7: Shadow Dash I-Frames)
    if (input.dashPressed) {
      if (!this.progression.hasAbility('dash')) {
        this.showLockedHint('DASH: LVL 3');
      } else if (
        this.dashTimer <= 0 &&
        this.dashCooldownTimer <= 0 &&
        (this.grounded || this.airDashAvailable)
      ) {
        if (input.moveX !== 0) {
          this.facing = input.moveX;
        } else if (this.wallSliding && this.wallDir !== 0) {
          this.facing = (-this.wallDir) as 1 | -1;
        }

        const rawY = input.upHeld ? -1 : input.downHeld && !this.grounded ? 1 : 0;
        const rawX = rawY !== 0 && input.moveX === 0 ? 0 : input.moveX !== 0 ? input.moveX : this.facing;
        const len = Math.max(1, Math.hypot(rawX, rawY));
        this.dashDirX = rawX / len;
        this.dashDirY = rawY / len;

        this.dashTimer = cfg.dashDuration;
        this.dashCooldownTimer = cfg.dashCooldown;
        this.combat.onDashStart();
        const hasShadowDash = this.progression.hasAbility('shadowDash');
        if (hasShadowDash) {
          this.invulnTimer = Math.max(this.invulnTimer, cfg.dashIFrames);
          this.combat.recordHudAttack('Shadow Dash Attack', 7, 1.5);
        }
        if (!this.grounded) {
          this.airDashAvailable = false;
        }
        this.pvx = this.dashDirX * cfg.dashSpeed;
        this.pvy = this.dashDirY * cfg.dashSpeed;
        this.squashX = Math.abs(this.dashDirX) > 0.5 ? 1.32 : 0.82;
        this.squashY = Math.abs(this.dashDirY) > 0.5 ? 1.3 : 0.74;
        this.afterImageEmitTimer = 0;
        soundEngine.playDash();
        this.triggerShake(hasShadowDash ? 4.8 : 3.5, 0.13);
        this.spawnBurst(
          this.px + this.pw * 0.5,
          this.py + this.ph * 0.5,
          hasShadowDash ? 20 : 14,
          hasShadowDash ? '#c084fc' : '#99f6e4',
          240,
          0
        );
      }
    }

    const preBodyRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    const inWater = this.world.waterVolumes.some((w) => rectsOverlap(preBodyRect, w));
    if (inWater && !this.wasInWater) {
      this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.65, 14, '#7ae7ff', 170, -70);
      this.pvy *= 0.45;
      this.airDashAvailable = true;
      this.airJumpsRemaining = 1;
    }
    this.wasInWater = inWater;

    const activeAirStream = this.world.airStreams.find((s) => rectsOverlap(preBodyRect, s));

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.pvx = this.dashDirX * cfg.dashSpeed;
      this.pvy = this.dashDirY * cfg.dashSpeed;
      this.afterImageEmitTimer -= dt;
      if (this.afterImageEmitTimer <= 0) {
        this.afterImageEmitTimer = 0.028;
        this.spawnAfterImage();
      }
      // Level 7 Shadow Dash Attack: Cleave through enemies during dash
      if (this.progression.hasAbility('shadowDash')) {
        const dashBox: Rect = { x: this.px - 8, y: this.py - 4, w: this.pw + 16, h: this.ph + 8 };
        for (const enemy of this.world.enemies) {
          if (!enemy.alive || this.combat.shadowDashHitIds.has(enemy.id)) continue;
          if (rectsOverlap(dashBox, enemy)) {
            this.combat.shadowDashHitIds.add(enemy.id);
            const hitPoint = computeHitPoint(this.px + this.pw * 0.5, this.py + this.ph * 0.5, enemy);
            this.hitEnemy(enemy, 26, true, '#c084fc', hitPoint, { x: this.dashDirX, y: this.dashDirY }, true, false);
            this.spawnFloatingText(enemy.x + enemy.w * 0.5, enemy.y - 26, 'SHADOW CLEAVE!', '#c084fc');
          }
        }
      }
      if (this.dashTimer <= 0 && this.dashDirY < 0) {
        this.pvy *= 0.45;
      }
    } else {
      if (this.wallJumpLockTimer <= 0 && this.playerRecoilTimer <= 0) {
        const baseCap = input.walkHeld ? cfg.maxRunSpeed * 0.46 : cfg.maxRunSpeed;
        const moveCap = inWater ? baseCap * 0.78 : baseCap;
        if (input.moveX !== 0) {
          this.facing = input.moveX;
          const accel = (this.grounded ? cfg.groundAccel : cfg.airAccel) * (inWater ? 0.72 : 1);
          const targetVx = input.moveX * moveCap;
          if (Math.abs(this.pvx) > moveCap && Math.sign(this.pvx) === input.moveX) {
            this.pvx += (targetVx - this.pvx) * Math.min(1, dt * 8);
          } else {
            this.pvx += accel * dt * input.moveX;
            if (Math.abs(this.pvx) > moveCap && Math.sign(this.pvx) === input.moveX) {
              this.pvx = targetVx;
            }
          }
        } else {
          const decel = (this.grounded ? cfg.groundDecel : cfg.airDecel) * (inWater ? 0.7 : 1);
          const step = decel * dt;
          if (Math.abs(this.pvx) <= step) {
            this.pvx = 0;
          } else {
            this.pvx -= Math.sign(this.pvx) * step;
          }
        }
      }

      if (inWater) {
        // Buoyant water gravity & gentle drag
        const waterGrav = this.pvy < 0 ? cfg.gravityUp * 0.55 : cfg.gravityFall * 0.24;
        this.pvy = Math.min(220, this.pvy + waterGrav * dt);
        if (Math.abs(this.pvx) > 30 && Math.random() < 0.2) {
          this.spawnParticle(this.px + this.pw * 0.5, this.py + 8, 0, -45, 2.2, 0.35, '#a7f3d0', 0);
        }
      } else {
        const grav = this.pvy < 0 ? cfg.gravityUp : cfg.gravityFall;
        this.pvy = Math.min(cfg.maxFallSpeed, this.pvy + grav * dt);
      }

      if (activeAirStream) {
        this.pvy = Math.max(-540, this.pvy - activeAirStream.liftForce * dt);
        this.airDashAvailable = true;
      }

      this.wallSliding = false;
      if (
        this.progression.hasAbility('wallJump') &&
        !this.grounded &&
        !inWater &&
        this.wallDir !== 0 &&
        this.pvy > 0 &&
        input.moveX === this.wallDir
      ) {
        this.wallSliding = true;
        if (this.pvy > cfg.wallSlideSpeed) {
          this.pvy = cfg.wallSlideSpeed;
        }
        if (Math.random() < 0.35) {
          this.spawnParticle(
            this.wallDir === 1 ? this.px + this.pw : this.px,
            this.py + 12 + Math.random() * 24,
            -this.wallDir * 25,
            -20 - Math.random() * 25,
            2.4,
            0.28,
            '#74c69d',
            0
          );
        }
      }

      if (this.jumpBufferTimer > 0) {
        if (inWater) {
          // Buoyant Swim Stroke / Leap out of water
          this.pvy = -440;
          this.grounded = false;
          this.jumpBufferTimer = 0;
          this.airDashAvailable = true;
          this.airJumpsRemaining = 1;
          this.squashX = 0.82;
          this.squashY = 1.22;
          soundEngine.playJump();
          this.spawnBurst(this.px + this.pw * 0.5, this.py + 16, 10, '#a7f3d0', 140, -50);
        } else if (this.coyoteTimer > 0) {
          // 2.4 Primary Jump (Level 1: Walk + Jump)
          this.pvy = cfg.jumpVelocity;
          this.grounded = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
          this.squashX = 0.78;
          this.squashY = 1.28;
          soundEngine.playJump();
          this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph, 8, '#a7f3d0', 110, -30);
        } else if (this.wallDir !== 0 && !this.grounded) {
          if (this.progression.hasAbility('wallJump')) {
            // 2.10 Wall Jump (Level 4)
            this.pvx = -this.wallDir * cfg.wallJumpVelX;
            this.pvy = cfg.wallJumpVelY;
            this.facing = (-this.wallDir) as 1 | -1;
            this.wallJumpLockTimer = cfg.wallJumpLockTime;
            this.jumpBufferTimer = 0;
            this.wallSliding = false;
            this.airDashAvailable = true;
            this.airJumpsRemaining = 1;
            this.squashX = 0.76;
            this.squashY = 1.26;
            this.anim.trigger('wallJump', 0.2);
            soundEngine.playWallJump();
            this.spawnBurst(
              this.wallDir === 1 ? this.px + this.pw : this.px,
              this.py + this.ph * 0.5,
              10,
              '#d8f3dc',
              150,
              -60
            );
          } else {
            this.jumpBufferTimer = 0;
            this.showLockedHint('WALL JUMP: LVL 4');
          }
        } else if (this.airJumpsRemaining > 0 && !this.grounded) {
          if (this.progression.hasAbility('doubleJump')) {
            // 2.5 Monarch Double Jump (Level 5)
            this.airJumpsRemaining -= 1;
            this.pvy = cfg.jumpVelocity * 0.92;
            this.jumpBufferTimer = 0;
            this.squashX = 0.84;
            this.squashY = 1.22;
            this.anim.trigger('doubleJump', 0.28);
            soundEngine.playWallJump();
            this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.65, 16, '#a7f3d0', 180, -40);
          } else {
            this.jumpBufferTimer = 0;
            this.showLockedHint('DOUBLE JUMP: LVL 5');
          }
        }
      }

      if (!inWater && input.jumpReleased && this.pvy < -80) {
        this.pvy *= cfg.jumpCutMultiplier;
      }
    }

    // Multi-Stage Special Attack (Lvl 6 Energy Projectile, Lvl 8 AoE Magic Spell, Lvl 10 Ultimate Wave)
    if (input.comboStyleKeyIndex !== null) {
      const targetSpec = COMBAT_STYLE_SPECS[input.comboStyleKeyIndex];
      if (targetSpec && this.combat.canAttack()) {
        this.executeHoldAttack(input, targetSpec.id);
        this.emitHud(true);
      }
    } else if (input.specialAttackPressed) {
      if (!this.progression.hasAbility('energyAttack')) {
        this.showLockedHint('ENERGY: LVL 6');
      } else if (this.combat.canSpecial(gameState.currentLevel)) {
        this.executeSpecialAttack();
      }
    } else if (input.attackPressed) {
      if (this.combat.canAttack()) {
        this.startSlash(input);
      }
    }

    // Hold-Attack Charging Mechanics (0.6s threshold)
    const charge = this.combat.stepHoldCharge(
      dt,
      input.attackHeld,
      this.healTimer <= 0 && this.dyingTimer <= 0
    );
    if (charge.justReady) {
      const spec = this.combat.getActiveStyleSpec();
      soundEngine.playBench();
      this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 16, spec.color, 180, -30);
      this.spawnFloatingText(this.px + this.pw * 0.5, this.py - 18, `${spec.label.toUpperCase()} CHARGED!`, spec.color);
    }
    if (input.attackReleased && this.combat.isChargeReady()) {
      this.executeHoldAttack(input);
    }

    this.wasGrounded = this.grounded;
    this.moveAndCollide(dt);
    this.disturbNearbyRopes();

    const justLanded = this.grounded && !this.wasGrounded;
    if (this.grounded) {
      this.coyoteTimer = cfg.coyoteTime;
      this.airDashAvailable = true;
      this.airJumpsRemaining = 1;
      if (justLanded) {
        // 2.7 Landing Compression & Dust
        this.squashX = 1.28;
        this.squashY = 0.74;
        this.pogoChains = 0;
        soundEngine.playLand();
        this.depressMossBelow(1.0);
        this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph, 7, '#74c69d', 90, -25);
      }
      if (Math.abs(this.pvx) > 18) {
        const speedFactor = Math.abs(this.pvx) >= cfg.maxRunSpeed * 0.58 ? 15 : 10;
        this.runCycle += dt * speedFactor;
        this.footstepTimer -= dt;
        this.depressMossBelow(0.38);
        if (this.footstepTimer <= 0) {
          this.footstepTimer = speedFactor === 15 ? 0.22 : 0.32;
          this.spawnParticle(
            this.px + this.pw * 0.5 - this.facing * 6,
            this.py + this.ph - 1,
            -this.facing * 35,
            -18,
            2.2,
            0.22,
            '#52b788',
            80
          );
        }
      }
    }

    this.anim.update(dt, {
      vx: this.pvx,
      vy: this.pvy,
      grounded: this.grounded,
      wallSliding: this.wallSliding,
      dashing: this.dashTimer > 0,
      healing: this.healTimer > 0,
      maxRunSpeed: cfg.maxRunSpeed,
      justLanded,
    });

    if (this.grounded && this.isStandingSafe()) {
      this.safeGroundX = this.px;
      this.safeGroundY = this.py;
    }

    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const thorn of this.world.thorns) {
      const insetThorn: Rect = {
        x: thorn.x + 4,
        y: thorn.y + 8,
        w: thorn.w - 8,
        h: thorn.h - 8,
      };
      if (rectsOverlap(playerRect, insetThorn)) {
        this.onThornHazardHit();
        break;
      }
    }
  }

  private disturbNearbyRopes(): void {
    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;
    if (Math.abs(this.pvx) < 25) return;
    for (const rope of this.world.hangingRopes) {
      const tipX = rope.x + Math.sin(rope.angle) * rope.length;
      if (Math.abs(pcx - tipX) < 22 && pcy >= rope.y && pcy <= rope.y + rope.length + 24) {
        rope.angVel += Math.sign(this.pvx) * 0.12;
      }
    }
  }

  private updateHangingRopes(dt: number): void {
    for (const rope of this.world.hangingRopes) {
      const wind = Math.sin(this.elapsedTime * 1.4 + rope.x * 0.01) * 0.18;
      const angAccel = -14 * Math.sin(rope.angle) - 2.4 * rope.angVel + wind;
      rope.angVel += angAccel * dt;
      rope.angle += rope.angVel * dt;
    }
  }

  private isStandingSafe(): boolean {
    const cx = this.px + this.pw * 0.5;
    const feetY = this.py + this.ph + 4;
    for (const p of this.world.platforms) {
      if (cx >= p.x + 18 && cx <= p.x + p.w - 18 && Math.abs(feetY - p.y) < 10) {
        return true;
      }
    }
    return false;
  }

  private getSolidColliders(): Rect[] {
    const solids: Rect[] = [...this.world.platforms];
    for (const sw of this.world.secretWalls) {
      if (!sw.broken) solids.push(sw);
    }
    return solids;
  }

  private moveAndCollide(dt: number): void {
    const solids = this.getSolidColliders();

    this.px += this.pvx * dt;
    this.wallDir = 0;
    const hRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const p of solids) {
      if (!rectsOverlap(hRect, p)) continue;
      if (this.pvx > 0) {
        this.px = p.x - this.pw;
        this.pvx = 0;
        this.wallDir = 1;
      } else if (this.pvx < 0) {
        this.px = p.x + p.w;
        this.pvx = 0;
        this.wallDir = -1;
      }
      hRect.x = this.px;
    }

    if (this.wallDir === 0) {
      const probeRight: Rect = { x: this.px + this.pw, y: this.py + 6, w: 3, h: this.ph - 12 };
      const probeLeft: Rect = { x: this.px - 3, y: this.py + 6, w: 3, h: this.ph - 12 };
      for (const p of solids) {
        if (rectsOverlap(probeRight, p)) {
          this.wallDir = 1;
          break;
        }
        if (rectsOverlap(probeLeft, p)) {
          this.wallDir = -1;
          break;
        }
      }
    }

    this.py += this.pvy * dt;
    this.grounded = false;
    const vRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const p of solids) {
      if (!rectsOverlap(vRect, p)) continue;
      if (this.pvy >= 0) {
        this.py = p.y - this.ph;
        this.pvy = 0;
        this.grounded = true;
      } else if (this.pvy < 0) {
        this.py = p.y + p.h;
        this.pvy = 0;
      }
      vRect.y = this.py;
    }
  }

  private depressMossBelow(strength: number): void {
    const cx = this.px + this.pw * 0.5;
    const feetY = this.py + this.ph;
    for (const m of this.world.mossTufts) {
      if (Math.abs(m.y - feetY) < 8 && cx >= m.x - 10 && cx <= m.x + m.w + 10) {
        m.compression = Math.min(1, Math.max(m.compression, strength));
      }
    }
  }

  private updateMossTufts(dt: number): void {
    const stiffness = 135;
    const damping = 9.5;
    for (const m of this.world.mossTufts) {
      if (m.compression === 0 && Math.abs(m.velocity) < 0.001) continue;
      const force = -stiffness * m.compression - damping * m.velocity;
      m.velocity += force * dt;
      m.compression += m.velocity * dt;
      if (Math.abs(m.compression) < 0.005 && Math.abs(m.velocity) < 0.01) {
        m.compression = 0;
        m.velocity = 0;
      }
    }
  }

  private updateSecretWalls(dt: number): void {
    for (const sw of this.world.secretWalls) {
      if (sw.hitFlash > 0) {
        sw.hitFlash = Math.max(0, sw.hitFlash - dt);
      }
    }
  }

  private updateMapDiscovery(dt = 0): void {
    const sync = this.roomManager.syncPlayerRoom(
      this.world.rooms,
      this.px,
      this.py,
      this.pw,
      this.ph,
      dt
    );
    if (!sync) return;

    this.currentRoomId = sync.room.id;
    if (sync.changedRoom && this.status === 'PLAYING') {
      this.spawnFloatingText(
        this.px + this.pw * 0.5,
        this.py - 18,
        sync.room.name,
        '#a7f3d0'
      );
    }
    if (sync.newlyVisited && !this.visitedXpRoomIds.has(sync.room.id)) {
      this.visitedXpRoomIds.add(sync.room.id);
      this.awardXP(25, this.px + this.pw * 0.5, this.py - 32);
    }
    if (sync.changedRoom || sync.newlyVisited || sync.discoveredChanged) {
      this.mapVersion += 1;
    }
  }

  public selectCombatStyle(styleId: CombatStyleId): void {
    const res = this.combat.selectStyleById(styleId, gameState.currentLevel);
    if (!res.unlocked) {
      this.showLockedHint(`${res.spec.label.toUpperCase()}: LVL ${res.spec.unlockLevel}`);
      return;
    }
    if (res.changed) {
      soundEngine.playBench();
      this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 14, res.spec.color, 170, -25);
      this.spawnFloatingText(this.px + this.pw * 0.5, this.py - 20, `${res.spec.label.toUpperCase()} STYLE`, res.spec.color);
      this.emitHud(true);
    }
  }

  public cycleCombatStyle(): void {
    const next = this.combat.cycleStyle(gameState.currentLevel);
    soundEngine.playBench();
    this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 14, next.color, 170, -25);
    this.spawnFloatingText(this.px + this.pw * 0.5, this.py - 20, `${next.label.toUpperCase()} STYLE`, next.color);
    this.emitHud(true);
  }

  private startSlash(input: InputSnapshot): void {
    const res = this.combat.resolvePrimaryAttack({
      level: gameState.currentLevel,
      facing: this.facing,
      grounded: this.grounded,
      dashing: this.dashTimer > 0,
      moving: Math.abs(this.pvx) > 40,
      upHeld: input.upHeld,
      downHeld: input.downHeld,
    });

    if (!res.allowed) {
      if (res.lockedLabel) {
        this.showLockedHint(res.lockedLabel);
      }
      return;
    }

    if (res.lungeVx !== 0 && this.dashTimer <= 0) {
      this.pvx = res.lungeVx;
    }
    if (res.hopForGroundPogo) {
      this.pvy = -265;
      this.grounded = false;
      this.squashX = 0.85;
      this.squashY = 1.18;
    } else if (this.combat.slash.dir === 'down' && this.pvy > 220) {
      this.pvy = 140;
    }

    this.positionSlash();
    this.anim.trigger('attack', res.animDuration);
    soundEngine.playSlash(res.pitch);

    if (res.fireQuickNeedle) {
      this.combat.spawnPlayerNeedle(
        this.px + this.pw * 0.5 + this.facing * 16,
        this.py + this.ph * 0.48,
        this.facing,
        0,
        Math.round(10 + gameState.currentLevel * 1.5),
        res.styleSpec.color
      );
    }

    const sparkColor =
      this.combat.slash.kind === 'comboFinisher'
        ? '#fde047'
        : res.styleSpec.color;
    this.spawnSwingSparks(this.combat.slash.x, this.combat.slash.y, this.combat.slash.dir, sparkColor);
  }

  private executeHoldAttack(input: InputSnapshot, styleOverride?: CombatStyleId): void {
    const res = this.combat.resolveHoldAttack(
      {
        level: gameState.currentLevel,
        facing: this.facing,
        grounded: this.grounded,
        dashing: this.dashTimer > 0,
        moving: Math.abs(this.pvx) > 40,
        upHeld: input.upHeld,
        downHeld: input.downHeld,
      },
      styleOverride
    );

    if (res.lungeVx !== 0 && this.dashTimer <= 0) {
      this.pvx = res.lungeVx;
    }
    if (res.lungeVy !== 0) {
      this.pvy = res.lungeVy;
      this.grounded = false;
    }
    if (res.invulnDuration > 0) {
      this.invulnTimer = Math.max(this.invulnTimer, res.invulnDuration);
    }
    if (res.bonusSoul > 0) {
      this.soul = Math.min(this.maxSoul, this.soul + res.bonusSoul);
    }

    this.positionSlash();
    this.anim.trigger('specialAttack', res.duration + 0.05);
    this.triggerShake(6.5, 0.2);
    soundEngine.playSlash(
      res.styleId === 'reaper' ? 0.68 : res.styleId === 'wanderer' ? 1.25 : 0.78
    );

    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;
    this.spawnFloatingText(pcx, this.py - 22, `${res.attackName.toUpperCase()}!`, res.color);
    this.spawnBurst(pcx + this.facing * 18, pcy, 24, res.color, 260, -40);

    if (res.needlesToFire > 0) {
      for (const vyOff of [-95, 0, 95]) {
        this.combat.spawnPlayerNeedle(pcx + this.facing * 18, pcy, this.facing, vyOff, Math.round(res.damage * 0.42), res.color);
      }
    }

    if (res.deployCogTrap) {
      this.combat.spawnTrap('cog', pcx + this.facing * 20, pcy + 6, this.facing * 150, -80, Math.round(res.damage * 0.48), res.color);
    }
    if (res.deployMineTrap) {
      this.combat.spawnTrap('mine', pcx - this.facing * 10, pcy + 10, -this.facing * 40, -110, Math.round(res.damage * 0.55), res.color);
    }

    if (res.spawnAoeRadius > 0) {
      this.combat.spawnAoeRing(pcx, pcy, res.spawnAoeRadius, res.color, res.styleId === 'shaman');
      for (const enemy of this.world.enemies) {
        if (!enemy.alive) continue;
        if (circleIntersectsRect(pcx, pcy, res.spawnAoeRadius, enemy)) {
          const hitPoint = computeHitPoint(pcx, pcy, enemy);
          const dx = enemy.x + enemy.w * 0.5 - pcx;
          const dy = enemy.y + enemy.h * 0.5 - pcy;
          const len = Math.max(1, Math.hypot(dx, dy));
          this.hitEnemy(enemy, Math.round(res.damage * 0.72), true, res.color, hitPoint, { x: dx / len, y: dy / len }, true, false);
        }
      }
    }

    if (res.spawnShockwave) {
      this.combat.specialWaves.push({
        active: true,
        x: pcx + this.facing * 20,
        y: pcy,
        vx: this.facing * 680,
        facing: this.facing,
        life: 0.9,
        maxLife: 0.9,
        damage: res.damage,
        isUltimate: false,
        halfW: 28,
        halfH: 48,
        color: res.color,
        hitIds: new Set<string>(),
      });
    }
  }

  private updatePlayerNeedles(dt: number): void {
    for (const n of this.combat.playerNeedles) {
      if (!n.active) continue;
      n.life -= dt;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.life <= 0) {
        n.active = false;
        continue;
      }

      const rect: Rect = { x: n.x - 10, y: n.y - 4, w: 20, h: 8 };
      let hitWall = false;
      for (const p of this.world.platforms) {
        if (rectsOverlap(rect, p)) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        n.active = false;
        this.spawnBurst(n.x, n.y, 6, n.color, 130, -20);
        continue;
      }

      for (const enemy of this.world.enemies) {
        if (!enemy.alive || n.hitIds.has(enemy.id)) continue;
        if (rectsOverlap(rect, enemy)) {
          n.hitIds.add(enemy.id);
          n.active = false;
          this.hitEnemy(enemy, n.damage, false, n.color, { x: n.x, y: n.y }, { x: n.facing, y: 0 }, false, false);
          break;
        }
      }
    }
  }

  private updateCombatTraps(dt: number): void {
    for (const trap of this.combat.traps) {
      if (!trap.active) continue;
      trap.life -= dt;
      trap.spin += dt * (trap.kind === 'cog' ? 16 : 9);
      if (trap.tickTimer > 0) trap.tickTimer -= dt;
      if (trap.life <= 0) {
        trap.active = false;
        continue;
      }

      trap.vy = Math.min(540, trap.vy + 980 * dt);
      trap.x += trap.vx * dt;
      trap.y += trap.vy * dt;
      trap.vx *= Math.pow(0.25, dt);

      const box: Rect = { x: trap.x - trap.radius, y: trap.y - trap.radius, w: trap.radius * 2, h: trap.radius * 2 };
      for (const p of this.world.platforms) {
        if (rectsOverlap(box, p) && trap.vy > 0 && trap.y < p.y + 18) {
          trap.y = p.y - trap.radius;
          trap.vy = 0;
        }
      }

      if (trap.tickTimer <= 0) {
        for (const enemy of this.world.enemies) {
          if (!enemy.alive) continue;
          if (circleIntersectsRect(trap.x, trap.y, trap.radius + 8, enemy)) {
            trap.tickTimer = trap.kind === 'cog' ? 0.28 : 0.6;
            const hp = computeHitPoint(trap.x, trap.y, enemy);
            this.hitEnemy(enemy, trap.damage, true, trap.color, hp, { x: trap.x < enemy.x ? 1 : -1, y: -0.4 }, false, false);
            if (trap.kind === 'mine') {
              this.combat.spawnAoeRing(trap.x, trap.y, 72, trap.color, false);
              this.spawnBurst(trap.x, trap.y, 18, trap.color, 240, -60);
              trap.active = false;
            }
            break;
          }
        }
      }
    }
  }

  private spawnSwingSparks(ox: number, oy: number, dir: SlashDirection, color: string): void {
    let baseAngle = 0;
    if (dir === 'left') baseAngle = Math.PI;
    else if (dir === 'up') baseAngle = -Math.PI * 0.5;
    else if (dir === 'down') baseAngle = Math.PI * 0.5;

    for (let i = 0; i < 6; i++) {
      const ang = baseAngle + (Math.random() - 0.5) * 1.4;
      const spd = 160 + Math.random() * 140;
      this.spawnParticle(
        ox + Math.cos(ang) * 24,
        oy + Math.sin(ang) * 24,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        2 + Math.random() * 2,
        0.16 + Math.random() * 0.12,
        color,
        40
      );
    }
  }

  private executeSpecialAttack(): void {
    const resolved = this.combat.resolveSpecialAttack({
      level: gameState.currentLevel,
      facing: this.facing,
      soul: this.soul,
    });

    if (resolved.isUltimate || resolved.hasNova) {
      this.invulnTimer = Math.max(this.invulnTimer, 0.28);
    }

    this.anim.trigger('specialAttack', 0.36);
    this.triggerShake(resolved.isUltimate ? 10.5 : resolved.hasNova ? 7.2 : 4.2, 0.24);
    if (resolved.hasNova) {
      soundEngine.playPogo();
    }
    soundEngine.playSlash(resolved.isUltimate ? 0.68 : 0.85);

    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;

    if (resolved.hasNova) {
      this.combat.spawnAoeRing(pcx, pcy, resolved.novaRadius, resolved.color, resolved.isUltimate);
      this.spawnBurst(
        pcx,
        pcy,
        resolved.isUltimate ? 48 : 30,
        resolved.color,
        resolved.isUltimate ? 340 : 280,
        -40
      );
      if (resolved.isUltimate) {
        this.spawnFloatingText(pcx, this.py - 22, 'ULTIMATE SLASH WAVE!', '#fde047');
      } else {
        this.spawnFloatingText(pcx, this.py - 18, 'SOUL NOVA!', '#38bdf8');
      }

      for (const enemy of this.world.enemies) {
        if (!enemy.alive) continue;
        if (circleIntersectsRect(pcx, pcy, resolved.novaRadius, enemy)) {
          const hitPoint = computeHitPoint(pcx, pcy, enemy);
          const dx = enemy.x + enemy.w * 0.5 - pcx;
          const dy = enemy.y + enemy.h * 0.5 - pcy;
          const len = Math.max(1, Math.hypot(dx, dy));
          this.hitEnemy(
            enemy,
            resolved.novaDamage,
            true,
            resolved.color,
            hitPoint,
            { x: dx / len, y: dy / len },
            resolved.isUltimate,
            false
          );
        }
      }
      for (const sw of this.world.secretWalls) {
        if (sw.broken) continue;
        if (circleIntersectsRect(pcx, pcy, resolved.novaRadius, sw)) {
          sw.hp = 0;
          sw.broken = true;
          this.essence += 50;
          this.awardXP(65, sw.x + sw.w * 0.5, sw.y + sw.h * 0.5);
          soundEngine.playEnemyDefeat();
          this.spawnBurst(sw.x + sw.w * 0.5, sw.y + sw.h * 0.5, 30, '#95d5b2', 280, -60);
          const room = this.world.rooms.find((r) => r.id === sw.revealRoomId);
          if (room) {
            room.discovered = true;
            this.mapVersion += 1;
          }
          this.saveProgress();
        }
      }
    } else {
      this.spawnBurst(pcx + this.facing * 14, pcy, 14, '#67e8f9', 200, -20);
    }

    if (resolved.soulCost > 0) {
      this.soul = Math.max(0, this.soul - resolved.soulCost);
    }

    const waveDirs: (1 | -1)[] = resolved.isUltimate
      ? [this.facing, (-this.facing) as 1 | -1]
      : [this.facing];
    for (const dir of waveDirs) {
      this.combat.specialWaves.push({
        active: true,
        x: pcx + dir * 22,
        y: pcy,
        vx: dir * resolved.waveSpeed,
        facing: dir,
        life: resolved.waveLife,
        maxLife: resolved.waveLife,
        damage: resolved.waveDamage,
        isUltimate: resolved.isUltimate,
        halfW: resolved.waveHalfW,
        halfH: resolved.waveHalfH,
        color: resolved.color,
        hitIds: new Set<string>(),
      });
    }
  }

  private updateSpecialWaves(dt: number): void {
    for (const wave of this.combat.specialWaves) {
      if (!wave.active) continue;
      wave.life -= dt;
      wave.x += wave.vx * dt;
      if (wave.life <= 0) {
        wave.active = false;
        continue;
      }

      if (wave.isUltimate && Math.random() < 0.75) {
        this.spawnParticle(
          wave.x - wave.facing * 16,
          wave.y + (Math.random() - 0.5) * wave.halfH * 1.4,
          -wave.facing * 120,
          (Math.random() - 0.5) * 60,
          2.8,
          0.24,
          '#fde047',
          0
        );
      }

      const box: Rect = {
        x: wave.x - wave.halfW,
        y: wave.y - wave.halfH,
        w: wave.halfW * 2,
        h: wave.halfH * 2,
      };
      for (const enemy of this.world.enemies) {
        if (!enemy.alive || wave.hitIds.has(enemy.id)) continue;
        if (rectsOverlap(box, enemy)) {
          wave.hitIds.add(enemy.id);
          const hitPoint = computeHitPoint(wave.x, wave.y, enemy);
          this.hitEnemy(
            enemy,
            wave.damage,
            true,
            wave.color,
            hitPoint,
            { x: wave.facing, y: 0 },
            wave.isUltimate,
            false
          );
        }
      }
      for (const sw of this.world.secretWalls) {
        if (sw.broken || wave.hitIds.has(sw.id)) continue;
        if (rectsOverlap(box, sw)) {
          wave.hitIds.add(sw.id);
          sw.hp -= wave.isUltimate ? 3 : 1;
          sw.hitFlash = 0.14;
          if (sw.hp <= 0) {
            sw.broken = true;
            this.essence += 50;
            this.awardXP(65, sw.x + sw.w * 0.5, sw.y + sw.h * 0.5);
            soundEngine.playEnemyDefeat();
            const room = this.world.rooms.find((r) => r.id === sw.revealRoomId);
            if (room) {
              room.discovered = true;
              this.mapVersion += 1;
            }
            this.saveProgress();
          }
        }
      }
    }
    if (this.combat.specialWaves.length > 14) {
      this.combat.specialWaves = this.combat.specialWaves.filter((w) => w.active);
    }
  }

  private positionSlash(): void {
    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;
    const slash = this.combat.slash;
    if (slash.dir === 'right') {
      slash.x = pcx + 14;
      slash.y = pcy;
    } else if (slash.dir === 'left') {
      slash.x = pcx - 14;
      slash.y = pcy;
    } else if (slash.dir === 'up') {
      slash.x = pcx;
      slash.y = pcy - 16;
    } else {
      slash.x = pcx;
      slash.y = pcy + 16;
    }
  }

  private updateSlash(dt: number): void {
    const slash = this.combat.slash;
    if (!slash.active) return;
    slash.timer -= dt;
    this.combat.stepSlashFrame();
    this.positionSlash();

    const hitbox = this.combat.getSlashHitbox();
    let triggeredPogo = false;

    // 1. Enemies
    const isComboFinisher = slash.kind === 'comboFinisher';
    const isHeavySlash =
      isComboFinisher || slash.kind === 'shadowDashAttack' || slash.kind === 'dashSlash';
    const slashVec =
      slash.dir === 'right'
        ? { x: 1, y: 0 }
        : slash.dir === 'left'
          ? { x: -1, y: 0 }
          : slash.dir === 'up'
            ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
    const slashContactOriginX = slash.x + slashVec.x * 16;
    const slashContactOriginY = slash.y + slashVec.y * 16;

    for (const enemy of this.world.enemies) {
      if (!enemy.alive || slash.hitIds.has(enemy.id)) continue;
      if (rectsOverlap(hitbox, enemy)) {
        slash.hitIds.add(enemy.id);
        const accent =
          isComboFinisher
            ? '#fde047'
            : slash.kind === 'shadowDashAttack'
              ? '#c084fc'
              : slash.kind === 'dashSlash'
                ? '#22d3ee'
                : '#fef08a';
        const hitPoint = computeHitPoint(slashContactOriginX, slashContactOriginY, enemy);
        const landed = this.hitEnemy(
          enemy,
          slash.damage,
          isComboFinisher || slash.kind === 'shadowDashAttack',
          accent,
          hitPoint,
          slashVec,
          isHeavySlash,
          slash.dir === 'right' || slash.dir === 'left'
        );
        if (landed && isComboFinisher) {
          this.soul = Math.min(this.maxSoul, this.soul + 8);
          this.spawnFloatingText(enemy.x + enemy.w * 0.5, enemy.y - 28, 'COMBO FINISHER!', '#fde047');
        }
        if (slash.dir === 'down') {
          triggeredPogo = true;
        }
      }
    }

    // 2. Breakable Secret Moss Walls
    for (const sw of this.world.secretWalls) {
      if (sw.broken || slash.hitIds.has(sw.id)) continue;
      if (rectsOverlap(hitbox, sw)) {
        slash.hitIds.add(sw.id);
        sw.hp -= 1;
        sw.hitFlash = 0.14;
        this.hitstopTimer = 0.045;
        this.triggerShake(5, 0.16);
        soundEngine.playHit();
        this.spawnBurst(sw.x + sw.w * 0.5, sw.y + sw.h * 0.5, 16, '#86efac', 220, -40);
        if (sw.hp <= 0) {
          sw.broken = true;
          this.essence += 50;
          this.awardXP(65, sw.x + sw.w * 0.5, sw.y + sw.h * 0.5);
          this.hitstopTimer = 0.065;
          this.triggerShake(7.5, 0.24);
          soundEngine.playEnemyDefeat();
          this.spawnBurst(sw.x + sw.w * 0.5, sw.y + sw.h * 0.5, 34, '#95d5b2', 300, -60);
          const room = this.world.rooms.find((r) => r.id === sw.revealRoomId);
          if (room) {
            room.discovered = true;
            this.mapVersion += 1;
          }
          this.saveProgress();
        }
      }
    }

    // 3. Spore Bulbs & Pogo Pods
    for (const bulb of this.world.sporeBulbs) {
      if (!bulb.alive || slash.hitIds.has(bulb.id)) continue;
      if (circleIntersectsRect(bulb.x, bulb.y, bulb.radius + 6, hitbox)) {
        slash.hitIds.add(bulb.id);
        this.soul = Math.min(this.maxSoul, this.soul + (bulb.pogoPod ? 10 : 22));
        this.essence += bulb.pogoPod ? 5 : 15;
        this.spawnBurst(bulb.x, bulb.y, 16, '#86efac', 210, -40);
        if (bulb.pogoPod) {
          soundEngine.playPogo();
          if (slash.dir === 'down') {
            triggeredPogo = true;
          }
        } else {
          bulb.alive = false;
          bulb.respawnTimer = 10;
          this.awardXP(15, bulb.x, bulb.y - 12);
          soundEngine.playHit();
        }
      }
    }

    // 4. Sway Hanging Ropes when slashed
    for (const rope of this.world.hangingRopes) {
      const ropeBox: Rect = { x: rope.x - 16, y: rope.y, w: 32, h: rope.length };
      if (rectsOverlap(hitbox, ropeBox)) {
        rope.angVel += (slash.dir === 'left' ? -1 : 1) * 0.85;
      }
    }

    // 5. Pogo on Thorn Hazards (Level 5 Downward Pogo)
    if (slash.dir === 'down' && !slash.hitIds.has('thorn-pogo')) {
      for (const thorn of this.world.thorns) {
        if (rectsOverlap(hitbox, thorn)) {
          slash.hitIds.add('thorn-pogo');
          triggeredPogo = true;
          this.spawnBurst(this.px + this.pw * 0.5, thorn.y + 4, 14, '#e9d5ff', 210, -85);
          soundEngine.playPogo();
          break;
        }
      }
    }

    if (triggeredPogo) {
      this.executePogoBounce();
    }

    if (slash.timer <= 0) {
      slash.active = false;
    }
  }

  private executePogoBounce(): void {
    const spec = this.combat.getActiveStyleSpec();
    const pcx = this.px + this.pw * 0.5;
    const pFeetY = this.py + this.ph;

    this.pvy = this.config.pogoVelocity * spec.pogoBoostMult;
    this.airDashAvailable = true;
    this.airJumpsRemaining = 1;
    this.dashTimer = 0;
    this.pogoChains += 1;
    this.squashX = 0.8;
    this.squashY = 1.24;
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
    this.triggerShake(4.8, 0.14);

    // 7 Unique Style Pogo Effects
    this.spawnBurst(pcx, pFeetY + 6, 14, spec.color, 210, 60);
    if (spec.id === 'reaper') {
      this.soul = Math.min(this.maxSoul, this.soul + 8);
      this.combat.spawnAoeRing(pcx, pFeetY + 12, 68, spec.color, false);
    } else if (spec.id === 'wanderer') {
      this.combat.attackCooldownTimer = Math.min(this.combat.attackCooldownTimer, 0.08);
    } else if (spec.id === 'witch') {
      this.combat.spawnAoeRing(pcx, pFeetY + 10, 82, spec.color, false);
      for (const enemy of this.world.enemies) {
        if (!enemy.alive || this.combat.slash.hitIds.has(enemy.id)) continue;
        if (circleIntersectsRect(pcx, pFeetY + 10, 82, enemy)) {
          this.combat.slash.hitIds.add(enemy.id);
          this.hitEnemy(enemy, 14, true, spec.color, computeHitPoint(pcx, pFeetY, enemy), { x: 0, y: 1 }, false, false);
        }
      }
    } else if (spec.id === 'architect') {
      this.combat.spawnTrap('mine', pcx, pFeetY + 8, 0, 120, 18, spec.color);
    } else if (spec.id === 'shaman') {
      this.combat.spawnAoeRing(pcx, pFeetY + 14, 96, spec.color, true);
      for (const enemy of this.world.enemies) {
        if (!enemy.alive || this.combat.slash.hitIds.has(enemy.id)) continue;
        if (circleIntersectsRect(pcx, pFeetY + 14, 96, enemy)) {
          this.combat.slash.hitIds.add(enemy.id);
          this.hitEnemy(enemy, 18, true, spec.color, computeHitPoint(pcx, pFeetY, enemy), { x: 0, y: 1 }, true, false);
        }
      }
    }
  }

  public triggerAttackJuice(
    enemy: Enemy,
    hitPoint: HitPoint,
    attackVec: { x: number; y: number } = { x: this.facing, y: 0 },
    options: {
      heavy?: boolean;
      sparkColor?: string;
      applyPlayerRecoil?: boolean;
    } = {}
  ): void {
    const heavy = Boolean(options.heavy);
    const sparkColor = options.sparkColor ?? '#fef08a';
    const len = Math.hypot(attackVec.x, attackVec.y);
    const dirX = len > 0.001 ? attackVec.x / len : this.facing;
    const dirY = len > 0.001 ? attackVec.y / len : 0;

    // Step 1: Flash Effect (solid stark #ffffff for 3 to 4 frames)
    enemy.hitFlash = 4 / 60;

    // Step 2: Impact Audio Trigger Hook (exact first frame of collision)
    soundEngine.playHit(heavy);

    // Step 3: Particle Blast (10 to 15 glowing sparks/dust at hitPoint along attack vector)
    this.spawnDirectionalParticleBlast(
      hitPoint.x,
      hitPoint.y,
      dirX,
      dirY,
      heavy ? 15 : 12,
      sparkColor,
      heavy ? 330 : 270
    );

    // Step 4: Knockback Physics (push enemy away + simultaneous player recoil)
    const pcx = this.px + this.pw * 0.5;
    const ecx = enemy.x + enemy.w * 0.5;
    const knockDirX = Math.abs(dirX) > 0.25 ? Math.sign(dirX) : pcx < ecx ? 1 : -1;

    if (enemy.kind === 'crawler') {
      enemy.knockVx = knockDirX * (heavy ? 245 : 190);
      enemy.knockVy = 0;
      enemy.knockTimer = 0.16;
    } else if (enemy.kind === 'flyer') {
      enemy.knockVx = knockDirX * (heavy ? 265 : 205);
      enemy.knockVy = dirY * 130 - 65;
      enemy.knockTimer = 0.18;
    } else if (enemy.kind === 'shieldbearer') {
      enemy.knockVx = knockDirX * (heavy ? 185 : 140);
      enemy.knockVy = 0;
      enemy.knockTimer = 0.14;
    } else {
      enemy.knockVx = knockDirX * (heavy ? 145 : 100);
      enemy.knockVy = dirY < -0.2 ? -75 : -35;
      enemy.knockTimer = 0.12;
    }

    if (options.applyPlayerRecoil && this.dashTimer <= 0) {
      this.pvx = -knockDirX * (heavy ? 215 : 185);
      this.playerRecoilTimer = 0.085;
    }

    // Step 5: Screen Shake & Hit-Stop (2 to 3 frames freeze + camera vibration)
    const hitStopFrames = heavy || enemy.kind === 'warden' || enemy.kind === 'shieldbearer' ? 3 : 2.5;
    this.hitstopTimer = Math.max(this.hitstopTimer, hitStopFrames / 60);
    const shakeMag = heavy
      ? 7.8
      : enemy.kind === 'warden'
        ? 6.8
        : enemy.kind === 'shieldbearer'
          ? 5.6
          : 4.8;
    this.triggerShake(shakeMag, 0.17);
  }

  private hitEnemy(
    enemy: Enemy,
    damage = 15,
    bypassShield = false,
    sparkColor = '#fef08a',
    hitPoint?: HitPoint,
    attackVec?: { x: number; y: number },
    heavy = false,
    applyPlayerRecoil = false
  ): boolean {
    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;
    const ecx = enemy.x + enemy.w * 0.5;
    const ecy = enemy.y + enemy.h * 0.5;

    const slashDir = this.combat.slash.dir;
    const isHorizontalSlash = slashDir === 'right' || slashDir === 'left';
    const hittingFrontSide = (pcx < ecx && enemy.facing === -1) || (pcx > ecx && enemy.facing === 1);
    if (enemy.kind === 'shieldbearer' && enemy.shielded && !bypassShield && isHorizontalSlash && hittingFrontSide) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 3 / 60);
      this.triggerShake(3.8, 0.12);
      soundEngine.playPogo();
      this.spawnDirectionalParticleBlast(
        ecx + enemy.facing * 20,
        ecy,
        -enemy.facing,
        -0.25,
        12,
        '#e2e8f0',
        240
      );
      this.spawnFloatingText(ecx, enemy.y - 12, 'BLOCKED', '#cbd5e1');
      if (slashDir === 'right') this.pvx = -230;
      else if (slashDir === 'left') this.pvx = 230;
      this.playerRecoilTimer = 0.09;
      return false;
    }

    const resolvedHitPoint = hitPoint ?? computeHitPoint(pcx, pcy, enemy);
    const fallbackVec = { x: ecx - pcx, y: ecy - pcy };
    const resolvedAttackVec = attackVec ?? fallbackVec;

    enemy.hp = Math.max(0, enemy.hp - damage);
    const activeSpec = this.combat.getActiveStyleSpec();
    this.soul = Math.min(this.maxSoul, this.soul + 14 + activeSpec.soulBonusOnHit);

    // Beast Style Lifesteal Fury Mechanic (every 3 hits restores 1 HP mask)
    if (activeSpec.id === 'beast') {
      this.combat.beastHitCounter += 1;
      if (this.combat.beastHitCounter >= 3) {
        this.combat.beastHitCounter = 0;
        if (this.hp < this.maxHp) {
          this.hp += 1;
          this.spawnFloatingText(pcx, this.py - 26, '+1 LIFESTEAL!', '#fb7185');
          this.spawnBurst(pcx, pcy, 14, '#fb7185', 180, -40);
        }
      }
    }

    // Execute all 5 Combat Juice & Attack Feedback steps simultaneously
    this.triggerAttackJuice(enemy, resolvedHitPoint, resolvedAttackVec, {
      heavy: heavy || damage >= 30,
      sparkColor: activeSpec.color || sparkColor,
      applyPlayerRecoil,
    });

    this.spawnFloatingText(
      resolvedHitPoint.x + (Math.random() - 0.5) * 14,
      enemy.y - 10,
      damage >= 35 ? `-${damage}!` : `-${damage}`,
      bypassShield ? sparkColor : '#fef08a'
    );

    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.enemiesDefeated += 1;
      const essenceDrop =
        enemy.kind === 'warden' ? 150 : enemy.kind === 'shieldbearer' ? 60 : enemy.kind === 'flyer' ? 35 : 20;
      const xpDrop =
        enemy.kind === 'warden' ? 250 : enemy.kind === 'shieldbearer' ? 110 : enemy.kind === 'flyer' ? 55 : 35;
      this.essence += essenceDrop;
      this.awardXP(xpDrop, ecx, enemy.y - 24);
      soundEngine.playEnemyDefeat();
      this.hitstopTimer = Math.max(
        this.hitstopTimer,
        enemy.kind === 'warden' ? 0.095 : enemy.kind === 'shieldbearer' ? 0.072 : 0.055
      );
      this.triggerShake(enemy.kind === 'warden' ? 11.5 : enemy.kind === 'shieldbearer' ? 8.5 : 6.2, 0.25);
      this.spawnBurst(ecx, ecy, enemy.kind === 'warden' ? 46 : 26, '#6ee7b7', 320, -85);

      if (enemy.kind === 'warden') {
        this.bossDefeated = true;
        this.bossEngaged = false;
        for (const p of this.projectiles) p.active = false;
        for (const sw of this.shockwaves) sw.active = false;
      }
    }
    return true;
  }

  private applyEnemyKnockback(e: Enemy, dt: number): void {
    if (!e.knockTimer || e.knockTimer <= 0) return;
    e.knockTimer = Math.max(0, e.knockTimer - dt);
    const kvx = e.knockVx ?? 0;
    const kvy = e.knockVy ?? 0;

    if (e.kind === 'crawler') {
      const nextX = e.x + kvx * dt;
      const probeX = kvx >= 0 ? nextX + e.w + 2 : nextX - 4;
      const wallProbe: Rect = { x: probeX, y: e.y + 6, w: 4, h: e.h - 12 };
      const edgeProbe: Rect = { x: probeX, y: e.y + e.h + 2, w: 6, h: 12 };
      let blocked = false;
      let hasGround = false;
      for (const p of this.world.platforms) {
        if (rectsOverlap(wallProbe, p)) blocked = true;
        if (rectsOverlap(edgeProbe, p)) hasGround = true;
      }
      if (!blocked && hasGround) {
        e.x = nextX;
      } else {
        e.knockVx = 0;
      }
    } else if (e.kind === 'shieldbearer') {
      e.x = Math.max(e.homeX - 95, Math.min(e.homeX + 95, e.x + kvx * dt));
      e.y = e.homeY;
    } else if (e.kind === 'flyer') {
      e.x += kvx * dt;
      e.y += kvy * dt;
      const rect: Rect = { x: e.x, y: e.y, w: e.w, h: e.h };
      for (const p of this.world.platforms) {
        if (!rectsOverlap(rect, p)) continue;
        if (kvy > 0) e.y = p.y - e.h;
        else if (kvy < 0) e.y = p.y + p.h;
        rect.y = e.y;
      }
    } else {
      const arena = this.world.bossArena;
      e.x = Math.max(arena.minX, Math.min(arena.maxX - e.w, e.x + kvx * dt));
      e.y = Math.max(arena.minY, Math.min(arena.floorY - e.h, e.y + kvy * dt));
    }

    const decay = Math.pow(0.06, dt);
    e.knockVx = kvx * decay;
    e.knockVy = kvy * decay;
  }

  private updateEnemies(dt: number): void {
    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;

    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.kind === 'crawler') {
        this.updateCrawlerAI(e, dt);
      } else if (e.kind === 'flyer') {
        this.updateFlyerAI(e, dt, pcx, pcy);
      } else if (e.kind === 'shieldbearer') {
        this.updateShieldbearerAI(e, dt, pcx);
      } else {
        this.updateWardenBossAI(e, dt, pcx, pcy);
      }

      this.applyEnemyKnockback(e, dt);

      const enemyHitbox: Rect = {
        x: e.x + 4,
        y: e.y + 4,
        w: e.w - 8,
        h: e.h - 8,
      };
      if (rectsOverlap(playerRect, enemyHitbox)) {
        const ecx = e.x + e.w * 0.5;
        this.damagePlayer(pcx < ecx ? -1 : 1);
      }
    }
  }

  private updateCrawlerAI(e: Enemy, dt: number): void {
    const speed = 78;
    if (Math.abs(e.vx) < speed) {
      e.vx += (e.facing * speed - e.vx) * Math.min(1, dt * 6);
    }
    e.x += e.vx * dt;

    const probeX = e.facing === 1 ? e.x + e.w + 4 : e.x - 4;
    const wallProbe: Rect = { x: probeX, y: e.y + 6, w: 4, h: e.h - 12 };
    const edgeProbe: Rect = { x: probeX, y: e.y + e.h + 2, w: 6, h: 12 };

    let hitWall = false;
    let hasGroundAhead = false;
    for (const p of this.world.platforms) {
      if (rectsOverlap(wallProbe, p)) hitWall = true;
      if (rectsOverlap(edgeProbe, p)) hasGroundAhead = true;
    }

    if (hitWall || !hasGroundAhead) {
      e.facing = (-e.facing) as 1 | -1;
      e.vx = e.facing * speed;
      e.x += e.facing * 4;
    }
  }

  private updateFlyerAI(e: Enemy, dt: number, pcx: number, pcy: number): void {
    const ecx = e.x + e.w * 0.5;
    const ecy = e.y + e.h * 0.5;
    const dist = Math.hypot(pcx - ecx, pcy - ecy);

    if (e.aiState === 'FOLLOW') {
      e.stateTimer -= dt;
      const goalX = dist < 520 ? pcx : e.homeX + Math.sin(this.elapsedTime * 1.1 + e.animPhase) * 90;
      const goalY =
        dist < 520 ? pcy - 125 + Math.sin(this.elapsedTime * 3) * 14 : e.homeY + Math.cos(this.elapsedTime * 1.6) * 20;

      e.vx += (Math.max(-170, Math.min(170, (goalX - ecx) * 2.4)) - e.vx) * Math.min(1, dt * 4.5);
      e.vy += (Math.max(-150, Math.min(150, (goalY - ecy) * 2.4)) - e.vy) * Math.min(1, dt * 4.5);
      e.facing = pcx >= ecx ? 1 : -1;

      if (e.stateTimer <= 0 && dist < 390) {
        e.aiState = 'WINDUP';
        e.stateTimer = 0.42;
        e.targetX = pcx;
        e.targetY = pcy;
        e.vx *= 0.2;
        e.vy *= 0.2;
      }
    } else if (e.aiState === 'WINDUP') {
      e.stateTimer -= dt;
      e.vx *= 0.85;
      e.vy -= 30 * dt;
      if (e.stateTimer <= 0) {
        e.sporeWaveCount += 1;
        if (e.sporeWaveCount % 2 === 0 && dist > 140) {
          this.fireSingleSpore(ecx, ecy, pcx, pcy, 290);
          this.spawnBurst(ecx, ecy, 8, '#fdba74', 150, -30);
          e.aiState = 'RECOVER';
          e.stateTimer = 1.15;
          e.vx *= 0.2;
          e.vy = -30;
        } else {
          e.aiState = 'ATTACK';
          e.stateTimer = 0.48;
          const dx = e.targetX - ecx;
          const dy = e.targetY - ecy;
          const len = Math.max(1, Math.hypot(dx, dy));
          e.vx = (dx / len) * 440;
          e.vy = (dy / len) * 440;
        }
      }
    } else if (e.aiState === 'ATTACK') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'RECOVER';
        e.stateTimer = 1.35;
        e.vx *= 0.25;
        e.vy *= 0.25;
      }
    } else {
      e.stateTimer -= dt;
      e.vx *= 0.92;
      e.vy = Math.sin(this.elapsedTime * 5) * 18;
      if (e.stateTimer <= 0) {
        e.aiState = 'FOLLOW';
        e.stateTimer = 1.75;
      }
    }

    this.moveFlyerWithBounds(e, dt);
  }

  private updateShieldbearerAI(e: Enemy, dt: number, pcx: number): void {
    const ecx = e.x + e.w * 0.5;
    const distX = Math.abs(pcx - ecx);
    e.y = e.homeY;

    if (e.aiState === 'SHIELD') {
      e.shielded = true;
      e.stateTimer -= dt;
      e.facing = pcx >= ecx ? 1 : -1;
      e.vx = distX < 320 && distX > 46 ? e.facing * 52 : 0;
      if (e.stateTimer <= 0 || (distX < 130 && e.stateTimer < 0.9)) {
        e.aiState = 'FOLLOW';
        e.stateTimer = 0.75;
        e.shielded = false;
      }
    } else if (e.aiState === 'FOLLOW') {
      e.shielded = false;
      e.stateTimer -= dt;
      e.facing = pcx >= ecx ? 1 : -1;
      e.vx = distX < 360 && distX > 42 ? e.facing * 88 : 0;
      if (e.stateTimer <= 0 && distX < 280) {
        e.aiState = 'WINDUP';
        e.stateTimer = 0.55;
        e.vx = 0;
      } else if (e.stateTimer <= 0) {
        e.aiState = 'SHIELD';
        e.stateTimer = 1.4;
      }
    } else if (e.aiState === 'WINDUP') {
      e.shielded = false;
      e.vx = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'SLAM';
        e.stateTimer = 0.35;
        this.triggerShake(6.5, 0.2);
        soundEngine.playLand();
        this.spawnBurst(ecx, e.y + e.h - 4, 18, '#fbbf24', 220, -90);
        this.spawnShockwavePair(ecx, e.y + e.h, '#f59e0b', 280, 0.75);
      }
    } else if (e.aiState === 'SLAM') {
      e.shielded = false;
      e.vx = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'RECOVER';
        e.stateTimer = 0.95;
      }
    } else {
      e.shielded = false;
      e.vx = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'SHIELD';
        e.stateTimer = 1.45;
      }
    }

    e.x = Math.max(e.homeX - 95, Math.min(e.homeX + 95, e.x + e.vx * dt));
  }

  private updateWardenBossAI(e: Enemy, dt: number, pcx: number, pcy: number): void {
    const ecx = e.x + e.w * 0.5;
    const ecy = e.y + e.h * 0.5;
    const arena = this.world.bossArena;

    if (!this.bossEngaged) {
      if (pcx > arena.triggerX && pcy < arena.triggerY) {
        this.bossEngaged = true;
      } else {
        e.vy = Math.sin(this.elapsedTime * 2) * 15;
        e.y += e.vy * dt;
        return;
      }
    }

    if (e.hp <= e.maxHp * 0.5 && e.phase !== 2) {
      e.phase = 2;
      this.triggerShake(10, 0.35);
      soundEngine.playEnemyDefeat();
      this.spawnBurst(ecx, ecy, 36, '#f43f5e', 300, -60);
      this.spawnFloatingText(ecx, e.y - 18, 'PHASE II', '#fb923c');
    }

    const isPhase2 = e.phase === 2;

    if (e.aiState === 'FOLLOW') {
      e.stateTimer -= dt;
      const hoverX = pcx + Math.sin(this.elapsedTime * (isPhase2 ? 1.85 : 1.4)) * 120;
      const hoverY = arena.floorY - 275 + Math.sin(this.elapsedTime * 2.5) * 28;
      e.vx += (Math.max(-260, Math.min(260, (hoverX - ecx) * 2.7)) - e.vx) * Math.min(1, dt * 4);
      e.vy += (Math.max(-190, Math.min(190, (hoverY - ecy) * 2.8)) - e.vy) * Math.min(1, dt * 4);
      e.facing = pcx >= ecx ? 1 : -1;

      if (e.stateTimer <= 0) {
        e.sporeWaveCount += 1;
        e.aiState = 'WINDUP';
        e.stateTimer = isPhase2 ? 0.38 : 0.5;
        e.targetX = pcx;
        e.targetY = arena.floorY - 45;
        e.vx = 0;
        e.vy = -65;
      }
    } else if (e.aiState === 'WINDUP') {
      e.stateTimer -= dt;
      e.vy *= 0.9;
      if (e.stateTimer <= 0) {
        if (isPhase2 && e.sporeWaveCount % 3 === 0) {
          e.aiState = 'SLAM';
          e.stateTimer = 0.7;
          e.vx = (pcx - ecx) * 1.4;
          e.vy = 780;
        } else if (e.sporeWaveCount % 2 === 0) {
          e.aiState = 'DASH';
          e.stateTimer = 0.56;
          e.facing = pcx >= ecx ? 1 : -1;
          e.vx = e.facing * (isPhase2 ? 710 : 580);
          e.vy = 0;
          soundEngine.playDash();
        } else {
          e.aiState = 'ATTACK';
          e.stateTimer = 0.55;
          const dx = e.targetX - ecx;
          const dy = e.targetY - ecy;
          const len = Math.max(1, Math.hypot(dx, dy));
          const spd = isPhase2 ? 640 : 560;
          e.vx = (dx / len) * spd;
          e.vy = (dy / len) * spd;
        }
      }
    } else if (e.aiState === 'DASH') {
      e.stateTimer -= dt;
      const targetDashY = arena.floorY - e.h - 4;
      e.vy = (targetDashY - e.y) * 9;
      if (Math.random() < 0.45) {
        this.spawnParticle(ecx, ecy, -e.facing * 90, -20, 3.2, 0.22, isPhase2 ? '#fb923c' : '#7ae7ff', 0);
      }
      if (e.stateTimer <= 0 || e.x <= arena.minX + 5 || e.x + e.w >= arena.maxX - 5) {
        e.aiState = 'RECOVER';
        e.stateTimer = isPhase2 ? 0.95 : 1.25;
        e.vx *= 0.2;
        e.vy = -80;
      }
    } else if (e.aiState === 'SLAM') {
      e.stateTimer -= dt;
      e.vx *= 0.9;
      e.vy = 780;
      if (e.y + e.h >= arena.floorY - 4 || e.stateTimer <= 0) {
        e.y = arena.floorY - 4 - e.h;
        e.vx = 0;
        e.vy = 0;
        e.aiState = 'RECOVER';
        e.stateTimer = 1.15;
        this.triggerShake(9.5, 0.28);
        soundEngine.playLand();
        this.spawnBurst(ecx, arena.floorY - 5, 24, '#fb923c', 270, -100);
        this.spawnShockwavePair(ecx, arena.floorY, '#fb923c', 380, 1.35);
        this.fireSporeSpread(ecx, arena.floorY - 30);
      }
    } else if (e.aiState === 'ATTACK') {
      e.stateTimer -= dt;
      if (e.y + e.h >= arena.floorY - 4) {
        e.y = arena.floorY - 4 - e.h;
        e.vy = 0;
        e.vx = 0;
        e.aiState = 'RECOVER';
        e.stateTimer = isPhase2 ? 1.1 : 1.45;
        this.triggerShake(7.5, 0.22);
        soundEngine.playLand();
        this.spawnBurst(ecx, arena.floorY - 5, 18, '#fb923c', 230, -90);
        if (isPhase2) {
          this.spawnShockwavePair(ecx, arena.floorY, '#fb923c', 340, 1.1);
        }
        this.fireSporeSpread(ecx, arena.floorY - 30);
      } else if (e.stateTimer <= 0) {
        e.aiState = 'RECOVER';
        e.stateTimer = isPhase2 ? 1.0 : 1.3;
        e.vx *= 0.2;
        e.vy *= 0.2;
      }
    } else {
      e.stateTimer -= dt;
      e.vx *= 0.9;
      e.vy = Math.sin(this.elapsedTime * 4) * 16;
      if (e.stateTimer <= 0) {
        e.aiState = 'FOLLOW';
        e.stateTimer = isPhase2 ? 1.05 : 1.65;
      }
    }

    this.moveFlyerWithBounds(e, dt);
  }

  private fireSingleSpore(ox: number, oy: number, tx: number, ty: number, speed: number): void {
    const dx = tx - ox;
    const dy = ty - oy;
    const len = Math.max(1, Math.hypot(dx, dy));
    for (const p of this.projectiles) {
      if (!p.active) {
        p.active = true;
        p.x = ox;
        p.y = oy;
        p.vx = (dx / len) * speed;
        p.vy = (dy / len) * speed - 65;
        p.radius = 6.5;
        p.life = 2.4;
        return;
      }
    }
  }

  private fireSporeSpread(ox: number, oy: number): void {
    const velocities = [
      { vx: -270, vy: -95 },
      { vx: 270, vy: -95 },
      { vx: -150, vy: -220 },
      { vx: 150, vy: -220 },
    ];
    for (const vel of velocities) {
      for (const p of this.projectiles) {
        if (!p.active) {
          p.active = true;
          p.x = ox;
          p.y = oy;
          p.vx = vel.vx;
          p.vy = vel.vy;
          p.radius = 7.5;
          p.life = 2.6;
          break;
        }
      }
    }
  }

  private spawnShockwavePair(cx: number, groundY: number, color: string, speed: number, life: number): void {
    const h = 24;
    const w = 28;
    for (const dir of [-1, 1] as const) {
      this.shockwaves.push({
        active: true,
        x: cx - w * 0.5 + dir * 16,
        y: groundY - h,
        vx: dir * speed,
        w,
        h,
        life,
        maxLife: life,
        color,
      });
    }
  }

  private updateShockwaves(dt: number): void {
    const playerRect: Rect = { x: this.px + 3, y: this.py + 3, w: this.pw - 6, h: this.ph - 6 };
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.life -= dt;
      sw.x += sw.vx * dt;
      if (sw.life <= 0) {
        sw.active = false;
        continue;
      }
      if (rectsOverlap(playerRect, sw)) {
        sw.active = false;
        this.damagePlayer(sw.vx >= 0 ? 1 : -1);
      }
    }
    if (this.shockwaves.length > 16) {
      this.shockwaves = this.shockwaves.filter((s) => s.active);
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      active: true,
      x,
      y,
      vy: -52,
      text,
      color,
      life: 0.72,
      maxLife: 0.72,
    });
  }

  private updateFloatingTexts(dt: number): void {
    for (const ft of this.floatingTexts) {
      if (!ft.active) continue;
      ft.life -= dt;
      ft.y += ft.vy * dt;
      ft.vy *= 0.94;
      if (ft.life <= 0) {
        ft.active = false;
      }
    }
    if (this.floatingTexts.length > 24) {
      this.floatingTexts = this.floatingTexts.filter((f) => f.active);
    }
  }

  private moveFlyerWithBounds(e: Enemy, dt: number): void {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const rect: Rect = { x: e.x, y: e.y, w: e.w, h: e.h };
    for (const p of this.world.platforms) {
      if (!rectsOverlap(rect, p)) continue;
      if (e.vy > 0) {
        e.y = p.y - e.h;
        e.vy = -Math.abs(e.vy) * 0.3;
      } else if (e.vy < 0) {
        e.y = p.y + p.h;
        e.vy = Math.abs(e.vy) * 0.3;
      }
      rect.y = e.y;
    }
    if (e.kind === 'warden') {
      const arena = this.world.bossArena;
      e.x = Math.max(arena.minX, Math.min(arena.maxX - e.w, e.x));
      e.y = Math.max(arena.minY, Math.min(arena.floorY - e.h, e.y));
    }
  }

  private updateProjectiles(dt: number): void {
    const playerRect: Rect = { x: this.px + 3, y: this.py + 3, w: this.pw - 6, h: this.ph - 6 };
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 170 * dt;

      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      if (circleIntersectsRect(p.x, p.y, p.radius, playerRect)) {
        p.active = false;
        this.damagePlayer(this.px < p.x ? -1 : 1);
        continue;
      }
      for (const plat of this.world.platforms) {
        if (circleIntersectsRect(p.x, p.y, p.radius, plat)) {
          p.active = false;
          this.spawnBurst(p.x, p.y, 6, '#fdba74', 120, -20);
          break;
        }
      }
    }
  }

  private updateSporeBulbs(dt: number): void {
    for (const b of this.world.sporeBulbs) {
      if (!b.alive && b.respawnTimer > 0) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.alive = true;
        }
      }
    }
  }

  private updateRelics(): void {
    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const relic of this.world.relics) {
      if (relic.collected) continue;
      if (circleIntersectsRect(relic.x, relic.y, 20, playerRect)) {
        relic.collected = true;
        this.collectedItemIds.add(relic.itemId);
        if (relic.itemId === 'relic-shell-shard') {
          this.maxHp += 1;
          this.hp = this.maxHp;
        } else {
          this.essence += 25;
        }
        this.awardXP(75, relic.x, relic.y - 16);
        soundEngine.playBench();
        this.spawnBurst(relic.x, relic.y, 26, relic.color, 230, -80);
        this.saveProgress();
      }
    }
  }

  private updateDialogueProximity(input: InputSnapshot): void {
    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;
    let closest: DialogueSpeaker | null = null;
    let bestDist = Infinity;

    for (const s of this.world.speakers) {
      const dx = Math.abs(pcx - s.x);
      const dy = Math.abs(pcy - (s.y - 24));
      if (dx < 76 && dy < 70 && dx < bestDist) {
        bestDist = dx;
        closest = s;
      }
    }

    this.nearbySpeaker = closest;
    if (closest && input.interactPressed) {
      this.interactWithNearbySpeaker();
    }
  }

  private updateBenches(): void {
    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const bench of this.world.benches) {
      const zone: Rect = { x: bench.x - 36, y: bench.y - 48, w: 72, h: 48 };
      if (!bench.activated && rectsOverlap(playerRect, zone)) {
        bench.activated = true;
        this.respawnX = bench.x - this.pw * 0.5;
        this.respawnY = bench.y - this.ph;
        this.hp = this.maxHp;
        this.soul = Math.max(this.soul, 66);
        soundEngine.playBench();
        this.spawnBurst(bench.x, bench.y - 24, 24, '#a7f3d0', 220, -90);
        this.saveProgress();
      }
    }
  }

  private updateAltar(): void {
    if (!this.bossDefeated) return;
    const altarRect: Rect = {
      x: this.world.altarPos.x - 42,
      y: this.world.altarPos.y - 96,
      w: 84,
      h: 96,
    };
    const playerRect: Rect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    if (rectsOverlap(playerRect, altarRect)) {
      this.collectedItemIds.add('seal-ancient-silk');
      this.status = 'VICTORY';
      this.saveProgress();
      soundEngine.playVictory();
      soundEngine.stopAmbientDrone();
      this.emitHud(true);
    }
  }

  private beginDeathSequence(): void {
    this.hp = 0;
    this.dyingTimer = 0.85;
    this.pvx = 0;
    this.pvy = 0;
    this.dashTimer = 0;
    this.healTimer = 0;
    this.hitstopTimer = 0.08;
    this.anim.trigger('death', 0.85);
    this.triggerShake(11, 0.45);
    this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 38, '#ecfdf5', 260, -110);
    this.emitHud(true);
  }

  private onThornHazardHit(): void {
    if (this.invulnTimer > 0 || this.dyingTimer > 0) return;
    this.hp -= 1;
    this.invulnTimer = 1.1;
    this.hitFlashTimer = 0.14;
    this.hitstopTimer = 0.06;
    this.triggerShake(8, 0.24);
    soundEngine.playDamage();

    if (this.hp <= 0) {
      this.beginDeathSequence();
      return;
    }

    this.anim.trigger('hurt', 0.26);
    this.px = this.safeGroundX;
    this.py = this.safeGroundY;
    this.pvx = 0;
    this.pvy = 0;
    this.dashTimer = 0;
    this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 18, '#a7f3d0', 180, -40);
  }

  private damagePlayer(knockDir: -1 | 1): void {
    if (this.invulnTimer > 0 || this.dyingTimer > 0) return;
    this.hp -= 1;
    this.invulnTimer = 1.15;
    this.hitFlashTimer = 0.16;
    this.hitstopTimer = 0.065;
    this.dashTimer = 0;
    this.healTimer = 0;
    this.pvx = knockDir * 310;
    this.pvy = -330;
    this.wallJumpLockTimer = 0.16;
    this.triggerShake(9, 0.25);
    soundEngine.playDamage();
    this.spawnBurst(this.px + this.pw * 0.5, this.py + this.ph * 0.5, 22, '#fca5a5', 260, -70);

    if (this.hp <= 0) {
      this.beginDeathSequence();
    } else {
      this.anim.trigger('hurt', 0.26);
    }
  }

  private triggerShake(magnitude: number, duration: number): void {
    if (!this.screenShakeEnabled) return;
    this.shakeMag = Math.max(this.shakeMag, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    maxLife: number,
    color: string,
    gravity = 240,
    glow = false
  ): void {
    for (const pt of this.particles) {
      if (!pt.active) {
        pt.active = true;
        pt.x = x;
        pt.y = y;
        pt.vx = vx;
        pt.vy = vy;
        pt.size = size;
        pt.life = maxLife;
        pt.maxLife = maxLife;
        pt.color = color;
        pt.gravity = gravity;
        pt.glow = glow;
        return;
      }
    }
  }

  private spawnDirectionalParticleBlast(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    count: number,
    color: string,
    speed = 270
  ): void {
    const baseAngle = Math.atan2(dirY, dirX);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.25;
      const ang = baseAngle + spread;
      const spd = speed * (0.45 + Math.random() * 0.78);
      const isSparkCore = i % 3 === 0;
      this.spawnParticle(
        x + (Math.random() - 0.5) * 6,
        y + (Math.random() - 0.5) * 6,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 30,
        isSparkCore ? 2.4 + Math.random() * 2.2 : 2.8 + Math.random() * 2.6,
        0.24 + Math.random() * 0.2,
        isSparkCore ? '#ffffff' : color,
        150,
        true
      );
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number,
    biasVy: number
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * (0.35 + Math.random() * 0.75);
      this.spawnParticle(
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd + biasVy,
        2.2 + Math.random() * 3,
        0.25 + Math.random() * 0.3,
        color,
        260
      );
    }
  }

  private spawnAfterImage(): void {
    for (const img of this.afterImages) {
      if (!img.active) {
        img.active = true;
        img.x = this.px;
        img.y = this.py;
        img.facing = this.facing;
        img.alpha = 0.85;
        return;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
  }

  private updateAfterImages(dt: number): void {
    for (const img of this.afterImages) {
      if (!img.active) continue;
      img.alpha -= dt * 4.5;
      if (img.alpha <= 0) {
        img.active = false;
      }
    }
  }

  private updateCamera(dt: number): void {
    const next = this.roomManager.stepCamera(
      this.camX,
      this.camY,
      this.world.rooms,
      this.px,
      this.py,
      this.pw,
      this.ph,
      this.pvy,
      this.facing,
      this.viewW,
      this.viewH,
      this.world.width,
      this.world.height,
      dt,
      this.pvx
    );
    this.camX = next.x;
    this.camY = next.y;
  }

  private render(): void {
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      const mag = this.shakeMag * (this.shakeTime / 0.25);
      shakeX = (Math.random() * 2 - 1) * mag;
      shakeY = (Math.random() * 2 - 1) * mag;
      if (this.shakeTime <= 0.02) this.shakeMag = 0;
    }

    const playerState: PlayerRenderState = {
      x: this.px,
      y: this.py,
      w: this.pw,
      h: this.ph,
      vx: this.pvx,
      vy: this.pvy,
      facing: this.facing,
      grounded: this.grounded,
      wallSliding: this.wallSliding,
      wallDir: this.wallDir,
      dashing: this.dashTimer > 0,
      healing: this.healTimer > 0,
      healProgress: this.healTimer > 0 ? 1 - this.healTimer / 0.36 : 0,
      invulnTimer: this.invulnTimer,
      squashX: this.squashX,
      squashY: this.squashY,
      runCycle: this.runCycle,
      hitFlash: this.hitFlashTimer,
      chargeProgress: this.combat.getChargeProgress(),
      chargeColor: this.combat.getActiveStyleSpec().color,
      pose: this.anim.samplePose(this.elapsedTime, this.runCycle),
    };

    renderGameFrame(this.ctx, this.viewW, this.viewH, {
      time: this.elapsedTime,
      sceneTheme: this.sceneTheme,
      camX: this.camX,
      camY: this.camY,
      shakeX,
      shakeY,
      world: this.world,
      player: playerState,
      renderPlayer: (ctx, p, time, isTitleMode) => {
        this.drawWarriorCharacter(ctx, p, time, isTitleMode);
      },
      slash: this.combat.slash,
      playerNeedles: this.combat.playerNeedles,
      traps: this.combat.traps,
      afterImages: this.afterImages,
      particles: this.particles,
      projectiles: this.projectiles,
      specialWaves: this.combat.specialWaves,
      aoeRings: this.combat.aoeRings,
      shockwaves: this.shockwaves,
      floatingTexts: this.floatingTexts,
      bossDefeated: this.bossDefeated,
      isTitleMode: this.status === 'TITLE_MENU',
    });
  }

  private drawWarriorCharacter(
    ctx: CanvasRenderingContext2D,
    p: PlayerRenderState,
    time: number,
    isTitleMode: boolean
  ): void {
    const pose = p.pose;
    const st = isTitleMode ? 'idle' : pose.state;

    if (
      st !== 'death' &&
      st !== 'hurt' &&
      p.invulnTimer > 0 &&
      Math.floor(p.invulnTimer * 18) % 2 === 0 &&
      !p.dashing
    ) {
      return;
    }

    const cx = p.x + p.w * 0.5;
    const bottomY = p.y + p.h;
    const flash = p.hitFlash > 0 || st === 'hurt';

    ctx.save();
    ctx.translate(cx, bottomY);
    ctx.globalAlpha = pose.dissolveAlpha;
    ctx.scale(p.facing * p.squashX, p.squashY);

    // Rotate around character center for jumps/spins/dashes/hurt/death
    ctx.translate(0, -22 + pose.offsetY);
    ctx.rotate(pose.tiltAngle + (st === 'doubleJump' ? pose.spinAngle * 0.35 : 0));
    ctx.translate(0, 22);

    // Hold-Attack Charging Aura (builds smoothly to 100% over 0.6s)
    if (p.chargeProgress > 0.12) {
      const cp = p.chargeProgress;
      const ready = cp >= 1;
      const auraR = 22 + cp * 18 + Math.sin(time * (ready ? 26 : 14)) * 3;
      const grad = ctx.createRadialGradient(0, -24, 4, 0, -24, auraR * 1.35);
      grad.addColorStop(0, ready ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)');
      grad.addColorStop(0.55, `${p.chargeColor}55`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -24, auraR * 1.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ready ? '#ffffff' : p.chargeColor;
      ctx.lineWidth = ready ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.arc(0, -24, auraR * 0.86, time * 7, time * 7 + Math.PI * 2 * Math.min(1, cp));
      ctx.stroke();
    }

    // Healing Aura & Converging Soul Rings
    if (p.healing || st === 'healing') {
      const auraR = 26 + Math.sin(time * 24) * 4;
      const grad = ctx.createRadialGradient(0, -24, 4, 0, -24, auraR * 1.45);
      grad.addColorStop(0, 'rgba(236, 253, 245, 0.65)');
      grad.addColorStop(0.55, 'rgba(110, 231, 183, 0.25)');
      grad.addColorStop(1, 'rgba(122, 231, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -24, auraR * 1.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(167, 243, 208, 0.8)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, -22, 16 + Math.sin(time * 18) * 4, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Double Jump Spectral Moth Wings
    if (pose.wingSpread > 0.05) {
      const span = 26 * pose.wingSpread;
      ctx.save();
      ctx.globalAlpha *= 0.85;
      ctx.fillStyle = st === 'specialAttack' ? 'rgba(103, 232, 249, 0.45)' : 'rgba(167, 243, 208, 0.55)';
      ctx.strokeStyle = '#ecfeff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, -22);
      ctx.quadraticCurveTo(-span - 8, -42, -span - 4, -14);
      ctx.quadraticCurveTo(-14, -12, -4, -18);
      ctx.moveTo(4, -22);
      ctx.quadraticCurveTo(span + 8, -42, span + 4, -14);
      ctx.quadraticCurveTo(14, -12, 4, -18);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Special Attack 360-degree Silk Cyclone Nova Ring
    if (st === 'specialAttack') {
      const novaR = 22 + pose.progress * 74;
      const novaAlpha = Math.max(0, 1 - pose.progress * 0.85);
      ctx.save();
      ctx.globalAlpha = novaAlpha;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 4 * (1 - pose.progress * 0.5);
      ctx.beginPath();
      ctx.arc(0, -22, novaR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ecfeff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -22, novaR * 0.72, pose.spinAngle, pose.spinAngle + Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();
    }

    // Hurt / Death Ring Feedback
    if (st === 'hurt') {
      ctx.strokeStyle = 'rgba(252, 165, 165, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -24, 20 + pose.progress * 18, 0, Math.PI * 2);
      ctx.stroke();
    } else if (st === 'death') {
      const shatterR = 14 + pose.progress * 54;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pose.progress);
      ctx.strokeStyle = '#ecfeff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -26, shatterR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#a7f3d0';
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + pose.progress * 2.2;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * shatterR * 0.7, -26 + Math.sin(ang) * shatterR * 0.7, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Scaled Horned Warrior Geometry (respecting pose, direction & position)
    const frameTime = time * 60;
    const breatheY = st === 'idle' ? Math.sin(frameTime * 0.08) * 3 : st === 'landing' ? 4 : 0;
    const cloakTrail = Math.min(14, Math.abs(p.vx) * 0.03 + pose.cloakLift * 0.7);
    const wave = Math.sin(frameTime * 0.1) * 3 - cloakTrail;
    const stride = pose.legStride * 1.85;
    const isAirborne = st === 'jumping' || st === 'doubleJump' || st === 'wallJump' || st === 'falling';

    ctx.save();
    ctx.scale(0.48, 0.48);
    ctx.translate(0, -68 + breatheY);

    // 1. Dark Silhouetted Legs
    ctx.fillStyle = st === 'hurt' ? '#fca5a5' : flash ? '#ffffff' : '#0f131a';
    if (st === 'wallSlide') {
      ctx.beginPath();
      ctx.moveTo(-10, 42);
      ctx.lineTo(-4, 42);
      ctx.lineTo(2, 62);
      ctx.lineTo(-5, 64);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(4, 42);
      ctx.lineTo(12, 42);
      ctx.lineTo(15, 65);
      ctx.lineTo(8, 66);
      ctx.closePath();
      ctx.fill();
    } else {
      const legDrop = isAirborne ? -6 : 0;
      ctx.beginPath();
      ctx.moveTo(-10, 42);
      ctx.lineTo(-4, 42);
      ctx.lineTo(-8 + stride, 68 + legDrop);
      ctx.lineTo(-14 + stride, 65 + legDrop);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(4, 42);
      ctx.lineTo(12, 42);
      ctx.lineTo(16 - stride, 68 + legDrop);
      ctx.lineTo(9 - stride, 68 + legDrop);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Layered Dark Blue Cloak (Back & Front with Folds)
    ctx.fillStyle =
      st === 'hurt'
        ? '#fca5a5'
        : flash
        ? '#ffffff'
        : p.dashing || st === 'dash'
        ? '#0ea5e9'
        : '#1e2b3c';
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(14, 14);
    ctx.lineTo(24 + wave, 52);
    ctx.lineTo(8 + wave * 0.4, 46);
    ctx.lineTo(0 + wave * 0.3, 54);
    ctx.lineTo(-10 + wave * 0.4, 46);
    ctx.lineTo(-26 + wave, 52);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle =
      st === 'hurt'
        ? '#fecaca'
        : flash
        ? '#ffffff'
        : p.dashing || st === 'dash'
        ? '#38bdf8'
        : st === 'specialAttack'
        ? '#3b82f6'
        : '#2c3e55';
    ctx.strokeStyle = flash ? '#ffffff' : '#090c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, 12);
    ctx.quadraticCurveTo(0, 18, 15, 12);
    ctx.lineTo(22 + wave, 46);
    ctx.lineTo(12 + wave * 0.35, 40);
    ctx.lineTo(2 + wave * 0.25, 48);
    ctx.lineTo(-8 + wave * 0.35, 40);
    ctx.lineTo(-22 + wave, 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Glowing Cyan Needle Sword
    if (!p.wallSliding && st !== 'wallSlide' && st !== 'death') {
      ctx.save();
      if (st === 'attack' || st === 'specialAttack') {
        ctx.translate(10, 26);
        ctx.rotate(Math.PI - 0.85 + pose.progress * 1.65);
      } else if (st === 'dash' || p.dashing) {
        ctx.translate(6, 28);
        ctx.rotate(Math.PI);
      } else {
        ctx.translate(-8, 30);
        ctx.rotate(-Math.PI / 6 + Math.sin(frameTime * 0.08) * 0.04);
      }

      ctx.fillStyle = '#34495e';
      ctx.fillRect(0, -3, 12, 6);
      ctx.fillStyle = '#5dade2';
      ctx.fillRect(-2, -8, 4, 16);

      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#a3f7ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(-2, -5);
      ctx.lineTo(-65, 0);
      ctx.lineTo(-2, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-55, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 4. White Mask & Curved Horns
    ctx.fillStyle = st === 'hurt' ? '#fee2e2' : flash ? '#ffffff' : '#f4f6f8';
    ctx.strokeStyle = flash && st !== 'hurt' ? '#ffffff' : '#090c12';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    ctx.moveTo(-16, -12);
    ctx.bezierCurveTo(-26, -30, -24, -48, -10, -56);
    ctx.bezierCurveTo(-15, -42, -14, -28, -8, -22);
    ctx.quadraticCurveTo(0, -24, 8, -22);
    ctx.bezierCurveTo(14, -28, 15, -42, 10, -56);
    ctx.bezierCurveTo(24, -48, 26, -30, 16, -12);
    ctx.bezierCurveTo(22, 6, 14, 18, 0, 18);
    ctx.bezierCurveTo(-14, 18, -22, 6, -16, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Hollow Knight Style Deep Black Eyes
    if (!flash || st === 'hurt') {
      ctx.fillStyle = st === 'hurt' ? '#ef4444' : st === 'specialAttack' ? '#0891b2' : '#090c12';
      const eyeScaleY = st === 'healing' || st === 'hurt' ? 0.55 : 1;
      ctx.beginPath();
      ctx.ellipse(-6, -1, 4.5, 7.5 * eyeScaleY, -0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(9, -1, 4, 7 * eyeScaleY, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  private getInventoryItems(): InventoryItem[] {
    const hasWarrior = this.progression.hasAbility('swordAttack');
    const hasPogo = this.progression.hasAbility('doubleJump');
    const hasDash = this.progression.hasAbility('dash');
    return [
      {
        id: 'pale-needle',
        name: 'Pale Needle',
        category: 'Ability',
        description: 'Active from Level 1 (Horizontal Slash) & enhanced at Level 2 (Warrior Up-Slash).',
        collected: true,
        equipped: true,
        icon: 'needle',
      },
      {
        id: 'pogo-art',
        name: 'Downward Pogo Art',
        category: 'Ability',
        description: 'Unlocks at Level 5 (Double Jumper): Strike downward (S + J) on foes & spikes to rebound.',
        collected: hasPogo || hasWarrior,
        equipped: hasPogo,
        icon: 'crest',
      },
      {
        id: 'silk-dash',
        name: 'Silk Dash',
        category: 'Ability',
        description: 'Unlocks at Level 3 (Dash Slash) & upgrades at Level 7 (Shadow Dash Attack).',
        collected: hasDash,
        equipped: hasDash,
        icon: 'dash',
      },
      {
        id: 'focus-mend',
        name: 'Soul Focus Mend',
        category: 'Ability',
        description: 'Channel 33 Soul while grounded (F) to restore 1 shattered Mask.',
        collected: true,
        equipped: true,
        icon: 'focus',
      },
      {
        id: 'relic-mothscale',
        name: 'Mothscale Charm',
        category: 'Relic',
        description: 'Hidden in Canopy Sanctuary behind a cracked upper moss wall (+25 Essence).',
        collected: this.collectedItemIds.has('relic-mothscale'),
        equipped: this.collectedItemIds.has('relic-mothscale'),
        icon: 'relic',
      },
      {
        id: 'relic-shell-shard',
        name: 'Pale Shell Fragment',
        category: 'Relic',
        description: 'Hidden in the Forgotten Relic Vault beneath Misty Reed Marsh (+1 Max Mask).',
        collected: this.collectedItemIds.has('relic-shell-shard'),
        equipped: this.collectedItemIds.has('relic-shell-shard'),
        icon: 'crest',
      },
      {
        id: 'seal-ancient-silk',
        name: 'Ancient Silk Seal',
        category: 'Seal',
        description: "Claimed at the Sanctum Altar after vanquishing the Mosslight Warden.",
        collected: this.collectedItemIds.has('seal-ancient-silk'),
        equipped: this.collectedItemIds.has('seal-ancient-silk'),
        icon: 'seal',
      },
    ];
  }

  private emitHud(force: boolean): void {
    const boss = this.world.enemies.find((e) => e.kind === 'warden');
    const pcx = this.px + this.pw * 0.5;
    const pcy = this.py + this.ph * 0.5;
    const zoneName = getZoneName(pcx, pcy, this.world.rooms);
    const activeRoom = this.world.rooms.find((r) => r.id === this.currentRoomId) ?? this.world.rooms[0];

    const playerNormX = Math.max(0, Math.min(1, (pcx - activeRoom.x) / activeRoom.w));
    const playerNormY = Math.max(0, Math.min(1, (pcy - activeRoom.y) / activeRoom.h));
    const normBucketX = Math.round(playerNormX * 8);
    const normBucketY = Math.round(playerNormY * 8);

    const bossActive = Boolean(this.bossEngaged && boss && boss.alive);
    const bossHp = boss ? Math.max(0, boss.hp) : 0;
    const bossMaxHp = boss ? boss.maxHp : 240;
    const secs = Math.floor(this.runTime);
    const dashReady =
      this.progression.hasAbility('dash') &&
      this.dashCooldownTimer <= 0 &&
      (this.grounded || this.airDashAvailable);
    const canHeal = this.soul >= 33 && this.hp < this.maxHp;
    const secretWallsBroken = this.world.secretWalls.filter((sw) => sw.broken).length;
    const totalSecretWalls = this.world.secretWalls.length;
    const inventoryKey = Array.from(this.collectedItemIds).sort().join(',');
    const speakerKey = this.nearbySpeaker?.id ?? '';
    const dialogueKey = this.activeDialogue ? `${this.activeDialogue.speakerName}:${this.activeDialogue.lineIndex}` : '';
    const hasSave = this.hasSaveData();
    const stats = this.progression.getProgressStats();
    const styleSpec = this.combat.getActiveStyleSpec();
    const unlockedStyles = this.combat.getUnlockedStyles(stats.level);
    const chargeBucket = Math.round(this.combat.getChargeProgress() * 10);
    const bannerKey = this.levelUpBanner ? `${this.levelUpBanner.level}:${this.levelUpBanner.abilityLabel}` : '';
    const transitionKey = this.biomeTransitionLabel ?? '';

    const key = `${this.status}|${this.sceneTheme}|${this.world.width}x${this.world.height}|${this.hp}|${this.maxHp}|${this.soul}|${this.essence}|${stats.level}|${stats.xp}|${this.combat.activeStyle}|${chargeBucket}|${this.combat.activeAttackName}|${this.combat.activeAttackLevel}|${this.combat.comboStep}|${bannerKey}|${transitionKey}|${zoneName}|${this.currentRoomId}|${this.roomManager.roomX},${this.roomManager.roomY}|${this.mapVersion}|${normBucketX},${normBucketY}|${secretWallsBroken}|${bossActive}|${bossHp}|${secs}|${this.enemiesDefeated}|${this.pogoChains}|${dashReady}|${canHeal}|${inventoryKey}|${speakerKey}|${dialogueKey}|${hasSave}`;
    if (!force && key === this.lastHudKey) return;
    this.lastHudKey = key;

    this.onHudChange({
      status: this.status,
      sceneTheme: this.sceneTheme,
      hp: this.hp,
      maxHp: this.maxHp,
      soul: this.soul,
      maxSoul: this.maxSoul,
      essence: this.essence,
      level: stats.level,
      levelTitle: stats.title,
      abilityLabel: stats.abilityLabel,
      activeAttackName: this.combat.activeAttackName,
      activeAttackLevel: this.combat.activeAttackLevel,
      activeStyle: styleSpec.id,
      activeStyleLabel: styleSpec.label,
      activeHoldName: styleSpec.holdAttackName,
      activePogoName: styleSpec.pogoAttackName,
      chargeProgress: this.combat.getChargeProgress(),
      unlockedStyles,
      comboStep: this.combat.comboStep,
      xp: stats.xp,
      xpIntoLevel: stats.xpIntoLevel,
      xpForNextLevel: stats.xpForNextLevel,
      xpProgress: stats.progress,
      unlockedAbilities: { ...gameState.unlockedAbilities },
      levelUpBanner: this.levelUpBanner ? { ...this.levelUpBanner } : null,
      zoneName,
      currentRoomId: this.currentRoomId,
      roomX: this.roomManager.roomX,
      roomY: this.roomManager.roomY,
      biomeTransitionLabel: this.biomeTransitionLabel,
      worldWidth: this.world.width,
      worldHeight: this.world.height,
      playerNormX,
      playerNormY,
      rooms: this.world.rooms.map((r) => ({ ...r })),
      secretWallsBroken,
      totalSecretWalls,
      bossActive,
      bossName: 'Mosslight Warden',
      bossHp,
      bossMaxHp,
      elapsedSeconds: secs,
      enemiesDefeated: this.enemiesDefeated,
      pogoChains: this.pogoChains,
      canHeal,
      dashReady,
      inventory: this.getInventoryItems(),
      nearbySpeaker: this.nearbySpeaker ? { ...this.nearbySpeaker } : null,
      activeDialogue: this.activeDialogue ? { ...this.activeDialogue } : null,
      hasSaveData: hasSave,
    });
  }

  public respawnAtCheckpoint(): void {
    this.hp = this.maxHp;
    this.soul = Math.max(this.soul, 33);
    this.px = this.respawnX;
    this.py = this.respawnY;
    this.pvx = 0;
    this.pvy = 0;
    this.dyingTimer = 0;
    this.airJumpsRemaining = 1;
    this.anim.reset();
    this.invulnTimer = 1.0;
    this.status = 'PLAYING';
    soundEngine.startAmbientDrone();
    this.emitHud(true);
  }
}
