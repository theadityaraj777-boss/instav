/**
 * RotateFlipPanel — Four action buttons: rotate CW/CCW, flip H/V.
 * Applied as CSS transform on the preview canvas.
 */
import {
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

export default function RotateFlipPanel({ state, onUpdate }: Props) {
  const rotateCW = () => {
    onUpdate({ rotation: (state.rotation + 90) % 360 });
  };

  const rotateCCW = () => {
    onUpdate({ rotation: (state.rotation - 90 + 360) % 360 });
  };

  const flipH = () => {
    onUpdate({ flipH: !state.flipH });
  };

  const flipV = () => {
    onUpdate({ flipV: !state.flipV });
  };

  const reset = () => {
    onUpdate({ rotation: 0, flipH: false, flipV: false });
  };

  const ACTIONS = [
    {
      label: "Rotate CW",
      icon: RotateCw,
      onClick: rotateCW,
      ocid: "rotate_cw",
      active: false,
    },
    {
      label: "Rotate CCW",
      icon: RotateCcw,
      onClick: rotateCCW,
      ocid: "rotate_ccw",
      active: false,
    },
    {
      label: "Flip H",
      icon: FlipHorizontal,
      onClick: flipH,
      ocid: "flip_h",
      active: state.flipH,
    },
    {
      label: "Flip V",
      icon: FlipVertical,
      onClick: flipV,
      ocid: "flip_v",
      active: state.flipV,
    },
  ];

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Rotate &amp; Flip
      </h3>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ label, icon: Icon, onClick, ocid, active }) => (
          <button
            type="button"
            key={ocid}
            data-ocid={`editor.${ocid}_button`}
            onClick={onClick}
            className={`flex flex-col items-center gap-2 py-5 rounded-2xl border transition-all duration-200 ${
              active
                ? "border-amber-400/60 bg-amber-400/10"
                : "border-border/30 bg-surface-1 hover:border-amber-400/30 hover:bg-muted/50"
            }`}
          >
            <Icon
              className={`w-6 h-6 ${active ? "text-amber-400" : "text-muted-foreground"}`}
            />
            <span
              className={`text-xs font-medium ${active ? "text-amber-400" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Current state display */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-border/30">
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Rotation</p>
          <p className="text-lg font-bold text-amber-400 tabular-nums">
            {state.rotation}°
          </p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Flip</p>
          <p className="text-sm font-semibold text-foreground">
            {!state.flipH && !state.flipV
              ? "None"
              : [state.flipH && "H", state.flipV && "V"]
                  .filter(Boolean)
                  .join(" + ")}
          </p>
        </div>
      </div>

      {/* Reset */}
      {(state.rotation !== 0 || state.flipH || state.flipV) && (
        <button
          type="button"
          data-ocid="editor.rotate_reset_button"
          onClick={reset}
          className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-1"
        >
          Reset rotation &amp; flip
        </button>
      )}
    </div>
  );
}
