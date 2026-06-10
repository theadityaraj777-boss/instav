/**
 * ReplacePanel — Replace the active clip's media source while preserving all edits.
 * Shows current ↔ new side-by-side with confirm.
 */
import { RefreshCw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
  onReplaceMedia?: (file: File) => void;
}

export default function ReplacePanel({
  state,
  onUpdate,
  onReplaceMedia,
}: Props) {
  const [replacementFile, setReplacementFile] = useState<File | null>(
    state.replacementFile ?? null,
  );
  const [replacementUrl, setReplacementUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (replacementUrl) URL.revokeObjectURL(replacementUrl);
    const url = URL.createObjectURL(file);
    setReplacementFile(file);
    setReplacementUrl(url);
    onUpdate({ replacementFile: file });
  };

  const handleConfirm = () => {
    if (!replacementFile) return;
    if (onReplaceMedia) {
      onReplaceMedia(replacementFile);
    }
    toast.success(
      `Clip replaced with "${replacementFile.name}". All edits preserved.`,
    );
    setReplacementFile(null);
    setReplacementUrl(null);
    onUpdate({ replacementFile: null });
  };

  const handleCancel = () => {
    if (replacementUrl) URL.revokeObjectURL(replacementUrl);
    setReplacementFile(null);
    setReplacementUrl(null);
    onUpdate({ replacementFile: null });
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Replace Clip
      </h3>

      {/* Before / After */}
      <div className="flex items-center gap-3">
        {/* Current */}
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground mb-1.5">Current</p>
          <div
            className="rounded-xl border border-border/30 overflow-hidden flex items-center justify-center"
            style={{ height: 80, background: "rgba(255,255,255,0.04)" }}
          >
            <span className="text-3xl">🎬</span>
          </div>
        </div>

        {/* Arrow */}
        <RefreshCw className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-4" />

        {/* New */}
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground mb-1.5">
            Replacement
          </p>
          <button
            type="button"
            className="rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-amber-400/50 w-full"
            style={{
              height: 80,
              background: replacementUrl
                ? "transparent"
                : "rgba(245,200,66,0.04)",
              borderColor: replacementUrl ? "rgba(245,200,66,0.5)" : undefined,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {replacementUrl ? (
              replacementFile?.type.startsWith("video/") ? (
                <video
                  src={replacementUrl}
                  className="w-full h-full object-cover rounded-xl"
                  muted
                  playsInline
                >
                  <track kind="captions" />
                </video>
              ) : (
                <img
                  src={replacementUrl}
                  alt="Replacement preview"
                  className="w-full h-full object-cover rounded-xl"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-amber-400/60" />
                <span className="text-[10px] text-muted-foreground">
                  Select file
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Select button */}
      {!replacementFile && (
        <button
          type="button"
          data-ocid="editor.replace.upload_button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 font-semibold text-sm hover:bg-amber-400/20 transition-all"
        >
          <Upload className="w-4 h-4" />
          Choose Replacement File
        </button>
      )}

      {/* Confirm / cancel */}
      {replacementFile && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground text-center truncate px-2">
            "{replacementFile.name}"
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="editor.replace.confirm_button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 text-xs font-bold hover:bg-amber-400/20 transition-all"
            >
              ✓ Confirm Replace
            </button>
            <button
              type="button"
              data-ocid="editor.replace.cancel_button"
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl border border-border/40 bg-surface-1 text-muted-foreground text-xs hover:text-foreground transition-all"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            All filters, speed, text overlays and effects will be preserved.
          </p>
        </div>
      )}
    </div>
  );
}
