/**
 * PipPanel — Picture-in-Picture overlay: upload image/video, control position,
 * scale, opacity.
 *
 * DRAG SUPPORT: The PiP overlay on the canvas is draggable via the same
 * drag system used for text/stickers. When the user drags the PiP on the canvas,
 * EditorPreviewCanvas fires onOverlayPositionChange('pip', 'pip', x, y) which
 * updates state.pip.x and state.pip.y in MediaEditorTab — flowing back here as
 * updated props, which update the X/Y sliders reactively.
 *
 * Quick positioning: Center button + 4 corner snap buttons.
 */
import { Slider } from "@/components/ui/slider";
import { MapPin, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

export default function PipPanel({ state, onUpdate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { pip } = state;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    const type = file.type.startsWith("video/") ? "video" : "image";
    onUpdate({ pip: { src, type, x: 60, y: 10, scale: 30, opacity: 100 } });
  };

  const update = (changes: Partial<NonNullable<typeof pip>>) => {
    if (!pip) return;
    onUpdate({ pip: { ...pip, ...changes } });
  };

  // Quick snap positions
  const snapTo = (x: number, y: number) => update({ x, y });

  return (
    <div className="p-3 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Picture-in-Picture
      </h3>

      {!pip ? (
        <button
          type="button"
          data-ocid="editor.pip_upload_button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed border-border hover:border-amber-400/50 bg-surface-1 transition-all"
        >
          <Upload className="w-7 h-7 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Upload image or video overlay
          </span>
          <span className="text-xs text-muted-foreground/70">
            JPG · PNG · MP4 · WebM
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          {/* Preview thumbnail */}
          <div className="relative rounded-xl overflow-hidden bg-black h-20">
            {pip.type === "image" ? (
              <img
                src={pip.src}
                alt="PiP"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={pip.src}
                className="w-full h-full object-contain"
                muted
                playsInline
                autoPlay
                loop
              >
                <track kind="captions" />
              </video>
            )}
            <button
              type="button"
              onClick={() => onUpdate({ pip: null })}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-red-500/80 transition-colors"
              aria-label="Remove PiP"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drag hint */}
          <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
            <span>💡</span>
            Drag the overlay on the preview to reposition
          </p>

          {/* Position display */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-1 border border-border/30">
            <MapPin className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground/70">
              Current position:
            </span>
            <span className="text-[10px] text-amber-400 font-semibold tabular-nums ml-auto">
              X {pip.x}% · Y {pip.y}%
            </span>
          </div>

          {/* Quick snap buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground block">
              Quick snap
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {/* Top row */}
              <button
                type="button"
                onClick={() => snapTo(5, 5)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to top-left"
              >
                ↖ Top-left
              </button>
              <button
                type="button"
                onClick={() => snapTo(35, 5)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to top-center"
              >
                ↑ Top
              </button>
              <button
                type="button"
                onClick={() => snapTo(65, 5)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to top-right"
              >
                ↗ Top-right
              </button>
              {/* Middle row */}
              <button
                type="button"
                onClick={() => snapTo(5, 40)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to left"
              >
                ← Left
              </button>
              <button
                type="button"
                onClick={() => snapTo(35, 40)}
                className="py-1.5 text-[9px] rounded-lg border border-amber-400/30 bg-amber-400/5 hover:border-amber-400/60 text-amber-400/80 transition-all font-semibold"
                aria-label="Center"
                data-ocid="editor.pip_center_button"
              >
                ⊕ Center
              </button>
              <button
                type="button"
                onClick={() => snapTo(65, 40)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to right"
              >
                → Right
              </button>
              {/* Bottom row */}
              <button
                type="button"
                onClick={() => snapTo(5, 70)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to bottom-left"
              >
                ↙ Bot-left
              </button>
              <button
                type="button"
                onClick={() => snapTo(35, 70)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to bottom-center"
              >
                ↓ Bottom
              </button>
              <button
                type="button"
                onClick={() => snapTo(65, 70)}
                className="py-1.5 text-[9px] rounded-lg border border-border/30 bg-surface-1 hover:border-amber-400/40 hover:text-amber-400 text-muted-foreground transition-all"
                aria-label="Snap to bottom-right"
              >
                ↘ Bot-right
              </button>
            </div>
          </div>

          {/* Position X */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-14">
              Position X
            </span>
            <Slider
              data-ocid="editor.pip_position_x"
              value={[pip.x]}
              onValueChange={([v]) => update({ x: v })}
              min={0}
              max={80}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {pip.x}%
            </span>
          </div>

          {/* Position Y */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-14">
              Position Y
            </span>
            <Slider
              data-ocid="editor.pip_position_y"
              value={[pip.y]}
              onValueChange={([v]) => update({ y: v })}
              min={0}
              max={80}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {pip.y}%
            </span>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-14">
              Scale
            </span>
            <Slider
              value={[pip.scale]}
              onValueChange={([v]) => update({ scale: v })}
              min={10}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {pip.scale}%
            </span>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-14">
              Opacity
            </span>
            <Slider
              value={[pip.opacity]}
              onValueChange={([v]) => update({ opacity: v })}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {pip.opacity}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-1 flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Replace overlay
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
