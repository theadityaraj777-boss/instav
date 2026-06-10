/**
 * OpacityPanel — Single slider (0–100) for the clip/image overall opacity.
 * Applied as CSS opacity on the main media element in real-time.
 */
import { Slider } from "@/components/ui/slider";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

export default function OpacityPanel({ state, onUpdate }: Props) {
  const opacity = state.clipOpacity ?? 100;

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Opacity
      </h3>

      {/* Big opacity display */}
      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-amber-400/30 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#f5c842,#e8a020)",
              opacity: opacity / 100,
            }}
          />
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 0 0 / 12px 12px",
              zIndex: -1,
            }}
          />
        </div>
        <div className="ml-6 text-center">
          <p className="text-4xl font-display font-bold text-amber-400 tabular-nums leading-none">
            {opacity}
          </p>
          <p className="text-xs text-muted-foreground mt-1">%</p>
        </div>
      </div>

      {/* Slider + numeric input */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">
          Opacity
        </span>
        <Slider
          data-ocid="editor.opacity.slider"
          value={[opacity]}
          onValueChange={([v]) => onUpdate({ clipOpacity: v })}
          min={0}
          max={100}
          step={1}
          className="flex-1"
        />
        <input
          type="number"
          data-ocid="editor.opacity.input"
          value={opacity}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, Number(e.target.value)));
            onUpdate({ clipOpacity: v });
          }}
          min={0}
          max={100}
          className="w-14 px-2 py-1 rounded-lg border border-border/40 bg-surface-1 text-xs text-foreground text-center tabular-nums focus:outline-none focus:border-amber-400/50"
        />
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 flex-wrap">
        {[25, 50, 75, 100].map((v) => (
          <button
            type="button"
            key={v}
            data-ocid={`editor.opacity.preset.${v}`}
            onClick={() => onUpdate({ clipOpacity: v })}
            className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
              opacity === v
                ? "border-amber-400/60 bg-amber-400/15 text-amber-400"
                : "border-border/30 bg-surface-1 text-muted-foreground hover:border-amber-400/30"
            }`}
          >
            {v}%
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-1 border border-border/30">
        <div className="flex-1 text-center">
          <p className="text-[9px] text-muted-foreground">Transparent</p>
          <p className="text-xs text-muted-foreground">0%</p>
        </div>
        <div className="w-full h-1 flex-1 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${opacity}%`,
              background: "linear-gradient(90deg,#f5c842,#06b6d4)",
            }}
          />
        </div>
        <div className="flex-1 text-center">
          <p className="text-[9px] text-muted-foreground">Opaque</p>
          <p className="text-xs text-amber-400">100%</p>
        </div>
      </div>

      {opacity !== 100 && (
        <button
          type="button"
          onClick={() => onUpdate({ clipOpacity: 100 })}
          className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-1"
        >
          Reset to 100%
        </button>
      )}
    </div>
  );
}
