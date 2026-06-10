/**
 * CutoutPanel — Shape-based cutout masks using CSS clip-path.
 * Shapes: Circle, Star, Heart, Diamond, Triangle, Hexagon, Rectangle.
 */
import { Slider } from "@/components/ui/slider";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const SHAPE_PRESETS = [
  {
    id: "none",
    label: "None",
    icon: "⊘",
    clipPath: "none",
  },
  {
    id: "circle",
    label: "Circle",
    icon: "○",
    clipPath: "circle(45% at 50% 50%)",
  },
  {
    id: "star",
    label: "Star",
    icon: "★",
    clipPath:
      "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  },
  {
    id: "heart",
    label: "Heart",
    icon: "♥",
    clipPath:
      "polygon(50% 80%, 15% 40%, 10% 25%, 20% 10%, 35% 8%, 50% 20%, 65% 8%, 80% 10%, 90% 25%, 85% 40%)",
  },
  {
    id: "diamond",
    label: "Diamond",
    icon: "◆",
    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  },
  {
    id: "triangle",
    label: "Triangle",
    icon: "▲",
    clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
  },
  {
    id: "hexagon",
    label: "Hexagon",
    icon: "⬡",
    clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    icon: "▬",
    clipPath: "inset(10% 5% 10% 5% round 8px)",
  },
];

export default function CutoutPanel({ state, onUpdate }: Props) {
  const cutoutShape = state.cutoutShape ?? "none";
  const cutoutFeather = state.cutoutFeather ?? 0;
  const removeBackground = state.removeBackground ?? false;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Cutout / Shape Mask
      </h3>

      {/* Shape grid */}
      <div className="grid grid-cols-4 gap-2">
        {SHAPE_PRESETS.map((shape) => (
          <button
            type="button"
            key={shape.id}
            data-ocid={`editor.cutout.shape.${shape.id}`}
            onClick={() => onUpdate({ cutoutShape: shape.id })}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
              cutoutShape === shape.id
                ? "border-amber-400/60 bg-amber-400/15 text-amber-400"
                : "border-border/30 bg-surface-1 text-muted-foreground hover:border-amber-400/30 hover:text-foreground"
            }`}
          >
            <span className="text-xl leading-none">{shape.icon}</span>
            <span className="text-[9px] font-medium">{shape.label}</span>
          </button>
        ))}
      </div>

      {/* Feather (softness) */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">
          Feather
        </span>
        <Slider
          data-ocid="editor.cutout.feather_slider"
          value={[cutoutFeather]}
          onValueChange={([v]) => onUpdate({ cutoutFeather: v })}
          min={0}
          max={20}
          step={1}
          className="flex-1"
          disabled={cutoutShape === "none"}
        />
        <span className="text-[10px] text-amber-400 tabular-nums w-10 text-right">
          {cutoutFeather}px
        </span>
      </div>

      {/* Remove background toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-1 border border-border/30">
        <div>
          <p className="text-xs font-medium text-foreground">
            Remove Background
          </p>
          <p className="text-[10px] text-muted-foreground">
            Show transparent / black behind cutout
          </p>
        </div>
        <button
          type="button"
          data-ocid="editor.cutout.remove_background_toggle"
          onClick={() => onUpdate({ removeBackground: !removeBackground })}
          className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
            removeBackground ? "bg-amber-400" : "bg-muted"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow ${
              removeBackground ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Preview hint */}
      {cutoutShape !== "none" && (
        <div className="p-2 rounded-lg border border-amber-400/20 bg-amber-400/5">
          <p className="text-[10px] text-amber-400 text-center">
            ✓ {SHAPE_PRESETS.find((s) => s.id === cutoutShape)?.label} mask
            applied
            {removeBackground ? " · background removed" : ""}
            {cutoutFeather > 0 ? ` · ${cutoutFeather}px feather` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
