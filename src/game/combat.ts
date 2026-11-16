import type {
  AoeRingEffect,
  CombatAttackKind,
  CombatStyleId,
  CombatTrap,
  PlayerNeedle,
  Rect,
  SlashArc,
  SlashDirection,
  SpecialWave,
} from './types';

export interface CombatStyleSpec {
  id: CombatStyleId;
  index: number;
  hotkey: 'Q' | 'R' | 'G' | 'B' | 'Y' | 'U' | 'N';
  label: string;
  unlockLevel: number;
  color: string;
  accentColor: string;
  holdAttackName: string;
  pogoAttackName: string;
  primaryCooldown: number;
  damageMult: number;
  radiusBonus: number;
  pogoBoostMult: number;
  soulBonusOnHit: number;
  summary: string;
}

export const COMBAT_STYLE_SPECS: CombatStyleSpec[] = [
  {
    id: 'hunter',
    index: 0,
    hotkey: 'Q',
    label: 'Hunter',
    unlockLevel: 1,
    color: '#67e8f9',
    accentColor: '#ecfeff',
    holdAttackName: 'Twin Needle Barrage',
    pogoAttackName: 'Piercing Needle Pogo',
    primaryCooldown: 0.21,
    damageMult: 1.0,
    radiusBonus: 4,
    pogoBoostMult: 1.0,
    soulBonusOnHit: 0,
    summary: '3-Needle fan spread + forward piercing lunge.',
  },
  {
    id: 'reaper',
    index: 1,
    hotkey: 'R',
    label: 'Reaper',
    unlockLevel: 1,
    color: '#a78bfa',
    accentColor: '#ede9fe',
    holdAttackName: 'Reaper Scythe Cleave',
    pogoAttackName: 'Heavy Reaper Smash Pogo',
    primaryCooldown: 0.26,
    damageMult: 1.25,
    radiusBonus: 16,
    pogoBoostMult: 1.04,
    soulBonusOnHit: 8,
    summary: 'Wide violet scythe cleave that harvests bonus Silk.',
  },
  {
    id: 'wanderer',
    index: 2,
    hotkey: 'G',
    label: 'Wanderer',
    unlockLevel: 1,
    color: '#bef264',
    accentColor: '#f7fee7',
    holdAttackName: 'Cyclone Flurry Spin',
    pogoAttackName: 'Nimble Flick Pogo',
    primaryCooldown: 0.14,
    damageMult: 0.92,
    radiusBonus: -2,
    pogoBoostMult: 0.96,
    soulBonusOnHit: 1,
    summary: '360° whirlwind spin flurry & rapid strikes.',
  },
  {
    id: 'beast',
    index: 3,
    hotkey: 'B',
    label: 'Beast',
    unlockLevel: 1,
    color: '#fb7185',
    accentColor: '#ffe4e6',
    holdAttackName: 'Savage Fury Lunge',
    pogoAttackName: 'Feral Fang Dive Pogo',
    primaryCooldown: 0.2,
    damageMult: 1.18,
    radiusBonus: 10,
    pogoBoostMult: 1.06,
    soulBonusOnHit: 2,
    summary: 'High-speed crimson claw lunge with lifesteal.',
  },
  {
    id: 'witch',
    index: 4,
    hotkey: 'Y',
    label: 'Witch',
    unlockLevel: 1,
    color: '#34d399',
    accentColor: '#d1fae5',
    holdAttackName: 'Silk Thread Web Nova',
    pogoAttackName: 'Thread Whip Pogo',
    primaryCooldown: 0.23,
    damageMult: 1.12,
    radiusBonus: 22,
    pogoBoostMult: 1.02,
    soulBonusOnHit: 4,
    summary: 'Sweeping 360° emerald silk-thread web blast.',
  },
  {
    id: 'architect',
    index: 5,
    hotkey: 'U',
    label: 'Architect',
    unlockLevel: 1,
    color: '#fbbf24',
    accentColor: '#fef3c7',
    holdAttackName: 'Screw-Dash & Cog Trap',
    pogoAttackName: 'Piston Drill Pogo',
    primaryCooldown: 0.23,
    damageMult: 1.15,
    radiusBonus: 8,
    pogoBoostMult: 1.16,
    soulBonusOnHit: 2,
    summary: 'Corkscrew drill dash + spinning cog-saw & mine trap.',
  },
  {
    id: 'shaman',
    index: 6,
    hotkey: 'N',
    label: 'Shaman',
    unlockLevel: 1,
    color: '#f472b6',
    accentColor: '#fde047',
    holdAttackName: 'Soul Cataclysm Wave',
    pogoAttackName: 'Arcane Rune Blast Pogo',
    primaryCooldown: 0.24,
    damageMult: 1.24,
    radiusBonus: 18,
    pogoBoostMult: 1.12,
    soulBonusOnHit: 5,
    summary: 'Arcane AoE nova + screen-traveling soul wave.',
  },
];

