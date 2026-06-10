/**
 * CaptionPanel — Caption/subtitle overlay configuration:
 * text, 3 style presets, color, background, font size, vertical position.
 */
import { Slider } from "@/components/ui/slider";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const STYLE_PRESETS: {
  id: "classic" | "neon" | "bold";
  label: string;
  emoji: string;
  desc: string;
}[] = [
  { id: "classic", label: "Classic", emoji: "📝", desc: "Clean white text" },
  { id: "neon", label: "Neon", emoji: "💡", desc: "Glowing neon glow" },
  { id: "bold", label: "Bold", emoji: "💪", desc: "Heavy drop shadow" },
];

const PRESET_COLORS = [
  "#ffffff",
  "#f5c842",
  "#06b6d4",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#000000",
  "#f97316",
];

export default function CaptionPanel({ state, onUpdate }: Props) {
  const cap = state.caption;

  const update = (changes: Partial<typeof cap>) => {
    onUpdate({ caption: { ...cap, ...changes } });
  };

  return (
    <div className="p-3 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Caption
      </h3>

      {/* Caption text input */}
      <div>
        <span className="text-[10px] text-muted-foreground block mb-1.5">
          Caption text
        </span>
        <textarea
          data-ocid="editor.caption_text_input"
          value={cap.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Enter caption / subtitles…"
          rows={2}
          className="w-full bg-surface-1 border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-400/50 transition-colors resize-none"
        />
      </div>

      {/* Style presets */}
      <div>
        <span className="text-[10px] text-muted-foreground block mb-2">
          Style
        </span>
        <div className="flex gap-2">
          {STYLE_PRESETS.map((s) => (
            <button
              type="button"
              key={s.id}
              data-ocid={`editor.caption_style.${s.id}`}
              onClick={() => update({ style: s.id })}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                cap.style === s.id
                  ? "border-amber-400/60 bg-amber-400/10"
                  : "border-border/30 bg-surface-1 hover:border-amber-400/30"
              }`}
            >
              <span className="text-lg">{s.emoji}</span>
              <span
                className={`text-[10px] font-medium ${cap.style === s.id ? "text-amber-400" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font color */}
      <div>
        <span className="text-[10px] text-muted-foreground block mb-1.5">
          Text color
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => update({ color: c })}
              className={`w-7 h-7 rounded-full border-2 transition-all ${cap.color === c ? "border-white scale-110" : "border-border/30"}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={cap.color}
            onChange={(e) => update({ color: e.target.value })}
            className="w-7 h-7 rounded-full cursor-pointer bg-transparent border border-border/40"
            title="Custom color"
          />
        </div>
      </div>

      {/* Background color + opacity */}
      <div>
        <span className="text-[10px] text-muted-foreground block mb-1.5">
          Background
        </span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={cap.bgColor}
            onChange={(e) => update({ bgColor: e.target.value })}
            className="w-8 h-8 rounded-lg cursor-pointer border border-border/40"
            title="Background color"
          />
          <Slider
            value={[cap.bgOpacity]}
            onValueChange={([v]) => update({ bgOpacity: v })}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-10 text-right tabular-nums">
            {cap.bgOpacity}% opacity
          </span>
        </div>
      </div>

      {/* Font size */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-14">
          Font size
        </span>
        <Slider
          value={[cap.fontSize]}
          onValueChange={([v]) => update({ fontSize: v })}
          min={14}
          max={48}
          step={1}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
          {cap.fontSize}px
        </span>
      </div>

      {/* Vertical position */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-14">Position</span>
        <Slider
          value={[cap.verticalPos]}
          onValueChange={([v]) => update({ verticalPos: v })}
          min={10}
          max={90}
          step={1}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
          {cap.verticalPos}%
        </span>
      </div>

      {/* Preview */}
      {cap.text && (
        <div
          className="w-full rounded-xl p-3 text-center text-sm"
          style={{
            color: cap.color,
            background: `${cap.bgColor}${Math.round((cap.bgOpacity / 100) * 255)
              .toString(16)
              .padStart(2, "0")}`,
            fontWeight: cap.style === "bold" ? 700 : 400,
            fontSize: `${Math.min(cap.fontSize, 20)}px`,
            textShadow:
              cap.style === "neon"
                ? `0 0 8px ${cap.color}, 0 0 16px ${cap.color}`
                : cap.style === "bold"
                  ? "1px 1px 4px rgba(0,0,0,0.8)"
                  : "none",
          }}
        >
          {cap.text}
        </div>
      )}
    </div>
  );
}
