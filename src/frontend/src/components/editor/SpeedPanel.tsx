/**
 * SpeedPanel — Video playback speed preset buttons (0.5x–2x).
 */
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const SPEED_PRESETS = [
  { label: "0.5×", value: 0.5 },
  { label: "0.75×", value: 0.75 },
  { label: "1×", value: 1 },
  { label: "1.25×", value: 1.25 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
];

export default function SpeedPanel({ state, onUpdate }: Props) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Playback Speed
      </h3>

      <div className="flex flex-wrap gap-2 justify-center">
        {SPEED_PRESETS.map(({ label, value }) => {
          const isActive = state.speed === value;
          return (
            <button
              type="button"
              key={value}
              data-ocid={`editor.speed.${label}`}
              onClick={() => onUpdate({ speed: value })}
              className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "border-amber-400 text-amber-400 bg-amber-400/10 shadow-[0_0_12px_oklch(0.78_0.16_75/0.3)]"
                  : "border-border/40 text-muted-foreground bg-surface-1 hover:border-amber-400/40 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="text-center">
          <p className="text-3xl font-display font-bold text-amber-400">
            {state.speed}×
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {state.speed < 1
              ? "Slow motion"
              : state.speed > 1
                ? "Fast forward"
                : "Normal speed"}
          </p>
        </div>
      </div>

      {state.speed !== 1 && (
        <button
          type="button"
          onClick={() => onUpdate({ speed: 1 })}
          className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-1"
        >
          Reset to 1×
        </button>
      )}
    </div>
  );
}