export function getStyleSpec(id: CombatStyleId): CombatStyleSpec {
  return COMBAT_STYLE_SPECS.find((s) => s.id === id) ?? COMBAT_STYLE_SPECS[0];
}

export interface AttackContext {
  level: number;
  facing: 1 | -1;
  grounded: boolean;
  dashing: boolean;
  moving: boolean;
  upHeld: boolean;
  downHeld: boolean;
}

export interface SpecialContext {
  level: number;
  facing: 1 | -1;
  soul: number;
}

export interface ResolvedSpecialAttack {
  kind: CombatAttackKind;
  attackName: string;
  levelReq: number;
  cooldown: number;
  soulCost: number;
  hasNova: boolean;
  novaRadius: number;
  novaDamage: number;
  waveDamage: number;
  waveSpeed: number;
  waveLife: number;
  waveHalfW: number;
  waveHalfH: number;
  isUltimate: boolean;
  color: string;
}

export interface ResolvedHoldAttack {
  styleId: CombatStyleId;
  attackName: string;
  levelReq: number;
  color: string;
  cooldown: number;
  lungeVx: number;
  lungeVy: number;
  damage: number;
  radius: number;
  duration: number;
  needlesToFire: number;
  deployCogTrap: boolean;
  deployMineTrap: boolean;
  spawnAoeRadius: number;
  spawnShockwave: boolean;
  bonusSoul: number;
  invulnDuration: number;
}

export class PlayerCombat {
  public attackCooldownTimer = 0;
  public specialCooldownTimer = 0;
  public comboStep = 0;
  public comboResetTimer = 0;
  public dashAttackWindowTimer = 0;

  // Silksong Multi-Style State
  public activeStyle: CombatStyleId = 'hunter';
  public chargeTimer = 0;
  public readonly chargeThreshold = 0.6;
  public chargeReadyNotified = false;
  public beastHitCounter = 0;

  public activeAttackName = 'Basic Horizontal Slash';
  public activeAttackLevel = 1;
  private activeDisplayHoldTimer = 0;

  public shadowDashHitIds = new Set<string>();

  public slash: SlashArc = {
    active: false,
    x: 0,
    y: 0,
    dir: 'right',
    timer: 0,
    duration: 0.15,
    frame: 0,
    kind: 'basicHorizontal',
    styleId: 'hunter',
    styleColor: '#67e8f9',
    isHoldAttack: false,
    levelReq: 1,
    attackName: 'Basic Horizontal Slash',
    damage: 14,
    radius: 42,
    comboStep: 0,
    hitIds: new Set<string>(),
  };

  public specialWaves: SpecialWave[] = [];
  public aoeRings: AoeRingEffect[] = [];
  public playerNeedles: PlayerNeedle[] = [];
  public traps: CombatTrap[] = [];

  public reset(): void {
    this.attackCooldownTimer = 0;
    this.specialCooldownTimer = 0;
    this.comboStep = 0;
    this.comboResetTimer = 0;
    this.dashAttackWindowTimer = 0;
    this.activeStyle = 'hunter';
    this.chargeTimer = 0;
    this.chargeReadyNotified = false;
    this.beastHitCounter = 0;
    this.activeAttackName = 'Basic Horizontal Slash';
    this.activeAttackLevel = 1;
    this.activeDisplayHoldTimer = 0;
    this.shadowDashHitIds.clear();
    this.slash.active = false;
    this.slash.hitIds.clear();
    this.specialWaves = [];
    this.aoeRings = [];
    this.playerNeedles = [];
    this.traps = [];
  }

