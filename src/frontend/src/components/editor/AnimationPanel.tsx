/**
 * AnimationPanel — Grid of CSS animation presets for in/out animations.
 * Applied as CSS @keyframes on the preview canvas wrapper.
 */
import { Slider } from "@/components/ui/slider";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const IN_ANIMATIONS = [
  { id: "none", label: "None", icon: "⊘" },
  { id: "fadeIn", label: "Fade In", icon: "✦" },
  { id: "slideInLeft", label: "Slide ←", icon: "←" },
  { id: "slideInRight", label: "Slide →", icon: "→" },
  { id: "slideInUp", label: "Slide ↑", icon: "↑" },
  { id: "slideInDown", label: "Slide ↓", icon: "↓" },
  { id: "zoomIn", label: "Zoom In", icon: "⊕" },
  { id: "bounceIn", label: "Bounce", icon: "⤨" },
  { id: "rotateIn", label: "Rotate", icon: "↺" },
  { id: "flipIn", label: "Flip", icon: "⟳" },
];

const OUT_ANIMATIONS = [
  { id: "none", label: "None", icon: "⊘" },
  { id: "fadeOut", label: "Fade Out", icon: "✦" },
  { id: "slideOutLeft", label: "Slide ←", icon: "←" },
  { id: "slideOutRight", label: "Slide →", icon: "→" },
  { id: "slideOutUp", label: "Slide ↑", icon: "↑" },
  { id: "slideOutDown", label: "Slide ↓", icon: "↓" },
  { id: "zoomOut", label: "Zoom Out", icon: "⊖" },
  { id: "bounceOut", label: "Bounce", icon: "⤨" },
  { id: "rotateOut", label: "Rotate", icon: "↻" },
  { id: "flipOut", label: "Flip", icon: "⟲" },
  { id: "flash", label: "Flash", icon: "⚡" },
];

export default function AnimationPanel({ state, onUpdate }: Props) {
  const animIn = state.animationIn ?? "none";
  const animOut = state.animationOut ?? "none";
  const animDuration = state.animationDuration ?? 0.6;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Animations
      </h3>

      {/* Duration */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">
          Duration
        </span>
        <Slider
          data-ocid="editor.animation.duration_slider"
          value={[animDuration]}
          onValueChange={([v]) => onUpdate({ animationDuration: v })}
          min={0.3}
          max={2}
          step={0.1}
          className="flex-1"
        />
        <span className="text-[10px] text-amber-400 tabular-nums w-10 text-right">
          {animDuration.toFixed(1)}s
        </span>
      </div>

      {/* In animations */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          Entrance
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {IN_ANIMATIONS.map((anim) => (
            <button
              type="button"
              key={anim.id}
              data-ocid={`editor.animation.in.${anim.id}`}
              onClick={() => onUpdate({ animationIn: anim.id })}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all ${
                animIn === anim.id
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-400"
                  : "border-border/30 bg-surface-1 text-muted-foreground hover:border-amber-400/30 hover:text-foreground"
              }`}
            >
              <span className="text-base leading-none">{anim.icon}</span>
              <span className="text-[9px] font-medium leading-tight">
                {anim.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Out animations */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          Exit
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {OUT_ANIMATIONS.map((anim) => (
            <button
              type="button"
              key={`out-${anim.id}`}
              data-ocid={`editor.animation.out.${anim.id}`}
              onClick={() => onUpdate({ animationOut: anim.id })}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all ${
                animOut === anim.id
                  ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                  : "border-border/30 bg-surface-1 text-muted-foreground hover:border-cyan-400/30 hover:text-foreground"
              }`}
            >
              <span className="text-base leading-none">{anim.icon}</span>
              <span className="text-[9px] font-medium leading-tight">
                {anim.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Current selection summary */}
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-lg bg-surface-1 border border-amber-400/20 text-center">
          <p className="text-[9px] text-muted-foreground">In</p>
          <p className="text-xs font-semibold text-amber-400 truncate">
            {animIn}
          </p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-surface-1 border border-cyan-400/20 text-center">
          <p className="text-[9px] text-muted-foreground">Out</p>
          <p className="text-xs font-semibold text-cyan-400 truncate">
            {animOut}
          </p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-surface-1 border border-border/20 text-center">
          <p className="text-[9px] text-muted-foreground">Time</p>
          <p className="text-xs font-semibold text-foreground">
            {animDuration.toFixed(1)}s
          </p>
        </div>
      </div>

      {(animIn !== "none" || animOut !== "none") && (
        <button
          type="button"
          onClick={() =>
            onUpdate({ animationIn: "none", animationOut: "none" })
          }
          className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-1"
        >
          Clear animations
        </button>
      )}
    </div>
  );
}
