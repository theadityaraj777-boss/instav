import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { EditorState, FilterSettings } from "@/pages/EditorPage";
import { RotateCcw } from "lucide-react";

interface FiltersPanelProps {
  state: EditorState;
  onUpdate: (updates: Partial<EditorState>) => void;
}

// ─── Filter preset definitions ────────────────────────────────────────────────

interface Preset {
  id: string;
  label: string;
  /** CSS filter string applied to preview thumbnail */
  cssFilter: string;
  /** Gradient used in the thumbnail to simulate a photo */
  gradient: string;
  settings: Partial<FilterSettings>;
}

const PRESETS: Preset[] = [
  {
    id: "none",
    label: "Original",
    cssFilter: "none",
    gradient: "linear-gradient(135deg, #e0b48a 0%, #7ec8e3 50%, #5e9e6e 100%)",
    settings: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      sharpness: 0,
      vignette: 0,
    },
  },
  {
    id: "cinematic",
    label: "Cinematic",
    cssFilter: "contrast(1.3) saturate(0.8) brightness(0.9)",
    gradient: "linear-gradient(135deg, #8b6a4e 0%, #4a7a8a 50%, #3a6a4a 100%)",
    settings: {
      brightness: 90,
      contrast: 130,
      saturation: 80,
      hue: 0,
      exposure: -5,
      highlights: -30,
      shadows: 15,
      sharpness: 10,
      vignette: 40,
    },
  },
  {
    id: "moody",
    label: "Moody",
    cssFilter:
      "contrast(1.4) saturate(0.6) brightness(0.85) hue-rotate(200deg)",
    gradient: "linear-gradient(135deg, #2a3a5e 0%, #1a2a4a 50%, #3a4a6e 100%)",
    settings: {
      brightness: 85,
      contrast: 140,
      saturation: 60,
      hue: -160,
      exposure: -15,
      highlights: -20,
      shadows: 10,
      sharpness: 5,
      vignette: 30,
    },
  },
  {
    id: "warm-gold",
    label: "Warm Gold",
    cssFilter: "sepia(0.4) saturate(1.6) brightness(1.1) contrast(1.1)",
    gradient: "linear-gradient(135deg, #f5c842 0%, #e8a020 50%, #c4702a 100%)",
    settings: {
      brightness: 110,
      contrast: 110,
      saturation: 160,
      hue: 20,
      exposure: 10,
      highlights: -5,
      shadows: 15,
      sharpness: 5,
      vignette: 10,
    },
  },
  {
    id: "cool-blue",
    label: "Cool Blue",
    cssFilter:
      "hue-rotate(200deg) saturate(1.4) brightness(1.05) contrast(1.1)",
    gradient: "linear-gradient(135deg, #4fc3f7 0%, #0288d1 50%, #006494 100%)",
    settings: {
      brightness: 105,
      contrast: 110,
      saturation: 140,
      hue: -160,
      exposure: 0,
      highlights: 10,
      shadows: -10,
      sharpness: 8,
      vignette: 10,
    },
  },
  {
    id: "noir",
    label: "Noir",
    cssFilter: "grayscale(1) contrast(1.5) brightness(0.9)",
    gradient: "linear-gradient(135deg, #2a2a2a 0%, #666 50%, #111 100%)",
    settings: {
      brightness: 90,
      contrast: 150,
      saturation: 0,
      hue: 0,
      exposure: -15,
      highlights: -20,
      shadows: 20,
      sharpness: 20,
      vignette: 50,
    },
  },
  {
    id: "soft-glow",
    label: "Soft Glow",
    cssFilter: "brightness(1.2) saturate(1.1) contrast(0.9) blur(0.3px)",
    gradient: "linear-gradient(135deg, #ffe0f0 0%, #ffd6e0 50%, #e8d5f5 100%)",
    settings: {
      brightness: 120,
      contrast: 90,
      saturation: 110,
      hue: 0,
      exposure: 15,
      highlights: 20,
      shadows: 30,
      sharpness: 0,
      vignette: 0,
    },
  },
  {
    id: "retro-70s",
    label: "Retro 70s",
    cssFilter: "sepia(0.5) saturate(1.8) hue-rotate(-20deg) contrast(1.1)",
    gradient: "linear-gradient(135deg, #d4a55a 0%, #c8703a 50%, #b85a2a 100%)",
    settings: {
      brightness: 105,
      contrast: 110,
      saturation: 180,
      hue: -20,
      exposure: 5,
      highlights: -10,
      shadows: 20,
      sharpness: 5,
      vignette: 20,
    },
  },
  {
    id: "neon-pop",
    label: "Neon Pop",
    cssFilter: "saturate(2.5) contrast(1.3) brightness(1.1)",
    gradient: "linear-gradient(135deg, #ff0080 0%, #00ff80 50%, #0080ff 100%)",
    settings: {
      brightness: 110,
      contrast: 130,
      saturation: 250,
      hue: 0,
      exposure: 5,
      highlights: 10,
      shadows: -5,
      sharpness: 10,
      vignette: 0,
    },
  },
  {
    id: "faded",
    label: "Faded",
    cssFilter: "contrast(0.85) saturate(0.7) brightness(1.15)",
    gradient: "linear-gradient(135deg, #c8b8a8 0%, #b8c8c8 50%, #a8b8a8 100%)",
    settings: {
      brightness: 115,
      contrast: 85,
      saturation: 70,
      hue: 0,
      exposure: 10,
      highlights: 30,
      shadows: 40,
      sharpness: 0,
      vignette: 0,
    },
  },
  {
    id: "deep-shadow",
    label: "Deep Shadow",
    cssFilter: "contrast(1.6) brightness(0.75) saturate(0.9)",
    gradient: "linear-gradient(135deg, #1a0a00 0%, #2a1a0a 50%, #0a0a1a 100%)",
    settings: {
      brightness: 75,
      contrast: 160,
      saturation: 90,
      hue: 0,
      exposure: -20,
      highlights: -30,
      shadows: 5,
      sharpness: 15,
      vignette: 60,
    },
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    cssFilter: "sepia(0.3) saturate(1.5) hue-rotate(-10deg) brightness(1.15)",
    gradient: "linear-gradient(135deg, #ffb347 0%, #ff8c00 50%, #ff6600 100%)",
    settings: {
      brightness: 115,
      contrast: 105,
      saturation: 150,
      hue: -10,
      exposure: 10,
      highlights: -5,
      shadows: 15,
      sharpness: 5,
      vignette: 15,
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    cssFilter:
      "hue-rotate(100deg) saturate(1.5) contrast(1.2) brightness(1.05)",
    gradient: "linear-gradient(135deg, #00c896 0%, #00a878 50%, #006450 100%)",
    settings: {
      brightness: 105,
      contrast: 120,
      saturation: 150,
      hue: 100,
      exposure: 5,
      highlights: -5,
      shadows: 10,
      sharpness: 8,
      vignette: 15,
    },
  },
  {
    id: "pink-dream",
    label: "Pink Dream",
    cssFilter: "hue-rotate(300deg) saturate(1.8) brightness(1.1) contrast(1.0)",
    gradient: "linear-gradient(135deg, #ff80bf 0%, #d060a0 50%, #a04080 100%)",
    settings: {
      brightness: 110,
      contrast: 100,
      saturation: 180,
      hue: -60,
      exposure: 10,
      highlights: 10,
      shadows: 20,
      sharpness: 0,
      vignette: 10,
    },
  },
  {
    id: "chrome",
    label: "Chrome",
    cssFilter: "contrast(1.5) saturate(0.2) brightness(1.1)",
    gradient: "linear-gradient(135deg, #c8c8d8 0%, #e8e8f0 50%, #a0a0b8 100%)",
    settings: {
      brightness: 110,
      contrast: 150,
      saturation: 20,
      hue: 0,
      exposure: 5,
      highlights: 15,
      shadows: 5,
      sharpness: 25,
      vignette: 5,
    },
  },
  {
    id: "lomo",
    label: "Lomo",
    cssFilter: "contrast(1.4) saturate(1.5) brightness(0.9)",
    gradient: "linear-gradient(135deg, #c84040 0%, #40c8c8 50%, #4040c8 100%)",
    settings: {
      brightness: 90,
      contrast: 140,
      saturation: 150,
      hue: 0,
      exposure: -5,
      highlights: -10,
      shadows: 10,
      sharpness: 10,
      vignette: 55,
    },
  },
  {
    id: "sunburn",
    label: "Sunburn",
    cssFilter: "sepia(0.6) saturate(2) hue-rotate(-30deg) brightness(1.2)",
    gradient: "linear-gradient(135deg, #ff6040 0%, #ff9020 50%, #ffb040 100%)",
    settings: {
      brightness: 120,
      contrast: 105,
      saturation: 200,
      hue: -30,
      exposure: 15,
      highlights: -10,
      shadows: 10,
      sharpness: 5,
      vignette: 5,
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    cssFilter: "hue-rotate(180deg) saturate(1.6) brightness(1.0) contrast(1.1)",
    gradient: "linear-gradient(135deg, #006080 0%, #0090a0 50%, #00c0c0 100%)",
    settings: {
      brightness: 100,
      contrast: 110,
      saturation: 160,
      hue: 180,
      exposure: 0,
      highlights: 5,
      shadows: -5,
      sharpness: 8,
      vignette: 15,
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    cssFilter: "hue-rotate(240deg) saturate(1.4) brightness(0.7) contrast(1.3)",
    gradient: "linear-gradient(135deg, #1a0060 0%, #300080 50%, #1a0040 100%)",
    settings: {
      brightness: 70,
      contrast: 130,
      saturation: 140,
      hue: -120,
      exposure: -20,
      highlights: -20,
      shadows: 5,
      sharpness: 10,
      vignette: 45,
    },
  },
  {
    id: "vivid",
    label: "Vivid",
    cssFilter: "saturate(2) contrast(1.2) brightness(1.05)",
    gradient: "linear-gradient(135deg, #ff4040 0%, #40ff40 50%, #4040ff 100%)",
    settings: {
      brightness: 105,
      contrast: 120,
      saturation: 200,
      hue: 0,
      exposure: 5,
      highlights: 10,
      shadows: -5,
      sharpness: 12,
      vignette: 0,
    },
  },
];

// ─── Slider controls ──────────────────────────────────────────────────────────

interface SliderControl {
  key: keyof FilterSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const CONTROLS: SliderControl[] = [
  {
    key: "brightness",
    label: "Brightness",
    min: 50,
    max: 150,
    step: 1,
    unit: "%",
  },
  { key: "contrast", label: "Contrast", min: 50, max: 200, step: 1, unit: "%" },
  {
    key: "saturation",
    label: "Saturation",
    min: 0,
    max: 200,
    step: 1,
    unit: "%",
  },
  { key: "hue", label: "Hue Shift", min: -180, max: 180, step: 1, unit: "°" },
  { key: "exposure", label: "Exposure", min: -50, max: 50, step: 1, unit: "" },
  {
    key: "highlights",
    label: "Highlights",
    min: -50,
    max: 50,
    step: 1,
    unit: "",
  },
  { key: "shadows", label: "Shadows", min: -50, max: 50, step: 1, unit: "" },
  { key: "sharpness", label: "Sharpness", min: 0, max: 100, step: 1, unit: "" },
  { key: "vignette", label: "Vignette", min: 0, max: 100, step: 1, unit: "%" },
];

const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  vignette: 0,
  preset: "none",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function FiltersPanel({ state, onUpdate }: FiltersPanelProps) {
  const applyPreset = (preset: Preset) => {
    onUpdate({
      filters: {
        ...state.filters,
        ...preset.settings,
        preset: preset.id,
      },
    });
  };

  const updateFilter = (key: keyof FilterSettings, value: number) => {
    onUpdate({
      filters: { ...state.filters, [key]: value, preset: "custom" },
    });
  };

  const resetFilters = () => {
    onUpdate({ filters: DEFAULT_FILTERS });
  };

  return (
    <div className="p-3 space-y-4">
      {/* ── Presets grid ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Presets
          </h3>
          <span className="text-[10px] text-muted-foreground/60">
            {PRESETS.length} filters
          </span>
        </div>

        {/* Horizontal scrollable row */}
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex gap-2 pb-2 min-w-max">
            {PRESETS.map((preset) => {
              const isActive = state.filters.preset === preset.id;
              return (
                <button
                  type="button"
                  key={preset.id}
                  data-ocid={`filters.preset.${preset.id}`}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-1.5 rounded-xl border transition-all duration-200 min-w-[72px] group",
                    isActive
                      ? "border-amber-400/70 bg-amber-400/10 shadow-[0_0_8px_rgba(245,200,66,0.2)]"
                      : "border-border/30 bg-muted/30 hover:border-amber-400/40 hover:bg-muted/50",
                  )}
                >
                  {/* Thumbnail */}
                  <div
                    className={cn(
                      "relative w-16 h-16 rounded-lg overflow-hidden transition-all duration-200",
                      isActive
                        ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-background"
                        : "",
                    )}
                  >
                    {/* Base gradient simulating a photo */}
                    <div
                      className="absolute inset-0"
                      style={{ background: preset.gradient }}
                    />
                    {/* Filtered overlay — applies the preset visually */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: preset.gradient,
                        filter: preset.cssFilter,
                        mixBlendMode: "normal",
                      }}
                    />
                    {/* Lomo vignette simulation */}
                    {preset.id === "lomo" && (
                      <div
                        className="absolute inset-0 rounded-lg"
                        style={{
                          boxShadow: "inset 0 0 20px 8px rgba(0,0,0,0.6)",
                        }}
                      />
                    )}
                    {/* Active check */}
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                          <svg
                            viewBox="0 0 10 8"
                            className="w-3 h-3 fill-black"
                            aria-hidden="true"
                          >
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="black"
                              strokeWidth="1.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={cn(
                      "text-[10px] whitespace-nowrap font-medium transition-colors leading-tight",
                      isActive
                        ? "text-amber-400"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Manual adjustments ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Adjustments
          </h3>
          <button
            type="button"
            data-ocid="filters.reset_button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="space-y-3">
          {CONTROLS.map(({ key, label, min, max, step, unit }) => {
            const value = state.filters[key] as number;
            const isDefault =
              key === "brightness" || key === "contrast" || key === "saturation"
                ? value === 100
                : value === 0;
            return (
              <div key={String(key)} className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-[10px] w-20 flex-shrink-0 transition-colors",
                    isDefault ? "text-muted-foreground" : "text-amber-400/80",
                  )}
                >
                  {label}
                </span>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => updateFilter(key, v)}
                  min={min}
                  max={max}
                  step={step}
                  className="flex-1"
                />
                <span
                  className={cn(
                    "text-[10px] w-12 text-right tabular-nums transition-colors",
                    isDefault ? "text-muted-foreground" : "text-amber-400",
                  )}
                >
                  {value}
                  {unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