  public getUnlockedStyles(level: number): CombatStyleId[] {
    return COMBAT_STYLE_SPECS.filter((s) => level >= s.unlockLevel).map((s) => s.id);
  }

  public getActiveStyleSpec(): CombatStyleSpec {
    return getStyleSpec(this.activeStyle);
  }

  public getChargeProgress(): number {
    return Math.max(0, Math.min(1, this.chargeTimer / this.chargeThreshold));
  }

  public isChargeReady(): boolean {
    return this.chargeTimer >= this.chargeThreshold;
  }

  public selectStyleById(styleId: CombatStyleId, level: number): { changed: boolean; unlocked: boolean; spec: CombatStyleSpec } {
    const spec = getStyleSpec(styleId);
    if (level < spec.unlockLevel) {
      return { changed: false, unlocked: false, spec };
    }
    const changed = this.activeStyle !== spec.id;
    this.activeStyle = spec.id;
    this.chargeTimer = 0;
    this.chargeReadyNotified = false;
    this.recordHudAttack(`${spec.label} Style`, spec.unlockLevel, 1.5);
    return { changed, unlocked: true, spec };
  }

  public cycleStyle(level: number): CombatStyleSpec {
    const unlocked = COMBAT_STYLE_SPECS.filter((s) => level >= s.unlockLevel);
    if (unlocked.length <= 1) {
      this.activeStyle = unlocked[0]?.id ?? 'hunter';
      return getStyleSpec(this.activeStyle);
    }
    const idx = unlocked.findIndex((s) => s.id === this.activeStyle);
    const next = unlocked[(idx + 1) % unlocked.length];
    this.activeStyle = next.id;
    this.chargeTimer = 0;
    this.chargeReadyNotified = false;
    this.recordHudAttack(`${next.label} Style`, next.unlockLevel, 1.5);
    return next;
  }

  public syncHighestUnlockedStyleIfNeeded(level: number): void {
    const spec = getStyleSpec(this.activeStyle);
    if (level < spec.unlockLevel) {
      this.activeStyle = 'hunter';
    }
  }

  public onDashStart(): void {
    this.dashAttackWindowTimer = 0.28;
    this.shadowDashHitIds.clear();
  }

