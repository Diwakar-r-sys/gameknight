import { Layers, Play, X } from 'lucide-react';
import { BIOME_OPTIONS, type LevelPreset } from '../game/types';
import { LEVEL_PRESETS } from '../game/world';

interface LevelSelectModalProps {
  open: boolean;
  onSelectPreset: (preset: LevelPreset) => void;
  onClose: () => void;
}

export function LevelSelectModal({ open, onSelectPreset, onClose }: LevelSelectModalProps) {
  if (!open) return null;

  return (
    <div
      className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-[#03090a]/88"
      role="dialog"
      aria-modal="true"
      aria-label="Select Zone"
    >
      <div className="modal-scroll w-full max-w-2xl rounded-xl border border-[#284b44] bg-[#081517] p-6 text-[#e6f0ec] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#193330] pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-[#74c69d]" />
            <div>
              <h2 className="font-display text-xl font-semibold tracking-wider text-[#eef7f3]">
                Select Zone
              </h2>
              <p className="mt-0.5 text-xs text-[#88aba0]">
                Descend directly into any Mossgrotto chamber
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#25443e] bg-[#0d2022] text-[#a7c7bc] transition-colors hover:bg-[#153133] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4]"
            aria-label="Close zone selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LEVEL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className="group flex min-h-[92px] flex-col justify-between rounded-xl border border-[#22413b] bg-[#061113] p-4 text-left transition-colors hover:border-[#52b788] hover:bg-[#0c2123]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-base font-semibold text-[#eef7f3] group-hover:text-[#a7f3d0]">
                    {preset.name}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-[#8eb0a5]">
                    {preset.subtitle}
                  </div>
                </div>
                <span className="shrink-0 rounded border border-[#2a4e46] bg-[#0c2224] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#74c69d]">
                  {preset.difficulty}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#74998e]">
                <span>
                  Biome:{' '}
                  {BIOME_OPTIONS.find((b) => b.id === preset.recommendedTheme)?.shortLabel ?? 'Ice Cavern'}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-[#74c69d] group-hover:text-[#d8f3dc]">
                  <Play className="h-3 w-3 fill-current" />
                  <span>Enter</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
