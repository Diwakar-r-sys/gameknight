import { useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { Compass, Crosshair, Minus, Plus, X } from 'lucide-react';
import type { PortalDirection, RoomCell, SceneTheme } from '../game/types';

interface WorldMapModalProps {
  open: boolean;
  sceneTheme: SceneTheme;
  rooms: RoomCell[];
  currentRoomId: string;
  worldWidth: number;
  worldHeight: number;
  playerNormX: number;
  playerNormY: number;
  secretWallsBroken: number;
  totalSecretWalls: number;
  onClose: () => void;
}

const MAP_TITLES: Record<SceneTheme, string> = {
  crystal: 'Crystal Ice Cavern · Vertical Drop Shaft',
  swamp: 'Mystic Swamp Forest · Winding Marshway',
  grotto: 'Lush Green Moss Grotto · Cavern Maze',
};

function getPortalExitVector(
  x: number,
  y: number,
  w: number,
  h: number,
  dir: PortalDirection
): { x1: number; y1: number; x2: number; y2: number; tx: number; ty: number; anchor: 'start' | 'end' | 'middle' } {
  if (dir === 'W') {
    return { x1: x, y1: y + h * 0.5, x2: x - 24, y2: y + h * 0.5, tx: x - 30, ty: y + h * 0.5, anchor: 'end' };
  }
  if (dir === 'E') {
    return { x1: x + w, y1: y + h * 0.5, x2: x + w + 24, y2: y + h * 0.5, tx: x + w + 30, ty: y + h * 0.5, anchor: 'start' };
  }
  if (dir === 'N') {
    return { x1: x + w * 0.5, y1: y, x2: x + w * 0.5, y2: y - 22, tx: x + w * 0.5, ty: y - 30, anchor: 'middle' };
  }
  if (dir === 'S') {
    return { x1: x + w * 0.5, y1: y + h, x2: x + w * 0.5, y2: y + h + 22, tx: x + w * 0.5, ty: y + h + 32, anchor: 'middle' };
  }
  if (dir === 'NE') {
    return { x1: x + w, y1: y + 8, x2: x + w + 22, y2: y - 14, tx: x + w + 28, ty: y - 16, anchor: 'start' };
  }
  if (dir === 'NW') {
    return { x1: x, y1: y + 8, x2: x - 22, y2: y - 14, tx: x - 28, ty: y - 16, anchor: 'end' };
  }
  if (dir === 'SE') {
    return { x1: x + w, y1: y + h - 8, x2: x + w + 22, y2: y + h + 14, tx: x + w + 28, ty: y + h + 18, anchor: 'start' };
  }
  return { x1: x, y1: y + h - 8, x2: x - 22, y2: y + h + 14, tx: x - 28, ty: y + h + 18, anchor: 'end' };
}

export function WorldMapModal({
  open,
  sceneTheme,
  rooms,
  currentRoomId,
  worldWidth,
  worldHeight,
  playerNormX,
  playerNormY,
  secretWallsBroken,
  totalSecretWalls,
  onClose,
}: WorldMapModalProps) {
  const [zoom, setZoom] = useState(1.05);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  if (!open) return null;

  const isVisibleRoom = (room: RoomCell) => !room.isSecret || room.discovered || room.visited;

  const visitedCount = rooms.filter((r) => r.visited).length;
  const inspectedRoom =
    rooms.find((r) => r.id === (selectedRoomId ?? currentRoomId) && isVisibleRoom(r)) ??
    rooms.find((r) => r.id === currentRoomId);

  const mapW = 640;
  const mapH = 380;
  const pad = 42;
  const safeW = Math.max(1, worldWidth || 3400);
  const safeH = Math.max(1, worldHeight || 2150);
  const scale = Math.min((mapW - pad * 2) / safeW, (mapH - pad * 2) / safeH);
  const offsetX = (mapW - safeW * scale) * 0.5;
  const offsetY = (mapH - safeH * scale) * 0.5;

  const toRect = (room: RoomCell) => ({
    x: offsetX + room.x * scale,
    y: offsetY + room.y * scale,
    w: Math.max(36, room.w * scale - 4),
    h: Math.max(28, room.h * scale - 4),
  });

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.14 : -0.14;
    setZoom((z) => Math.max(0.65, Math.min(2.3, Number((z + delta).toFixed(2)))));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setPan({
      x: Math.max(-360, Math.min(360, e.clientX - dragStart.x)),
      y: Math.max(-240, Math.min(240, e.clientY - dragStart.y)),
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const handleResetView = () => {
    setZoom(1.05);
    setPan({ x: 0, y: 0 });
  };

  const renderedLinks = new Set<string>();

  return (
    <div
      className="safe-modal fixed inset-0 z-40 flex items-center justify-center bg-[#020809]/92 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Cavern World Map"
    >
      <div className="flex h-[calc(100dvh-2rem-var(--safe-top)-var(--safe-bottom))] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#294c44] bg-[#071315] text-[#e6f0ec] shadow-2xl md:h-[88dvh]">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#193330] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[#74c69d]" />
            <div>
              <h2 className="font-display text-lg font-semibold tracking-wider text-[#eef7f3]">
                {MAP_TITLES[sceneTheme]}
              </h2>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-[#89aba0]">
                <span className="font-mono-code tabular-nums">
                  {visitedCount} / {rooms.length} Chambers Explored
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-code tabular-nums">
                  {secretWallsBroken} / {totalSecretWalls} Secret Walls Opened
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.2).toFixed(2))))}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#25443e] bg-[#0c1e20] text-[#cbe5dc] hover:bg-[#143134]"
              aria-label="Zoom out map"
              title="Zoom Out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-mono-code w-12 text-center text-xs tabular-nums text-[#a7cabf]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.3, Number((z + 0.2).toFixed(2))))}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#25443e] bg-[#0c1e20] text-[#cbe5dc] hover:bg-[#143134]"
              aria-label="Zoom in map"
              title="Zoom In"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#25443e] bg-[#0c1e20] px-3 text-xs text-[#cbe5dc] hover:bg-[#143134]"
              title="Center Map"
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Center</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#2b524a] bg-[#10282a] text-[#e2f5ec] hover:bg-[#183b3e]"
              aria-label="Close map"
              title="Close (M / Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interactive Pan & Zoom Canvas */}
        <div
          className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#040c0e] ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Subtle coordinate grid backdrop */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(116, 198, 157, 0.35) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />

          <div
            className="transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <svg
              width={mapW + 80}
              height={mapH + 60}
              viewBox={`-40 -30 ${mapW + 80} ${mapH + 60}`}
              className="overflow-visible"
            >
              {/* Interconnected Passage Lines */}
              {rooms.map((room) => {
                if (!isVisibleRoom(room)) return null;
                const a = toRect(room);
                const ax = a.x + a.w * 0.5;
                const ay = a.y + a.h * 0.5;
                return room.adjacentRoomIds.map((adjId) => {
                  const pairKey = room.id < adjId ? `${room.id}:${adjId}` : `${adjId}:${room.id}`;
                  if (renderedLinks.has(pairKey)) return null;
                  const adj = rooms.find((r) => r.id === adjId);
                  if (!adj || !isVisibleRoom(adj)) return null;
                  renderedLinks.add(pairKey);
                  const b = toRect(adj);
                  const exploredLink = room.visited || adj.visited;
                  return (
                    <line
                      key={pairKey}
                      x1={ax}
                      y1={ay}
                      x2={b.x + b.w * 0.5}
                      y2={b.y + b.h * 0.5}
                      stroke={exploredLink ? '#40916c' : '#203d38'}
                      strokeWidth={exploredLink ? 7 : 4}
                      strokeDasharray={exploredLink ? undefined : '5 4'}
                      strokeLinecap="round"
                    />
                  );
                });
              })}

              {/* Proportional Chamber Polygons */}
              {rooms.map((room) => {
                if (!isVisibleRoom(room)) return null;
                const { x, y, w, h } = toRect(room);
                const isCurrent = room.id === currentRoomId;
                const isSelected = room.id === inspectedRoom?.id;

                const fill = room.visited
                  ? isCurrent
                    ? '#1b473d'
                    : room.isSecret
                      ? '#133a42'
                      : '#112c29'
                  : room.discovered
                    ? '#091819'
                    : '#050e10';

                const stroke = isCurrent
                  ? '#a7f3d0'
                  : isSelected
                    ? '#74c69d'
                    : room.isBossRoom && (room.visited || room.discovered)
                      ? '#f59e0b'
                      : room.visited
                        ? '#40916c'
                        : room.discovered
                          ? '#2f5b52'
                          : '#1c3833';

                const shortName =
                  w < 105 && room.name.length > 16 ? `${room.name.slice(0, 14)}…` : room.name;

                return (
                  <g
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={5}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isCurrent ? 2.4 : 1.5}
                      strokeDasharray={room.visited ? undefined : '5 4'}
                    />

                    {/* Cross-Biome Gateway Arrows + Labels (Deepnest style) */}
                    {room.portalLinks?.map((link) => {
                      const vec = getPortalExitVector(x, y, w, h, link.dir);
                      const ang = Math.atan2(vec.y2 - vec.y1, vec.x2 - vec.x1);
                      const w1x = vec.x2 - Math.cos(ang - 0.55) * 7;
                      const w1y = vec.y2 - Math.sin(ang - 0.55) * 7;
                      const w2x = vec.x2 - Math.cos(ang + 0.55) * 7;
                      const w2y = vec.y2 - Math.sin(ang + 0.55) * 7;
                      const color =
                        link.targetTheme === 'crystal'
                          ? '#67e8f9'
                          : link.targetTheme === 'swamp'
                            ? '#c084fc'
                            : '#6ee7b7';
                      return (
                        <g key={`${room.id}-${link.targetTheme}`}>
                          <line
                            x1={vec.x1}
                            y1={vec.y1}
                            x2={vec.x2}
                            y2={vec.y2}
                            stroke={color}
                            strokeWidth={2}
                          />
                          <polygon
                            points={`${vec.x2},${vec.y2} ${w1x},${w1y} ${w2x},${w2y}`}
                            fill={color}
                          />
                          <text
                            x={vec.tx}
                            y={vec.ty}
                            textAnchor={vec.anchor}
                            dominantBaseline="middle"
                            fill={color}
                            fontSize="10.5"
                            fontWeight="600"
                          >
                            {link.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Room Title */}
                    <text
                      x={x + 8}
                      y={y + 18}
                      fill={room.visited ? '#e6f5ee' : room.discovered ? '#7fa59a' : '#4a6b62'}
                      fontSize={w < 105 ? '9.5' : '11'}
                      fontWeight="600"
                    >
                      {room.visited || room.discovered ? shortName : '???'}
                    </text>

                    {/* Room Sub-tags */}
                    {h >= 46 && room.hasBench && room.visited && (
                      <text x={x + 8} y={y + h - 8} fill="#95d5b2" fontSize="9.5">
                        Bench
                      </text>
                    )}
                    {h >= 46 && room.isSecret && (
                      <text x={x + 8} y={y + h - 8} fill="#67e8f9" fontSize="9.5">
                        Secret
                      </text>
                    )}
                    {h >= 46 && room.isBossRoom && (room.visited || room.discovered) && (
                      <text x={x + 8} y={y + h - 8} fill="#fbbf24" fontSize="9.5">
                        Warden Arena
                      </text>
                    )}

                    {/* Player Position Marker */}
                    {isCurrent && (
                      <g
                        transform={`translate(${x + 12 + playerNormX * Math.max(8, w - 24)}, ${
                          y + 22 + playerNormY * Math.max(8, h - 32)
                        })`}
                      >
                        <circle r={9} fill="rgba(167, 243, 208, 0.25)" />
                        <circle r={5} fill="#ecfdf5" stroke="#04100d" strokeWidth={1.5} />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom-Left Room Inspector */}
          {inspectedRoom && (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-[#23433d] bg-[#071517]/95 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#e6f5ee]">
                <span>
                  {inspectedRoom.visited || inspectedRoom.discovered
                    ? inspectedRoom.name
                    : 'Unexplored Chamber'}
                </span>
                <span className="font-mono-code text-[10px] font-normal text-[#74998e] tabular-nums">
                  [{inspectedRoom.gridX}, {inspectedRoom.gridY}]
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-[#88aba0]">
                {inspectedRoom.id === currentRoomId
                  ? 'Current Location'
                  : inspectedRoom.visited
                    ? 'Explored Chamber'
                    : inspectedRoom.discovered
                      ? 'Adjacent Mapped Area'
                      : 'Unexplored Connected Path'}
                {inspectedRoom.isSecret ? ' · Hidden Behind Moss Wall' : ''}
                {inspectedRoom.hasBench && inspectedRoom.visited ? ' · Stone Bench' : ''}
                {inspectedRoom.portalLinks?.length
                  ? ` · Gateway to ${inspectedRoom.portalLinks.map((l) => l.label).join(', ')}`
                  : ''}
              </div>
            </div>
          )}
        </div>

        {/* Footer Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#193330] bg-[#061012] px-6 py-3 text-xs text-[#91b3a8]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#40916c] bg-[#112c29]" />
              <span>Visited</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-[#2f5b52] bg-[#091819]" />
              <span>Unexplored</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#40916c] bg-[#133a42]" />
              <span>Secret Chamber</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ecfdf5]" />
              <span>Vessel</span>
            </span>
          </div>
          <span className="text-[11px] text-[#729489]">Drag to pan · Scroll to zoom · M or Esc to close</span>
        </div>
      </div>
    </div>
  );
}