  public updateTimers(dt: number, isDashing: boolean, level: number): void {
    this.syncHighestUnlockedStyleIfNeeded(level);

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    }
    if (this.specialCooldownTimer > 0) {
      this.specialCooldownTimer = Math.max(0, this.specialCooldownTimer - dt);
    }
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.comboResetTimer = 0;
        this.comboStep = 0;
      }
    }
    if (isDashing) {
      this.dashAttackWindowTimer = Math.max(this.dashAttackWindowTimer, 0.2);
    } else if (this.dashAttackWindowTimer > 0) {
      this.dashAttackWindowTimer = Math.max(0, this.dashAttackWindowTimer - dt);
    }

    if (this.activeDisplayHoldTimer > 0) {
      this.activeDisplayHoldTimer -= dt;
      if (this.activeDisplayHoldTimer <= 0) {
        this.activeDisplayHoldTimer = 0;
        const baseline = this.getDefaultAttackForLevel(level);
        this.activeAttackName = baseline.name;
        this.activeAttackLevel = baseline.level;
      }
    } else {
      const baseline = this.getDefaultAttackForLevel(level);
      this.activeAttackName = baseline.name;
      this.activeAttackLevel = baseline.level;
    }

    for (const ring of this.aoeRings) {
      if (!ring.active) continue;
      ring.life -= dt;
      const p = 1 - Math.max(0, ring.life / ring.maxLife);
      ring.radius = 18 + (ring.maxRadius - 18) * (1 - Math.pow(1 - p, 2.2));
      if (ring.life <= 0) {
        ring.active = false;
      }
    }
    if (this.aoeRings.length > 14) {
      this.aoeRings = this.aoeRings.filter((r) => r.active);
    }
  }

  public stepHoldCharge(
    dt: number,
    attackHeld: boolean,
    canCharge: boolean
  ): { justReady: boolean; progress: number } {
    if (!attackHeld || !canCharge) {
      this.chargeTimer = 0;
      this.chargeReadyNotified = false;
      return { justReady: false, progress: 0 };
    }

    const prevReady = this.chargeReadyNotified;
    this.chargeTimer = Math.min(this.chargeThreshold + 0.25, this.chargeTimer + dt);
    let justReady = false;
    if (this.chargeTimer >= this.chargeThreshold && !prevReady) {
      this.chargeReadyNotified = true;
      justReady = true;
    }
    return { justReady, progress: this.getChargeProgress() };
  }

  public getDefaultAttackForLevel(level: number): { name: string; level: number } {
    const spec = getStyleSpec(this.activeStyle);
    if (level >= 10) return { name: `${spec.label} · Ultimate Wave`, level: 10 };
    if (level >= 9) return { name: `${spec.label} · Multi-Hit Combo`, level: 9 };
    if (level >= 8) return { name: `${spec.label} · AoE Spell`, level: 8 };
    if (level >= 7) return { name: `${spec.label} · Shadow Dash`, level: 7 };
    if (level >= 6) return { name: `${spec.label} · Energy Blast`, level: 6 };
    if (level >= 5) return { name: `${spec.label} · Downward Pogo`, level: 5 };
    if (level >= 4) return { name: `${spec.label} · Swift Cleave`, level: 4 };
    if (level >= 3) return { name: `${spec.label} · Dash Slash`, level: 3 };
    if (level >= 2) return { name: `${spec.label} · Warrior Slash`, level: 2 };
    return { name: `${spec.label} · Horizontal Slash`, level: 1 };
  }

  public canAttack(): boolean {
    return this.attackCooldownTimer <= 0;
  }

  public canSpecial(level: number): boolean {
    return level >= 6 && this.specialCooldownTimer <= 0;
  }

  public resolvePrimaryAttack(ctx: AttackContext): {
    allowed: boolean;
    lockedLabel?: string;
    cooldown: number;
    pitch: number;
    lungeVx: number;
    hopForGroundPogo: boolean;
    animDuration: number;
    fireQuickNeedle: boolean;
    styleSpec: CombatStyleSpec;
  } {
    const lvl = ctx.level;
    const spec = getStyleSpec(this.activeStyle);

    // Direction resolution: W/Up -> up; S/Down -> down pogo (airborne or auto pogo-hop from ground!)
    let dir: SlashDirection = ctx.facing === 1 ? 'right' : 'left';
    let hopForGroundPogo = false;
    if (ctx.upHeld) {
      dir = 'up';
    } else if (ctx.downHeld) {
      dir = 'down';
      if (ctx.grounded) {
        hopForGroundPogo = true;
      }
    }

    let kind: CombatAttackKind = 'basicHorizontal';
    let levelReq = spec.unlockLevel;
    let attackName =
      dir === 'up'
        ? `${spec.label} Up-Slash`
        : dir === 'down'
          ? spec.pogoAttackName
          : `${spec.label} Slash`;
    let damage = Math.round(14 * spec.damageMult);
    let radius = Math.max(36, 44 + spec.radiusBonus);
    let duration = spec.id === 'wanderer' ? 0.115 : spec.id === 'reaper' ? 0.18 : 0.145;
    const cooldown = Math.max(0.12, spec.primaryCooldown - (lvl >= 4 ? 0.02 : 0));
    let lungeVx = 0;
    let fireQuickNeedle = false;

    const isDashContext = ctx.dashing || this.dashAttackWindowTimer > 0;

    if (dir === 'down') {
      kind = 'stylePogo';
      levelReq = Math.max(spec.unlockLevel, lvl >= 5 ? 5 : 1);
      attackName = spec.pogoAttackName;
      damage = Math.round((lvl >= 9 ? 22 : lvl >= 5 ? 18 : 15) * spec.damageMult);
      radius = Math.max(40, 48 + spec.radiusBonus);
      duration = spec.id === 'wanderer' ? 0.12 : 0.155;
    } else if (lvl >= 7 && isDashContext) {
      kind = 'shadowDashAttack';
      levelReq = 7;
      attackName = `${spec.label} Shadow Dash`;
      damage = Math.round(28 * spec.damageMult);
      radius = 60 + Math.max(0, spec.radiusBonus);
      duration = 0.17;
      lungeVx = ctx.facing * 240;
    } else if (lvl >= 3 && isDashContext) {
      kind = 'dashSlash';
      levelReq = 3;
      attackName = `${spec.label} Dash Slash`;
      damage = Math.round(22 * spec.damageMult);
      radius = 56 + Math.max(0, spec.radiusBonus);
      duration = 0.16;
      lungeVx = ctx.facing * 185;
    } else if (lvl >= 9) {
      this.comboStep = this.comboResetTimer > 0 ? (this.comboStep + 1) % 3 : 0;
      this.comboResetTimer = 0.9;
      if (this.comboStep === 0) {
        kind = 'comboHit1';
        levelReq = 9;
        attackName = `${spec.label} Combo I`;
        damage = Math.round(20 * spec.damageMult);
        radius = 50 + spec.radiusBonus;
      } else if (this.comboStep === 1) {
        kind = 'comboHit2';
        levelReq = 9;
        attackName = `${spec.label} Combo II`;
        damage = Math.round(24 * spec.damageMult);
        radius = 54 + spec.radiusBonus;
      } else {
        kind = 'comboFinisher';
        levelReq = 9;
        attackName = `${spec.label} Combo III`;
        damage = Math.round(36 * spec.damageMult);
        radius = 64 + spec.radiusBonus;
        duration = 0.18;
      }
    } else if (!ctx.grounded && lvl >= 3) {
      kind = 'airSlash';
      levelReq = Math.max(spec.unlockLevel, lvl >= 4 ? 4 : 3);
      attackName = `${spec.label} Air Cleave`;
      damage = Math.round((lvl >= 4 ? 21 : 18) * spec.damageMult);
      radius = 48 + spec.radiusBonus;
    } else if (lvl >= 2) {
      kind = 'warriorSlash';
      levelReq = Math.max(spec.unlockLevel, 2);
      attackName = dir === 'up' ? `${spec.label} Up-Slash` : `${spec.label} Slash`;
      damage = Math.round(18 * spec.damageMult);
      radius = 46 + spec.radiusBonus;
    } else {
      kind = 'basicHorizontal';
      levelReq = 1;
      attackName = dir === 'up' ? `${spec.label} Upward Slash` : `${spec.label} Slash`;
      damage = Math.round(15 * spec.damageMult);
      radius = 44 + spec.radiusBonus;
      duration = 0.14;
    }

    // Hunter Style passive: fires a quick piercing needle on forward strikes
    if (spec.id === 'hunter' && dir !== 'down' && dir !== 'up') {
      fireQuickNeedle = true;
    }

    if (lvl < 9) {
      this.comboStep = 0;
    }

    this.attackCooldownTimer = cooldown;
    this.slash.active = true;
    this.slash.dir = dir;
    this.slash.duration = duration;
    this.slash.timer = duration;
    this.slash.frame = 0;
    this.slash.kind = kind;
    this.slash.styleId = spec.id;
    this.slash.styleColor = spec.color;
    this.slash.isHoldAttack = false;
    this.slash.levelReq = levelReq;
    this.slash.attackName = attackName;
    this.slash.damage = damage;
    this.slash.radius = radius;
    this.slash.comboStep = this.comboStep;
    this.slash.hitIds.clear();

    this.activeAttackName = attackName;
    this.activeAttackLevel = levelReq;
    this.activeDisplayHoldTimer = 1.6;

    const pitch =
      kind === 'comboFinisher'
        ? 1.28
        : spec.id === 'wanderer'
          ? 1.24
          : spec.id === 'reaper'
            ? 0.82
            : dir === 'up'
              ? 1.15
              : dir === 'down'
                ? 0.92
                : 1;

    return {
      allowed: true,
      cooldown,
      pitch,
      lungeVx,
      hopForGroundPogo,
      animDuration: duration + 0.03,
      fireQuickNeedle,
      styleSpec: spec,
    };
  }

  public resolveHoldAttack(ctx: AttackContext, styleOverride?: CombatStyleId): ResolvedHoldAttack {
    if (styleOverride) {
      this.activeStyle = styleOverride;
    }
    const spec = getStyleSpec(this.activeStyle);
    const lvl = ctx.level;
    const scale = 1 + (lvl - 1) * 0.07;

    let dir: SlashDirection = ctx.facing === 1 ? 'right' : 'left';
    if (ctx.upHeld) dir = 'up';
    else if (ctx.downHeld) dir = 'down';

    const baseDamage = Math.round(32 * spec.damageMult * scale);
    let radius = Math.max(60, 72 + spec.radiusBonus);
    let duration = 0.21;
    let cooldown = 0.26;
    let lungeVx = 0;
    let lungeVy = 0;
    let needlesToFire = 0;
    let deployCogTrap = false;
    let deployMineTrap = false;
    let spawnAoeRadius = 0;
    let spawnShockwave = false;
    let bonusSoul = 0;
    let invulnDuration = 0;

    if (spec.id === 'hunter') {
      needlesToFire = 3;
      lungeVx = ctx.facing * 230;
      radius = 66;
    } else if (spec.id === 'reaper') {
      lungeVx = ctx.facing * 150;
      radius = 90;
      duration = 0.25;
      spawnAoeRadius = 92;
      bonusSoul = 10;
    } else if (spec.id === 'wanderer') {
      duration = 0.26;
      cooldown = 0.2;
      radius = 84;
      lungeVy = ctx.grounded ? -160 : -110;
      spawnAoeRadius = 86;
    } else if (spec.id === 'beast') {
      lungeVx = ctx.facing * 430;
      radius = 78;
      duration = 0.22;
      invulnDuration = 0.22;
    } else if (spec.id === 'witch') {
      radius = 128;
      duration = 0.27;
      spawnAoeRadius = 136;
    } else if (spec.id === 'architect') {
      lungeVx = ctx.facing * 320;
      deployCogTrap = true;
      deployMineTrap = true;
      radius = 74;
    } else if (spec.id === 'shaman') {
      spawnAoeRadius = 120;
      spawnShockwave = true;
      radius = 86;
    }

    this.chargeTimer = 0;
    this.chargeReadyNotified = false;
    this.attackCooldownTimer = cooldown;

    this.slash.active = true;
    this.slash.dir = dir;
    this.slash.duration = duration;
    this.slash.timer = duration;
    this.slash.frame = 0;
    this.slash.kind = 'holdSlash';
    this.slash.styleId = spec.id;
    this.slash.styleColor = spec.color;
    this.slash.isHoldAttack = true;
    this.slash.levelReq = spec.unlockLevel;
    this.slash.attackName = spec.holdAttackName;
    this.slash.damage = baseDamage;
    this.slash.radius = radius;
    this.slash.comboStep = 2;
    this.slash.hitIds.clear();

    this.activeAttackName = spec.holdAttackName;
    this.activeAttackLevel = spec.unlockLevel;
    this.activeDisplayHoldTimer = 2.0;

    return {
      styleId: spec.id,
      attackName: spec.holdAttackName,
      levelReq: spec.unlockLevel,
      color: spec.color,
      cooldown,
      lungeVx,
      lungeVy,
      damage: baseDamage,
      radius,
      duration,
      needlesToFire,
      deployCogTrap,
      deployMineTrap,
      spawnAoeRadius,
      spawnShockwave,
      bonusSoul,
      invulnDuration,
    };
  }

  public spawnPlayerNeedle(
    x: number,
    y: number,
    facing: 1 | -1,
    vyOffset = 0,
    damage = 11,
    color = '#67e8f9'
  ): void {
    this.playerNeedles.push({
      active: true,
      x,
      y,
      vx: facing * 760,
      vy: vyOffset,
      facing,
      life: 0.55,
      maxLife: 0.55,
      damage,
      color,
      hitIds: new Set<string>(),
    });
    if (this.playerNeedles.length > 24) {
      this.playerNeedles = this.playerNeedles.filter((n) => n.active);
    }
  }

  public spawnTrap(
    kind: 'cog' | 'mine',
    x: number,
    y: number,
    vx = 0,
    vy = 0,
    damage = 16,
    color = '#fbbf24'
  ): void {
    this.traps.push({
      active: true,
      kind,
      x,
      y,
      vx,
      vy,
      radius: kind === 'cog' ? 20 : 14,
      life: kind === 'cog' ? 4.2 : 3.2,
      maxLife: kind === 'cog' ? 4.2 : 3.2,
      tickTimer: 0,
      spin: 0,
      damage,
      color,
    });
    if (this.traps.length > 10) {
      this.traps = this.traps.filter((t) => t.active);
    }
  }

  public resolveSpecialAttack(ctx: SpecialContext): ResolvedSpecialAttack {
    const spec = getStyleSpec(this.activeStyle);
    const isUltimate = ctx.level >= 10;
    const hasStrongMagic = ctx.level >= 8 || spec.id === 'shaman';

    const kind: CombatAttackKind = isUltimate
      ? 'ultimateWave'
      : hasStrongMagic
        ? 'aoeMagicSpell'
        : 'energyProjectile';
    const levelReq = isUltimate ? 10 : hasStrongMagic ? 8 : 6;
    const attackName = isUltimate
      ? `${spec.label} Ultimate Wave`
      : hasStrongMagic
        ? `${spec.label} AoE Spell`
        : `${spec.label} Energy Blast`;

    this.specialCooldownTimer = isUltimate ? 0.5 : 0.56;
    this.attackCooldownTimer = Math.max(this.attackCooldownTimer, 0.22);

    this.activeAttackName = attackName;
    this.activeAttackLevel = levelReq;
    this.activeDisplayHoldTimer = 2.0;

    return {
      kind,
      attackName,
      levelReq,
      cooldown: this.specialCooldownTimer,
      soulCost: ctx.soul >= 20 ? 20 : 0,
      hasNova: hasStrongMagic || isUltimate,
      novaRadius: isUltimate ? 175 : 132,
      novaDamage: isUltimate ? 65 : 40,
      waveDamage: isUltimate ? 48 : 26,
      waveSpeed: isUltimate ? 820 : 650,
      waveLife: isUltimate ? 1.35 : 0.92,
      waveHalfW: isUltimate ? 46 : 24,
      waveHalfH: isUltimate ? 110 : 34,
      isUltimate,
      color: isUltimate ? '#fde047' : spec.color,
    };
  }

  public spawnAoeRing(x: number, y: number, maxRadius: number, color: string, isUltimate: boolean): void {
    this.aoeRings.push({
      active: true,
      x,
      y,
      radius: 20,
      maxRadius,
      life: isUltimate ? 0.42 : 0.32,
      maxLife: isUltimate ? 0.42 : 0.32,
      color,
      isUltimate,
    });
  }

  public stepSlashFrame(): void {
    if (!this.slash.active) return;
    const progress = 1 - Math.max(0, this.slash.timer / Math.max(0.001, this.slash.duration));
    if (progress < 0.33) {
      this.slash.frame = 0;
    } else if (progress < 0.68) {
      this.slash.frame = 1;
    } else {
      this.slash.frame = 2;
    }
  }

  public getSlashHitbox(): Rect {
    const { x, y, dir, radius, isHoldAttack, styleId } = this.slash;
    if (isHoldAttack && (styleId === 'wanderer' || styleId === 'witch')) {
      return { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
    }
    const reach = radius + 24;
    const breadth = Math.round(radius * 1.62);
    if (dir === 'right') return { x: x - 6, y: y - breadth * 0.5, w: reach, h: breadth };
    if (dir === 'left') return { x: x - reach + 6, y: y - breadth * 0.5, w: reach, h: breadth };
    if (dir === 'up') return { x: x - breadth * 0.5, y: y - reach + 6, w: breadth, h: reach };
    return { x: x - breadth * 0.5, y: y - 6, w: breadth, h: reach };
  }

  public recordHudAttack(name: string, levelReq: number, holdSeconds = 1.6): void {
    this.activeAttackName = name;
    this.activeAttackLevel = levelReq;
    this.activeDisplayHoldTimer = holdSeconds;
  }
}
