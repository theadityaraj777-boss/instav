/**
 * DeletePanel — Delete a clip segment or an entire clip from the timeline.
 * Danger-styled UI with confirmation step.
 */
import { AlertTriangle, Trash2 } from "lucide-react";
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

export default function DeletePanel({ state, onUpdate }: Props) {
  const clips = state.clips ?? [
    { start: state.trimStart, end: state.trimEnd || 30 },
  ];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [confirmMode, setConfirmMode] = useState<"segment" | "clip" | null>(
    null,
  );

  const handleDeleteClip = () => {
    if (selectedIdx === null) return;
    const newClips = clips.filter((_, i) => i !== selectedIdx);
    if (newClips.length === 0) {
      toast.error("Cannot delete the last clip.");
      return;
    }
    onUpdate({
      clips: newClips,
      trimStart: newClips[0].start,
      trimEnd: newClips[0].end,
    });
    setSelectedIdx(null);
    setConfirmMode(null);
    toast.success("Clip deleted.");
  };

  const handleDeleteSegment = () => {
    if (selectedIdx === null) return;
    const clip = clips[selectedIdx];
    const midStart = clip.start + (clip.end - clip.start) * 0.25;
    const midEnd = clip.start + (clip.end - clip.start) * 0.75;
    const newClips = [
      ...clips.slice(0, selectedIdx),
      { start: clip.start, end: midStart },
      { start: midEnd, end: clip.end },
      ...clips.slice(selectedIdx + 1),
    ];
    onUpdate({ clips: newClips });
    setSelectedIdx(null);
    setConfirmMode(null);
    toast.success("Segment deleted (middle 50% removed).");
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Delete
      </h3>

      {/* Clip list */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          Select a clip
        </p>
        {clips.map((clip, i) => (
          <button
            type="button"
            key={`clip-del-${clip.start}-${clip.end}`}
            data-ocid={`editor.delete.clip.${i + 1}`}
            onClick={() => {
              setSelectedIdx(i);
              setConfirmMode(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              selectedIdx === i
                ? "border-red-500/50 bg-red-500/10"
                : "border-border/30 bg-surface-1 hover:border-red-400/30"
            }`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: i % 2 === 0 ? "#f5c842" : "#06b6d4" }}
            />
            <span
              className={`text-xs font-medium flex-1 text-left ${selectedIdx === i ? "text-red-400" : "text-foreground"}`}
            >
              Clip {i + 1}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {fmt(clip.start)} → {fmt(clip.end)}
            </span>
          </button>
        ))}
      </div>

      {/* Actions */}
      {selectedIdx !== null && !confirmMode && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-ocid="editor.delete.segment_button"
            onClick={() => setConfirmMode("segment")}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 transition-all"
          >
            <Trash2 className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-semibold text-orange-400">
              Delete Segment
            </span>
            <span className="text-[10px] text-muted-foreground">
              Middle portion
            </span>
          </button>
          <button
            type="button"
            data-ocid="editor.delete.clip_button"
            onClick={() => setConfirmMode("clip")}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
            <span className="text-xs font-semibold text-red-400">
              Delete Clip
            </span>
            <span className="text-[10px] text-muted-foreground">
              Remove entirely
            </span>
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmMode && selectedIdx !== null && (
        <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300 font-medium">
              {confirmMode === "clip"
                ? `Delete Clip ${selectedIdx + 1} entirely?`
                : `Delete the middle segment of Clip ${selectedIdx + 1}?`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="editor.delete.confirm_button"
              onClick={
                confirmMode === "clip" ? handleDeleteClip : handleDeleteSegment
              }
              className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
            >
              Confirm Delete
            </button>
            <button
              type="button"
              data-ocid="editor.delete.cancel_button"
              onClick={() => setConfirmMode(null)}
              className="flex-1 py-2 rounded-lg border border-border/40 bg-surface-1 text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedIdx === null && (
        <p className="text-center text-[11px] text-muted-foreground py-2">
          Select a clip above to delete it or a segment.
        </p>
      )}
    </div>
  );
}
