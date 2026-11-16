import { ChevronRight, MessageSquare } from 'lucide-react';
import type { DialogueSpeaker, HudSnapshot } from '../game/types';

interface DialogueBoxProps {
  activeDialogue: HudSnapshot['activeDialogue'];
  nearbySpeaker: DialogueSpeaker | null;
  touchActive: boolean;
  onInteract: () => void;
  onAdvance: () => void;
  onClose: () => void;
}

export function DialogueBox({
  activeDialogue,
  nearbySpeaker,
  touchActive,
  onInteract,
  onAdvance,
  onClose,
}: DialogueBoxProps) {
  const bottomOffsetClass = touchActive
    ? 'bottom-[calc(11.5rem+var(--safe-bottom))] md:bottom-[calc(1.5rem+var(--safe-bottom))]'
    : 'bottom-[calc(1.25rem+var(--safe-bottom))]';

  if (!activeDialogue) {
    if (!nearbySpeaker) return null;
    const isTablet = nearbySpeaker.id.includes('tablet');
    return (
      <div className={`pointer-events-auto fixed left-1/2 z-20 -translate-x-1/2 ${bottomOffsetClass}`}>
        <button
          type="button"
          onClick={onInteract}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#3d7a69] bg-[#081618]/95 px-4 text-xs font-semibold text-[#ecfdf5] shadow-lg transition-colors hover:bg-[#112c2f]"
        >
          <MessageSquare className="h-4 w-4 text-[#74c69d]" />
          <span>
            {isTablet ? `Read ${nearbySpeaker.name}` : `Speak with ${nearbySpeaker.name}`} (E)
          </span>
        </button>
      </div>
    );
  }

  const isLastLine = activeDialogue.lineIndex + 1 >= activeDialogue.lines.length;
  const currentLine = activeDialogue.lines[activeDialogue.lineIndex] ?? '';

  return (
    <div
      className={`pointer-events-auto fixed left-1/2 z-30 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 px-1 ${bottomOffsetClass}`}
      role="dialog"
      aria-label={`Dialogue with ${activeDialogue.speakerName}`}
    >
      <div className="rounded-xl border border-[#2d584e] bg-[#071416]/96 p-4 text-[#e6f0ec] shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-[#193330] pb-2.5">
          <div>
            <div className="font-display text-base font-semibold tracking-wider text-[#eef7f3]">
              {activeDialogue.speakerName}
            </div>
            <div className="text-[11px] text-[#74c69d]">{activeDialogue.speakerTitle}</div>
          </div>
          <span className="font-mono-code text-xs tabular-nums text-[#83a69b]">
            {activeDialogue.lineIndex + 1} / {activeDialogue.lines.length}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#d4eae2]">{currentLine}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs text-[#89aba0] hover:text-white"
          >
            Close (Esc)
          </button>

          <button
            type="button"
            onClick={onAdvance}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#52b788] px-5 text-xs font-semibold text-[#04100d] transition-colors hover:bg-[#74c69d]"
          >
            <span>{isLastLine ? 'Finish' : 'Next'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
