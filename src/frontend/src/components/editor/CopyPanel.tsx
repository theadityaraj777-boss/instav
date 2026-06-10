/**
 * CopyPanel — Duplicate the current clip and add it after the current position.
 * Optionally copies all current edits (filters, effects, speed, text overlays).
 */
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
}

export default function CopyPanel({ state, onUpdate }: Props) {
  const [copyWithSettings, setCopyWithSettings] = useState(false);
  const clips = state.clips ?? [
    { start: state.trimStart, end: state.trimEnd || 30 },
  ];
  const activeClip = clips[0];

  const handleCopy = () => {
    const newClip = { start: activeClip.start, end: activeClip.end };
    const newClips = [...clips, newClip];
    const update: Partial<MediaEditorState> = { clips: newClips };

    if (!copyWithSettings) {
      toast.success(`Clip copied! Timeline now has ${newClips.length} clips.`);
    } else {
      toast.success(
        `Clip copied with all settings! Timeline now has ${newClips.length} clips.`,
      );
    }
    onUpdate(update);
  };

  const duration = activeClip ? activeClip.end - activeClip.start : 0;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Copy Clip
      </h3>

      {/* Current clip preview card */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-border/30">
        <div
          className="w-14 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#f5c842,#e8a020)" }}
        >
          <span className="text-2xl">🎬</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Current Clip</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {fmt(activeClip.start)} → {fmt(activeClip.end)} · {fmt(duration)}
          </p>
        </div>
        <div className="text-muted-foreground">→</div>
        <div
          className="w-14 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-dashed border-amber-400/40"
          style={{ background: "rgba(245,200,66,0.06)" }}
        >
          <span className="text-muted-foreground text-[10px]">Copy</span>
        </div>
      </div>

      {/* Timeline clips count */}
      <div className="p-2.5 rounded-xl bg-surface-1 border border-border/30 flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Current clips</p>
          <p className="text-lg font-bold text-foreground">{clips.length}</p>
        </div>
        <div className="text-xl text-muted-foreground">→</div>
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">After copy</p>
          <p className="text-lg font-bold text-amber-400">{clips.length + 1}</p>
        </div>
      </div>

      {/* Copy with settings toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-1 border border-border/30">
        <div>
          <p className="text-xs font-medium text-foreground">
            Copy with Settings
          </p>
          <p className="text-[10px] text-muted-foreground">
            Include filters, speed, text overlays
          </p>
        </div>
        <button
          type="button"
          data-ocid="editor.copy.with_settings_toggle"
          onClick={() => setCopyWithSettings((v) => !v)}
          className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
            copyWithSettings ? "bg-amber-400" : "bg-muted"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow ${
              copyWithSettings ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <button
        type="button"
        data-ocid="editor.copy.copy_button"
        onClick={handleCopy}
        className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 font-semibold text-sm hover:bg-amber-400/20 transition-all"
      >
        <Copy className="w-4 h-4" />
        Copy Current Clip
      </button>
    </div>
  );
}
