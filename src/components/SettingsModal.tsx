import { SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import type { GameSettings } from '../game/types';

interface SettingsModalProps {
  open: boolean;
  settings: GameSettings;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleScreenShake: () => void;
  onTouchControlsChange: (mode: GameSettings['touchControls']) => void;
  onClose: () => void;
}

export function SettingsModal({
  open,
  settings,
  volume,
  onVolumeChange,
  onToggleMute,
  onToggleScreenShake,
  onTouchControlsChange,
  onClose,
}: SettingsModalProps) {
  if (!open) return null;

  const touchOptions: { value: GameSettings['touchControls']; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'on', label: 'Always On' },
    { value: 'off', label: 'Off' },
  ];

  return (
    <div
      className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-[#03090a]/88"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="modal-scroll w-full max-w-md rounded-xl border border-[#284b44] bg-[#081517] p-6 text-[#e6f0ec] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#193330] pb-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 text-[#74c69d]" />
            <h2 className="font-display text-xl font-semibold tracking-wider text-[#eef7f3]">
              Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#25443e] bg-[#0d2022] text-[#a7c7bc] transition-colors hover:bg-[#153133] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4]"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Master Volume & Mute */}
          <div className="rounded-lg border border-[#1a3531] bg-[#061012] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-[#e2f5ec]">Audio Output</div>
                <div className="text-xs text-[#88aba0]">Cavern drone & combat SFX</div>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#284b44] bg-[#0d2224] px-3.5 text-xs font-medium text-[#cbe5dc] transition-colors hover:bg-[#143336] hover:text-white"
              >
                {settings.muted ? (
                  <>
                    <VolumeX className="h-4 w-4 text-[#fca5a5]" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 text-[#74c69d]" />
                    <span>Active</span>
                  </>
                )}
              </button>
            </div>

            <label className="mt-4 flex flex-col gap-2 text-xs text-[#9dc0b5]">
              <div className="flex justify-between">
                <span>Master Volume</span>
                <span className="font-mono-code tabular-nums text-[#e6f0ec]">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="h-6 w-full cursor-pointer accent-[#52b788]"
              />
            </label>
          </div>

          {/* Screen Shake */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#1a3531] bg-[#061012] p-4">
            <div>
              <div className="text-sm font-medium text-[#e2f5ec]">Combat Screen Shake</div>
              <div className="text-xs text-[#88aba0]">Camera recoil on nail hits & dashes</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.screenShake}
              onClick={onToggleScreenShake}
              className={`inline-flex min-h-[44px] min-w-[76px] items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
                settings.screenShake
                  ? 'border-[#52b788] bg-[#13382e] text-[#ecfdf5]'
                  : 'border-[#25443e] bg-[#0b1b1d] text-[#88aba0]'
              }`}
            >
              {settings.screenShake ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* On-Screen Touch Controls */}
          <div className="rounded-lg border border-[#1a3531] bg-[#061012] p-4">
            <div className="text-sm font-medium text-[#e2f5ec]">Touch Controls</div>
            <div className="mt-0.5 text-xs text-[#88aba0]">
              Virtual D-pad & action buttons for phones and tablets
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {touchOptions.map((opt) => {
                const active = settings.touchControls === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onTouchControlsChange(opt.value)}
                    className={`min-h-[44px] rounded-lg border px-2 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#52b788] bg-[#143a30] text-[#ecfdf5]'
                        : 'border-[#24443f] bg-[#0a1a1c] text-[#9ec0b5] hover:bg-[#112a2d]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-[#193330] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#52b788] px-6 text-sm font-semibold text-[#04100d] transition-colors hover:bg-[#74c69d]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
