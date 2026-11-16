import type { RoomCell } from './types';

export interface CameraUpdateInput {
  playerX: number;
  playerY: number;
  playerW: number;
  playerH: number;
  playerVx: number;
  playerVy: number;
  facing: 1 | -1;
  viewW: number;
  viewH: number;
  worldW: number;
  worldH: number;
  room?: RoomCell;
  isTransitioning?: boolean;
  dt: number;
}

/**
 * Dynamic 2D Metroidvania Camera with:
 * 1. Smooth frame-rate normalized Lerp following (smoothingFactor ~ 0.08 - 0.10)
 * 2. Centered viewport framing with deadzone & directional look-ahead offset
 * 3. Connected room & world boundary clamping so outside level void is never visible
 */
export class Camera {
  public x = 0;
  public y = 0;
  public targetX = 0;
  public targetY = 0;

  public smoothingFactor = 0.09;
  public transitionSmoothing = 0.115;

  public deadzoneW = 48;
  public deadzoneH = 36;
  public lookAheadDistance = 88;

  private focusX = 0;
  private focusY = 0;
  private lookAheadX = 0;
  private lookAheadY = 0;
  private initialized = false;

  public reset(
    playerCenterX: number,
    playerCenterY: number,
    facing: 1 | -1,
    viewW: number,
    viewH: number,
    worldW: number,
    worldH: number,
    room?: RoomCell
  ): { x: number; y: number } {
    this.focusX = playerCenterX;
    this.focusY = playerCenterY;
    this.lookAheadX = facing * (this.lookAheadDistance * 0.5);
    this.lookAheadY = 0;

    const clamped = this.computeClampedTarget(
      this.focusX + this.lookAheadX - viewW * 0.5,
      this.focusY + this.lookAheadY - viewH * 0.52,
      viewW,
      viewH,
      worldW,
      worldH,
      room
    );

    this.x = clamped.x;
    this.y = clamped.y;
    this.targetX = clamped.x;
    this.targetY = clamped.y;
    this.initialized = true;
    return clamped;
  }

  public update(input: CameraUpdateInput): { x: number; y: number } {
    const pcx = input.playerX + input.playerW * 0.5;
    const pcy = input.playerY + input.playerH * 0.5;

    if (!this.initialized) {
      return this.reset(
        pcx,
        pcy,
        input.facing,
        input.viewW,
        input.viewH,
        input.worldW,
        input.worldH,
        input.room
      );
    }

    const dt = Math.max(0.001, Math.min(0.05, input.dt));

    // 1. Deadzone tracking around the player center
    const halfDzW = this.deadzoneW * 0.5;
    const halfDzH = this.deadzoneH * 0.5;
    const dx = pcx - this.focusX;
    const dy = pcy - this.focusY;

    if (Math.abs(dx) > halfDzW) {
      this.focusX = pcx - Math.sign(dx) * halfDzW;
    }
    if (Math.abs(dy) > halfDzH) {
      this.focusY = pcy - Math.sign(dy) * halfDzH;
    }

    // 2. Smooth directional Look-Ahead offset (horizontal facing + subtle vertical velocity lead)
    const lookLerp = 1 - Math.pow(1 - 0.08, dt * 60);
    const desiredLookX =
      input.facing * this.lookAheadDistance +
      Math.max(-32, Math.min(32, input.playerVx * 0.06));
    const desiredLookY = Math.max(-56, Math.min(72, input.playerVy * 0.075));

    this.lookAheadX += (desiredLookX - this.lookAheadX) * lookLerp;
    this.lookAheadY += (desiredLookY - this.lookAheadY) * lookLerp;

    // 3. Centered framing target clamped to room & map boundaries
    const rawTargetX = this.focusX + this.lookAheadX - input.viewW * 0.5;
    const rawTargetY = this.focusY + this.lookAheadY - input.viewH * 0.52;

    const clamped = this.computeClampedTarget(
      rawTargetX,
      rawTargetY,
      input.viewW,
      input.viewH,
      input.worldW,
      input.worldH,
      input.room
    );

    this.targetX = clamped.x;
    this.targetY = clamped.y;

    // 4. Smooth Lerp Following: camera.x += (targetX - camera.x) * smoothingFactor
    const baseSmooth = input.isTransitioning ? this.transitionSmoothing : this.smoothingFactor;
    const alpha = 1 - Math.pow(1 - baseSmooth, dt * 60);

    this.x += (this.targetX - this.x) * alpha;
    this.y += (this.targetY - this.y) * alpha;

    // Snap sub-pixel tail when nearly settled
    if (Math.abs(this.targetX - this.x) < 0.05) this.x = this.targetX;
    if (Math.abs(this.targetY - this.y) < 0.05) this.y = this.targetY;

    return { x: this.x, y: this.y };
  }

  private computeClampedTarget(
    rawX: number,
    rawY: number,
    viewW: number,
    viewH: number,
    worldW: number,
    worldH: number,
    room?: RoomCell
  ): { x: number; y: number } {
    const worldMaxX = Math.max(0, worldW - viewW);
    const worldMaxY = Math.max(0, worldH - viewH);

    if (!room) {
      return {
        x: Math.max(0, Math.min(worldMaxX, rawX)),
        y: Math.max(0, Math.min(worldMaxY, rawY)),
      };
    }

    // Horizontal clamping: open doorways allow smooth scrolling into connected chambers;
    // closed room edges clamp cleanly so the player never sees past solid room boundaries.
    let minX = 0;
    let maxX = worldMaxX;

    const hasW = room.connections.includes('W');
    const hasE = room.connections.includes('E');

    if (!hasW) {
      minX = room.x <= 40 ? 0 : Math.max(0, room.x - 16);
    }
    if (!hasE) {
      const rightLimit = room.x + room.w;
      maxX =
        rightLimit >= worldW - 40
          ? worldMaxX
          : Math.max(0, Math.min(worldMaxX, rightLimit + 16 - viewW));
    }

    let clampedX: number;
    if (minX > maxX) {
      // Enclosed small chamber narrower than viewport: frame gracefully within world bounds
      clampedX = Math.max(0, Math.min(worldMaxX, room.x + (room.w - viewW) * 0.5));
    } else {
      clampedX = Math.max(minX, Math.min(maxX, rawX));
    }

    // Vertical clamping: open N/S shafts track seamlessly vertically; closed ceilings/floors clamp cleanly
    let minY = 0;
    let maxY = worldMaxY;

    const hasN = room.connections.includes('N');
    const hasS = room.connections.includes('S');

    if (!hasN) {
      minY = room.y <= 140 ? 0 : Math.max(0, room.y - 24);
    }
    if (!hasS) {
      const bottomLimit = room.y + room.h;
      maxY =
        bottomLimit >= worldH - 40
          ? worldMaxY
          : Math.max(0, Math.min(worldMaxY, bottomLimit + 24 - viewH));
    }

    let clampedY: number;
    if (minY > maxY) {
      clampedY = Math.max(0, Math.min(worldMaxY, room.y + (room.h - viewH) * 0.5));
    } else {
      clampedY = Math.max(minY, Math.min(maxY, rawY));
    }

    return {
      x: Math.max(0, Math.min(worldMaxX, clampedX)),
      y: Math.max(0, Math.min(worldMaxY, clampedY)),
    };
  }
}
