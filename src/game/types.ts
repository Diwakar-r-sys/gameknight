import type { AbilityId } from './progression';

export type GameStatus = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';
export type SceneTheme = 'crystal' | 'swamp' | 'grotto';

export interface BiomeMeta {
  id: SceneTheme;
  label: string;
  shortLabel: string;
  description: string;
}

export const BIOME_OPTIONS: BiomeMeta[] = [
  {
    id: 'crystal',
    label: '1. Ice Cavern',
    shortLabel: 'Ice Cavern',
    description: 'Deep slate-blue cavern with jagged cyan crystals and warm brazier torches.',
  },
  {
    id: 'swamp',
    label: '2. Swamp Forest',
    shortLabel: 'Swamp Forest',
    description: 'Twilight purple marsh with stilted thatched huts, log bridges, and glowing flora.',
  },
  {
    id: 'grotto',
    label: '3. Green Grotto',
    shortLabel: 'Green Grotto',
    description: 'Sunlit emerald cavern with vertical God rays, dangling vines, and springy moss.',
  },
];

export interface MovementConfig {
  maxRunSpeed: number;
  groundAccel: number;
  groundDecel: number;
  airAccel: number;
  airDecel: number;
  jumpVelocity: number;
  jumpCutMultiplier: number;
  gravityUp: number;
  gravityFall: number;
  maxFallSpeed: number;
  coyoteTime: number;
  jumpBufferTime: number;
  wallSlideSpeed: number;
  wallJumpVelX: number;
  wallJumpVelY: number;
  wallJumpLockTime: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  dashIFrames: number;
  pogoVelocity: number;
}

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  maxRunSpeed: 360,
  groundAccel: 3800,
  groundDecel: 4600,
  airAccel: 2700,
  airDecel: 2000,
  jumpVelocity: -640,
  jumpCutMultiplier: 0.44,
  gravityUp: 1650,
  gravityFall: 2480,
  maxFallSpeed: 790,
  coyoteTime: 0.12,
  jumpBufferTime: 0.1,
  wallSlideSpeed: 145,
  wallJumpVelX: 430,
  wallJumpVelY: -610,
  wallJumpLockTime: 0.14,
  dashSpeed: 880,
  dashDuration: 0.155,
  dashCooldown: 0.42,
  dashIFrames: 0.2,
  pogoVelocity: -595,
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform extends Rect {
  id: string;
  kind: 'stone' | 'mossStone' | 'pillar' | 'bridge' | 'floatingIsland';
  mossTop?: boolean;
  hasSprout?: boolean;
  depthOffset?: number;
}

export interface WaterVolume extends Rect {
  id: string;
  tint: 'emerald' | 'marsh';
  lilypadXs: number[];
}

export interface AirStream extends Rect {
  id: string;
  liftForce: number;
}

export interface BouncePad extends Rect {
  id: string;
  boostVelocity: number;
  bounceTimer: number;
}

export interface ReedProp {
  x: number;
  y: number;
  height: number;
  layer: 'mid' | 'fore';
  kind: 'lilyStem' | 'cattail' | 'ringPost';
  phase: number;
}

export interface ThornHazard extends Rect {
  id: string;
  orientation: 'up' | 'down';
}

export interface SecretWall extends Rect {
  id: string;
  hp: number;
  maxHp: number;
  broken: boolean;
  hitFlash: number;
  revealRoomId: string;
}

export interface HangingRope {
  id: string;
  x: number;
  y: number;
  length: number;
  angle: number;
  angVel: number;
}

export interface GlowLight {
  x: number;
  y: number;
  radius: number;
  color: 'teal' | 'amber' | 'emerald';
  phase: number;
  isFirefly?: boolean;
  driftRadius?: number;
}

export type CardinalDir = 'N' | 'S' | 'E' | 'W';
export type PortalDirection = CardinalDir | 'NE' | 'NW' | 'SE' | 'SW';

export interface BiomePortalLink {
  label: string;
  targetTheme: SceneTheme;
  dir: PortalDirection;
}

export interface BiomePortal extends Rect {
  id: string;
  targetTheme: SceneTheme;
  targetRoomId: string;
  spawnX: number;
  spawnY: number;
  label: string;
  shortLabel: string;
  direction: PortalDirection;
}

export interface RoomCell {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  discovered: boolean;
  visited: boolean;
  hasBench?: boolean;
  isBossRoom?: boolean;
  isSecret?: boolean;
  connections: CardinalDir[];
  adjacentRoomIds: string[];
  portalLinks?: BiomePortalLink[];
}

export interface MossTuft {
  x: number;
  y: number;
  w: number;
  compression: number;
  velocity: number;
  hueShift: number;
}

export interface SporeBulb {
  id: string;
  x: number;
  y: number;
  radius: number;
  alive: boolean;
  respawnTimer: number;
  pogoPod: boolean;
  swayPhase: number;
}

export interface BenchCheckpoint {
  id: string;
  x: number;
  y: number;
  activated: boolean;
  zoneName: string;
}

export type EnemyKind = 'crawler' | 'flyer' | 'shieldbearer' | 'warden';
export type FlyerAIState = 'FOLLOW' | 'WINDUP' | 'ATTACK' | 'RECOVER' | 'SHIELD' | 'DASH' | 'SLAM';

export interface HitPoint {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  knockVx?: number;
  knockVy?: number;
  knockTimer?: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  aiState: FlyerAIState;
  stateTimer: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  hitFlash: number;
  alive: boolean;
  animPhase: number;
  sporeWaveCount: number;
  shielded?: boolean;
  phase?: 1 | 2;
}

export interface SporeProjectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
}

