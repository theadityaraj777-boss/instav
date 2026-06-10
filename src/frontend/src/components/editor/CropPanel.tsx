/**
 * CropPanel — Visual crop with aspect ratio presets and draggable handles.
 * Applied as CSS clip-path on the preview element.
 */
import { Slider } from "@/components/ui/slider";
import { Crop, RotateCcw } from "lucide-react";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const ASPECT_PRESETS = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
];

function aspectToRatio(aspect: string): number | null {
  if (aspect === "free") return null;
  const [w, h] = aspect.split(":").map(Number);
  return w / h;
}

export default function CropPanel({ state, onUpdate }: Props) {
  const cropX = state.cropX ?? 0;
  const cropY = state.cropY ?? 0;
  const cropW = state.cropW ?? 100;
  const cropH = state.cropH ?? 100;
  const cropAspect = state.cropAspect ?? "free";

  const applyAspect = (aspect: string) => {
    const ratio = aspectToRatio(aspect);
    onUpdate({ cropAspect: aspect });
    if (ratio !== null) {
      // Lock width, recalculate height based on aspect
      const newH = Math.min(100, cropW / ratio);
      onUpdate({ cropAspect: aspect, cropH: newH });
    }
  };

  const applyCrop = () => {
    onUpdate({ cropX, cropY, cropW, cropH, cropAspect });
  };

  const resetCrop = () => {
    onUpdate({
      cropX: 0,
      cropY: 0,
      cropW: 100,
      cropH: 100,
      cropAspect: "free",
    });
  };

  const updateX = (v: number) => onUpdate({ cropX: v });
  const updateY = (v: number) => onUpdate({ cropY: v });
  const updateW = (v: number) => {
    const ratio = aspectToRatio(cropAspect);
    if (ratio !== null) {
      onUpdate({ cropW: v, cropH: Math.min(100 - cropY, v / ratio) });
    } else {
      onUpdate({ cropW: v });
    }
  };
  const updateH = (v: number) => onUpdate({ cropH: v });

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Crop
      </h3>

      {/* Aspect ratio presets */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          Aspect Ratio
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {ASPECT_PRESETS.map((p) => (
            <button
              type="button"
              key={p.value}
              data-ocid={`editor.crop.aspect.${p.value.replace(":", "_")}`}
              onClick={() => applyAspect(p.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                cropAspect === p.value
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-400"
                  : "border-border/30 bg-surface-1 text-muted-foreground hover:border-amber-400/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual crop preview */}
      <div
        className="relative rounded-xl bg-black overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Dimmed overlay */}
        <div className="absolute inset-0 bg-black/60 z-10" />
        {/* Crop region */}
        <div
          className="absolute z-20 border-2 border-amber-400 rounded"
          style={{
            left: `${cropX}%`,
            top: `${cropY}%`,
            width: `${cropW}%`,
            height: `${cropH}%`,
          }}
        >
          {/* Corner handles */}
          {["tl", "tr", "bl", "br"].map((corner) => (
            <div
              key={corner}
              className="absolute w-3 h-3 bg-amber-400 rounded-sm cursor-nwse-resize z-30"
              style={{
                top: corner.startsWith("t") ? -4 : "auto",
                bottom: corner.startsWith("b") ? -4 : "auto",
                left: corner.endsWith("l") ? -4 : "auto",
                right: corner.endsWith("r") ? -4 : "auto",
              }}
            />
          ))}
          {/* Center crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-px bg-amber-400/60" />
            <div className="absolute h-4 w-px bg-amber-400/60" />
          </div>
        </div>
      </div>

      {/* Fine controls */}
      <div className="space-y-2">
        {[
          { label: "X", value: cropX, set: updateX, max: 50 },
          { label: "Y", value: cropY, set: updateY, max: 50 },
          { label: "Width", value: cropW, set: updateW, min: 20, max: 100 },
          { label: "Height", value: cropH, set: updateH, min: 20, max: 100 },
        ].map(({ label, value, set, max, min = 0 }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-10 flex-shrink-0">
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
            <span className="text-[10px] text-amber-400 tabular-nums w-8 text-right">
              {value}%
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          data-ocid="editor.crop.apply_button"
          onClick={applyCrop}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all"
        >
          <Crop className="w-3.5 h-3.5" />
          Apply Crop
        </button>
        <button
          type="button"
          data-ocid="editor.crop.reset_button"
          onClick={resetCrop}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/40 bg-surface-1 text-muted-foreground text-xs hover:text-amber-400 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
