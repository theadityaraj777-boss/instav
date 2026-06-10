/**
 * FreezePanel — Freeze the current frame at playhead time for a set duration.
 * Uses video.pause() + CSS hold simulation.
 */
import { Slider } from "@/components/ui/slider";
import { Camera } from "lucide-react";
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

export default function FreezePanel({ state, onUpdate }: Props) {
  const freezeTime = state.freezeTime ?? 0;
  const freezeDuration = state.freezeDuration ?? 2;
  const freezeActive = state.freezeActive ?? false;
  const dur = state.trimEnd || 30;
  const [localTime, setLocalTime] = useState(freezeTime);

  const insertFreeze = () => {
    onUpdate({
      freezeTime: localTime,
      freezeDuration,
      freezeActive: true,
    });
    toast.success(
      `Freeze frame inserted at ${fmt(localTime)} for ${freezeDuration.toFixed(1)}s`,
    );
  };

  const clearFreeze = () => {
    onUpdate({ freezeActive: false, freezeTime: 0 });
    toast("Freeze frame removed.");
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Freeze Frame
      </h3>

      {/* Status indicator */}
      {freezeActive && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <p className="text-xs text-amber-400 font-medium">
            Freeze active at {fmt(state.freezeTime ?? 0)} ·{" "}
            {state.freezeDuration?.toFixed(1)}s
          </p>
        </div>
      )}

      {/* Playhead time */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Freeze at</span>
          <span className="text-amber-400 font-bold tabular-nums">
            {fmt(localTime)}
          </span>
        </div>
        <div className="relative h-7 bg-surface-1 rounded-full border border-border/30 overflow-hidden">
          {/* Freeze marker */}
          {freezeActive && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
              style={{ left: `${((state.freezeTime ?? 0) / dur) * 100}%` }}
            />
          )}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
            style={{ left: `${(localTime / dur) * 100}%` }}
          />
        </div>
        <Slider
          data-ocid="editor.freeze.time_slider"
          value={[localTime]}
          onValueChange={([v]) => setLocalTime(v)}
          min={0}
          max={dur}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Duration */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0">
          Hold duration
        </span>
        <Slider
          data-ocid="editor.freeze.duration_slider"
          value={[freezeDuration]}
          onValueChange={([v]) => onUpdate({ freezeDuration: v })}
          min={0.5}
          max={5}
          step={0.5}
          className="flex-1"
        />
        <span className="text-[10px] text-amber-400 tabular-nums w-10 text-right">
          {freezeDuration.toFixed(1)}s
        </span>
      </div>

      {/* Quick duration presets */}
      <div className="flex gap-1.5 flex-wrap">
        {[0.5, 1, 2, 3, 5].map((v) => (
          <button
            type="button"
            key={v}
            data-ocid={`editor.freeze.duration_preset.${v}`}
            onClick={() => onUpdate({ freezeDuration: v })}
            className={`flex-1 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
              freezeDuration === v
                ? "border-amber-400/60 bg-amber-400/15 text-amber-400"
                : "border-border/30 bg-surface-1 text-muted-foreground hover:border-amber-400/30"
            }`}
          >
            {v}s
          </button>
        ))}
      </div>

      {/* Insert button */}
      <button
        type="button"
        data-ocid="editor.freeze.insert_button"
        onClick={insertFreeze}
        className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 font-semibold text-sm hover:bg-amber-400/20 transition-all"
      >
        <Camera className="w-4 h-4" />
        Freeze Frame at {fmt(localTime)}
      </button>

      {freezeActive && (
        <button
          type="button"
          data-ocid="editor.freeze.clear_button"
          onClick={clearFreeze}
          className="w-full text-xs text-muted-foreground hover:text-red-400 transition-colors py-1"
        >
          Remove freeze frame
        </button>
      )}
    </div>
  );
}
