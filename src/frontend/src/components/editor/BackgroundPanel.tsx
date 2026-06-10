/**
 * BackgroundPanel — Background editor for portrait images:
 * Original, Color Fill, Blur, or Gradient options.
 */
import { Slider } from "@/components/ui/slider";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

type BgMode = MediaEditorState["bgMode"];

const BG_MODES: { id: BgMode; label: string; emoji: string; desc: string }[] = [
  { id: "original", label: "Original", emoji: "🖼️", desc: "No background" },
  { id: "color", label: "Color Fill", emoji: "🎨", desc: "Solid color" },
  { id: "blur", label: "Blur BG", emoji: "💧", desc: "Blurred version" },
  { id: "gradient", label: "Gradient", emoji: "🌈", desc: "Gradient fill" },
];

const GRADIENT_PRESETS = [
  {
    id: "gold-cyan",
    label: "Gold → Cyan",
    value: "linear-gradient(135deg,#f5c842,#06b6d4)",
  },
  {
    id: "purple-pink",
    label: "Purple → Pink",
    value: "linear-gradient(135deg,#8b5cf6,#ec4899)",
  },
  {
    id: "sunset",
    label: "Sunset",
    value: "linear-gradient(135deg,#f97316,#ef4444)",
  },
  {
    id: "ocean",
    label: "Ocean",
    value: "linear-gradient(135deg,#0ea5e9,#2dd4bf)",
  },
  {
    id: "forest",
    label: "Forest",
    value: "linear-gradient(135deg,#16a34a,#84cc16)",
  },
  {
    id: "night",
    label: "Night",
    value: "linear-gradient(135deg,#1e1b4b,#312e81)",
  },
];

export default function BackgroundPanel({ state, onUpdate }: Props) {
  return (
    <div className="p-3 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Background (Portrait)
      </h3>

      {/* Mode selector */}
      <div className="grid grid-cols-4 gap-2">
        {BG_MODES.map((m) => (
          <button
            type="button"
            key={m.id}
            data-ocid={`editor.bg.${m.id}`}
            onClick={() => onUpdate({ bgMode: m.id })}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
              state.bgMode === m.id
                ? "border-amber-400/60 bg-amber-400/10"
                : "border-border/30 bg-surface-1 hover:border-amber-400/30"
            }`}
          >
            <span className="text-xl">{m.emoji}</span>
            <span
              className={`text-[10px] font-medium ${state.bgMode === m.id ? "text-amber-400" : "text-muted-foreground"}`}
            >
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* Color fill */}
      {state.bgMode === "color" && (
        <div>
          <span className="text-[10px] text-muted-foreground block mb-2">
            Fill Color
          </span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={state.bgColor}
              onChange={(e) => onUpdate({ bgColor: e.target.value })}
              className="w-10 h-10 rounded-xl cursor-pointer border border-border/40"
              title="Background color"
            />
            <div
              className="flex-1 h-10 rounded-xl border border-border/30"
              style={{ background: state.bgColor }}
            />
          </div>
        </div>
      )}

      {/* Blur background */}
      {state.bgMode === "blur" && (
        <div>
          <span className="text-[10px] text-muted-foreground block mb-2">
            Blur Amount
          </span>
          <div className="flex items-center gap-3">
            <Slider
              value={[state.bgBlur]}
              onValueChange={([v]) => onUpdate({ bgBlur: v })}
              min={1}
              max={40}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">
              {state.bgBlur}px
            </span>
          </div>
        </div>
      )}

      {/* Gradient picker */}
      {state.bgMode === "gradient" && (
        <div>
          <span className="text-[10px] text-muted-foreground block mb-2">
            Gradient Preset
          </span>
          <div className="grid grid-cols-3 gap-2">
            {GRADIENT_PRESETS.map((g) => (
              <button
                type="button"
                key={g.id}
                onClick={() => onUpdate({ bgGradient: g.value })}
                className={`rounded-xl h-12 border-2 transition-all ${
                  state.bgGradient === g.value
                    ? "border-white scale-105"
                    : "border-transparent hover:border-white/30"
                }`}
                style={{ background: g.value }}
                aria-label={g.label}
                title={g.label}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {GRADIENT_PRESETS.find((g) => g.value === state.bgGradient)
              ?.label ?? "Custom"}
          </p>
        </div>
      )}

      {state.bgMode === "original" && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Original media shown as-is with no background fill.
        </p>
      )}
    </div>
  );
}
