/**
 * EditorTimeline — Professional video editing timeline with multi-clip support,
 * real video frame thumbnails, draggable playhead, trim handles (real-time update),
 * context menu, zoom, clear-all, and empty state.
 */
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Clip, EditorState } from "@/pages/EditorPage";
import { Copy, Plus, Scissors, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function MoveUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="17 11 12 6 7 11" />
      <polyline points="17 18 12 13 7 18" />
    </svg>
  );
}
function MoveDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="7 13 12 18 17 13" />
      <polyline points="7 6 12 11 17 6" />
    </svg>
  );
}

interface EditorTimelineProps {
  state: EditorState;
  onUpdate: (updates: Partial<EditorState>) => void;
}

const CLIP_GRADIENTS = [
  "from-amber-500/90 to-amber-600/80",
  "from-sky-500/90 to-sky-600/80",
  "from-violet-500/90 to-violet-600/80",
  "from-emerald-500/90 to-emerald-600/80",
  "from-rose-500/90 to-rose-600/80",
  "from-cyan-500/90 to-cyan-600/80",
  "from-orange-500/90 to-orange-600/80",
  "from-pink-500/90 to-pink-600/80",
  "from-teal-500/90 to-teal-600/80",
  "from-indigo-500/90 to-indigo-600/80",
];

function clipGradient(index: number) {
  return CLIP_GRADIENTS[index % CLIP_GRADIENTS.length];
}

interface ContextMenu {
  clipId: string;
  x: number;
  y: number;
}

function rebuildStartTimes(clips: Clip[]): Clip[] {
  let cursor = 0;
  return clips.map((c) => {
    const updated = { ...c, startTime: cursor };
    cursor += c.duration;
    return updated;
  });
}

// ── Video frame extractor ─────────────────────────────────────────────────────
async function extractVideoFrames(
  src: string,
  count: number,
): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const frames: string[] = [];

    video.onloadedmetadata = async () => {
      canvas.width = 80;
      canvas.height = 45;
      const duration = video.duration;
      if (!ctx || !Number.isFinite(duration) || duration <= 0) {
        resolve([]);
        return;
      }
      for (let i = 0; i < count; i++) {
        const t = (i / Math.max(1, count - 1)) * duration * 0.95;
        await new Promise<void>((res) => {
          video.onseeked = () => res();
          video.currentTime = t;
        });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.6));
      }
      video.src = "";
      resolve(frames);
    };
    video.onerror = () => resolve([]);
    video.src = src;
  });
}

// ── Clip thumbnail strip ──────────────────────────────────────────────────────
function ClipFrameStrip({
  clip,
  width,
  height,
  gradient,
}: {
  clip: Clip;
  width: number;
  height: number;
  gradient: string;
}) {
  const [frames, setFrames] = useState<string[]>([]);
  const srcRef = useRef("");

  useEffect(() => {
    const src = clip.src;
    if (!src || !src.startsWith("blob:") || srcRef.current === src) return;
    srcRef.current = src;
    const frameCount = Math.max(3, Math.round(width / 40));
    extractVideoFrames(src, frameCount).then(setFrames);
  }, [clip.src, width]);

  if (frames.length === 0) {
    return (
      <div
        className={cn("w-full h-full rounded-lg bg-gradient-to-r", gradient)}
        style={{ opacity: 0.7 }}
      />
    );
  }

  return (
    <div className="flex w-full h-full overflow-hidden rounded-lg">
      {frames.map((frame, i) => (
        <img
          // biome-ignore lint/suspicious/noArrayIndexKey: positional frame thumbnails
          key={i}
          src={frame}
          alt=""
          aria-hidden="true"
          className="object-cover flex-1"
          style={{ height, minWidth: 0 }}
          draggable={false}
        />
      ))}
    </div>
  );
}

