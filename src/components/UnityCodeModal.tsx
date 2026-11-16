import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { UNITY_SCRIPTS } from '../data/unityScripts';

interface UnityCodeModalProps {
  open: boolean;
  onClose: () => void;
}

export function UnityCodeModal({ open, onClose }: UnityCodeModalProps) {
  const [selectedId, setSelectedId] = useState(UNITY_SCRIPTS[0].id);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const activeScript = UNITY_SCRIPTS.find((s) => s.id === selectedId) ?? UNITY_SCRIPTS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeScript.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback ignored in restricted frames
    }
  };

  return (
    <div
      className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-[#03090a]/90 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Unity C# Architecture Scripts"
    >
      <div className="flex h-[calc(100dvh-2rem-var(--safe-top)-var(--safe-bottom))] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#2a4a44] bg-[#081517] text-[#e6f0ec] shadow-2xl md:h-[88dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c3632] px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-wide text-[#e2f5ec]">
              Unity 2D C# Architecture
            </h2>
            <p className="mt-0.5 text-xs text-[#88aba0]">
              Modular ScriptableObject physics, multi-tier parallax, and state-machine AI scripts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#25443e] bg-[#0d2022] text-[#a7c7bc] transition-colors hover:bg-[#153133] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5eead4]"
            aria-label="Close Unity C# reference"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Script List */}
          <nav className="w-full shrink-0 overflow-y-auto border-b border-[#1c3632] bg-[#061012] p-3 md:w-72 md:border-b-0 md:border-r">
            <div className="space-y-1">
              {UNITY_SCRIPTS.map((script) => {
                const isSelected = script.id === activeScript.id;
                return (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(script.id);
                      setCopied(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#13322e] text-[#ecfdf5]'
                        : 'text-[#8fb0a5] hover:bg-[#0d2123] hover:text-[#d5e8e1]'
                    }`}
                  >
                    <div className="font-mono-code text-xs font-medium">{script.filename}</div>
                    <div className="mt-0.5 truncate text-[11px] text-[#6d9186]">{script.module}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-[#172e2b] pt-4 text-xs leading-relaxed text-[#7c9f94]">
              <p className="font-medium text-[#b5d6ca]">Unity Setup Checklist</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                <li>Set Rigidbody2D Collision Detection to Continuous and freeze Z rotation.</li>
                <li>Create a Ground LayerMask and assign child GroundCheck + WallCheck transforms.</li>
                <li>Create a MovementData asset via Assets &gt; Create &gt; Mossgrotto &gt; Movement Data.</li>
                <li>Assign ParallaxLayer multipliers (0.18 far, 0.38 mid, 1.28 foreground).</li>
              </ol>
            </div>
          </nav>

          {/* Code Viewer */}
          <div className="flex min-h-0 flex-1 flex-col bg-[#050d0f]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#172e2b] px-5 py-3">
              <div className="min-w-0">
                <div className="font-mono-code text-sm font-medium text-[#74c69d]">
                  {activeScript.filename}
                </div>
                <p className="mt-0.5 text-xs text-[#89aba0]">{activeScript.summary}</p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#2a5248] bg-[#102926] px-3 py-1.5 text-xs font-medium text-[#d8f3dc] transition-colors hover:bg-[#183b36] whitespace-nowrap"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#5eead4]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy C#'}</span>
              </button>
            </div>

            <pre className="font-mono-code min-h-0 flex-1 overflow-auto p-5 text-[12.5px] leading-relaxed text-[#cbe2da]">
              <code>{activeScript.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
