import type { PortalDirection, RoomCell, SceneTheme } from '../game/types';

interface MiniMapHudProps {
  sceneTheme: SceneTheme;
  rooms: RoomCell[];
  currentRoomId: string;
  roomX: number;
  roomY: number;
  worldWidth: number;
  worldHeight: number;
  playerNormX: number;
  playerNormY: number;
  onOpenFullMap: () => void;
}

const REGION_SHORT: Record<SceneTheme, string> = {
  crystal: 'Ice Cavern',
  swamp: 'Swamp Forest',
  grotto: 'Green Grotto',
};

function getPortalArrowOrigin(
  x: number,
  y: number,
  w: number,
  h: number,
  dir: PortalDirection
): { x1: number; y1: number; x2: number; y2: number } {
  if (dir === 'W') return { x1: x, y1: y + h * 0.5, x2: x - 8, y2: y + h * 0.5 };
  if (dir === 'E') return { x1: x + w, y1: y + h * 0.5, x2: x + w + 8, y2: y + h * 0.5 };
  if (dir === 'N') return { x1: x + w * 0.5, y1: y, x2: x + w * 0.5, y2: y - 8 };
  if (dir === 'S') return { x1: x + w * 0.5, y1: y + h, x2: x + w * 0.5, y2: y + h + 8 };
  if (dir === 'NE') return { x1: x + w, y1: y + 3, x2: x + w + 7, y2: y - 4 };
  if (dir === 'NW') return { x1: x, y1: y + 3, x2: x - 7, y2: y - 4 };
  if (dir === 'SE') return { x1: x + w, y1: y + h - 3, x2: x + w + 7, y2: y + h + 4 };
  return { x1: x, y1: y + h - 3, x2: x - 7, y2: y + h + 4 };
}

export function MiniMapHud({
  sceneTheme,
  rooms,
  currentRoomId,
  roomX,
  roomY,
  worldWidth,
  worldHeight,
  playerNormX,
  playerNormY,
  onOpenFullMap,
}: MiniMapHudProps) {
  const svgW = 152;
  const svgH = 88;
  const pad = 11;
  const safeW = Math.max(1, worldWidth || 3400);
  const safeH = Math.max(1, worldHeight || 2150);
  const scale = Math.min((svgW - pad * 2) / safeW, (svgH - pad * 2) / safeH);
  const offsetX = (svgW - safeW * scale) * 0.5;
  const offsetY = (svgH - safeH * scale) * 0.5;

  const toRect = (room: RoomCell) => ({
    x: offsetX + room.x * scale,
    y: offsetY + room.y * scale,
    w: Math.max(11, room.w * scale - 1.5),
    h: Math.max(9, room.h * scale - 1.5),
  });

  const isVisibleRoom = (room: RoomCell) => !room.isSecret || room.discovered || room.visited;
  const renderedConnectors = new Set<string>();

  return (
    <button
      type="button"
      onClick={onOpenFullMap}
      className="pointer-events-auto group flex flex-col items-end rounded-lg border border-[#24443f] bg-[#061113]/92 p-2 text-left transition-colors hover:border-[#4c8f7d]"
      title="Open Full Cavern Map (M)"
      aria-label="Open Full Cavern Map"
    >
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="block overflow-visible"
      >
        {/* Interconnected Passage Bridges */}
        {rooms.map((room) => {
          if (!isVisibleRoom(room)) return null;
          const a = toRect(room);
          const ax = a.x + a.w * 0.5;
          const ay = a.y + a.h * 0.5;
          return room.adjacentRoomIds.map((adjId) => {
            const pairKey = room.id < adjId ? `${room.id}:${adjId}` : `${adjId}:${room.id}`;
            if (renderedConnectors.has(pairKey)) return null;
            const adj = rooms.find((r) => r.id === adjId);
            if (!adj || !isVisibleRoom(adj)) return null;
            renderedConnectors.add(pairKey);
            const b = toRect(adj);
            const bothExplored = room.visited || adj.visited;
            return (
              <line
                key={pairKey}
                x1={ax}
                y1={ay}
                x2={b.x + b.w * 0.5}
                y2={b.y + b.h * 0.5}
                stroke={bothExplored ? '#387d63' : '#1b3833'}
                strokeWidth={bothExplored ? 2.4 : 1.5}
                strokeDasharray={bothExplored ? undefined : '2 2'}
              />
            );
          });
        })}

        {/* Proportional Room Polygons (Visited = Solid, Unexplored = Dotted Outline) */}
        {rooms.map((room) => {
          if (!isVisibleRoom(room)) return null;
          const { x, y, w, h } = toRect(room);
          const isCurrent = room.id === currentRoomId;

          const fill = room.visited
            ? isCurrent
              ? '#1e5447'
              : room.isSecret
                ? '#183d46'
                : '#112e2a'
            : room.discovered
              ? '#091b1d'
              : '#050e10';

          const stroke = isCurrent
            ? '#a7f3d0'
            : room.isBossRoom && (room.discovered || room.visited)
              ? '#f59e0b'
              : room.visited
                ? '#40916c'
                : room.discovered
                  ? '#34665a'
                  : '#1f423b';

          return (
            <g key={room.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={1.5}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurrent ? 1.6 : 1}
                strokeDasharray={room.visited ? undefined : '2.2 2.2'}
              />

              {/* Cross-Biome Gateway Arrow */}
              {room.portalLinks?.map((link) => {
                const arrow = getPortalArrowOrigin(x, y, w, h, link.dir);
                const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
                const tipX = arrow.x2;
                const tipY = arrow.y2;
                const wing1X = tipX - Math.cos(angle - 0.55) * 4;
                const wing1Y = tipY - Math.sin(angle - 0.55) * 4;
                const wing2X = tipX - Math.cos(angle + 0.55) * 4;
                const wing2Y = tipY - Math.sin(angle + 0.55) * 4;
                const arrowColor =
                  link.targetTheme === 'crystal'
                    ? '#67e8f9'
                    : link.targetTheme === 'swamp'
                      ? '#c084fc'
                      : '#6ee7b7';
                return (
                  <g key={`${room.id}-${link.targetTheme}`}>
                    <line
                      x1={arrow.x1}
                      y1={arrow.y1}
                      x2={tipX}
                      y2={tipY}
                      stroke={arrowColor}
                      strokeWidth={1.3}
                    />
                    <polygon
                      points={`${tipX},${tipY} ${wing1X},${wing1Y} ${wing2X},${wing2Y}`}
                      fill={arrowColor}
                    />
                  </g>
                );
              })}

              {/* Bench dot */}
              {room.hasBench && room.visited && (
                <rect x={x + 2.5} y={y + h - 4.5} width={4} height={2.5} fill="#95d5b2" />
              )}

              {/* Boss icon */}
              {room.isBossRoom && (room.visited || room.discovered) && (
                <circle cx={x + w - 4} cy={y + 4} r={2} fill="#fbbf24" />
              )}

              {/* Player beacon */}
              {isCurrent && (
                <circle
                  cx={x + 2 + playerNormX * Math.max(1, w - 4)}
                  cy={y + 2 + playerNormY * Math.max(1, h - 4)}
                  r={3.2}
                  fill="#ecfdf5"
                  stroke="#04100d"
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex w-full items-center justify-between gap-2 text-[10px] text-[#83a69b] group-hover:text-[#cbe5dc]">
        <span className="truncate">{REGION_SHORT[sceneTheme]}</span>
        <span className="font-mono-code shrink-0 tabular-nums">
          [{roomX},{roomY}] · M
        </span>
      </div>
    </button>
  );
}