export default function EditorTimeline({
  state,
  onUpdate,
}: EditorTimelineProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const [activeClipId, setActiveClipId] = useState<string | null>(
    state.clips[0]?.id ?? null,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Trim handle drag state
  const trimDragRef = useRef<{
    clipId: string;
    edge: "left" | "right";
    startX: number;
    originalDuration: number;
  } | null>(null);

  const PX_PER_SEC = 60 * state.zoom;
  const totalDuration = state.clips.reduce((acc, c) => acc + c.duration, 0);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Playhead drag
  const scrubToX = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const time = Math.max(0, Math.min(totalDuration, x / PX_PER_SEC));
      onUpdate({ currentTime: time });
    },
    [totalDuration, PX_PER_SEC, onUpdate],
  );

  useEffect(() => {
    if (!isDraggingPlayhead) return;
    const onMouseMove = (e: MouseEvent) => scrubToX(e.clientX);
    const onTouchMove = (e: TouchEvent) => scrubToX(e.touches[0].clientX);
    const onUp = () => setIsDraggingPlayhead(false);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [isDraggingPlayhead, scrubToX]);

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(totalDuration, x / PX_PER_SEC));
    onUpdate({ currentTime: time });
  };

  // ── Trim handle drag (real-time)
  useEffect(() => {
    const onMove = (clientX: number) => {
      const t = trimDragRef.current;
      if (!t) return;
      const clip = state.clips.find((c) => c.id === t.clipId);
      if (!clip) return;
      const dx = (clientX - t.startX) / PX_PER_SEC;
      if (t.edge === "left") {
        const newDuration = Math.max(0.5, t.originalDuration - dx);
        const updatedClips = rebuildStartTimes(
          state.clips.map((c) =>
            c.id === t.clipId ? { ...c, duration: newDuration } : c,
          ),
        );
        onUpdate({
          clips: updatedClips,
          totalDuration: updatedClips.reduce((a, c) => a + c.duration, 0),
          currentTime: clip.startTime,
        });
      } else {
        const newDuration = Math.max(0.5, t.originalDuration + dx);
        const updatedClips = rebuildStartTimes(
          state.clips.map((c) =>
            c.id === t.clipId ? { ...c, duration: newDuration } : c,
          ),
        );
        onUpdate({
          clips: updatedClips,
          totalDuration: updatedClips.reduce((a, c) => a + c.duration, 0),
          currentTime: clip.startTime + newDuration,
        });
      }
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const onUp = () => {
      trimDragRef.current = null;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [state.clips, PX_PER_SEC, onUpdate]);

  const startTrimDrag = (
    e: React.MouseEvent | React.TouchEvent,
    clipId: string,
    edge: "left" | "right",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const clip = state.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    trimDragRef.current = {
      clipId,
      edge,
      startX: clientX,
      originalDuration: clip.duration,
    };
  };

  // ── Clip helpers
  const removeClip = useCallback(
    (id: string) => {
      const next = rebuildStartTimes(state.clips.filter((c) => c.id !== id));
      const dur = next.reduce((acc, c) => acc + c.duration, 0);
      onUpdate({ clips: next, totalDuration: dur });
      if (activeClipId === id) setActiveClipId(next[0]?.id ?? null);
      setContextMenu(null);
    },
    [state.clips, activeClipId, onUpdate],
  );

  const duplicateClip = useCallback(
    (id: string) => {
      const src = state.clips.find((c) => c.id === id);
      if (!src) return;
      const idx = state.clips.indexOf(src);
      const copy: Clip = { ...src, id: `clip-${Date.now()}` };
      const next = rebuildStartTimes([
        ...state.clips.slice(0, idx + 1),
        copy,
        ...state.clips.slice(idx + 1),
      ]);
      const dur = next.reduce((acc, c) => acc + c.duration, 0);
      onUpdate({ clips: next, totalDuration: dur });
      setContextMenu(null);
    },
    [state.clips, onUpdate],
  );

  // Split clip at current playhead position
  const splitClipAtPlayhead = useCallback(
    (id: string) => {
      const src = state.clips.find((c) => c.id === id);
      if (!src || src.duration < 1) {
        setContextMenu(null);
        return;
      }
      let splitAt = state.currentTime;
      if (
        splitAt <= src.startTime + 0.1 ||
        splitAt >= src.startTime + src.duration - 0.1
      ) {
        splitAt = src.startTime + src.duration / 2;
      }
      const durA = splitAt - src.startTime;
      const durB = src.duration - durA;
      const a: Clip = { ...src, duration: durA };
      const b: Clip = { ...src, id: `clip-${Date.now()}`, duration: durB };
      const idx = state.clips.indexOf(src);
      const next = rebuildStartTimes([
        ...state.clips.slice(0, idx),
        a,
        b,
        ...state.clips.slice(idx + 1),
      ]);
      const dur = next.reduce((acc, c) => acc + c.duration, 0);
      onUpdate({ clips: next, totalDuration: dur });
      setContextMenu(null);
    },
    [state.clips, state.currentTime, onUpdate],
  );

  const moveClipToFront = useCallback(
    (id: string) => {
      const idx = state.clips.findIndex((c) => c.id === id);
      if (idx <= 0) {
        setContextMenu(null);
        return;
      }
      const reordered = [...state.clips];
      const [moved] = reordered.splice(idx, 1);
      reordered.unshift(moved);
      onUpdate({ clips: rebuildStartTimes(reordered), totalDuration });
      setContextMenu(null);
    },
    [state.clips, totalDuration, onUpdate],
  );

  const moveClipToBack = useCallback(
    (id: string) => {
      const idx = state.clips.findIndex((c) => c.id === id);
      if (idx < 0 || idx === state.clips.length - 1) {
        setContextMenu(null);
        return;
      }
      const reordered = [...state.clips];
      const [moved] = reordered.splice(idx, 1);
      reordered.push(moved);
      onUpdate({ clips: rebuildStartTimes(reordered), totalDuration });
      setContextMenu(null);
    },
    [state.clips, totalDuration, onUpdate],
  );

  const clearAll = useCallback(() => {
    onUpdate({ clips: [], totalDuration: 0 });
    setActiveClipId(null);
  }, [onUpdate]);

  // ── Add clip from file input
  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const url = URL.createObjectURL(file);
    if (isVideo) {
      const vid = document.createElement("video");
      vid.src = url;
      vid.onloadedmetadata = () => {
        appendClip(file, url, "video", Math.min(vid.duration, 180));
        vid.src = "";
      };
    } else {
      appendClip(file, url, "image", 3);
    }
    e.target.value = "";
  };

  const appendClip = (
    file: File,
    url: string,
    type: "video" | "image",
    duration: number,
  ) => {
    const startTime = state.clips.reduce(
      (acc, c) => Math.max(acc, c.startTime + c.duration),
      0,
    );
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      type,
      name: file.name.replace(/\.[^.]+$/, ""),
      duration,
      startTime,
      src: url,
    };
    onUpdate({
      clips: [...state.clips, newClip],
      totalDuration: startTime + duration,
    });
    setActiveClipId(newClip.id);
  };

  // ── Drag and drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const srcIndex = dragIndexRef.current;
    if (srcIndex === null || srcIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }
    const reordered = [...state.clips];
    const [moved] = reordered.splice(srcIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const next = rebuildStartTimes(reordered);
    const dur = next.reduce((acc, c) => acc + c.duration, 0);
    onUpdate({ clips: next, totalDuration: dur });
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  // ── Context menu
  const openContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    clipId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ clipId, x: rect.left, y: rect.top - 180 });
  };

  const handleLongPressStart = (clipId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        clipId,
        x: window.innerWidth / 2 - 70,
        y: window.innerHeight / 2 - 100,
      });
    }, 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const zoomIn = () => onUpdate({ zoom: Math.min(state.zoom * 1.5, 8) });
  const zoomOut = () => onUpdate({ zoom: Math.max(state.zoom / 1.5, 0.2) });

  const trackWidth = Math.max(360, totalDuration * PX_PER_SEC + 60);
  const clipBlockWidth = 96;

  const TrackLabel = ({ label, color }: { label: string; color: string }) => (
    <div
      className="absolute left-0 top-0 bottom-0 flex items-center px-1.5 z-20 select-none"
      style={{ width: 36, background: "oklch(0.08 0.012 265 / 1)" }}
    >
      <span
        className="text-[7px] font-bold tracking-widest uppercase"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Timeline
          </span>
          <div className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
            <span className="text-[10px] font-semibold text-amber-400 tabular-nums">
              {formatTime(totalDuration)}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground/40 tabular-nums">
            {state.clips.length} clip{state.clips.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-ocid="timeline.zoom_out_button"
            onClick={zoomOut}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border/40 bg-muted/40 text-muted-foreground hover:text-amber-400 hover:border-amber-400/40 transition-all text-[10px]"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
            <span>−</span>
          </button>
          <span className="text-[9px] text-muted-foreground/60 tabular-nums w-8 text-center">
            {Math.round(state.zoom * 100)}%
          </span>
          <button
            type="button"
            data-ocid="timeline.zoom_in_button"
            onClick={zoomIn}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border/40 bg-muted/40 text-muted-foreground hover:text-amber-400 hover:border-amber-400/40 transition-all text-[10px]"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
            <span>+</span>
          </button>
          {state.clips.length > 0 && (
            <button
              type="button"
              data-ocid="timeline.clear_all_button"
              onClick={clearAll}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all text-[10px]"
              aria-label="Clear all clips"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main timeline tracks */}
      <div
        className="relative rounded-xl overflow-hidden border border-border/40"
        style={{
          background: "oklch(0.07 0.012 265 / 0.95)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="overflow-x-auto scrollbar-hide">
          <div style={{ width: trackWidth, minWidth: "100%" }}>
            {/* Ruler */}
            <div
              ref={rulerRef}
              className="relative h-7 cursor-pointer select-none border-b border-border/30 pl-9"
              style={{ background: "oklch(0.09 0.01 265 / 1)" }}
              onClick={handleRulerClick}
              role="slider"
              aria-valuenow={state.currentTime}
              aria-valuemin={0}
              aria-valuemax={totalDuration}
              aria-label="Timeline scrubber"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight")
                  onUpdate({
                    currentTime: Math.min(totalDuration, state.currentTime + 1),
                  });
                if (e.key === "ArrowLeft")
                  onUpdate({ currentTime: Math.max(0, state.currentTime - 1) });
              }}
            >
              {Array.from(
                { length: Math.ceil(totalDuration) + 2 },
                (_, i) => i,
              ).map((i) => {
                const isMajor = i % 5 === 0;
                return (
                  <div
                    key={`tick-${i}`}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: i * PX_PER_SEC }}
                  >
                    <div
                      className={cn(
                        "w-px",
                        isMajor ? "h-3 bg-border/70" : "h-2 bg-border/40",
                      )}
                    />
                    {isMajor && (
                      <span className="text-[8px] text-muted-foreground/60 mt-0.5 tabular-nums">
                        {formatTime(i)}
                      </span>
                    )}
                    {!isMajor && i % 1 === 0 && (
                      <span className="text-[7px] text-muted-foreground/30 mt-0.5 tabular-nums">
                        {i}s
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Draggable playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-20 group"
                style={{
                  left: state.currentTime * PX_PER_SEC,
                  cursor: "col-resize",
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingPlayhead(true);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsDraggingPlayhead(true);
                }}
                role="presentation"
              >
                <div className="w-4 h-4 bg-amber-400 rounded-full -translate-x-[7px] -translate-y-0.5 shadow-[0_0_8px_rgba(245,200,66,0.7)] flex items-center justify-center border-2 border-amber-300 cursor-col-resize" />
                <div className="absolute top-4 -translate-x-1/2 px-1.5 py-0.5 rounded bg-amber-400/90 text-[8px] font-semibold text-black whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTime(state.currentTime)}
                </div>
              </div>
            </div>

            {/* VIDEO track */}
            <div
              className="relative h-14 border-b border-border/20 cursor-pointer"
              onClick={handleRulerClick}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleRulerClick(
                  e as unknown as React.MouseEvent<HTMLDivElement>,
                )
              }
              role="presentation"
            >
              <TrackLabel label="VIDEO" color="oklch(0.78 0.16 75)" />
              <div className="absolute inset-0 pl-9">
                {state.clips.map((clip, idx) => (
                  <div
                    key={clip.id}
                    className={cn(
                      "absolute top-1.5 bottom-1.5 rounded-lg group overflow-hidden border transition-all duration-150",
                      activeClipId === clip.id
                        ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-background border-amber-400/50 shadow-[0_0_12px_rgba(245,200,66,0.4)]"
                        : "border-white/10 ring-0 hover:border-amber-400/40",
                    )}
                    style={{
                      left: clip.startTime * PX_PER_SEC,
                      width: Math.max(28, clip.duration * PX_PER_SEC - 2),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveClipId(clip.id);
                      onUpdate({ currentTime: clip.startTime });
                    }}
                    onContextMenu={(e) => openContextMenu(e, clip.id)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setActiveClipId(clip.id)
                    }
                    aria-label={`Select clip: ${clip.name}`}
                  >
                    {/* Real video frames */}
                    <ClipFrameStrip
                      clip={clip}
                      width={Math.max(28, clip.duration * PX_PER_SEC - 2)}
                      height={44}
                      gradient={clipGradient(idx)}
                    />
                    {/* Name overlay */}
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                      <span className="text-[9px] text-white/90 font-semibold truncate drop-shadow-sm">
                        {clip.name}
                      </span>
                    </div>
                    {/* Left trim handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-10 hover:bg-amber-400/30 rounded-l-lg transition-colors"
                      onMouseDown={(e) => startTrimDrag(e, clip.id, "left")}
                      onTouchStart={(e) => startTrimDrag(e, clip.id, "left")}
                      role="presentation"
                    >
                      <div className="w-0.5 h-5 bg-white/60 rounded-full" />
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClip(clip.id);
                      }}
                      className="absolute top-1 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded bg-black/60 text-white/80 hover:text-white"
                      aria-label={`Remove ${clip.name}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    {/* Right trim handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-10 hover:bg-amber-400/30 rounded-r-lg transition-colors"
                      onMouseDown={(e) => startTrimDrag(e, clip.id, "right")}
                      onTouchStart={(e) => startTrimDrag(e, clip.id, "right")}
                      role="presentation"
                    >
                      <div className="w-0.5 h-5 bg-white/60 rounded-full" />
                    </div>
                  </div>
                ))}
                {/* Playhead overlay */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400/70 z-10 pointer-events-none"
                  style={{ left: state.currentTime * PX_PER_SEC }}
                />
              </div>
            </div>

            {/* TEXT track */}
            {state.textLayers.length > 0 && (
              <div className="relative h-8 border-b border-border/20">
                <TrackLabel label="TEXT" color="oklch(0.73 0.15 168)" />
                <div className="absolute inset-0 pl-9">
                  {state.textLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="absolute top-1 bottom-1 rounded bg-gradient-to-r from-emerald-500/70 to-teal-500/70 flex items-center px-1 border border-emerald-400/20"
                      style={{
                        left: layer.startTime * PX_PER_SEC,
                        width: layer.duration * PX_PER_SEC - 2,
                      }}
                    >
                      <span className="text-[8px] text-white truncate">
                        {layer.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUDIO track */}
            {state.audioTracks.length > 0 && (
              <div className="relative h-8">
                <TrackLabel label="AUDIO" color="oklch(0.65 0.18 350)" />
                <div className="absolute inset-0 pl-9">
                  {state.audioTracks.map((track) => (
                    <div
                      key={track.id}
                      className="absolute top-1 bottom-1 rounded bg-gradient-to-r from-rose-500/70 to-pink-500/70 flex items-center px-1 border border-rose-400/20"
                      style={{
                        left: track.startTime * PX_PER_SEC,
                        width: track.duration * PX_PER_SEC - 2,
                      }}
                    >
                      <span className="text-[8px] text-white truncate">
                        {track.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clip strip */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Clips
          </h3>
        </div>
        {state.clips.length === 0 ? (
          <div
            data-ocid="timeline.empty_state"
            className="flex flex-col items-center gap-4 py-8 rounded-2xl border-2 border-dashed border-border/30 bg-surface-1/30"
          >
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-amber-400/30 flex items-center justify-center bg-amber-400/5">
              <Plus className="w-7 h-7 text-amber-400/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground/60">
                No clips yet
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Add a video or photo to start editing
              </p>
            </div>
            <button
              type="button"
              data-ocid="timeline.add_clip_button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg"
              style={{
                background: "linear-gradient(135deg,#f5c842,#e8a020)",
                color: "oklch(0.05 0.008 265)",
              }}
            >
              <Plus className="w-4 h-4" />
              Add Clip
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-2 pb-2 min-w-max items-end">
              {state.clips.map((clip, idx) => {
                const isActive = activeClipId === clip.id;
                const isDragTarget = dragOverIndex === idx;
                return (
                  <div
                    key={clip.id}
                    data-ocid={`timeline.clip.${idx + 1}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => openContextMenu(e, clip.id)}
                    onTouchStart={() => handleLongPressStart(clip.id)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchMove={handleLongPressEnd}
                    style={{ width: clipBlockWidth }}
                    className={cn(
                      "flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 group transition-all duration-150",
                      isDragTarget && "scale-105 opacity-80",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveClipId(clip.id);
                        onUpdate({ currentTime: clip.startTime });
                      }}
                      className={cn(
                        "w-full h-16 rounded-xl relative overflow-hidden transition-all duration-150",
                        isActive
                          ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-background shadow-[0_0_14px_rgba(245,200,66,0.45)]"
                          : "ring-1 ring-white/10 group-hover:ring-amber-400/40",
                      )}
                      aria-label={`Select clip ${idx + 1}: ${clip.name}`}
                    >
                      <ClipFrameStrip
                        clip={clip}
                        width={clipBlockWidth}
                        height={64}
                        gradient={clipGradient(idx)}
                      />
                      <div className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white/90">
                          {idx + 1}
                        </span>
                      </div>
                      <span className="absolute bottom-1 right-1 text-[7px] text-white/80 font-mono tabular-nums bg-black/50 px-1 rounded">
                        {formatTime(clip.duration)}
                      </span>
                      <span className="absolute top-1 right-1 text-[7px] font-bold uppercase tracking-wider text-white/60 bg-black/40 px-1 rounded">
                        {clip.type === "blank"
                          ? "BLK"
                          : clip.type === "video"
                            ? "VID"
                            : "IMG"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeClip(clip.id);
                        }}
                        className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md bg-black/60 text-white/80 hover:text-red-400"
                        aria-label={`Remove clip ${idx + 1}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </button>
                    <span
                      className={cn(
                        "text-[8px] truncate w-full text-center px-0.5 transition-colors",
                        isActive
                          ? "text-amber-400 font-semibold"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {clip.name}
                    </span>
                  </div>
                );
              })}
              <div
                className="flex flex-col items-center gap-1 flex-shrink-0"
                style={{ width: clipBlockWidth }}
              >
                <button
                  type="button"
                  data-ocid="timeline.add_clip_button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-16 rounded-xl border-2 border-dashed border-amber-400/40 flex flex-col items-center justify-center gap-1 text-amber-400 hover:border-amber-400/80 hover:bg-amber-400/5 transition-all duration-200 group"
                  aria-label="Add clip"
                >
                  <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="text-[8px] font-semibold">Add Clip</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleAddFile}
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl border border-border/50 overflow-hidden shadow-2xl"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 160),
            top: Math.max(contextMenu.y, 8),
            background: "oklch(0.12 0.015 265 / 0.97)",
            backdropFilter: "blur(20px)",
            minWidth: 148,
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            data-ocid="timeline.context_duplicate_button"
            onClick={() => duplicateClip(contextMenu.clipId)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-amber-400/10 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400/70" />
            Duplicate
          </button>
          <button
            type="button"
            data-ocid="timeline.context_split_button"
            onClick={() => splitClipAtPlayhead(contextMenu.clipId)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-amber-400/10 transition-colors border-t border-border/30"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400/70" />
            Split at Playhead
          </button>
          <button
            type="button"
            data-ocid="timeline.context_to_front_button"
            onClick={() => moveClipToFront(contextMenu.clipId)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-amber-400/10 transition-colors border-t border-border/30"
          >
            <MoveUpIcon className="w-3.5 h-3.5 text-violet-400/70" />
            Move to Front
          </button>
          <button
            type="button"
            data-ocid="timeline.context_to_back_button"
            onClick={() => moveClipToBack(contextMenu.clipId)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-amber-400/10 transition-colors border-t border-border/30"
          >
            <MoveDownIcon className="w-3.5 h-3.5 text-violet-400/70" />
            Move to Back
          </button>
          <button
            type="button"
            data-ocid="timeline.context_delete_button"
            onClick={() => removeClip(contextMenu.clipId)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors border-t border-border/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={() => setContextMenu(null)}
            className="absolute top-1.5 right-1.5 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close context menu"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
