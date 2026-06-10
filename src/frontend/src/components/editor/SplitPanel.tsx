/**
 * SplitPanel — Split the active clip at the current playhead position.
 * Visual indicator shows the split point on the timeline bar.
 */
import { Slider } from "@/components/ui/slider";
import { Scissors } from "lucide-react";
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

export default function SplitPanel({ state, onUpdate }: Props) {
  const dur = state.trimEnd || 30;
  const [splitTime, setSplitTime] = useState(
    Math.max(
      state.trimStart + 0.5,
      (state.trimStart + (state.trimEnd || dur)) / 2,
    ),
  );
  const clips = state.clips ?? [
    { start: state.trimStart, end: state.trimEnd || dur },
  ];

  const handleSplit = () => {
    if (
      splitTime <= state.trimStart + 0.1 ||
      splitTime >= (state.trimEnd || dur) - 0.1
    ) {
      toast.error("Split point too close to clip edges.");
      return;
    }
    const newClips = clips.flatMap((clip) => {
      if (splitTime > clip.start && splitTime < clip.end) {
        return [
          { start: clip.start, end: splitTime },
          { start: splitTime, end: clip.end },
        ];
      }
      return [clip];
    });
    onUpdate({ clips: newClips });
    toast.success(`Split into ${newClips.length} clips at ${fmt(splitTime)}`);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Split Clip
      </h3>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        Drag the playhead in the timeline to your desired split point, then tap
        Split. You can also drag the slider below.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{fmt(state.trimStart)}</span>
          <span className="text-amber-400 font-bold">✂ {fmt(splitTime)}</span>
          <span>{fmt(state.trimEnd || dur)}</span>
        </div>

        <div className="relative h-8 bg-surface-1 rounded-full border border-border/30 overflow-hidden">
          <div
            className="absolute top-0 bottom-0 rounded-l-full"
            style={{
              left: `${(state.trimStart / dur) * 100}%`,
              right: `${100 - (splitTime / dur) * 100}%`,
              background: "oklch(0.78 0.16 75 / 0.5)",
            }}
          />
          <div
            className="absolute top-0 bottom-0 rounded-r-full"
            style={{
              left: `${(splitTime / dur) * 100}%`,
              right: `${100 - ((state.trimEnd || dur) / dur) * 100}%`,
              background: "oklch(0.72 0.19 200 / 0.5)",
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-1 bg-white z-10 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
            style={{ left: `${(splitTime / dur) * 100}%` }}
          />
        </div>

        <Slider
          data-ocid="editor.split.time_slider"
          value={[splitTime]}
          onValueChange={([v]) => setSplitTime(v)}
          min={state.trimStart}
          max={state.trimEnd || dur}
          step={0.05}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-surface-1 border border-border/30 text-center">
          <p className="text-[10px] text-muted-foreground">Clip A</p>
          <p className="text-sm font-bold text-amber-400 tabular-nums">
            {fmt(state.trimStart)} → {fmt(splitTime)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {fmt(splitTime - state.trimStart)} long
          </p>
        </div>
        <div className="p-3 rounded-xl bg-surface-1 border border-border/30 text-center">
          <p className="text-[10px] text-muted-foreground">Clip B</p>
          <p className="text-sm font-bold text-cyan-400 tabular-nums">
            {fmt(splitTime)} → {fmt(state.trimEnd || dur)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {fmt((state.trimEnd || dur) - splitTime)} long
          </p>
        </div>
      </div>

      {clips.length > 1 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Timeline ({clips.length} clips)
          </p>
          {clips.map((clip, i) => (
            <div
              key={`split-clip-${clip.start}-${clip.end}`}
              data-ocid={`editor.split.clip.${i + 1}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-1 border border-border/20"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: i % 2 === 0 ? "#f5c842" : "#06b6d4" }}
              />
              <span className="text-xs text-foreground">Clip {i + 1}</span>
              <span className="text-[10px] text-muted-foreground flex-1 text-right tabular-nums">
                {fmt(clip.start)} → {fmt(clip.end)} (
                {fmt(clip.end - clip.start)})
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        data-ocid="editor.split.split_button"
        onClick={handleSplit}
        className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 font-semibold text-sm hover:bg-amber-400/20 transition-all"
      >
        <Scissors className="w-4 h-4" />
        Split at {fmt(splitTime)}
      </button>
    </div>
  );
}
