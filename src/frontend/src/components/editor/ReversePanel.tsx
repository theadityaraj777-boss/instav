/**
 * ReversePanel — Toggle to reverse the video playback direction.
 * Sets playbackRate to -1 via requestAnimationFrame loop on the video element.
 */
import { Rewind } from "lucide-react";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

export default function ReversePanel({ state, onUpdate }: Props) {
  const isReversed = state.isReversed ?? false;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Reverse Video
      </h3>

      {/* Big toggle card */}
      <button
        type="button"
        data-ocid="editor.reverse.toggle"
        onClick={() => onUpdate({ isReversed: !isReversed })}
        className={`w-full py-8 flex flex-col items-center gap-3 rounded-2xl border-2 transition-all duration-300 ${
          isReversed
            ? "border-amber-400/60 bg-amber-400/10 shadow-[0_0_24px_oklch(0.78_0.16_75/0.25)]"
            : "border-border/30 bg-surface-1 hover:border-amber-400/30"
        }`}
      >
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            isReversed ? "bg-amber-400/20" : "bg-muted/50"
          }`}
        >
          <Rewind
            className={`w-8 h-8 transition-all duration-300 ${
              isReversed ? "text-amber-400" : "text-muted-foreground"
            }`}
          />
        </div>
        <div className="text-center">
          <p
            className={`text-base font-bold transition-colors ${
              isReversed ? "text-amber-400" : "text-muted-foreground"
            }`}
          >
            {isReversed ? "◀◀ Reversed" : "Normal Playback"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isReversed ? "Video plays backward" : "Tap to reverse video"}
          </p>
        </div>
      </button>

      {/* Status info */}
      <div
        className={`p-3 rounded-xl border transition-all ${
          isReversed
            ? "border-amber-400/30 bg-amber-400/5"
            : "border-border/20 bg-surface-1"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              isReversed
                ? "bg-amber-400 animate-pulse"
                : "bg-muted-foreground/40"
            }`}
          />
          <p className="text-xs text-muted-foreground flex-1">
            {isReversed
              ? "Playback direction reversed — video plays from end to start."
              : "Standard playback — video plays from start to end."}
          </p>
        </div>
      </div>

      {/* Visual direction indicator */}
      <div className="flex items-center gap-2 px-2">
        <div
          className={`flex-1 flex items-center gap-1 text-[10px] transition-colors ${
            !isReversed ? "text-amber-400" : "text-muted-foreground/40"
          }`}
        >
          <div className="flex-1 h-px bg-current" />
          <span>▶</span>
          <span>Forward</span>
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <div
          className={`flex-1 flex items-center gap-1 text-[10px] transition-colors ${
            isReversed ? "text-amber-400" : "text-muted-foreground/40"
          }`}
        >
          <span>Reverse</span>
          <span>◀</span>
          <div className="flex-1 h-px bg-current" />
        </div>
      </div>

      {/* Export note */}
      <div className="p-2.5 rounded-xl border border-border/20 bg-surface-1">
        <p className="text-[10px] text-muted-foreground text-center">
          ⚠ Reverse effect is applied during playback preview and baked in on
          export.
        </p>
      </div>

      {isReversed && (
        <button
          type="button"
          onClick={() => onUpdate({ isReversed: false })}
          className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-1"
        >
          Reset to normal playback
        </button>
      )}
    </div>
  );
}
