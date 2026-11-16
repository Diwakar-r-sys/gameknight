import { Backpack, CheckCircle2, Compass, Lock, Sparkles, Sword, Wind, X } from 'lucide-react';
import { PROGRESSION_TABLE, type AbilityId } from '../game/progression';
import type { InventoryItem } from '../game/types';

interface InventoryModalProps {
  open: boolean;
  items: InventoryItem[];
  hp: number;
  maxHp: number;
  soul: number;
  maxSoul: number;
  essence: number;
  level: number;
  levelTitle: string;
  xp: number;
  unlockedAbilities: Record<AbilityId, boolean>;
  secretWallsBroken: number;
  totalSecretWalls: number;
  onClose: () => void;
}

function renderItemIcon(icon: InventoryItem['icon'], collected: boolean) {
  const cls = collected ? 'h-5 w-5 text-[#74c69d]' : 'h-5 w-5 text-[#46685f]';
  switch (icon) {
    case 'needle':
      return <Sword className={cls} />;
    case 'dash':
      return <Wind className={cls} />;
    case 'focus':
      return <Sparkles className={cls} />;
    case 'crest':
    case 'seal':
    case 'relic':
    default:
      return <Compass className={cls} />;
  }
}

export function InventoryModal({
  open,
  items,
  hp,
  maxHp,
  soul,
  maxSoul,
  essence,
  level,
  levelTitle,
  xp,
  unlockedAbilities,
  secretWallsBroken,
  totalSecretWalls,
  onClose,
}: InventoryModalProps) {
  if (!open) return null;

  return (
    <div
      className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-[#03090a]/88"
      role="dialog"
      aria-modal="true"
      aria-label="Vessel Inventory"
    >
      <div className="modal-scroll w-full max-w-2xl rounded-xl border border-[#284b44] bg-[#081517] p-6 text-[#e6f0ec] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#193330] pb-4">
          <div className="flex items-center gap-2.5">
            <Backpack className="h-5 w-5 text-[#74c69d]" />
            <div>
              <h2 className="font-display text-xl font-semibold tracking-wider text-[#eef7f3]">
                Vessel Inventory
              </h2>
              <p className="mt-0.5 text-xs text-[#88aba0]">
                Arts, cavern relics, and ancient seals bound to this Vessel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#25443e] bg-[#0d2022] text-[#a7c7bc] transition-colors hover:bg-[#153133] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4]"
            aria-label="Close inventory"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-lg border border-[#1a3531] bg-[#061012] px-3 py-2.5">
            <div className="text-[11px] text-[#7fa398]">Masks</div>
            <div className="font-mono-code mt-0.5 text-sm font-semibold tabular-nums text-[#ecfdf5]">
              {hp} / {maxHp}
            </div>
          </div>
          <div className="rounded-lg border border-[#1a3531] bg-[#061012] px-3 py-2.5">
            <div className="text-[11px] text-[#7fa398]">Soul Vessel</div>
            <div className="font-mono-code mt-0.5 text-sm font-semibold tabular-nums text-[#6ee7b7]">
              {soul} / {maxSoul}
            </div>
          </div>
          <div className="rounded-lg border border-[#1a3531] bg-[#061012] px-3 py-2.5">
            <div className="text-[11px] text-[#7fa398]">Essence</div>
            <div className="font-mono-code mt-0.5 text-sm font-semibold tabular-nums text-[#ecfdf5]">
              {essence}
            </div>
          </div>
          <div className="rounded-lg border border-[#1a3531] bg-[#061012] px-3 py-2.5">
            <div className="text-[11px] text-[#7fa398]">Secret Walls</div>
            <div className="font-mono-code mt-0.5 text-sm font-semibold tabular-nums text-[#74c69d]">
              {secretWallsBroken} / {totalSecretWalls}
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                item.collected
                  ? 'border-[#254942] bg-[#09191b]'
                  : 'border-[#162b28] bg-[#050e10] opacity-75'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                  item.collected
                    ? 'border-[#2c594f] bg-[#0f292b]'
                    : 'border-[#1c3531] bg-[#071315]'
                }`}
              >
                {renderItemIcon(item.icon, item.collected)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      item.collected ? 'text-[#eef7f3]' : 'text-[#7c9c92]'
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.collected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#74c69d]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6c8a81]">
                      <Lock className="h-3 w-3" />
                      <span>Unfound</span>
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#6e9488]">
                  {item.category}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#98bab0]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 10-Level Ability Progression Tree */}
        <div className="mt-5 border-t border-[#193330] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#95d5b2]">
              Knight Progression · Level {level}: {levelTitle}
            </span>
            <span className="font-mono-code text-xs text-[#fde047] tabular-nums">{xp} XP</span>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROGRESSION_TABLE.map((tier) => {
              const unlocked = unlockedAbilities[tier.abilityId];
              return (
                <div
                  key={tier.level}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                    unlocked
                      ? 'border-[#2b584e] bg-[#0a1d1f] text-[#eef7f3]'
                      : 'border-[#162b28] bg-[#050e10] text-[#6d8d83] opacity-75'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      Lvl {tier.level} {tier.title}
                    </div>
                    <div className="truncate text-[11px] text-[#8eb0a5]">{tier.abilityLabel}</div>
                  </div>
                  <div className="font-mono-code shrink-0 text-[10px] tabular-nums">
                    {unlocked ? (
                      <span className="text-[#74c69d]">UNLOCKED</span>
                    ) : (
                      <span>{tier.xpRequired} XP</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#193330] pt-4 text-xs text-[#7ea196]">
          <span>Press I or Esc to close</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#52b788] px-5 text-sm font-semibold text-[#04100d] hover:bg-[#74c69d]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
