import type {
  AirStream,
  BenchCheckpoint,
  BiomePortal,
  BouncePad,
  DialogueSpeaker,
  Enemy,
  FloatingMote,
  GlowLight,
  GodRay,
  HangingRope,
  LevelPreset,
  MossTuft,
  Platform,
  ReedProp,
  RoomCell,
  SceneTheme,
  SecretWall,
  SporeBulb,
  ThornHazard,
  WaterVolume,
  WorldRelicPickup,
  XpOrb,
} from './types';

export interface PropAnchor {
  x: number;
  y: number;
  scale?: number;
}

export interface BossArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  floorY: number;
  triggerX: number;
  triggerY: number;
}

export interface WorldData {
  theme: SceneTheme;
  mapTitle: string;
  mapStyle: string;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  platforms: Platform[];
  waterVolumes: WaterVolume[];
  airStreams: AirStream[];
  bouncePads: BouncePad[];
  reedProps: ReedProp[];
  thorns: ThornHazard[];
  secretWalls: SecretWall[];
  hangingRopes: HangingRope[];
  glowLights: GlowLight[];
  mossTufts: MossTuft[];
  sporeBulbs: SporeBulb[];
  benches: BenchCheckpoint[];
  speakers: DialogueSpeaker[];
  relics: WorldRelicPickup[];
  xpOrbs: XpOrb[];
  enemies: Enemy[];
  godRays: GodRay[];
  motes: FloatingMote[];
  rooms: RoomCell[];
  portals: BiomePortal[];
  propAnchors: PropAnchor[];
  bossArena: BossArenaBounds;
  altarPos: { x: number; y: number };
}

export const LEVEL_PRESETS: LevelPreset[] = [
  {
    id: 'ice-entry',
    name: 'Crystal Ice Cavern',
    subtitle: 'Vertical shaft layout: deep chasms, floating ice ledges & abyss pool',
    spawnX: 160,
    spawnY: 360,
    recommendedTheme: 'crystal',
    difficulty: 'Entry',
  },
  {
    id: 'ice-abyss',
    name: 'Subzero Abyss Pool',
    subtitle: 'Bottom of the Glacial Drop Shaft with crystal tiers & icy basin',
    spawnX: 520,
    spawnY: 1820,
    recommendedTheme: 'crystal',
    difficulty: 'Depths',
  },
  {
    id: 'swamp-crossing',
    name: 'Mystic Swamp Forest',
    subtitle: 'Horizontal winding marsh: fallen log bridges, stilt huts & shallow water',
    spawnX: 180,
    spawnY: 720,
    recommendedTheme: 'swamp',
    difficulty: 'Trial',
  },
  {
    id: 'grotto-maze',
    name: 'Lush Green Moss Grotto',
    subtitle: 'Maze-like interconnected caverns: springy moss bounce pads & vine shafts',
    spawnX: 180,
    spawnY: 820,
    recommendedTheme: 'grotto',
    difficulty: 'Ascent',
  },
  {
    id: 'grotto-sanctum',
    name: 'Grotto Heart Sanctum',
    subtitle: 'Face the Mosslight Warden inside the interconnected moss arena',
    spawnX: 2740,
    spawnY: 560,
    recommendedTheme: 'grotto',
    difficulty: 'Boss',
  },
];

export function findRoomAt(rooms: RoomCell[], x: number, y: number): RoomCell | undefined {
  for (const r of rooms) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
      return r;
    }
  }
  return rooms[0];
}

export function getZoneName(x: number, y: number, rooms?: RoomCell[]): string {
  if (rooms && rooms.length > 0) {
    const found = findRoomAt(rooms, x, y);
    if (found) return found.name;
  }
  return 'Mossgrotto';
}

function buildMossTufts(platforms: Platform[]): MossTuft[] {
  const tufts: MossTuft[] = [];
  for (const p of platforms) {
    if (!p.mossTop) continue;
    const count = Math.floor(p.w / 32);
    for (let i = 0; i < count; i++) {
      tufts.push({
        x: p.x + 8 + i * 32,
        y: p.y,
        w: 26,
        compression: 0,
        velocity: 0,
        hueShift: ((i * 19 + p.x) % 24) - 12,
      });
    }
  }
  return tufts;
}

function buildMotes(width: number, height: number, count = 110): FloatingMote[] {
  const motes: FloatingMote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      x: (i * 197) % width,
      y: 80 + ((i * 313) % Math.max(400, height - 160)),
      radius: 1.2 + (i % 4) * 0.65,
      depth: 0.25 + (i % 5) * 0.22,
      phase: i * 0.61,
      speedY: 8 + (i % 6) * 4,
      driftX: 10 + (i % 5) * 5,
    });
  }
  return motes;
}

