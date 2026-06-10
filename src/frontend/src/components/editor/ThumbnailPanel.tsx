/**
 * ThumbnailPanel — Upload a thumbnail for the current video/image post.
 * Stores the thumbnail as an object URL in editor state.
 * Target resolution: 1280×720 for feed, 1080×1920 for ShortSport.
 */
import { Image, Upload, X } from "lucide-react";
import { useRef } from "react";

interface ThumbnailPanelProps {
  thumbnailUrl: string | null;
  destination: "feed" | "shortsport";
  onThumbnailChange: (url: string | null) => void;
}

export default function ThumbnailPanel({
  thumbnailUrl,
  destination,
  onThumbnailChange,
}: ThumbnailPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetRes = destination === "shortsport" ? "1080×1920" : "1280×720";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    const url = URL.createObjectURL(file);
    onThumbnailChange(url);
    e.target.value = "";
  };

  const clearThumbnail = () => {
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    onThumbnailChange(null);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Thumbnail
        </h3>
        <span className="text-[10px] text-muted-foreground/60 bg-surface-1 px-2 py-0.5 rounded-md border border-border/30">
          {targetRes}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        This image will appear as the video cover in the feed.
        {destination === "shortsport" &&
          " Thumbnails are not shown in the ShortSport tab."}
      </p>

      {thumbnailUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-amber-400/30">
          <img
            src={thumbnailUrl}
            alt="Thumbnail preview"
            className="w-full object-cover"
            style={{
              maxHeight: destination === "shortsport" ? 160 : 120,
              objectPosition: "center",
            }}
          />
          <button
            type="button"
            onClick={clearThumbnail}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
            aria-label="Remove thumbnail"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
            <p className="text-[10px] text-white/80">
              Thumbnail set • {targetRes}
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-ocid="editor.thumbnail.upload_button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-8 rounded-xl border-2 border-dashed border-amber-400/30 flex flex-col items-center gap-3 hover:border-amber-400/60 hover:bg-amber-400/5 transition-all duration-200 group"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.78 0.16 75 / 0.12)" }}
          >
            <Image className="w-6 h-6 text-amber-400/70 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
              Upload thumbnail
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              JPG or PNG • recommended {targetRes}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-400/30 bg-amber-400/8">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">
              Choose Image
            </span>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
