/**
 * KeyframePanel — Add/remove keyframes at specific timestamps to animate
 * opacity, scale, and position (X/Y). Uses requestAnimationFrame for video
 * and CSS transitions for images.
 */
import { Slider } from "@/components/ui/slider";
import { PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
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

export default function KeyframePanel({ state, onUpdate }: Props) {
  const keyframes = state.keyframes ?? [];
  const dur = state.trimEnd || 30;
  const [scrubTime, setScrubTime] = useState(0);
  const [kfOpacity, setKfOpacity] = useState(100);
  const [kfScale, setKfScale] = useState(100);
  const [kfX, setKfX] = useState(0);
  const [kfY, setKfY] = useState(0);

  // Per-element selection: null = global (main media), otherwise element id
  type ElementTarget =
    | { kind: "media" }
    | { kind: "text"; id: string; label: string }
    | { kind: "sticker"; id: string; label: string };

  const elementTargets: ElementTarget[] = [
    { kind: "media" },
    ...state.textOverlays.map((t, i) => ({
      kind: "text" as const,
      id: t.id,
      label: t.text
        ? `Text: ${t.text.slice(0, 14)}${t.text.length > 14 ? "\u2026" : ""}`
        : `Text ${i + 1}`,
    })),
    ...state.stickers.map((s, i) => ({
      kind: "sticker" as const,
      id: s.id,
      label: `Sticker ${s.emoji || i + 1}`,
    })),
  ];

  const [selectedTargetIdx, setSelectedTargetIdx] = useState(0);
  const selectedTarget =
    elementTargets[Math.min(selectedTargetIdx, elementTargets.length - 1)];

  // Keyframes for the selected element (global ones are stored on main state.keyframes)
  // Per-element keyframes use a tag prefix in their id so we can filter them
  const elementKey =
    !selectedTarget || selectedTarget.kind === "media"
      ? "media"
      : selectedTarget.id;

  const elementKFs = keyframes.filter((kf) =>
    elementKey === "media"
      ? !kf.id.includes("::")
      : kf.id.startsWith(`${elementKey}::kf-`),
  );

  // Sync panel sliders when scrubbing over existing keyframes
  const nearestKF = elementKFs
    .slice()
    .sort(
      (a, b) => Math.abs(a.time - scrubTime) - Math.abs(b.time - scrubTime),
    )[0];

  const addKeyframe = () => {
    const idBase =
      elementKey === "media"
        ? `kf-${Date.now()}`
        : `${elementKey}::kf-${Date.now()}`;
    const next = [
      ...keyframes,
      {
        id: idBase,
        time: scrubTime,
        opacity: kfOpacity,
        scale: kfScale,
        x: kfX,
        y: kfY,
      },
    ].sort((a, b) => a.time - b.time);
    onUpdate({ keyframes: next });
  };

  const removeKeyframe = (id: string) => {
    onUpdate({ keyframes: keyframes.filter((k) => k.id !== id) });
  };

  // Playhead sync — load values from nearest keyframe when scrubbing
  const handleScrub = (v: number) => {
    setScrubTime(v);
    const kf = elementKFs
      .slice()
      .sort((a, b) => Math.abs(a.time - v) - Math.abs(b.time - v))[0];
    if (kf && Math.abs(kf.time - v) < 0.5) {
      setKfOpacity(kf.opacity ?? 100);
      setKfScale(kf.scale ?? 100);
      setKfX(kf.x ?? 0);
      setKfY(kf.y ?? 0);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Keyframes
      </h3>

      {/* Element selector */}
      {elementTargets.length > 1 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Animate element
          </p>
          <div className="flex flex-wrap gap-1">
            {elementTargets.map((t, i) => (
              <button
                key={t.kind === "media" ? "media" : t.id}
                type="button"
                data-ocid={`editor.keyframe.target.${i}`}
                onClick={() => setSelectedTargetIdx(i)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedTargetIdx === i
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                    : "border-border/30 bg-surface-1 text-muted-foreground hover:border-amber-400/30"
                }`}
              >
                {t.kind === "media" ? "Main Clip" : t.label}
              </button>
            ))}
          </div>
          {selectedTarget && selectedTarget.kind !== "media" && (
            <p className="text-[10px] text-amber-400/70">
              Scene-by-scene: set values at two points to animate{" "}
              <em>{selectedTarget.label}</em> between them.
            </p>
          )}
        </div>
      )}

      {/* Timeline scrubber */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Playhead</span>
          <span className="text-amber-400 tabular-nums">{fmt(scrubTime)}</span>
        </div>
        <div className="relative h-7 bg-surface-1 rounded-full border border-border/30 overflow-hidden">
          {/* All keyframe markers for selected element */}
          {elementKFs.map((kf) => (
            <div
              key={kf.id}
              className="absolute top-0 bottom-0 w-1 bg-amber-400 rounded-full opacity-80"
              style={{ left: `${(kf.time / dur) * 100}%` }}
            />
          ))}
          {/* Scene segments between consecutive keyframes */}
          {elementKFs.length >= 2 &&
            elementKFs
              .slice()
              .sort((a, b) => a.time - b.time)
              .map((kf, i, arr) => {
                if (i === arr.length - 1) return null;
                const x1 = (kf.time / dur) * 100;
                const x2 = (arr[i + 1].time / dur) * 100;
                return (
                  <div
                    key={`seg-${kf.id}`}
                    className="absolute top-2 bottom-2 rounded-full"
                    style={{
                      left: `${x1}%`,
                      width: `${x2 - x1}%`,
                      background: "rgba(245,200,66,0.18)",
                    }}
                  />
                );
              })}
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
            style={{ left: `${(scrubTime / dur) * 100}%` }}
          />
        </div>
        <Slider
          value={[scrubTime]}
          onValueChange={([v]) => handleScrub(v)}
          min={0}
          max={dur}
          step={0.1}
          className="w-full"
        />
        {nearestKF && Math.abs(nearestKF.time - scrubTime) < 0.5 && (
          <p className="text-[10px] text-amber-400 text-center">
            ◆ Keyframe at {fmt(nearestKF.time)} — editing this point
          </p>
        )}
      </div>

      {/* Keyframe properties */}
      <div className="space-y-2 p-3 rounded-xl bg-surface-1 border border-border/30">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          At {fmt(scrubTime)}
        </p>
        {[
          {
            label: "Opacity",
            value: kfOpacity,
            set: setKfOpacity,
            min: 0,
            max: 100,
            unit: "%",
          },
          {
            label: "Scale",
            value: kfScale,
            set: setKfScale,
            min: 10,
            max: 300,
            unit: "%",
          },
          {
            label: "X Offset",
            value: kfX,
            set: setKfX,
            min: -100,
            max: 100,
            unit: "px",
          },
          {
            label: "Y Offset",
            value: kfY,
            set: setKfY,
            min: -100,
            max: 100,
            unit: "px",
          },
        ].map(({ label, value, set, min, max, unit }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">
              {label}
            </span>
            <Slider
              value={[value]}
              onValueChange={([v]) => set(v)}
              min={min}
              max={max}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-amber-400 tabular-nums w-12 text-right">
              {value}
              {unit}
            </span>
          </div>
        ))}
        <button
          type="button"
          data-ocid="editor.keyframe.add_button"
          onClick={addKeyframe}
          className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add Keyframe at {fmt(scrubTime)}
        </button>
      </div>

      {/* Keyframe list */}
      {elementKFs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {elementKFs.length} keyframe{elementKFs.length !== 1 ? "s" : ""}
            {elementKFs.length >= 2
              ? ` — ${elementKFs.length - 1} scene${elementKFs.length - 1 !== 1 ? "s" : ""}`
              : ""}
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {elementKFs
              .slice()
              .sort((a, b) => a.time - b.time)
              .map((kf, i) => (
                <div
                  key={kf.id}
                  data-ocid={`editor.keyframe.item.${i + 1}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-1 border border-border/20"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-xs text-amber-400 tabular-nums font-mono w-10">
                    {fmt(kf.time)}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">
                    op:{kf.opacity ?? 100}% sc:{kf.scale ?? 100}% x:{kf.x ?? 0}{" "}
                    y:{kf.y ?? 0}
                  </span>
                  <button
                    type="button"
                    data-ocid={`editor.keyframe.delete_button.${i + 1}`}
                    onClick={() => removeKeyframe(kf.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                    aria-label="Remove keyframe"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground py-2">
          No keyframes yet — scrub the timeline and add one above.
        </p>
      )}

      {elementKFs.length > 0 && (
        <button
          type="button"
          onClick={() =>
            onUpdate({
              keyframes: keyframes.filter((k) =>
                elementKey === "media"
                  ? k.id.includes("::")
                  : !k.id.startsWith(`${elementKey}::kf-`),
              ),
            })
          }
          className="w-full text-xs text-muted-foreground hover:text-red-400 transition-colors py-1"
        >
          Clear keyframes for this element
        </button>
      )}
    </div>
  );
}
