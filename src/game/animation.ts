export type AnimationState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'doubleJump'
  | 'falling'
  | 'landing'
  | 'dash'
  | 'wallSlide'
  | 'wallJump'
  | 'attack'
  | 'specialAttack'
  | 'hurt'
  | 'death'
  | 'healing';

export interface AnimationContext {
  vx: number;
  vy: number;
  grounded: boolean;
  wallSliding: boolean;
  dashing: boolean;
  healing: boolean;
  maxRunSpeed: number;
  justLanded: boolean;
}

export interface ProceduralPose {
  state: AnimationState;
  progress: number;
  tiltAngle: number;
  offsetY: number;
  legStride: number;
  cloakLift: number;
  wingSpread: number;
  spinAngle: number;
  auraAlpha: number;
  needleAngle: number;
  dissolveAlpha: number;
}

export class AnimationController {
  public state: AnimationState = 'idle';
  public stateTime = 0;
  private transientState: AnimationState | null = null;
  private transientRemaining = 0;
  private transientDuration = 0.001;

  public reset(): void {
    this.state = 'idle';
    this.stateTime = 0;
    this.transientState = null;
    this.transientRemaining = 0;
    this.transientDuration = 0.001;
  }

  public trigger(nextState: AnimationState, duration: number): void {
    // Death overrides everything; hurt overrides non-death states
    if (this.transientState === 'death' && nextState !== 'death') {
      return;
    }
    this.transientState = nextState;
    this.transientRemaining = Math.max(0.01, duration);
    this.transientDuration = Math.max(0.01, duration);
    this.state = nextState;
    this.stateTime = 0;
  }

  public update(dt: number, ctx: AnimationContext): AnimationState {
    this.stateTime += dt;

    if (ctx.justLanded && this.transientState !== 'death' && this.transientState !== 'hurt') {
      this.trigger('landing', 0.12);
    }

    if (this.transientState) {
      this.transientRemaining -= dt;
      if (this.transientRemaining <= 0) {
        this.transientState = null;
        this.transientRemaining = 0;
      }
    }

    let resolved: AnimationState;

    if (this.transientState === 'death') {
      resolved = 'death';
    } else if (this.transientState === 'hurt') {
      resolved = 'hurt';
    } else if (ctx.healing) {
      resolved = 'healing';
    } else if (this.transientState === 'specialAttack') {
      resolved = 'specialAttack';
    } else if (this.transientState === 'attack') {
      resolved = 'attack';
    } else if (ctx.dashing) {
      resolved = 'dash';
    } else if (this.transientState === 'wallJump') {
      resolved = 'wallJump';
    } else if (this.transientState === 'doubleJump') {
      resolved = 'doubleJump';
    } else if (ctx.wallSliding) {
      resolved = 'wallSlide';
    } else if (!ctx.grounded) {
      resolved = ctx.vy < -15 ? 'jumping' : 'falling';
    } else if (this.transientState === 'landing' && Math.abs(ctx.vx) < 60) {
      resolved = 'landing';
    } else if (Math.abs(ctx.vx) >= ctx.maxRunSpeed * 0.58) {
      resolved = 'running';
    } else if (Math.abs(ctx.vx) > 14) {
      resolved = 'walking';
    } else {
      resolved = 'idle';
    }

    if (resolved !== this.state) {
      this.state = resolved;
      this.stateTime = 0;
    }

    return this.state;
  }

  public getTransientProgress(): number {
    if (!this.transientState) return 0;
    return Math.max(0, Math.min(1, 1 - this.transientRemaining / this.transientDuration));
  }

  public samplePose(time: number, runCycle: number): ProceduralPose {
    const progress = this.getTransientProgress();
    const base: ProceduralPose = {
      state: this.state,
      progress,
      tiltAngle: 0,
      offsetY: 0,
      legStride: 0,
      cloakLift: 0,
      wingSpread: 0,
      spinAngle: 0,
      auraAlpha: 0,
      needleAngle: -0.75,
      dissolveAlpha: 1,
    };

    switch (this.state) {
      case 'idle':
        base.offsetY = Math.sin(time * 2.6) * 1.2;
        break;
      case 'walking':
        base.tiltAngle = 0.04;
        base.offsetY = -Math.abs(Math.sin(runCycle * 0.65)) * 1.6;
        base.legStride = Math.sin(runCycle * 0.65) * 3.8;
        base.cloakLift = 2.5;
        base.needleAngle = -0.6;
        break;
      case 'running':
        base.tiltAngle = 0.14;
        base.offsetY = -Math.abs(Math.sin(runCycle)) * 2.8;
        base.legStride = Math.sin(runCycle) * 6.2;
        base.cloakLift = 9;
        base.needleAngle = -0.35;
        break;
      case 'jumping':
        base.tiltAngle = -0.06;
        base.cloakLift = 5;
        base.legStride = 2.5;
        base.needleAngle = -0.95;
        break;
      case 'doubleJump':
        base.wingSpread = Math.sin(progress * Math.PI);
        base.spinAngle = progress * Math.PI * 2;
        base.auraAlpha = 0.65 * (1 - progress);
        base.cloakLift = 8;
        break;
      case 'falling':
        base.tiltAngle = 0.08;
        base.cloakLift = 11;
        base.legStride = -1.5;
        base.needleAngle = -1.1;
        break;
      case 'landing':
        base.offsetY = Math.sin(progress * Math.PI) * 3.5;
        base.cloakLift = 4 * (1 - progress);
        break;
      case 'dash':
        base.tiltAngle = 0.34;
        base.cloakLift = 14;
        base.auraAlpha = 0.55;
        base.needleAngle = 0.05;
        break;
      case 'wallSlide':
        base.tiltAngle = -0.1;
        base.cloakLift = 3;
        base.needleAngle = -1.25;
        break;
      case 'wallJump':
        base.tiltAngle = 0.18;
        base.cloakLift = 9;
        base.auraAlpha = 0.35 * (1 - progress);
        break;
      case 'attack':
        base.tiltAngle = 0.16 * Math.sin(progress * Math.PI);
        base.needleAngle = -1.4 + progress * 2.4;
        base.cloakLift = 6;
        break;
      case 'specialAttack':
        base.spinAngle = progress * Math.PI * 2;
        base.auraAlpha = 0.85 * Math.sin(progress * Math.PI);
        base.wingSpread = 0.65 * Math.sin(progress * Math.PI);
        base.needleAngle = 0.1;
        break;
      case 'hurt':
        base.tiltAngle = -0.26 * (1 - progress);
        base.offsetY = -Math.sin(progress * Math.PI) * 3;
        base.auraAlpha = 0.5 * (1 - progress);
        break;
      case 'death':
        base.tiltAngle = -0.35 * progress;
        base.offsetY = -progress * 10;
        base.dissolveAlpha = Math.max(0, 1 - progress);
        base.auraAlpha = Math.sin(progress * Math.PI);
        break;
      case 'healing':
        base.offsetY = Math.sin(time * 8) * 1.4;
        base.auraAlpha = 0.75;
        base.cloakLift = 4;
        break;
    }

    return base;
  }
}