// ============================================================================
// MAP 1: CRYSTAL ICE CAVERN — 8-Room Vertical Shaft & Chasm Network (3400 x 2150)
// Connects East Gate -> Swamp Forest | Apex Spire -> Green Grotto
// ============================================================================
function createCrystalWorld(): WorldData {
  const width = 3400;
  const height = 2150;

  const platforms: Platform[] = [
    // Outer bounds
    { id: 'ice-bound-l', x: -60, y: 0, w: 80, h: height, kind: 'stone' },
    { id: 'ice-bound-r', x: 3360, y: 0, w: 120, h: height, kind: 'stone' },
    { id: 'ice-ceil-top', x: 0, y: 0, w: width, h: 120, kind: 'stone' },

    // Room 1: Frozen Rim Entry (top-left, y=420 floor, with drop-shaft opening x:520..620)
    { id: 'ice-entry-floor-l', x: 20, y: 420, w: 500, h: 320, kind: 'mossStone', mossTop: true },
    { id: 'ice-entry-floor-r', x: 620, y: 420, w: 140, h: 320, kind: 'mossStone', mossTop: true },
    { id: 'ice-entry-step', x: 400, y: 335, w: 145, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-entry-lip', x: 635, y: 265, w: 115, h: 26, kind: 'floatingIsland', mossTop: true },

    // Shaft Framing Walls (Glacial Drop Shaft x: 760..1360)
    { id: 'ice-shaft-wall-l-mid', x: 720, y: 740, w: 60, h: 220, kind: 'stone' },
    { id: 'ice-shaft-wall-l-low', x: 720, y: 1160, w: 60, h: 300, kind: 'stone' },
    { id: 'ice-shaft-wall-r-top', x: 1360, y: 120, w: 60, h: 240, kind: 'stone' },
    { id: 'ice-shaft-wall-r-mid', x: 1360, y: 620, w: 60, h: 220, kind: 'stone' },
    { id: 'ice-shaft-wall-r-low', x: 1360, y: 1080, w: 60, h: 380, kind: 'stone' },

    // Staggered Floating Ice Platforms down the Vertical Shaft
    { id: 'ice-shaft-ledge-1', x: 830, y: 495, w: 155, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-shaft-ledge-2', x: 1150, y: 620, w: 165, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-shaft-ledge-3', x: 840, y: 785, w: 165, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-shaft-ledge-4', x: 1140, y: 955, w: 170, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-shaft-ledge-5', x: 830, y: 1125, w: 175, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-shaft-ledge-6', x: 1135, y: 1310, w: 175, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-shaft-ledge-7', x: 855, y: 1505, w: 165, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-shaft-ledge-8', x: 1155, y: 1685, w: 165, h: 26, kind: 'floatingIsland', mossTop: true },

    // Room 3: Shattered Crystal Tiers (West mid-level x: 20..720, drop-shaft N at 520..620, S at 340..480)
    { id: 'ice-tier-ceil-l', x: 20, y: 720, w: 500, h: 60, kind: 'stone' },
    { id: 'ice-tier-ceil-r', x: 620, y: 720, w: 100, h: 60, kind: 'stone' },
    { id: 'ice-tier-floor', x: 480, y: 1120, w: 240, h: 240, kind: 'mossStone', mossTop: true },
    { id: 'ice-tier-climb-1', x: 545, y: 990, w: 135, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-tier-climb-2', x: 425, y: 870, w: 135, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-tier-ledge-a', x: 290, y: 1020, w: 155, h: 28, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-tier-ledge-b', x: 95, y: 925, w: 175, h: 30, kind: 'mossStone', mossTop: true },
    { id: 'ice-tier-pit', x: 20, y: 1270, w: 320, h: 90, kind: 'stone' },
    { id: 'ice-tier-drop-step', x: 350, y: 1370, w: 120, h: 26, kind: 'floatingIsland', mossTop: true },

    // Room 4: Subzero Abyss Pool (Bottom chasm x: 320..1760)
    { id: 'ice-abyss-west', x: 20, y: 1880, w: 670, h: 270, kind: 'mossStone', mossTop: true },
    { id: 'ice-abyss-step-w', x: 340, y: 1620, w: 135, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-abyss-step-w2', x: 420, y: 1755, w: 130, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-abyss-bed', x: 690, y: 1995, w: 540, h: 155, kind: 'stone' },
    { id: 'ice-abyss-float-1', x: 750, y: 1795, w: 130, h: 28, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-abyss-float-2', x: 990, y: 1775, w: 135, h: 28, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-abyss-east', x: 1230, y: 1880, w: 530, h: 270, kind: 'mossStone', mossTop: true },
    { id: 'ice-abyss-div-top', x: 1720, y: 1480, w: 40, h: 250, kind: 'stone' },

    // Room 5 (Secret): Crystalline Vault (x: 1760..2300, open east at 1720..1880 into Frostwind Crossing)
    { id: 'ice-vault-ceil', x: 1760, y: 1480, w: 540, h: 70, kind: 'stone' },
    { id: 'ice-vault-wall-r', x: 2260, y: 1550, w: 40, h: 170, kind: 'stone' },
    { id: 'ice-vault-floor', x: 1760, y: 1880, w: 540, h: 270, kind: 'mossStone', mossTop: true },

    // Room 6: Crystal Spire Rift (Mid-East Chasm x: 1360..2760, y: 780..1460)
    { id: 'ice-rift-ledge-w', x: 1420, y: 1060, w: 220, h: 28, kind: 'mossStone', mossTop: true },
    { id: 'ice-rift-ledge-1', x: 1730, y: 1140, w: 165, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-rift-ledge-2', x: 1995, y: 1030, w: 175, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-rift-ledge-3', x: 2270, y: 1130, w: 180, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-rift-pit-l', x: 1420, y: 1390, w: 940, h: 90, kind: 'stone' },
    { id: 'ice-rift-climb-1', x: 1690, y: 920, w: 150, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-rift-climb-2', x: 1530, y: 790, w: 140, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-rift-wall-e', x: 2720, y: 780, w: 60, h: 680, kind: 'stone' },

    // Room 7: Frostwind Crossing (East Gate x: 2300..3360, y: 1460..2150) -> Portal to Swamp Forest!
    { id: 'ice-gate-ceil-e', x: 2620, y: 1480, w: 740, h: 70, kind: 'stone' },
    { id: 'ice-gate-floor', x: 2300, y: 1880, w: 1060, h: 270, kind: 'mossStone', mossTop: true },
    { id: 'ice-gate-step-1', x: 2430, y: 1735, w: 150, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-gate-step-2', x: 2345, y: 1585, w: 145, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-gate-step-3', x: 2495, y: 1425, w: 155, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'ice-gate-perch-e', x: 2860, y: 1755, w: 190, h: 26, kind: 'bridge', mossTop: true },

    // Room 8: Apex Spire (Boss Sanctum x: 1360..2760, floor y=620, drop/updraft shaft at x:1540..1680)
    { id: 'ice-apex-floor-w', x: 1360, y: 620, w: 180, h: 160, kind: 'mossStone', mossTop: true },
    { id: 'ice-apex-floor-e', x: 1680, y: 620, w: 1080, h: 160, kind: 'mossStone', mossTop: true },
    { id: 'ice-apex-perch-l', x: 1900, y: 485, w: 155, h: 24, kind: 'bridge', mossTop: true },
    { id: 'ice-apex-perch-r', x: 2310, y: 485, w: 155, h: 24, kind: 'bridge', mossTop: true },
  ];

  const waterVolumes: WaterVolume[] = [
    {
      id: 'ice-abyss-water',
      x: 690,
      y: 1890,
      w: 540,
      h: 108,
      tint: 'emerald',
      lilypadXs: [740, 860, 1010, 1140],
    },
  ];

  const airStreams: AirStream[] = [
    {
      id: 'ice-vertical-stream',
      x: 1015,
      y: 260,
      w: 105,
      h: 1600,
      liftForce: 1980,
    },
    {
      id: 'ice-rift-stream',
      x: 1560,
      y: 420,
      w: 100,
      h: 820,
      liftForce: 1900,
    },
  ];

  const secretWalls: SecretWall[] = [
    {
      id: 'ice-secret-vault',
      x: 1720,
      y: 1730,
      w: 36,
      h: 150,
      hp: 2,
      maxHp: 2,
      broken: false,
      hitFlash: 0,
      revealRoomId: 'ice-vault',
    },
  ];

  const thorns: ThornHazard[] = [
    { id: 'ice-thorn-1', x: 70, y: 1238, w: 250, h: 32, orientation: 'up' },
    { id: 'ice-thorn-2', x: 1690, y: 1358, w: 250, h: 32, orientation: 'up' },
    { id: 'ice-thorn-3', x: 2050, y: 1358, w: 260, h: 32, orientation: 'up' },
  ];

  const hangingRopes: HangingRope[] = [
    { id: 'ice-rope-1', x: 960, y: 120, length: 190, angle: 0.03, angVel: 0 },
    { id: 'ice-rope-2', x: 1190, y: 120, length: 220, angle: -0.02, angVel: 0 },
    { id: 'ice-rope-3', x: 1920, y: 120, length: 160, angle: 0.04, angVel: 0 },
    { id: 'ice-rope-4', x: 2960, y: 1550, length: 150, angle: -0.03, angVel: 0 },
  ];

  const sporeBulbs: SporeBulb[] = [
    { id: 'ice-bulb-1', x: 475, y: 290, radius: 16, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 0.2 },
    { id: 'ice-pogo-1', x: 175, y: 1145, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 0.8 },
    { id: 'ice-pogo-2', x: 280, y: 1135, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 1.9 },
    { id: 'ice-pogo-3', x: 1815, y: 1265, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 1.2 },
    { id: 'ice-pogo-4', x: 2180, y: 1265, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 2.3 },
    { id: 'ice-bulb-2', x: 930, y: 1740, radius: 18, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 2.4 },
    { id: 'ice-bulb-3', x: 1980, y: 1825, radius: 20, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 1.1 },
  ];

  const benches: BenchCheckpoint[] = [
    { id: 'ice-bench-1', x: 685, y: 420, activated: false, zoneName: 'Frozen Rim Entry' },
    { id: 'ice-bench-2', x: 1445, y: 620, activated: false, zoneName: 'Apex Spire' },
    { id: 'ice-bench-3', x: 2680, y: 1880, activated: false, zoneName: 'Frostwind Crossing' },
  ];

  const speakers: DialogueSpeaker[] = [
    {
      id: 'npc-elder-moth',
      name: 'Elder Moth',
      title: 'Keeper of the Rim',
      x: 260,
      y: 420,
      read: false,
      lines: [
        'Welcome to Crystal Ice Cavern. Explore Up, Down, Left, Right, and diagonal crystal shafts.',
        'Descend to Frostwind Crossing in the southeast to walk into Swamp Forest, or climb to Apex Spire for Green Grotto.',
      ],
    },
    {
      id: 'npc-hermit',
      name: 'Frost Hermit',
      title: 'Abyss Watcher',
      x: 560,
      y: 1880,
      read: false,
      lines: [
        'You survived the plunge to the Subzero Abyss Pool.',
        'Strike the fractured crystal wall to the east to uncover the Crystalline Vault and Frostwind Crossing beyond.',
      ],
    },
    {
      id: 'lore-summit-tablet',
      name: 'Glacial Tablet',
      title: 'Spire Decree',
      x: 1760,
      y: 620,
      read: false,
      lines: [
        'Beyond this spire waits the Mosslight Warden. East of the altar lies the mossy gateway to Green Grotto.',
      ],
    },
  ];

  const relics: WorldRelicPickup[] = [
    { id: 'ice-relic-1', itemId: 'relic-mothscale', x: 165, y: 880, collected: false, color: '#67e8f9' },
    { id: 'ice-relic-2', itemId: 'relic-shell-shard', x: 2060, y: 1835, collected: false, color: '#a7f3d0' },
  ];

  const xpOrbs: XpOrb[] = [
    { id: 'xp-1', x: 350, y: 390, xpValue: 30, collected: false, phase: 0.2 },
    { id: 'xp-2', x: 475, y: 300, xpValue: 35, collected: false, phase: 1.0 },
    { id: 'xp-3', x: 910, y: 460, xpValue: 40, collected: false, phase: 1.7 },
    { id: 'xp-4', x: 920, y: 750, xpValue: 45, collected: false, phase: 2.3 },
    { id: 'xp-5', x: 365, y: 985, xpValue: 45, collected: false, phase: 0.6 },
    { id: 'xp-6', x: 1220, y: 1275, xpValue: 50, collected: false, phase: 1.4 },
    { id: 'xp-7', x: 815, y: 1758, xpValue: 55, collected: false, phase: 2.8 },
    { id: 'xp-8', x: 1410, y: 1845, xpValue: 60, collected: false, phase: 0.9 },
    { id: 'xp-9', x: 1940, y: 1845, xpValue: 70, collected: false, phase: 2.1 },
    { id: 'xp-10', x: 2080, y: 990, xpValue: 65, collected: false, phase: 1.5 },
    { id: 'xp-11', x: 2955, y: 1715, xpValue: 75, collected: false, phase: 0.4 },
    { id: 'xp-12', x: 1980, y: 450, xpValue: 80, collected: false, phase: 1.2 },
  ];

  const enemies: Enemy[] = [
    {
      id: 'ice-crawler-1', kind: 'crawler', x: 380, y: 388, w: 38, h: 32,
      vx: 72, vy: 0, hp: 45, maxHp: 45, facing: 1, aiState: 'FOLLOW', stateTimer: 0,
      targetX: 0, targetY: 0, homeX: 380, homeY: 388, hitFlash: 0, alive: true, animPhase: 0, sporeWaveCount: 0,
    },
    {
      id: 'ice-crawler-2', kind: 'crawler', x: 560, y: 1088, w: 38, h: 32,
      vx: -76, vy: 0, hp: 45, maxHp: 45, facing: -1, aiState: 'FOLLOW', stateTimer: 0,
      targetX: 0, targetY: 0, homeX: 560, homeY: 1088, hitFlash: 0, alive: true, animPhase: 1.2, sporeWaveCount: 0,
    },
    {
      id: 'ice-crawler-3', kind: 'crawler', x: 2820, y: 1848, w: 38, h: 32,
      vx: -80, vy: 0, hp: 50, maxHp: 50, facing: -1, aiState: 'FOLLOW', stateTimer: 0,
      targetX: 0, targetY: 0, homeX: 2820, homeY: 1848, hitFlash: 0, alive: true, animPhase: 2.1, sporeWaveCount: 0,
    },
    {
      id: 'ice-flyer-1', kind: 'flyer', x: 1060, y: 880, w: 38, h: 34,
      vx: 0, vy: 0, hp: 60, maxHp: 60, facing: -1, aiState: 'FOLLOW', stateTimer: 1.6,
      targetX: 1060, targetY: 880, homeX: 1060, homeY: 880, hitFlash: 0, alive: true, animPhase: 0.5, sporeWaveCount: 0,
    },
    {
      id: 'ice-flyer-2', kind: 'flyer', x: 2050, y: 920, w: 38, h: 34,
      vx: 0, vy: 0, hp: 65, maxHp: 65, facing: -1, aiState: 'FOLLOW', stateTimer: 1.8,
      targetX: 2050, targetY: 920, homeX: 2050, homeY: 920, hitFlash: 0, alive: true, animPhase: 1.4, sporeWaveCount: 0,
    },
    {
      id: 'ice-shield-1', kind: 'shieldbearer', x: 1480, y: 1816, w: 56, h: 64,
      vx: 0, vy: 0, hp: 90, maxHp: 90, facing: -1, aiState: 'SHIELD', stateTimer: 1.5,
      targetX: 1480, targetY: 1816, homeX: 1480, homeY: 1816, hitFlash: 0, alive: true, animPhase: 0.4, sporeWaveCount: 0, shielded: true,
    },
    {
      id: 'warden-boss', kind: 'warden', x: 2260, y: 420, w: 76, h: 72,
      vx: 0, vy: 0, hp: 240, maxHp: 240, facing: -1, aiState: 'FOLLOW', stateTimer: 1.8,
      targetX: 2260, targetY: 420, homeX: 2220, homeY: 420, hitFlash: 0, alive: true, animPhase: 0, sporeWaveCount: 0, phase: 1,
    },
  ];

  const rooms: RoomCell[] = [
    {
      id: 'ice-entry', name: 'Frozen Rim Entry', gridX: 0, gridY: 0,
      x: 0, y: 120, w: 760, h: 620,
      discovered: true, visited: true, hasBench: true,
      connections: ['E', 'S'], adjacentRoomIds: ['ice-shaft', 'ice-tiers'],
    },
    {
      id: 'ice-tiers', name: 'Shattered Crystal Tiers', gridX: 0, gridY: 1,
      x: 20, y: 740, w: 740, h: 720,
      discovered: true, visited: false,
      connections: ['N', 'E', 'S'], adjacentRoomIds: ['ice-entry', 'ice-shaft', 'ice-abyss'],
    },
    {
      id: 'ice-shaft', name: 'Glacial Drop Shaft', gridX: 1, gridY: 1,
      x: 760, y: 120, w: 600, h: 1340,
      discovered: true, visited: false,
      connections: ['W', 'E', 'S'], adjacentRoomIds: ['ice-entry', 'ice-tiers', 'ice-abyss', 'ice-sanctum', 'ice-rift'],
    },
    {
      id: 'ice-abyss', name: 'Subzero Abyss Pool', gridX: 1, gridY: 2,
      x: 20, y: 1460, w: 1740, h: 680,
      discovered: false, visited: false,
      connections: ['N', 'E'], adjacentRoomIds: ['ice-tiers', 'ice-shaft', 'ice-vault'],
    },
    {
      id: 'ice-vault', name: 'Crystalline Vault', gridX: 2, gridY: 2,
      x: 1760, y: 1460, w: 540, h: 680,
      discovered: false, visited: false, isSecret: true,
      connections: ['W', 'E'], adjacentRoomIds: ['ice-abyss', 'ice-east-gate'],
    },
    {
      id: 'ice-rift', name: 'Crystal Spire Rift', gridX: 2, gridY: 1,
      x: 1360, y: 780, w: 1400, h: 680,
      discovered: false, visited: false,
      connections: ['W', 'N', 'S'], adjacentRoomIds: ['ice-shaft', 'ice-sanctum', 'ice-east-gate'],
    },
    {
      id: 'ice-east-gate', name: 'Frostwind Crossing', gridX: 3, gridY: 2,
      x: 2300, y: 1460, w: 1080, h: 680,
      discovered: false, visited: false, hasBench: true,
      connections: ['W', 'N'], adjacentRoomIds: ['ice-vault', 'ice-rift'],
      portalLinks: [{ label: 'Swamp Forest', targetTheme: 'swamp', dir: 'E' }],
    },
    {
      id: 'ice-sanctum', name: 'Apex Spire', gridX: 2, gridY: 0,
      x: 1360, y: 120, w: 1400, h: 660,
      discovered: false, visited: false, hasBench: true, isBossRoom: true,
      connections: ['W', 'S'], adjacentRoomIds: ['ice-shaft', 'ice-rift'],
      portalLinks: [{ label: 'Green Grotto', targetTheme: 'grotto', dir: 'NE' }],
    },
  ];

  const portals: BiomePortal[] = [
    {
      id: 'portal-ice-to-swamp',
      x: 3255,
      y: 1730,
      w: 75,
      h: 150,
      targetTheme: 'swamp',
      targetRoomId: 'swamp-crossing',
      spawnX: 150,
      spawnY: 720,
      label: 'Swamp Forest',
      shortLabel: 'Swamp Forest →',
      direction: 'E',
    },
    {
      id: 'portal-ice-to-grotto',
      x: 2650,
      y: 470,
      w: 75,
      h: 150,
      targetTheme: 'grotto',
      targetRoomId: 'grotto-sanctum',
      spawnX: 3560,
      spawnY: 560,
      label: 'Green Grotto',
      shortLabel: 'Green Grotto ↗',
      direction: 'NE',
    },
  ];

  const propAnchors: PropAnchor[] = [
    { x: 180, y: 420, scale: 0.9 },
    { x: 520, y: 1120, scale: 0.85 },
    { x: 460, y: 1880, scale: 1.0 },
    { x: 1340, y: 1880, scale: 0.95 },
    { x: 1840, y: 620, scale: 1.0 },
    { x: 2950, y: 1880, scale: 0.95 },
  ];

  const glowLights: GlowLight[] = [
    { x: 260, y: 360, radius: 200, color: 'teal', phase: 0.3 },
    { x: 1065, y: 860, radius: 280, color: 'teal', phase: 1.1 },
    { x: 1065, y: 1580, radius: 260, color: 'emerald', phase: 2.0 },
    { x: 2040, y: 1820, radius: 240, color: 'teal', phase: 0.7 },
    { x: 2050, y: 1050, radius: 260, color: 'teal', phase: 1.4 },
    { x: 3150, y: 1780, radius: 250, color: 'emerald', phase: 0.9 },
    { x: 2150, y: 520, radius: 310, color: 'teal', phase: 2.4 },
    { x: 940, y: 440, radius: 75, color: 'amber', phase: 0.5, isFirefly: true, driftRadius: 28 },
    { x: 1180, y: 1250, radius: 80, color: 'amber', phase: 1.8, isFirefly: true, driftRadius: 32 },
  ];

  const godRays: GodRay[] = [
    { x: 420, width: 160, angle: 0.22, alpha: 0.09, phase: 0.1, speed: 0.4 },
    { x: 1060, width: 190, angle: 0.12, alpha: 0.11, phase: 1.2, speed: 0.45 },
    { x: 2040, width: 210, angle: 0.2, alpha: 0.1, phase: 2.3, speed: 0.38 },
    { x: 2960, width: 180, angle: 0.16, alpha: 0.09, phase: 0.8, speed: 0.35 },
  ];

  const reedProps: ReedProp[] = [
    { x: 715, y: 1890, height: 95, layer: 'mid', kind: 'ringPost', phase: 0.2 },
    { x: 1185, y: 1890, height: 105, layer: 'mid', kind: 'ringPost', phase: 1.4 },
  ];

  return {
    theme: 'crystal',
    mapTitle: 'Crystal Ice Cavern',
    mapStyle: 'Vertical Drop Shaft',
    width,
    height,
    spawnX: 160,
    spawnY: 360,
    platforms,
    waterVolumes,
    airStreams,
    bouncePads: [],
    reedProps,
    thorns,
    secretWalls,
    hangingRopes,
    glowLights,
    mossTufts: buildMossTufts(platforms),
    sporeBulbs,
    benches,
    speakers,
    relics,
    xpOrbs,
    enemies,
    godRays,
    motes: buildMotes(width, height, 125),
    rooms,
    portals,
    propAnchors,
    bossArena: {
      minX: 1740,
      maxX: 2630,
      minY: 160,
      floorY: 620,
      triggerX: 1850,
      triggerY: 660,
    },
    altarPos: { x: 2560, y: 620 },
  };
}

// ============================================================================
// MAP 2: MYSTIC SWAMP FOREST — 8-Room Horizontal & Stilt Hut Network (4600 x 1460)
// West Entry <- Ice Cavern | East Sanctum -> Green Grotto
// ============================================================================
function createSwampWorld(): WorldData {
  const width = 4600;
  const height = 1460;

  const platforms: Platform[] = [
    { id: 'swamp-bound-l', x: -60, y: 0, w: 80, h: height, kind: 'stone' },
    { id: 'swamp-bound-r', x: 4540, y: 0, w: 100, h: height, kind: 'stone' },
    { id: 'swamp-ceil', x: 0, y: 0, w: width, h: 110, kind: 'stone' },

    // Room 1: Stilt Village Crossing (x: 20..1080) <- Portal from Ice Cavern
    { id: 'swamp-bank-1', x: 20, y: 780, w: 420, h: 680, kind: 'mossStone', mossTop: true },
    { id: 'swamp-pond-bed-1', x: 440, y: 940, w: 280, h: 520, kind: 'stone' },
    { id: 'swamp-hut-stilt-1', x: 450, y: 725, w: 230, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-bank-2', x: 720, y: 780, w: 360, h: 680, kind: 'mossStone', mossTop: true },
    { id: 'swamp-stilt-porch', x: 780, y: 680, w: 190, h: 26, kind: 'floatingIsland', mossTop: true },

    // Room 2: Fallen Log Span (x: 1080..2160, drop-opening at x:1980..2140 down to Submerged Marsh Sluice!)
    { id: 'swamp-marsh-bed-2', x: 1080, y: 945, w: 880, h: 60, kind: 'stone' },
    { id: 'swamp-log-bridge-1', x: 1120, y: 755, w: 240, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-log-bridge-2', x: 1455, y: 705, w: 260, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-log-bridge-3', x: 1810, y: 755, w: 190, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-pier-mid', x: 1510, y: 830, w: 150, h: 24, kind: 'floatingIsland', mossTop: true },

    // Room 3: Overhanging Rootway (Upper horizontal canopy route x: 1180..2280)
    { id: 'swamp-root-step', x: 2010, y: 615, w: 150, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'swamp-root-1', x: 1830, y: 505, w: 170, h: 26, kind: 'floatingIsland', mossTop: true, hasSprout: true },
    { id: 'swamp-root-2', x: 1550, y: 415, w: 185, h: 26, kind: 'floatingIsland', mossTop: true },
    { id: 'swamp-root-3', x: 1260, y: 365, w: 210, h: 28, kind: 'mossStone', mossTop: true, hasSprout: true },
    { id: 'swamp-root-link-e', x: 2090, y: 385, w: 180, h: 26, kind: 'bridge', mossTop: true },

    // Room 4: Canopy Stilt Shrine (New upper-east thatched stilt hut room x: 2280..3260)
    { id: 'swamp-shrine-deck', x: 2340, y: 350, w: 340, h: 26, kind: 'bridge', mossTop: true },
    { id: 'swamp-shrine-hut', x: 2770, y: 315, w: 230, h: 26, kind: 'floatingIsland', mossTop: true, hasSprout: true },
    { id: 'swamp-shrine-drop-r', x: 3120, y: 455, w: 135, h: 26, kind: 'floatingIsland', mossTop: true },

    // Room 5: Submerged Marsh Sluice (New lower underground water passage x: 1080..2300, y: 1005..1440)
    { id: 'swamp-sluice-wall-l', x: 1080, y: 1005, w: 50, h: 455, kind: 'stone' },
    { id: 'swamp-sluice-floor', x: 1130, y: 1320, w: 1170, h: 140, kind: 'mossStone', mossTop: true },
    { id: 'swamp-sluice-pier-1', x: 1320, y: 1190, w: 190, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-sluice-pier-2', x: 1680, y: 1150, w: 200, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-sluice-step-e', x: 1995, y: 1075, w: 155, h: 24, kind: 'floatingIsland', mossTop: true },
    { id: 'swamp-sluice-step-up', x: 1985, y: 945, w: 145, h: 24, kind: 'floatingIsland', mossTop: true },

    // Room 6: Misty Reed Flats (x: 2160..3260)
    { id: 'swamp-flats-west', x: 2160, y: 780, w: 320, h: 240, kind: 'mossStone', mossTop: true },
    { id: 'swamp-flats-bed', x: 2480, y: 945, w: 460, h: 55, kind: 'stone' },
    { id: 'swamp-stilt-hut-2', x: 2560, y: 740, w: 220, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-flats-east', x: 2940, y: 780, w: 320, h: 680, kind: 'mossStone', mossTop: true },
    { id: 'swamp-vault-entry-step', x: 2840, y: 945, w: 100, h: 24, kind: 'bridge', mossTop: true },

    // Room 7 (Secret): Bog Hollow Vault (x: 2300..2940, lower submerged cavern connected W to Sluice)
    { id: 'swamp-vault-ceil', x: 2300, y: 960, w: 540, h: 55, kind: 'stone' },
    { id: 'swamp-vault-floor', x: 2300, y: 1320, w: 660, h: 140, kind: 'mossStone', mossTop: true },

    // Room 8: Twilight Fen Sanctum (Boss Arena x: 3260..4540) -> Portal to Green Grotto!
    { id: 'swamp-sanctum-floor', x: 3260, y: 780, w: 1280, h: 680, kind: 'mossStone', mossTop: true },
    { id: 'swamp-sanctum-perch-l', x: 3560, y: 645, w: 170, h: 24, kind: 'bridge', mossTop: true },
    { id: 'swamp-sanctum-perch-r', x: 4080, y: 645, w: 170, h: 24, kind: 'bridge', mossTop: true },
  ];

  const waterVolumes: WaterVolume[] = [
    {
      id: 'swamp-water-1',
      x: 440,
      y: 840,
      w: 280,
      h: 102,
      tint: 'marsh',
      lilypadXs: [485, 575, 665],
    },
    {
      id: 'swamp-water-2',
      x: 1080,
      y: 845,
      w: 880,
      h: 102,
      tint: 'marsh',
      lilypadXs: [1150, 1300, 1460, 1620, 1780, 1900],
    },
    {
      id: 'swamp-water-3',
      x: 2480,
      y: 845,
      w: 460,
      h: 102,
      tint: 'marsh',
      lilypadXs: [2530, 2660, 2790],
    },
    {
      id: 'swamp-sluice-water',
      x: 1130,
      y: 1235,
      w: 1170,
      h: 90,
      tint: 'marsh',
      lilypadXs: [1210, 1440, 1610, 1890, 2120],
    },
  ];

  const secretWalls: SecretWall[] = [
    {
      id: 'swamp-secret-hollow',
      x: 2820,
      y: 1160,
      w: 36,
      h: 160,
      hp: 2,
      maxHp: 2,
      broken: false,
      hitFlash: 0,
      revealRoomId: 'swamp-vault',
    },
  ];

  const thorns: ThornHazard[] = [
    { id: 'swamp-thorn-1', x: 1370, y: 915, w: 140, h: 30, orientation: 'up' },
    { id: 'swamp-thorn-2', x: 1700, y: 915, w: 160, h: 30, orientation: 'up' },
  ];

  const hangingRopes: HangingRope[] = [
    { id: 'swamp-rope-1', x: 340, y: 110, length: 240, angle: 0.03, angVel: 0 },
    { id: 'swamp-rope-2', x: 1580, y: 110, length: 210, angle: -0.02, angVel: 0 },
    { id: 'swamp-rope-3', x: 2660, y: 110, length: 230, angle: 0.03, angVel: 0 },
    { id: 'swamp-rope-4', x: 3880, y: 110, length: 220, angle: -0.03, angVel: 0 },
  ];

  const sporeBulbs: SporeBulb[] = [
    { id: 'swamp-bulb-1', x: 875, y: 635, radius: 16, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 0.4 },
    { id: 'swamp-pogo-1', x: 1405, y: 785, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 1.1 },
    { id: 'swamp-pogo-2', x: 1760, y: 785, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 2.2 },
    { id: 'swamp-bulb-2', x: 1640, y: 370, radius: 18, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 0.8 },
    { id: 'swamp-bulb-3', x: 2560, y: 1250, radius: 20, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 1.7 },
    { id: 'swamp-bulb-4', x: 2885, y: 270, radius: 18, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 0.9 },
  ];

  const benches: BenchCheckpoint[] = [
    { id: 'swamp-bench-1', x: 960, y: 780, activated: false, zoneName: 'Stilt Village Crossing' },
    { id: 'swamp-bench-2', x: 3350, y: 780, activated: false, zoneName: 'Twilight Fen Sanctum' },
  ];

  const speakers: DialogueSpeaker[] = [
    {
      id: 'npc-elder-moth',
      name: 'Elder Moth',
      title: 'Marsh Guide',
      x: 260,
      y: 780,
      read: false,
      lines: [
        'Welcome to Mystic Swamp Forest. West lies the frozen tunnel back to Crystal Ice Cavern.',
        'Traverse fallen-log bridges, dive into the Submerged Sluice below, or climb to the Canopy Stilt Shrine above.',
      ],
    },
    {
      id: 'npc-hermit',
      name: 'Reed Hermit',
      title: 'Fen Watcher',
      x: 2280,
      y: 780,
      read: false,
      lines: [
        'Drop through the eastern sluice shaft below the logs to reach the Bog Hollow Vault.',
      ],
    },
    {
      id: 'lore-summit-tablet',
      name: 'Fen Tablet',
      title: 'Twilight Decree',
      x: 3450,
      y: 780,
      read: false,
      lines: [
        'The Mosslight Warden roosts over the eastern marsh clearing. Beyond the altar opens the passage into Green Grotto.',
      ],
    },
  ];

  const relics: WorldRelicPickup[] = [
    { id: 'swamp-relic-1', itemId: 'relic-mothscale', x: 1350, y: 325, collected: false, color: '#67e8f9' },
    { id: 'swamp-relic-2', itemId: 'relic-shell-shard', x: 2450, y: 1275, collected: false, color: '#a7f3d0' },
  ];

  const xpOrbs: XpOrb[] = [
    { id: 'xp-1', x: 350, y: 745, xpValue: 30, collected: false, phase: 0.2 },
    { id: 'xp-2', x: 565, y: 690, xpValue: 35, collected: false, phase: 1.0 },
    { id: 'xp-3', x: 875, y: 645, xpValue: 40, collected: false, phase: 1.9 },
    { id: 'xp-4', x: 1240, y: 715, xpValue: 45, collected: false, phase: 0.6 },
    { id: 'xp-5', x: 1585, y: 665, xpValue: 50, collected: false, phase: 1.5 },
    { id: 'xp-6', x: 1630, y: 375, xpValue: 55, collected: false, phase: 2.3 },
    { id: 'xp-7', x: 2885, y: 275, xpValue: 65, collected: false, phase: 1.1 },
    { id: 'xp-8', x: 1780, y: 1110, xpValue: 60, collected: false, phase: 2.0 },
    { id: 'xp-9', x: 2670, y: 700, xpValue: 60, collected: false, phase: 0.9 },
    { id: 'xp-10', x: 2490, y: 1275, xpValue: 70, collected: false, phase: 2.7 },
    { id: 'xp-11', x: 3645, y: 605, xpValue: 75, collected: false, phase: 1.4 },
  ];

  const enemies: Enemy[] = [
    {
      id: 'swamp-crawler-1', kind: 'crawler', x: 820, y: 748, w: 38, h: 32,
      vx: 74, vy: 0, hp: 45, maxHp: 45, facing: 1, aiState: 'FOLLOW', stateTimer: 0,
      targetX: 0, targetY: 0, homeX: 820, homeY: 748, hitFlash: 0, alive: true, animPhase: 0, sporeWaveCount: 0,
    },
    {
      id: 'swamp-crawler-2', kind: 'crawler', x: 1450, y: 1288, w: 38, h: 32,
      vx: 78, vy: 0, hp: 50, maxHp: 50, facing: 1, aiState: 'FOLLOW', stateTimer: 0,
      targetX: 0, targetY: 0, homeX: 1450, homeY: 1288, hitFlash: 0, alive: true, animPhase: 1.2, sporeWaveCount: 0,
    },
    {
      id: 'swamp-flyer-1', kind: 'flyer', x: 1580, y: 580, w: 38, h: 34,
      vx: 0, vy: 0, hp: 60, maxHp: 60, facing: -1, aiState: 'FOLLOW', stateTimer: 1.8,
      targetX: 1580, targetY: 580, homeX: 1580, homeY: 580, hitFlash: 0, alive: true, animPhase: 0.7, sporeWaveCount: 0,
    },
    {
      id: 'swamp-flyer-2', kind: 'flyer', x: 2680, y: 600, w: 38, h: 34,
      vx: 0, vy: 0, hp: 60, maxHp: 60, facing: -1, aiState: 'FOLLOW', stateTimer: 2.0,
      targetX: 2680, targetY: 600, homeX: 2680, homeY: 600, hitFlash: 0, alive: true, animPhase: 1.9, sporeWaveCount: 0,
    },
    {
      id: 'swamp-shield-1', kind: 'shieldbearer', x: 3070, y: 716, w: 56, h: 64,
      vx: 0, vy: 0, hp: 90, maxHp: 90, facing: -1, aiState: 'SHIELD', stateTimer: 1.5,
      targetX: 3070, targetY: 716, homeX: 3070, homeY: 716, hitFlash: 0, alive: true, animPhase: 0.5, sporeWaveCount: 0, shielded: true,
    },
    {
      id: 'warden-boss', kind: 'warden', x: 3980, y: 580, w: 76, h: 72,
      vx: 0, vy: 0, hp: 240, maxHp: 240, facing: -1, aiState: 'FOLLOW', stateTimer: 1.8,
      targetX: 3980, targetY: 580, homeX: 3940, homeY: 580, hitFlash: 0, alive: true, animPhase: 0, sporeWaveCount: 0, phase: 1,
    },
  ];

  const rooms: RoomCell[] = [
    {
      id: 'swamp-crossing', name: 'Stilt Village Crossing', gridX: 0, gridY: 1,
      x: 0, y: 380, w: 1080, h: 600,
      discovered: true, visited: true, hasBench: true,
      connections: ['E'], adjacentRoomIds: ['swamp-bridges'],
      portalLinks: [{ label: 'Ice Cavern', targetTheme: 'crystal', dir: 'W' }],
    },
    {
      id: 'swamp-bridges', name: 'Fallen Log Span', gridX: 1, gridY: 1,
      x: 1080, y: 380, w: 1080, h: 580,
      discovered: true, visited: false,
      connections: ['W', 'N', 'S', 'E'], adjacentRoomIds: ['swamp-crossing', 'swamp-roots', 'swamp-sluice', 'swamp-flats'],
    },
    {
      id: 'swamp-roots', name: 'Overhanging Rootway', gridX: 1, gridY: 0,
      x: 1180, y: 110, w: 1100, h: 270,
      discovered: false, visited: false,
      connections: ['S', 'E'], adjacentRoomIds: ['swamp-bridges', 'swamp-shrine'],
    },
    {
      id: 'swamp-shrine', name: 'Canopy Stilt Shrine', gridX: 2, gridY: 0,
      x: 2280, y: 110, w: 980, h: 270,
      discovered: false, visited: false,
      connections: ['W', 'S'], adjacentRoomIds: ['swamp-roots', 'swamp-flats'],
    },
    {
      id: 'swamp-sluice', name: 'Submerged Marsh Sluice', gridX: 1, gridY: 2,
      x: 1080, y: 960, w: 1220, h: 480,
      discovered: false, visited: false,
      connections: ['N', 'E'], adjacentRoomIds: ['swamp-bridges', 'swamp-vault'],
    },
    {
      id: 'swamp-flats', name: 'Misty Reed Flats', gridX: 2, gridY: 1,
      x: 2160, y: 380, w: 1100, h: 520,
      discovered: false, visited: false,
      connections: ['W', 'N', 'S', 'E'], adjacentRoomIds: ['swamp-bridges', 'swamp-shrine', 'swamp-vault', 'swamp-sanctum'],
    },
    {
      id: 'swamp-vault', name: 'Bog Hollow Vault', gridX: 2, gridY: 2,
      x: 2300, y: 900, w: 960, h: 540,
      discovered: false, visited: false, isSecret: true,
      connections: ['W', 'N'], adjacentRoomIds: ['swamp-sluice', 'swamp-flats'],
    },
    {
      id: 'swamp-sanctum', name: 'Twilight Fen Sanctum', gridX: 3, gridY: 1,
      x: 3260, y: 160, w: 1340, h: 980,
      discovered: false, visited: false, hasBench: true, isBossRoom: true,
      connections: ['W'], adjacentRoomIds: ['swamp-flats'],
      portalLinks: [{ label: 'Green Grotto', targetTheme: 'grotto', dir: 'E' }],
    },
  ];

  const portals: BiomePortal[] = [
    {
      id: 'portal-swamp-to-ice',
      x: 24,
      y: 630,
      w: 72,
      h: 150,
      targetTheme: 'crystal',
      targetRoomId: 'ice-east-gate',
      spawnX: 3145,
      spawnY: 1820,
      label: 'Ice Cavern',
      shortLabel: '← Ice Cavern',
      direction: 'W',
    },
    {
      id: 'portal-swamp-to-grotto',
      x: 4445,
      y: 630,
      w: 75,
      h: 150,
      targetTheme: 'grotto',
      targetRoomId: 'grotto-entry',
      spawnX: 145,
      spawnY: 820,
      label: 'Green Grotto',
      shortLabel: 'Green Grotto →',
      direction: 'E',
    },
  ];

  const propAnchors: PropAnchor[] = [
    { x: 180, y: 780 },
    { x: 1160, y: 780 },
    { x: 2510, y: 350 },
    { x: 2220, y: 780 },
    { x: 3440, y: 780 },
  ];

  const glowLights: GlowLight[] = [
    { x: 260, y: 720, radius: 220, color: 'teal', phase: 0.2 },
    { x: 1580, y: 690, radius: 260, color: 'teal', phase: 1.5 },
    { x: 1360, y: 320, radius: 210, color: 'emerald', phase: 0.9 },
    { x: 2770, y: 290, radius: 220, color: 'amber', phase: 1.3 },
    { x: 1680, y: 1180, radius: 240, color: 'teal', phase: 2.0 },
    { x: 2660, y: 710, radius: 250, color: 'teal', phase: 2.1 },
    { x: 3920, y: 670, radius: 310, color: 'emerald', phase: 2.7 },
    { x: 580, y: 760, radius: 85, color: 'amber', phase: 0.4, isFirefly: true, driftRadius: 34 },
    { x: 1620, y: 740, radius: 90, color: 'amber', phase: 1.7, isFirefly: true, driftRadius: 38 },
    { x: 2640, y: 770, radius: 90, color: 'amber', phase: 2.5, isFirefly: true, driftRadius: 35 },
  ];

  const godRays: GodRay[] = [
    { x: 340, width: 170, angle: 0.19, alpha: 0.085, phase: 0.2, speed: 0.35 },
    { x: 1460, width: 190, angle: 0.22, alpha: 0.095, phase: 1.1, speed: 0.42 },
    { x: 2620, width: 180, angle: 0.18, alpha: 0.09, phase: 2.4, speed: 0.38 },
    { x: 3840, width: 210, angle: 0.2, alpha: 0.1, phase: 0.7, speed: 0.4 },
  ];

  const reedProps: ReedProp[] = [
    { x: 470, y: 840, height: 105, layer: 'mid', kind: 'cattail', phase: 0.3 },
    { x: 690, y: 840, height: 90, layer: 'mid', kind: 'lilyStem', phase: 1.2 },
    { x: 1220, y: 845, height: 110, layer: 'mid', kind: 'cattail', phase: 0.7 },
    { x: 1880, y: 845, height: 115, layer: 'mid', kind: 'cattail', phase: 1.9 },
    { x: 2540, y: 845, height: 105, layer: 'mid', kind: 'ringPost', phase: 0.4 },
    { x: 1360, y: 1235, height: 115, layer: 'mid', kind: 'cattail', phase: 0.9 },
    { x: 2820, y: 945, height: 150, layer: 'fore', kind: 'cattail', phase: 1.4 },
  ];

  return {
    theme: 'swamp',
    mapTitle: 'Mystic Swamp Forest',
    mapStyle: 'Horizontal Winding Pathway',
    width,
    height,
    spawnX: 160,
    spawnY: 720,
    platforms,
    waterVolumes,
    airStreams: [],
    bouncePads: [],
    reedProps,
    thorns,
    secretWalls,
    hangingRopes,
    glowLights,
    mossTufts: buildMossTufts(platforms),
    sporeBulbs,
    benches,
    speakers,
    relics,
    xpOrbs,
    enemies,
    godRays,
    motes: buildMotes(width, height, 120),
    rooms,
    portals,
    propAnchors,
    bossArena: {
      minX: 3500,
      maxX: 4380,
      minY: 220,
      floorY: 780,
      triggerX: 3560,
      triggerY: 820,
    },
    altarPos: { x: 4350, y: 780 },
  };
}

// ============================================================================
// MAP 3: LUSH GREEN MOSS GROTTO — 8-Room Maze & Vine Network (3800 x 1860)
// West Entry <- Swamp Forest | East Sanctum -> Ice Cavern
// ============================================================================
function createGrottoWorld(): WorldData {
  const width = 3800;
  const height = 1860;

  const platforms: Platform[] = [
    { id: 'grotto-bound-l', x: -60, y: 0, w: 80, h: height, kind: 'stone' },
    { id: 'grotto-bound-r', x: 3740, y: 0, w: 100, h: height, kind: 'stone' },
    { id: 'grotto-ceil', x: 0, y: 0, w: width, h: 110, kind: 'stone' },

    // Room 1: Emerald Entry Glade (x: 20..980) <- Portal from Swamp Forest
    { id: 'grotto-entry-l', x: 20, y: 880, w: 420, h: 320, kind: 'mossStone', mossTop: true },
    { id: 'grotto-pond-bed', x: 440, y: 1015, w: 320, h: 185, kind: 'stone' },
    { id: 'grotto-float-e1', x: 490, y: 745, w: 120, h: 28, kind: 'floatingIsland', mossTop: true, hasSprout: true },
    { id: 'grotto-float-e2', x: 660, y: 775, w: 115, h: 28, kind: 'floatingIsland', mossTop: true },
    { id: 'grotto-entry-r', x: 760, y: 880, w: 240, h: 320, kind: 'mossStone', mossTop: true },
    { id: 'grotto-entry-ceil', x: 0, y: 580, w: 980, h: 90, kind: 'stone' },

    // Room 2: Central Moss Labyrinth (Multi-level maze x: 980..2140, y: 650..1200)
    { id: 'grotto-maze-floor-l', x: 1000, y: 1120, w: 460, h: 100, kind: 'mossStone', mossTop: true },
    { id: 'grotto-maze-floor-r', x: 1620, y: 1120, w: 520, h: 100, kind: 'mossStone', mossTop: true },
    // Vertical vine-covered maze pillars for wall-sliding/wall-jumping
    { id: 'grotto-vine-col-1', x: 1350, y: 720, w: 52, h: 240, kind: 'stone' },
    { id: 'grotto-vine-col-2', x: 1810, y: 660, w: 52, h: 260, kind: 'stone' },
    { id: 'grotto-maze-mid-1', x: 1070, y: 920, w: 180, h: 28, kind: 'floatingIsland', mossTop: true, hasSprout: true },
    { id: 'grotto-maze-mid-2', x: 1470, y: 880, w: 220, h: 28, kind: 'floatingIsland', mossTop: true },
    { id: 'grotto-maze-div-l', x: 980, y: 650, w: 300, h: 55, kind: 'stone' },
    { id: 'grotto-maze-div-r', x: 1520, y: 650, w: 620, h: 55, kind: 'stone' },

    // Room 3: Vine Canopy Maze (Upper interconnected level + ceiling crawlspace x: 980..2140, y: 110..650)
    { id: 'grotto-canopy-step-1', x: 1210, y: 520, w: 160, h: 28, kind: 'floatingIsland', mossTop: true, hasSprout: true },
    { id: 'grotto-canopy-step-2', x: 1490, y: 425, w: 180, h: 28, kind: 'floatingIsland', mossTop: true },
    { id: 'grotto-canopy-step-3', x: 1810, y: 500, w: 190, h: 28, kind: 'floatingIsland', mossTop: true, hasSprout: true },
    { id: 'grotto-crawl-ledge', x: 1360, y: 260, w: 460, h: 26, kind: 'stone', mossTop: true },
    { id: 'grotto-canopy-ledge-w', x: 980, y: 390, w: 170, h: 28, kind: 'mossStone', mossTop: true },
    { id: 'grotto-canopy-wall-top', x: 940, y: 110, w: 40, h: 150, kind: 'stone' },
    { id: 'grotto-canopy-wall-bot', x: 940, y: 390, w: 40, h: 190, kind: 'stone' },

    // Secret Canopy Alcove (Top-left behind secret wall x: 520..940, y: 160..580)
    { id: 'grotto-sec-canopy-l', x: 520, y: 160, w: 44, h: 420, kind: 'stone' },
    { id: 'grotto-sec-canopy-f', x: 564, y: 440, w: 376, h: 48, kind: 'mossStone', mossTop: true },

    // Room 4: Sunken Spore Cistern (Lower maze x: 520..2140, y: 1200..1860)
    { id: 'grotto-cistern-l', x: 560, y: 1580, w: 400, h: 280, kind: 'mossStone', mossTop: true },
    { id: 'grotto-cistern-bed', x: 960, y: 1675, w: 500, h: 185, kind: 'stone' },
    { id: 'grotto-cistern-float', x: 1130, y: 1495, w: 140, h: 28, kind: 'floatingIsland', mossTop: true, hasSprout: true },
    { id: 'grotto-cistern-mid', x: 1460, y: 1580, w: 140, h: 280, kind: 'mossStone', mossTop: true },
    { id: 'grotto-cistern-pit', x: 1600, y: 1670, w: 280, h: 190, kind: 'stone' },
    { id: 'grotto-cistern-r', x: 1880, y: 1580, w: 280, h: 280, kind: 'mossStone', mossTop: true },
    { id: 'grotto-cistern-wall-top', x: 520, y: 1200, w: 40, h: 230, kind: 'stone' },

    // Secret Root Hollow (Bottom-left x: 120..520, y: 1220..1860)
    { id: 'grotto-sec-hollow-ceil', x: 120, y: 1220, w: 400, h: 60, kind: 'stone' },
    { id: 'grotto-sec-hollow-l', x: 120, y: 1280, w: 44, h: 580, kind: 'stone' },
    { id: 'grotto-sec-hollow-f', x: 164, y: 1580, w: 356, h: 280, kind: 'mossStone', mossTop: true },

    // Room 5: Sunbeam Ascent (Vertical connecting shaft x: 2140..2680)
    { id: 'grotto-shaft-wall-r', x: 2640, y: 620, w: 50, h: 1240, kind: 'stone' },
    { id: 'grotto-shaft-shelf-1', x: 2160, y: 1380, w: 165, h: 28, kind: 'bridge', mossTop: true },
    { id: 'grotto-shaft-shelf-2', x: 2465, y: 1140, w: 175, h: 28, kind: 'bridge', mossTop: true },
    { id: 'grotto-shaft-shelf-3', x: 2160, y: 880, w: 250, h: 32, kind: 'mossStone', mossTop: true },
    { id: 'grotto-shaft-shelf-4', x: 2475, y: 690, w: 165, h: 28, kind: 'bridge', mossTop: true },

    // Room 6: Grotto Heart Sanctum (Boss Arena x: 2680..3740, floor y=620) -> Portal to Ice Cavern!
    { id: 'grotto-sanctum-floor', x: 2640, y: 620, w: 1100, h: 260, kind: 'mossStone', mossTop: true },
    { id: 'grotto-sanctum-perch-l', x: 2860, y: 485, w: 145, h: 24, kind: 'floatingIsland', mossTop: true },
    { id: 'grotto-sanctum-perch-r', x: 3230, y: 485, w: 145, h: 24, kind: 'floatingIsland', mossTop: true },
  ];

  const bouncePads: BouncePad[] = [
    { id: 'bp-entry', x: 350, y: 864, w: 68, h: 18, boostVelocity: -840, bounceTimer: 0 },
    { id: 'bp-maze-l', x: 1270, y: 1104, w: 72, h: 18, boostVelocity: -880, bounceTimer: 0 },
    { id: 'bp-maze-up', x: 1560, y: 864, w: 72, h: 18, boostVelocity: -900, bounceTimer: 0 },
    { id: 'bp-cistern', x: 1980, y: 1564, w: 74, h: 18, boostVelocity: -920, bounceTimer: 0 },
    { id: 'bp-shaft', x: 2515, y: 1124, w: 72, h: 18, boostVelocity: -860, bounceTimer: 0 },
    { id: 'bp-sanctum', x: 3060, y: 604, w: 74, h: 18, boostVelocity: -820, bounceTimer: 0 },
  ];

  const waterVolumes: WaterVolume[] = [
    {
      id: 'grotto-entry-pond',
      x: 440,
      y: 905,
      w: 320,
      h: 112,
      tint: 'emerald',
      lilypadXs: [485, 585, 690],
    },
    {
      id: 'grotto-cistern-pond',
      x: 960,
      y: 1595,
      w: 500,
      h: 82,
      tint: 'emerald',
      lilypadXs: [1015, 1140, 1275, 1400],
    },
  ];

  const airStreams: AirStream[] = [
    {
      id: 'grotto-sunbeam-stream',
      x: 2345,
      y: 220,
      w: 96,
      h: 1160,
      liftForce: 1940,
    },
  ];

  const secretWalls: SecretWall[] = [
    {
      id: 'grotto-secret-canopy',
      x: 940,
      y: 260,
      w: 36,
      h: 130,
      hp: 2,
      maxHp: 2,
      broken: false,
      hitFlash: 0,
      revealRoomId: 'grotto-sec-canopy',
    },
    {
      id: 'grotto-secret-hollow',
      x: 520,
      y: 1430,
      w: 36,
      h: 150,
      hp: 2,
      maxHp: 2,
      broken: false,
      hitFlash: 0,
      revealRoomId: 'grotto-sec-hollow',
    },
  ];

  const thorns: ThornHazard[] = [
    { id: 'grotto-thorn-1', x: 1605, y: 1638, w: 270, h: 32, orientation: 'up' },
  ];

  const hangingRopes: HangingRope[] = [
    { id: 'grotto-vine-1', x: 280, y: 670, length: 145, angle: 0.04, angVel: 0 },
    { id: 'grotto-vine-2', x: 1120, y: 110, length: 220, angle: -0.03, angVel: 0 },
    { id: 'grotto-vine-3', x: 1430, y: 110, length: 250, angle: 0.03, angVel: 0 },
    { id: 'grotto-vine-4', x: 1740, y: 110, length: 235, angle: -0.04, angVel: 0 },
    { id: 'grotto-vine-5', x: 1375, y: 960, length: 120, angle: 0.02, angVel: 0 },
    { id: 'grotto-vine-6', x: 1835, y: 920, length: 150, angle: -0.02, angVel: 0 },
    { id: 'grotto-vine-7', x: 2390, y: 110, length: 240, angle: 0.03, angVel: 0 },
    { id: 'grotto-vine-8', x: 3090, y: 110, length: 210, angle: -0.03, angVel: 0 },
  ];

  const sporeBulbs: SporeBulb[] = [
    { id: 'grotto-bulb-1', x: 550, y: 700, radius: 16, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 0.3 },
    { id: 'grotto-pogo-1', x: 1690, y: 1510, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 1.0 },
    { id: 'grotto-pogo-2', x: 1800, y: 1495, radius: 21, alive: true, respawnTimer: 0, pogoPod: true, swayPhase: 2.1 },
    { id: 'grotto-bulb-2', x: 1580, y: 375, radius: 18, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 1.4 },
    { id: 'grotto-bulb-3', x: 740, y: 390, radius: 20, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 0.6 },
    { id: 'grotto-bulb-4', x: 340, y: 1525, radius: 20, alive: true, respawnTimer: 0, pogoPod: false, swayPhase: 2.5 },
  ];

  const benches: BenchCheckpoint[] = [
    { id: 'grotto-bench-1', x: 865, y: 880, activated: false, zoneName: 'Emerald Entry Glade' },
    { id: 'grotto-bench-2', x: 2745, y: 620, activated: false, zoneName: 'Grotto Heart Sanctum' },
  ];

  const speakers: DialogueSpeaker[] = [
    {
      id: 'npc-elder-moth',
      name: 'Elder Moth',
      title: 'Grotto Weaver',
      x: 240,
      y: 880,
      read: false,
      lines: [
        'Welcome to Lush Green Moss Grotto — an interconnected maze of bounce pads, ceiling crawlways, and hanging vine shafts.',
        'West lies the pathway back to Swamp Forest; east of the Sanctum Altar lies the shortcut to Crystal Ice Cavern.',
      ],
    },
    {
      id: 'npc-hermit',
      name: 'Spore Hermit',
      title: 'Cistern Keeper',
      x: 740,
      y: 1580,
      read: false,
      lines: [
        'Two cracked moss walls guard hidden chambers: one in the Vine Canopy above, one to your left.',
      ],
    },
    {
      id: 'lore-summit-tablet',
      name: 'Canopy Tablet',
      title: 'Heart Decree',
      x: 2840,
      y: 620,
      read: false,
      lines: [
        'Use the central moss bounce pad inside the Sanctum to leap above the Mosslight Warden.',
      ],
    },
  ];

  const relics: WorldRelicPickup[] = [
    { id: 'grotto-relic-1', itemId: 'relic-mothscale', x: 680, y: 400, collected: false, color: '#67e8f9' },
    { id: 'grotto-relic-2', itemId: 'relic-shell-shard', x: 260, y: 1540, collected: false, color: '#a7f3d0' },
  ];

  const xpOrbs: XpOrb[] = [
    { id: 'xp-1', x: 310, y: 845, xpValue: 30, collected: false, phase: 0.2 },
    { id: 'xp-2', x: 550, y: 710, xpValue: 35, collected: false, phase: 1.0 },
    { id: 'xp-3', x: 1160, y: 885, xpValue: 40, collected: false, phase: 1.8 },
    { id: 'xp-4', x: 1580, y: 845, xpValue: 45, collected: false, phase: 2.4 },
    { id: 'xp-5', x: 1290, y: 485, xpValue: 50, collected: false, phase: 0.7 },
    { id: 'xp-6', x: 1590, y: 225, xpValue: 60, collected: false, phase: 1.1 },
    { id: 'xp-7', x: 1905, y: 465, xpValue: 55, collected: false, phase: 1.6 },
    { id: 'xp-8', x: 1200, y: 1460, xpValue: 60, collected: false, phase: 2.1 },
    { id: 'xp-9', x: 2240, y: 1345, xpValue: 65, collected: false, phase: 0.4 },
    { id: 'xp-10', x: 2930, y: 450, xpValue: 75, collected: false, phase: 1.9 },
  ];

  const enemies: Enemy[] = [
    {
      id: 'grotto-crawler-1', kind: 'crawler', x: 1140, y: 1088, w: 38, h: 32,
      vx: 76, vy: 0, hp: 45, maxHp: 45, facing: 1, aiState: 'FOLLOW', stateTimer: 0,
      targetX: 0, targetY: 0, homeX: 1140, homeY: 1088, hitFlash: 0, alive: true, animPhase: 0, sporeWaveCount: 0,
    },
    {
      id: 'grotto-crawler-2', kind: 'crawler', x: 700, y: 1548, w: 38, h: 32,
      vx: -78, vy: 0, hp: 45, maxHp: 45, facing: -1, aiState: 'FOLLOW', stateTimer: 0,
      targetX: 0, targetY: 0, homeX: 700, homeY: 1548, hitFlash: 0, alive: true, animPhase: 1.3, sporeWaveCount: 0,
    },
    {
      id: 'grotto-flyer-1', kind: 'flyer', x: 1620, y: 310, w: 38, h: 34,
      vx: 0, vy: 0, hp: 60, maxHp: 60, facing: -1, aiState: 'FOLLOW', stateTimer: 1.8,
      targetX: 1620, targetY: 310, homeX: 1620, homeY: 310, hitFlash: 0, alive: true, animPhase: 0.8, sporeWaveCount: 0,
    },
    {
      id: 'grotto-shield-1', kind: 'shieldbearer', x: 2260, y: 816, w: 56, h: 64,
      vx: 0, vy: 0, hp: 90, maxHp: 90, facing: -1, aiState: 'SHIELD', stateTimer: 1.5,
      targetX: 2260, targetY: 816, homeX: 2260, homeY: 816, hitFlash: 0, alive: true, animPhase: 0.4, sporeWaveCount: 0, shielded: true,
    },
    {
      id: 'warden-boss', kind: 'warden', x: 3190, y: 420, w: 76, h: 72,
      vx: 0, vy: 0, hp: 240, maxHp: 240, facing: -1, aiState: 'FOLLOW', stateTimer: 1.8,
      targetX: 3190, targetY: 420, homeX: 3160, homeY: 420, hitFlash: 0, alive: true, animPhase: 0, sporeWaveCount: 0, phase: 1,
    },
  ];

  const rooms: RoomCell[] = [
    {
      id: 'grotto-entry', name: 'Emerald Entry Glade', gridX: 0, gridY: 1,
      x: 0, y: 580, w: 980, h: 620,
      discovered: true, visited: true, hasBench: true,
      connections: ['E'], adjacentRoomIds: ['grotto-labyrinth'],
      portalLinks: [{ label: 'Swamp Forest', targetTheme: 'swamp', dir: 'W' }],
    },
    {
      id: 'grotto-labyrinth', name: 'Central Moss Labyrinth', gridX: 1, gridY: 1,
      x: 980, y: 650, w: 1160, h: 550,
      discovered: true, visited: false,
      connections: ['W', 'N', 'S', 'E'], adjacentRoomIds: ['grotto-entry', 'grotto-canopy', 'grotto-cistern', 'grotto-ascent'],
    },
    {
      id: 'grotto-canopy', name: 'Vine Canopy Maze', gridX: 1, gridY: 0,
      x: 980, y: 110, w: 1160, h: 540,
      discovered: false, visited: false,
      connections: ['S', 'W', 'E'], adjacentRoomIds: ['grotto-labyrinth', 'grotto-sec-canopy', 'grotto-ascent'],
    },
    {
      id: 'grotto-sec-canopy', name: 'Canopy Sanctuary', gridX: 0, gridY: 0,
      x: 520, y: 160, w: 460, h: 420,
      discovered: false, visited: false, isSecret: true,
      connections: ['E'], adjacentRoomIds: ['grotto-canopy'],
    },
    {
      id: 'grotto-cistern', name: 'Sunken Spore Cistern', gridX: 1, gridY: 2,
      x: 520, y: 1200, w: 1620, h: 640,
      discovered: false, visited: false,
      connections: ['N', 'E', 'W'], adjacentRoomIds: ['grotto-labyrinth', 'grotto-ascent', 'grotto-sec-hollow'],
    },
    {
      id: 'grotto-sec-hollow', name: 'Forgotten Root Hollow', gridX: 0, gridY: 2,
      x: 120, y: 1220, w: 400, h: 620,
      discovered: false, visited: false, isSecret: true,
      connections: ['E'], adjacentRoomIds: ['grotto-cistern'],
    },
    {
      id: 'grotto-ascent', name: 'Sunbeam Ascent', gridX: 2, gridY: 1,
      x: 2140, y: 160, w: 540, h: 1600,
      discovered: false, visited: false,
      connections: ['W', 'E'], adjacentRoomIds: ['grotto-canopy', 'grotto-labyrinth', 'grotto-cistern', 'grotto-sanctum'],
    },
    {
      id: 'grotto-sanctum', name: 'Grotto Heart Sanctum', gridX: 3, gridY: 0,
      x: 2680, y: 160, w: 1100, h: 720,
      discovered: false, visited: false, hasBench: true, isBossRoom: true,
      connections: ['W'], adjacentRoomIds: ['grotto-ascent'],
      portalLinks: [{ label: 'Ice Cavern', targetTheme: 'crystal', dir: 'E' }],
    },
  ];

  const portals: BiomePortal[] = [
    {
      id: 'portal-grotto-to-swamp',
      x: 24,
      y: 730,
      w: 72,
      h: 150,
      targetTheme: 'swamp',
      targetRoomId: 'swamp-sanctum',
      spawnX: 4320,
      spawnY: 720,
      label: 'Swamp Forest',
      shortLabel: '← Swamp Forest',
      direction: 'W',
    },
    {
      id: 'portal-grotto-to-ice',
      x: 3655,
      y: 470,
      w: 75,
      h: 150,
      targetTheme: 'crystal',
      targetRoomId: 'ice-sanctum',
      spawnX: 2515,
      spawnY: 560,
      label: 'Ice Cavern',
      shortLabel: 'Ice Cavern →',
      direction: 'E',
    },
  ];

  const propAnchors: PropAnchor[] = [
    { x: 160, y: 880, scale: 1.0 },
    { x: 1120, y: 1120, scale: 0.95 },
    { x: 1840, y: 1120, scale: 0.9 },
    { x: 740, y: 1580, scale: 1.0 },
    { x: 2820, y: 620, scale: 1.05 },
  ];

  const glowLights: GlowLight[] = [
    { x: 240, y: 820, radius: 210, color: 'emerald', phase: 0.2 },
    { x: 1380, y: 850, radius: 240, color: 'teal', phase: 1.3 },
    { x: 1580, y: 380, radius: 240, color: 'emerald', phase: 0.8 },
    { x: 1180, y: 1470, radius: 250, color: 'teal', phase: 2.1 },
    { x: 2390, y: 820, radius: 260, color: 'teal', phase: 1.6 },
    { x: 3100, y: 520, radius: 300, color: 'emerald', phase: 2.6 },
    { x: 560, y: 730, radius: 85, color: 'amber', phase: 0.3, isFirefly: true, driftRadius: 30 },
    { x: 1560, y: 1020, radius: 90, color: 'amber', phase: 1.5, isFirefly: true, driftRadius: 34 },
    { x: 2400, y: 580, radius: 90, color: 'amber', phase: 2.4, isFirefly: true, driftRadius: 32 },
  ];

  const godRays: GodRay[] = [
    { x: 320, width: 155, angle: 0.14, alpha: 0.1, phase: 0.1, speed: 0.42 },
    { x: 1480, width: 185, angle: 0.12, alpha: 0.11, phase: 1.3, speed: 0.45 },
    { x: 2390, width: 175, angle: 0.1, alpha: 0.115, phase: 2.0, speed: 0.48 },
    { x: 3080, width: 195, angle: 0.15, alpha: 0.1, phase: 0.6, speed: 0.38 },
  ];

  const reedProps: ReedProp[] = [
    { x: 470, y: 905, height: 95, layer: 'mid', kind: 'lilyStem', phase: 0.2 },
    { x: 730, y: 905, height: 105, layer: 'mid', kind: 'lilyStem', phase: 1.4 },
    { x: 1010, y: 1595, height: 110, layer: 'mid', kind: 'cattail', phase: 0.8 },
    { x: 1420, y: 1595, height: 95, layer: 'mid', kind: 'lilyStem', phase: 1.9 },
  ];

  return {
    theme: 'grotto',
    mapTitle: 'Lush Green Moss Grotto',
    mapStyle: 'Interconnected Cavern Maze',
    width,
    height,
    spawnX: 160,
    spawnY: 820,
    platforms,
    waterVolumes,
    airStreams,
    bouncePads,
    reedProps,
    thorns,
    secretWalls,
    hangingRopes,
    glowLights,
    mossTufts: buildMossTufts(platforms),
    sporeBulbs,
    benches,
    speakers,
    relics,
    xpOrbs,
    enemies,
    godRays,
    motes: buildMotes(width, height, 125),
    rooms,
    portals,
    propAnchors,
    bossArena: {
      minX: 2820,
      maxX: 3560,
      minY: 200,
      floorY: 620,
      triggerX: 2880,
      triggerY: 660,
    },
    altarPos: { x: 3420, y: 620 },
  };
}

export function createWorld(theme: SceneTheme = 'crystal'): WorldData {
  if (theme === 'swamp') return createSwampWorld();
  if (theme === 'grotto') return createGrottoWorld();
  return createCrystalWorld();
}
