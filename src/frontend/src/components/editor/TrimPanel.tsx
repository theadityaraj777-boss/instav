/**
 * TrimPanel — Drag-handle video trimmer with real-time seek preview.
 */
import { Slider } from "@/components/ui/slider";
import { useEffect, useRef, useState } from "react";
import type { MediaEditorState } from "./MediaEditorTab";

interface TrimPanelProps {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
  videoDuration: number;
  mediaUrl: string | null;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function TrimPanel({
  state,
  onUpdate,
  videoDuration,
  mediaUrl,
}: TrimPanelProps) {
  const dur = videoDuration || state.trimEnd || 60;
  const [seekPos, setSeekPos] = useState(state.trimStart);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Sync seek with preview video
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.currentTime = seekPos;
    }
  }, [seekPos]);

  const trimDuration = state.trimEnd - state.trimStart;

  return (
    <div className="p-4 space-y-5">
      {/* Mini video preview */}
      {mediaUrl && (
        <div
          className="rounded-xl overflow-hidden bg-black"
          style={{ height: 100 }}
        >
          <video
            ref={previewRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
            muted
            playsInline
          >
            <track kind="captions" />
          </video>
        </div>
      )}

      {/* Timeline bar with in/out handles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Trim
          </span>
          <span className="text-xs text-amber-400 tabular-nums">
            {fmt(state.trimStart)} → {fmt(state.trimEnd)} ({fmt(trimDuration)})
          </span>
        </div>

        {/* Track bar */}
        <div className="relative h-8 bg-surface-1 rounded-full border border-border/30 overflow-hidden mb-1">
          {/* Trimmed region highlight */}
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{
              left: `${(state.trimStart / dur) * 100}%`,
              right: `${100 - (state.trimEnd / dur) * 100}%`,
              background:
                "linear-gradient(90deg, oklch(0.78 0.16 75 / 0.5), oklch(0.82 0.18 200 / 0.5))",
            }}
          />
          {/* Seek indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
            style={{ left: `${(seekPos / dur) * 100}%` }}
          />
        </div>

        {/* In point */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14">
              In point
            </span>
            <Slider
              data-ocid="editor.trim_in_slider"
              value={[state.trimStart]}
              onValueChange={([v]) => {
                const val = Math.min(v, state.trimEnd - 0.5);
                onUpdate({ trimStart: val });
                setSeekPos(val);
              }}
              min={0}
              max={dur}
              step={0.1}
              className="flex-1"
            />
            <span className="text-[10px] text-amber-400 tabular-nums w-10 text-right">
              {fmt(state.trimStart)}
            </span>
          </div>

          {/* Out point */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14">
              Out point
            </span>
            <Slider
              data-ocid="editor.trim_out_slider"
              value={[state.trimEnd || dur]}
              onValueChange={([v]) => {
                const val = Math.max(v, state.trimStart + 0.5);
                onUpdate({ trimEnd: val });
                setSeekPos(val);
              }}
              min={0}
              max={dur}
              step={0.1}
              className="flex-1"
            />
            <span className="text-[10px] text-amber-400 tabular-nums w-10 text-right">
              {fmt(state.trimEnd || dur)}
            </span>
          </div>

          {/* Seek */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14">Seek</span>
            <Slider
              value={[seekPos]}
              onValueChange={([v]) => setSeekPos(v)}
              min={state.trimStart}
              max={state.trimEnd || dur}
              step={0.05}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
              {fmt(seekPos)}
            </span>
          </div>
        </div>
      </div>

      {/* Duration info */}
      <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-1 border border-border/30">
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {fmt(dur)}
          </p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Trimmed</p>
          <p className="text-sm font-semibold text-amber-400 tabular-nums">
            {fmt(trimDuration)}
          </p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Cut</p>
          <p className="text-sm font-semibold text-muted-foreground tabular-nums">
            {fmt(dur - trimDuration)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onUpdate({ trimStart: 0, trimEnd: dur })}
        className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-1"
      >
        Reset Trim
      </button>
    </div>
  );
}
