export type AbilityId =
  | 'walkJump'
  | 'swordAttack'
  | 'dash'
  | 'wallJump'
  | 'doubleJump'
  | 'energyAttack'
  | 'shadowDash'
  | 'strongMagic'
  | 'combatCombo'
  | 'ultimateAbility';

export interface LevelTier {
  level: number;
  title: string;
  abilityId: AbilityId;
  abilityLabel: string;
  xpRequired: number;
  description: string;
}

export const PROGRESSION_TABLE: LevelTier[] = [
  {
    level: 1,
    title: 'Beginner Knight',
    abilityId: 'walkJump',
    abilityLabel: 'Basic Horizontal Slash',
    xpRequired: 0,
    description: 'Core movement & crisp white horizontal crescent slash (J / X / Click).',
  },
  {
    level: 2,
    title: 'Warrior',
    abilityId: 'swordAttack',
    abilityLabel: 'Warrior Upward & Wide Slash',
    xpRequired: 25,
    description: 'Upgrades nail reach & damage; unlocks upward crescent strike (W + J).',
  },
  {
    level: 3,
    title: 'Quick Knight',
    abilityId: 'dash',
    abilityLabel: 'Dash Slash & Air Slash',
    xpRequired: 60,
    description: 'Unlocks Silk Dash (K / Shift), lunging Dash Slash, and agile Air Slash.',
  },
  {
    level: 4,
    title: 'Wall Climber',
    abilityId: 'wallJump',
    abilityLabel: 'Wall Jump & Swift Cleave',
    xpRequired: 110,
    description: 'Unlocks Wall Slide, Wall Jump, and faster aerial cleave recovery.',
  },
  {
    level: 5,
    title: 'Double Jumper',
    abilityId: 'doubleJump',
    abilityLabel: 'Downward Pogo & Double Jump',
    xpRequired: 175,
    description: 'Unlocks Monarch Double Jump & Downward Pogo (S + J) off foes and spikes.',
  },
  {
    level: 6,
    title: 'Energy Master',
    abilityId: 'energyAttack',
    abilityLabel: 'Soul Energy Projectile',
    xpRequired: 255,
    description: 'Unlocks glowing Soul Crescent Projectile Spell (V / Right-Click).',
  },
  {
    level: 7,
    title: 'Shadow Warrior',
    abilityId: 'shadowDash',
    abilityLabel: 'Shadow Dash Attack',
    xpRequired: 350,
    description: 'Dash gains void i-frames and cleaves enemies passed through.',
  },
  {
    level: 8,
    title: 'Soul Master',
    abilityId: 'strongMagic',
    abilityLabel: 'Strong AoE Magic Spell',
    xpRequired: 460,
    description: 'Empowers Special with a 360-degree Soul Nova clearing nearby threats.',
  },
  {
    level: 9,
    title: 'Ancient Knight',
    abilityId: 'combatCombo',
    abilityLabel: 'Multi-Hit Combo Attack',
    xpRequired: 590,
    description: '3-stage escalating melee combo ending in a golden multi-hit finisher.',
  },
  {
    level: 10,
    title: 'Ultimate Knight',
    abilityId: 'ultimateAbility',
    abilityLabel: 'Ultimate Slash Wave',
    xpRequired: 750,
    description: 'Unleashes Radiant Judgment: screen-wiping twin slash waves & massive nova.',
  },
];

export interface GlobalGameState {
  currentLevel: number;
  currentXP: number;
  unlockedAbilities: Record<AbilityId, boolean>;
}

function createEmptyAbilities(): Record<AbilityId, boolean> {
  return {
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
  };
}

// Global gameState object synced automatically by ProgressionManager
export const gameState: GlobalGameState = {
  currentLevel: 1,
  currentXP: 0,
  unlockedAbilities: createEmptyAbilities(),
};

export class ProgressionManager {
  public reset(initialXp = 0): void {
    gameState.currentXP = Math.max(0, initialXp);
    this.syncLevelAndAbilities();
  }

  private syncLevelAndAbilities(): void {
    let highestLevel = 1;
    const flags = createEmptyAbilities();

    for (const tier of PROGRESSION_TABLE) {
      if (gameState.currentXP >= tier.xpRequired) {
        highestLevel = tier.level;
        flags[tier.abilityId] = true;
      }
    }

    gameState.currentLevel = highestLevel;
    gameState.unlockedAbilities = flags;
  }

  public addXP(amount: number): LevelTier[] {
    if (amount <= 0) return [];
    const prevLevel = gameState.currentLevel;
    gameState.currentXP += Math.round(amount);
    this.syncLevelAndAbilities();

    if (gameState.currentLevel <= prevLevel) {
      return [];
    }
    return PROGRESSION_TABLE.filter(
      (tier) => tier.level > prevLevel && tier.level <= gameState.currentLevel
    );
  }

  public hasAbility(abilityId: AbilityId): boolean {
    return Boolean(gameState.unlockedAbilities[abilityId]);
  }

  public getCurrentTier(): LevelTier {
    return (
      PROGRESSION_TABLE.find((t) => t.level === gameState.currentLevel) ??
      PROGRESSION_TABLE[0]
    );
  }

  public getNextTier(): LevelTier | null {
    return PROGRESSION_TABLE.find((t) => t.level === gameState.currentLevel + 1) ?? null;
  }

  public getProgressStats(): {
    level: number;
    title: string;
    abilityLabel: string;
    xp: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
    progress: number;
  } {
    const cur = this.getCurrentTier();
    const next = this.getNextTier();
    if (!next) {
      return {
        level: cur.level,
        title: cur.title,
        abilityLabel: cur.abilityLabel,
        xp: gameState.currentXP,
        xpIntoLevel: 1,
        xpForNextLevel: 1,
        progress: 1,
      };
    }

    const span = Math.max(1, next.xpRequired - cur.xpRequired);
    const into = Math.max(0, gameState.currentXP - cur.xpRequired);
    return {
      level: cur.level,
      title: cur.title,
      abilityLabel: cur.abilityLabel,
      xp: gameState.currentXP,
      xpIntoLevel: into,
      xpForNextLevel: span,
      progress: Math.max(0, Math.min(1, into / span)),
    };
  }
}
