import { Camera } from './camera';
import type { RoomCell } from './types';

export interface RoomSyncResult {
  room: RoomCell;
  changedRoom: boolean;
  newlyVisited: boolean;
  discoveredChanged: boolean;
}

export class RoomManager {
  public currentRoomId = '';
  public prevRoomId = '';
  public roomX = 0;
  public roomY = 0;
  public transitionTimer = 0;
  public readonly transitionDuration = 0.42;
  public readonly camera = new Camera();

  public reset(rooms: RoomCell[], px: number, py: number, pw: number, ph: number): RoomCell | undefined {
    const room = this.findRoom(rooms, px + pw * 0.5, py + ph * 0.5) ?? rooms[0];
    if (!room) return undefined;
    this.currentRoomId = room.id;
    this.prevRoomId = room.id;
    this.roomX = room.gridX;
    this.roomY = room.gridY;
    this.transitionTimer = 0;
    return room;
  }

  public findRoom(rooms: RoomCell[], cx: number, cy: number): RoomCell | undefined {
    // Prefer exact containment inside a room rectangle
    for (const r of rooms) {
      if (cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h) {
        return r;
      }
    }
    // Fallback to nearest room center so diagonal/corner boundary crossings never drop out
    let best: RoomCell | undefined = rooms[0];
    let bestDist = Infinity;
    for (const r of rooms) {
      const clampedX = Math.max(r.x, Math.min(cx, r.x + r.w));
      const clampedY = Math.max(r.y, Math.min(cy, r.y + r.h));
      const d = (cx - clampedX) * (cx - clampedX) + (cy - clampedY) * (cy - clampedY);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    return best;
  }

  public syncPlayerRoom(
    rooms: RoomCell[],
    px: number,
    py: number,
    pw: number,
    ph: number,
    dt = 0
  ): RoomSyncResult | null {
    if (this.transitionTimer > 0 && dt > 0) {
      this.transitionTimer = Math.max(0, this.transitionTimer - dt);
    }

    const pcx = px + pw * 0.5;
    const pcy = py + ph * 0.5;
    const room = this.findRoom(rooms, pcx, pcy);
    if (!room) return null;

    let changedRoom = false;
    let newlyVisited = false;
    let discoveredChanged = false;

    if (this.currentRoomId !== room.id) {
      this.prevRoomId = this.currentRoomId || room.id;
      this.currentRoomId = room.id;
      this.roomX = room.gridX;
      this.roomY = room.gridY;
      this.transitionTimer = this.transitionDuration;
      changedRoom = true;
    }

    if (!room.visited) {
      room.visited = true;
      room.discovered = true;
      newlyVisited = true;
      discoveredChanged = true;
    } else if (!room.discovered) {
      room.discovered = true;
      discoveredChanged = true;
    }

    // Mark adjacent non-secret rooms as adjacent-discovered (dotted/mapped outline)
    for (const adjId of room.adjacentRoomIds) {
      const adj = rooms.find((r) => r.id === adjId);
      if (adj && !adj.isSecret && !adj.discovered) {
        adj.discovered = true;
        discoveredChanged = true;
      }
    }

    return {
      room,
      changedRoom,
      newlyVisited,
      discoveredChanged,
    };
  }

  public computeImmediateCamera(
    rooms: RoomCell[],
    px: number,
    py: number,
    pw: number,
    ph: number,
    viewW: number,
    viewH: number,
    worldW: number,
    worldH: number,
    facing: 1 | -1 = 1
  ): { x: number; y: number } {
    const room =
      rooms.find((r) => r.id === this.currentRoomId) ??
      this.findRoom(rooms, px + pw * 0.5, py + ph * 0.5);
    return this.camera.reset(
      px + pw * 0.5,
      py + ph * 0.5,
      facing,
      viewW,
      viewH,
      worldW,
      worldH,
      room
    );
  }

  public stepCamera(
    camX: number,
    camY: number,
    rooms: RoomCell[],
    px: number,
    py: number,
    pw: number,
    ph: number,
    pvy: number,
    facing: 1 | -1,
    viewW: number,
    viewH: number,
    worldW: number,
    worldH: number,
    dt: number,
    pvx = 0
  ): { x: number; y: number } {
    const room =
      rooms.find((r) => r.id === this.currentRoomId) ??
      this.findRoom(rooms, px + pw * 0.5, py + ph * 0.5);

    this.camera.x = camX;
    this.camera.y = camY;

    return this.camera.update({
      playerX: px,
      playerY: py,
      playerW: pw,
      playerH: ph,
      playerVx: pvx,
      playerVy: pvy,
      facing,
      viewW,
      viewH,
      worldW,
      worldH,
      room,
      isTransitioning: this.transitionTimer > 0,
      dt,
    });
  }
}
