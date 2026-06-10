/**
 * EffectsPanelV2 — Visual effects panel with 10 toggleable thumbnail options.
 * CSS/canvas based only — no ffmpeg.
 */
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const EFFECTS = [
  { id: "none", label: "None", emoji: "🎞️", desc: "No effect" },
  { id: "blur", label: "Blur", emoji: "💧", desc: "Soft blur" },
  { id: "pixelate", label: "Pixelate", emoji: "🟦", desc: "Pixel art look" },
  { id: "film-grain", label: "Film Grain", emoji: "📽️", desc: "Vintage grain" },
  { id: "glitch", label: "Glitch", emoji: "⚡", desc: "Digital distortion" },
  { id: "vignette", label: "Vignette", emoji: "🔮", desc: "Dark edge frame" },
  { id: "vintage", label: "Vintage", emoji: "🌅", desc: "Old film sepia" },
  { id: "zoom", label: "Zoom", emoji: "🔍", desc: "Slow zoom in" },
  { id: "shake", label: "Shake", emoji: "📳", desc: "Camera shake" },
  { id: "bokeh", label: "Bokeh", emoji: "✨", desc: "Soft glow blur" },
];

export default function EffectsPanelV2({ state, onUpdate }: Props) {
  const toggleEffect = (id: string) => {
    if (id === "none") {
      onUpdate({ activeEffects: [] });
      return;
    }
    const current = state.activeEffects;
    const updated = current.includes(id)
      ? current.filter((e) => e !== id)
      : [...current, id];
    onUpdate({ activeEffects: updated });
  };

  const isActive = (id: string) => {
    if (id === "none") return state.activeEffects.length === 0;
    return state.activeEffects.includes(id);
  };

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Visual Effects
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {EFFECTS.map((effect) => {
          const active = isActive(effect.id);
          return (
            <button
              type="button"
              key={effect.id}
              data-ocid={`editor.effect.${effect.id}`}
              onClick={() => toggleEffect(effect.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                active
                  ? "bg-amber-400/10 border-amber-400/50"
                  : "bg-surface-1 border-border/30 hover:border-amber-400/30"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl border ${
                  active
                    ? "border-amber-400/40 bg-amber-400/10"
                    : "border-border/20 bg-muted/30"
                }`}
              >
                {effect.emoji}
              </div>
              <span
                className={`text-[10px] font-medium text-center ${active ? "text-amber-400" : "text-muted-foreground"}`}
              >
                {effect.label}
              </span>
            </button>
          );
        })}
      </div>

      {state.activeEffects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {state.activeEffects.map((id) => {
            const ef = EFFECTS.find((e) => e.id === id);
            return ef ? (
              <span
                key={id}
                className="flex items-center gap-1 text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded-full px-2.5 py-0.5"
              >
                {ef.emoji} {ef.label}
              </span>
            ) : null;
          })}
          <button
            type="button"
            onClick={() => onUpdate({ activeEffects: [] })}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