export type CombatStyleId =
  | 'hunter'
  | 'reaper'
  | 'wanderer'
  | 'beast'
  | 'witch'
  | 'architect'
  | 'shaman';

export interface PlayerNeedle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  life: number;
  maxLife: number;
  damage: number;
  color: string;
  hitIds: Set<string>;
}

export interface CombatTrap {
  active: boolean;
  kind: 'cog' | 'mine';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  spin: number;
  damage: number;
  color: string;
}

export type CombatAttackKind =
  | 'basicHorizontal'
  | 'warriorSlash'
  | 'dashSlash'
  | 'airSlash'
  | 'downPogo'
  | 'energyProjectile'
  | 'shadowDashAttack'
  | 'aoeMagicSpell'
  | 'comboHit1'
  | 'comboHit2'
  | 'comboFinisher'
  | 'ultimateWave'
  | 'holdSlash'
  | 'stylePogo';

export interface SpecialWave {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  life: number;
  maxLife: number;
  damage: number;
  isUltimate: boolean;
  halfW: number;
  halfH: number;
  color: string;
  hitIds: Set<string>;
}

export interface AoeRingEffect {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  isUltimate: boolean;
}

export interface Shockwave {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export type SlashDirection = 'right' | 'left' | 'up' | 'down';

export interface SlashArc {
  active: boolean;
  x: number;
  y: number;
  dir: SlashDirection;
  timer: number;
  duration: number;
  frame: 0 | 1 | 2;
  kind: CombatAttackKind;
  styleId: CombatStyleId;
  styleColor: string;
  isHoldAttack: boolean;
  levelReq: number;
  attackName: string;
  damage: number;
  radius: number;
  comboStep: number;
  hitIds: Set<string>;
}

export interface AfterImage {
  active: boolean;
  x: number;
  y: number;
  facing: 1 | -1;
  alpha: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  gravity: number;
  glow: boolean;
}

export interface GodRay {
  x: number;
  width: number;
  angle: number;
  alpha: number;
  phase: number;
  speed: number;
}

export interface FloatingMote {
  x: number;
  y: number;
  radius: number;
  depth: number;
  phase: number;
  speedY: number;
  driftX: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Ability' | 'Relic' | 'Seal';
  description: string;
  collected: boolean;
  equipped?: boolean;
  icon: 'needle' | 'dash' | 'focus' | 'relic' | 'crest' | 'seal';
}

export interface DialogueSpeaker {
  id: string;
  name: string;
  title: string;
  x: number;
  y: number;
  lines: string[];
  read: boolean;
}

export interface WorldRelicPickup {
  id: string;
  itemId: string;
  x: number;
  y: number;
  collected: boolean;
  color: string;
}

export interface XpOrb {
  id: string;
  x: number;
  y: number;
  xpValue: number;
  collected: boolean;
  phase: number;
}

export interface LevelPreset {
  id: string;
  name: string;
  subtitle: string;
  spawnX: number;
  spawnY: number;
  recommendedTheme: SceneTheme;
  difficulty: 'Entry' | 'Trial' | 'Ascent' | 'Depths' | 'Boss';
}

export interface GameSettings {
  muted: boolean;
  screenShake: boolean;
  touchControls: 'auto' | 'on' | 'off';
}

export interface BiomeMemorySnapshot {
  visitedRoomIds: string[];
  discoveredRoomIds: string[];
  brokenWallIds: string[];
  collectedOrbIds: string[];
  collectedRelicIds: string[];
  defeatedEnemyIds: string[];
  activatedBenchIds: string[];
  bossDefeated: boolean;
}

export interface SaveStateData {
  sceneTheme: SceneTheme;
  respawnX: number;
  respawnY: number;
  hp: number;
  maxHp: number;
  soul: number;
  essence: number;
  xp?: number;
  collectedOrbIds?: string[];
  zoneName: string;
  collectedItemIds: string[];
  equippedItemIds: string[];
  visitedRoomIds: string[];
  discoveredRoomIds: string[];
  brokenWallIds: string[];
  biomeMemory?: Partial<Record<SceneTheme, BiomeMemorySnapshot>>;
  savedAt: number;
}

export interface LevelUpBanner {
  level: number;
  title: string;
  abilityLabel: string;
}

export interface HudSnapshot {
  status: GameStatus;
  sceneTheme: SceneTheme;
  hp: number;
  maxHp: number;
  soul: number;
  maxSoul: number;
  essence: number;
  level: number;
  levelTitle: string;
  abilityLabel: string;
  activeAttackName: string;
  activeAttackLevel: number;
  activeStyle: CombatStyleId;
  activeStyleLabel: string;
  activeHoldName: string;
  activePogoName: string;
  chargeProgress: number;
  unlockedStyles: CombatStyleId[];
  comboStep: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpProgress: number;
  unlockedAbilities: Record<AbilityId, boolean>;
  levelUpBanner: LevelUpBanner | null;
  zoneName: string;
  worldWidth: number;
  worldHeight: number;
  currentRoomId: string;
  roomX: number;
  roomY: number;
  biomeTransitionLabel: string | null;
  playerNormX: number;
  playerNormY: number;
  rooms: RoomCell[];
  secretWallsBroken: number;
  totalSecretWalls: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  elapsedSeconds: number;
  enemiesDefeated: number;
  pogoChains: number;
  canHeal: boolean;
  dashReady: boolean;
  inventory: InventoryItem[];
  nearbySpeaker: DialogueSpeaker | null;
  activeDialogue: {
    speakerName: string;
    speakerTitle: string;
    lines: string[];
    lineIndex: number;
  } | null;
  hasSaveData: boolean;
}
