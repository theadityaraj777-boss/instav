/**
 * TextOverlayPanel — Add, configure, and remove text overlays on the canvas.
 *
 * DRAG FIX: Text is draggable on the preview canvas. When the user drags text
 * on the canvas, EditorPreviewCanvas fires onOverlayPositionChange which updates
 * x/y in MediaEditorTab state — which flows back here as updated props.
 *
 * This panel also provides:
 * - Position X/Y sliders (0–100%) as a fallback for precision positioning
 * - Current position display per overlay: "Position: 50%, 30%"
 * - Hint: "💡 Drag text on the preview to reposition"
 */
import { Slider } from "@/components/ui/slider";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MediaEditorState, TextOverlay } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const PRESET_COLORS = [
  "#ffffff",
  "#000000",
  "#f5c842",
  "#06b6d4",
  "#e8a020",
  "#ef4444",
  "#8b5cf6",
  "#22c55e",
];
const FONT_OPTIONS: { value: TextOverlay["fontFamily"]; label: string }[] = [
  { value: "serif", label: "Serif" },
  { value: "sans", label: "Sans" },
  { value: "mono", label: "Mono" },
];

export default function TextOverlayPanel({ state, onUpdate }: Props) {
  const [selId, setSelId] = useState<string | null>(null);
  const [newText, setNewText] = useState("Your text here");

  const addText = () => {
    const overlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: newText || "Text",
      x: 50,
      y: 50,
      fontSize: 28,
      fontFamily: "sans",
      color: "#ffffff",
      opacity: 100,
    };
    const updated = [...state.textOverlays, overlay];
    onUpdate({ textOverlays: updated });
    setSelId(overlay.id);
    setNewText("");
  };

  const updateOverlay = (id: string, changes: Partial<TextOverlay>) => {
    onUpdate({
      textOverlays: state.textOverlays.map((t) =>
        t.id === id ? { ...t, ...changes } : t,
      ),
    });
  };

  const removeOverlay = (id: string) => {
    onUpdate({ textOverlays: state.textOverlays.filter((t) => t.id !== id) });
    if (selId === id) setSelId(null);
  };

  const selected = state.textOverlays.find((t) => t.id === selId);

  return (
    <div className="p-3 space-y-4">
      {/* Add text */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Add Text
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            data-ocid="editor.text_input"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter text…"
            className="flex-1 bg-surface-1 border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-400/50 transition-colors"
            onKeyDown={(e) => e.key === "Enter" && addText()}
          />
          <button
            type="button"
            data-ocid="editor.add_text_button"
            onClick={addText}
            disabled={!newText.trim()}
            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 transition-all"
            style={{
              background: "linear-gradient(135deg,#f5c842,#06b6d4)",
              color: "oklch(0.05 0.008 265)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {/* Drag hint */}
        <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
          <span>💡</span>
          Drag text on the preview to reposition
        </p>
      </div>

      {/* Text list */}
      {state.textOverlays.length > 0 && (
        <div className="space-y-1.5">
          {state.textOverlays.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`w-full flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-left ${
                selId === t.id
                  ? "border-amber-400/60 bg-amber-400/10"
                  : "border-border/30 bg-surface-1 hover:border-amber-400/30"
              }`}
              onClick={() => setSelId(t.id === selId ? null : t.id)}
            >
              <span
                className="flex-1 text-sm truncate"
                style={{
                  color: t.color,
                  fontFamily:
                    t.fontFamily === "serif"
                      ? "serif"
                      : t.fontFamily === "mono"
                        ? "monospace"
                        : "sans-serif",
                }}
              >
                {t.text}
              </span>
              {/* Position badge */}
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50 tabular-nums flex-shrink-0">
                <MapPin className="w-2.5 h-2.5" />
                {Math.round(t.x)}%, {Math.round(t.y)}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOverlay(t.id);
                }}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                aria-label="Remove text"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Selected text controls */}
      {selected && (
        <div className="space-y-3 border-t border-border/30 pt-3">
          {/* Edit text */}
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">
              Edit text
            </span>
            <input
              type="text"
              value={selected.text}
              onChange={(e) =>
                updateOverlay(selected.id, { text: e.target.value })
              }
              className="w-full bg-surface-1 border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>

          {/* Font selector */}
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">
              Font
            </span>
            <div className="flex gap-1.5">
              {FONT_OPTIONS.map((f) => (
                <button
                  type="button"
                  key={f.value}
                  onClick={() =>
                    updateOverlay(selected.id, { fontFamily: f.value })
                  }
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    selected.fontFamily === f.value
                      ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                      : "border-border/30 bg-surface-1 text-muted-foreground hover:border-amber-400/30"
                  }`}
                  style={{
                    fontFamily:
                      f.value === "serif"
                        ? "serif"
                        : f.value === "mono"
                          ? "monospace"
                          : "sans-serif",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">
              Color
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => updateOverlay(selected.id, { color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    selected.color === c
                      ? "border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={selected.color}
                onChange={(e) =>
                  updateOverlay(selected.id, { color: e.target.value })
                }
                className="w-7 h-7 rounded-full border-2 border-border/40 cursor-pointer bg-transparent"
                title="Custom color"
              />
            </div>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-14">Size</span>
            <Slider
              value={[selected.fontSize]}
              onValueChange={([v]) =>
                updateOverlay(selected.id, { fontSize: v })
              }
              min={10}
              max={80}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {selected.fontSize}px
            </span>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-14">
              Opacity
            </span>
            <Slider
              value={[selected.opacity]}
              onValueChange={([v]) =>
                updateOverlay(selected.id, { opacity: v })
              }
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {selected.opacity}%
            </span>
          </div>

          {/* Position X slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">
                Position
              </span>
              <span className="text-[9px] text-muted-foreground/60 tabular-nums">
                X: {Math.round(selected.x)}% · Y: {Math.round(selected.y)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-5">X</span>
                <Slider
                  data-ocid="editor.text_position_x"
                  value={[selected.x]}
                  onValueChange={([v]) => updateOverlay(selected.id, { x: v })}
                  min={5}
                  max={95}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                  {Math.round(selected.x)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-5">Y</span>
                <Slider
                  data-ocid="editor.text_position_y"
                  value={[selected.y]}
                  onValueChange={([v]) => updateOverlay(selected.id, { y: v })}
                  min={5}
                  max={95}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                  {Math.round(selected.y)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.textOverlays.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-3xl mb-2">✏️</p>
          <p className="text-sm">Add text overlays to your media</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            💡 Drag text on the preview to reposition
          </p>
        </div>
      )}
    </div>
  );
}
