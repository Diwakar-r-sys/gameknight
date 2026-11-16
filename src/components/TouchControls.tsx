import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { VirtualAction } from '../game/input';
import type { AbilityId } from '../game/progression';

interface TouchControlsProps {
  visible: boolean;
  canHeal: boolean;
  hasSpeakerNearby: boolean;
  unlockedAbilities: Record<AbilityId, boolean>;
  onAction: (action: VirtualAction, active: boolean) => void;
}

interface PadButtonProps {
  label: string;
  action: VirtualAction;
  className?: string;
  onAction: (action: VirtualAction, active: boolean) => void;
  children: React.ReactNode;
}

function PadButton({ label, action, className = '', onAction, children }: PadButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onAction(action, true);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onAction(action, false);
      }}
      onPointerCancel={() => onAction(action, false)}
      className={`flex min-h-[48px] min-w-[48px] select-none touch-none items-center justify-center rounded-xl border border-[#2d584e] bg-[#081618]/80 text-[#d8f3dc] active:scale-95 active:border-[#74c69d] active:bg-[#163a35] ${className}`}
    >
      {children}
    </button>
  );
}

export function TouchControls({
  visible,
  canHeal,
  hasSpeakerNearby,
  unlockedAbilities,
  onAction,
}: TouchControlsProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-[max(1rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))]"
      aria-label="Touch Controls"
    >
      {/* Left D-Pad */}
      <div className="pointer-events-auto grid grid-cols-3 gap-1.5">
        <div />
        <PadButton label="Look Up" action="up" onAction={onAction}>
          <ArrowUp className="h-5 w-5" />
        </PadButton>
        <div />
        <PadButton label="Move Left" action="left" onAction={onAction}>
          <ArrowLeft className="h-5 w-5" />
        </PadButton>
        <PadButton label="Look Down" action="down" onAction={onAction}>
          <ArrowDown className="h-5 w-5" />
        </PadButton>
        <PadButton label="Move Right" action="right" onAction={onAction}>
          <ArrowRight className="h-5 w-5" />
        </PadButton>
      </div>

      {/* Right Action Cluster */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {hasSpeakerNearby && (
            <PadButton
              label="Speak or Read"
              action="interact"
              onAction={onAction}
              className="border-[#52b788] bg-[#12342c]/90 px-3 text-xs font-semibold text-[#ecfdf5]"
            >
              USE
            </PadButton>
          )}
          <PadButton
            label="Focus Heal"
            action="heal"
            onAction={onAction}
            className={`px-3 text-xs font-semibold ${
              canHeal ? 'border-[#6ee7b7] text-[#a7f3d0]' : 'opacity-75'
            }`}
          >
            FOC
          </PadButton>
          <PadButton
            label="Special Attack"
            action="special"
            onAction={onAction}
            className={`border-[#38bdf8]/60 px-3 text-xs font-semibold text-[#bae6fd] ${
              unlockedAbilities.energyAttack ? '' : 'opacity-40'
            }`}
          >
            SPL
          </PadButton>
          <PadButton
            label="Silk Dash"
            action="dash"
            onAction={onAction}
            className={`px-3 text-xs font-semibold ${
              unlockedAbilities.dash ? '' : 'opacity-40'
            }`}
          >
            DSH
          </PadButton>
        </div>

        <div className="flex items-center gap-2.5">
          <PadButton
            label="Needle Slash"
            action="attack"
            onAction={onAction}
            className="h-14 w-14 rounded-full text-xs font-semibold"
          >
            ATK
          </PadButton>
          <PadButton
            label="Jump or Double Jump"
            action="jump"
            onAction={onAction}
            className="h-14 w-14 rounded-full border-[#52b788] bg-[#102d28]/88 text-xs font-semibold text-[#ecfdf5]"
          >
            JMP
          </PadButton>
        </div>
      </div>
    </div>
  );
}
