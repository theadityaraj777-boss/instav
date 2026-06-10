import { useEffect, useRef, useState } from "react";
import type React from "react";
/**
 * EditorPreviewCanvas — Renders the media with all overlays, CSS transforms,
 * CSS filter string, and new tool effects applied in real-time.
 *
 * FRAME FIX: All elements (media, text, stickers, PiP) are rendered inside
 * a bounded frame div. Dragging is constrained to frame boundaries.
 * The frame shows the correct aspect ratio (9:16 for ShortSport, 16:9 for feed).
 */
import type {
  KeyframePoint,
  MediaEditorState,
  StickerOverlay,
  TextOverlay,
} from "./MediaEditorTab";

interface Props {
  mediaUrl: string | null;
  mediaKind: "video" | "image" | null;
  state: MediaEditorState;
  videoDuration: number;
  /** Called when a text/sticker/pip overlay is repositioned by dragging on the canvas */
  onOverlayPositionChange?: (
    id: string,
    type: "text" | "sticker" | "pip",
    x: number,
    y: number,
  ) => void;
}

/** Build CSS filter string from editor state */
function buildCssFilter(state: MediaEditorState): string {
  const parts: string[] = [];
  const { brightness, contrast, saturation, hue, activeEffects } = state;

  if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
  if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
  if (saturation !== 100) parts.push(`saturate(${saturation}%)`);
  if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`);

  if (activeEffects.includes("blur")) parts.push("blur(3px)");
  if (activeEffects.includes("sepia")) parts.push("sepia(80%)");
  if (activeEffects.includes("vintage"))
    parts.push("sepia(40%) saturate(130%) brightness(90%)");
  if (activeEffects.includes("bokeh")) parts.push("blur(1px) brightness(105%)");

  return parts.join(" ");
}

/** Build CSS transform string from rotate/flip state */
function buildTransform(state: MediaEditorState): string {
  const parts: string[] = [];
  if (state.rotation !== 0) parts.push(`rotate(${state.rotation}deg)`);
  if (state.flipH) parts.push("scaleX(-1)");
  if (state.flipV) parts.push("scaleY(-1)");
  return parts.length ? parts.join(" ") : "none";
}

/** Build clip-path from crop state */
function buildClipPath(state: MediaEditorState): string {
  const { cropX, cropY, cropW, cropH } = state;
  if (cropX === 0 && cropY === 0 && cropW === 100 && cropH === 100)
    return "none";
  const x1 = cropX;
  const y1 = cropY;
  const x2 = cropX + cropW;
  const y2 = cropY + cropH;
  return `inset(${y1}% ${100 - x2}% ${100 - y2}% ${x1}%)`;
}

/** Build clip-path from cutout shape */
function buildCutoutClipPath(state: MediaEditorState): string {
  if (!state.cutoutShape || state.cutoutShape === "none") return "none";
  const shapes: Record<string, string> = {
    circle: "circle(45% at 50% 50%)",
    star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    heart:
      "polygon(50% 80%, 15% 40%, 10% 25%, 20% 10%, 35% 8%, 50% 20%, 65% 8%, 80% 10%, 90% 25%, 85% 40%)",
    diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
    hexagon: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
    rectangle: "inset(10% 5% 10% 5% round 8px)",
  };
  return shapes[state.cutoutShape] ?? "none";
}

/** Interpolate keyframes at given time */
function interpolateKeyframes(
  keyframes: KeyframePoint[],
  time: number,
): { opacity: number; scale: number; x: number; y: number } {
  const defaults = { opacity: 100, scale: 100, x: 0, y: 0 };
  if (!keyframes.length) return defaults;

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) {
    return {
      opacity: sorted[0].opacity ?? defaults.opacity,
      scale: sorted[0].scale ?? defaults.scale,
      x: sorted[0].x ?? defaults.x,
      y: sorted[0].y ?? defaults.y,
    };
  }
  if (time >= sorted[sorted.length - 1].time) {
    const last = sorted[sorted.length - 1];
    return {
      opacity: last.opacity ?? defaults.opacity,
      scale: last.scale ?? defaults.scale,
      x: last.x ?? defaults.x,
      y: last.y ?? defaults.y,
    };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      const lerp = (
        av: number | undefined,
        bv: number | undefined,
        def: number,
      ) => (av ?? def) + t * ((bv ?? def) - (av ?? def));
      return {
        opacity: lerp(a.opacity, b.opacity, defaults.opacity),
        scale: lerp(a.scale, b.scale, defaults.scale),
        x: lerp(a.x, b.x, defaults.x),
        y: lerp(a.y, b.y, defaults.y),
      };
    }
  }
  return defaults;
}

/** Interpolate keyframes for a specific element (filtered by prefix) at given time */
function interpolateKeyframesFor(
  keyframes: KeyframePoint[],
  elementKey: string,
  time: number,
): { opacity: number; scale: number; x: number; y: number } {
  const filtered = keyframes.filter((kf) =>
    elementKey === "media"
      ? !kf.id.includes("::")
      : kf.id.startsWith(`${elementKey}::kf-`),
  );
  return interpolateKeyframes(filtered, time);
}

/** Animation CSS class names */
const ANIM_CSS: Record<string, string> = {
  fadeIn: "editor-anim-fadeIn",
  slideInLeft: "editor-anim-slideInLeft",
  slideInRight: "editor-anim-slideInRight",
  slideInUp: "editor-anim-slideInUp",
  slideInDown: "editor-anim-slideInDown",
  zoomIn: "editor-anim-zoomIn",
  bounceIn: "editor-anim-bounceIn",
  rotateIn: "editor-anim-rotateIn",
  flipIn: "editor-anim-flipIn",
  fadeOut: "editor-anim-fadeOut",
  slideOutLeft: "editor-anim-slideOutLeft",
  slideOutRight: "editor-anim-slideOutRight",
  slideOutUp: "editor-anim-slideOutUp",
  slideOutDown: "editor-anim-slideOutDown",
  zoomOut: "editor-anim-zoomOut",
  bounceOut: "editor-anim-bounceOut",
  rotateOut: "editor-anim-rotateOut",
  flipOut: "editor-anim-flipOut",
  flash: "editor-anim-flash",
};

/** Caption text shadow based on style */
function captionStyle(state: MediaEditorState) {
  const { caption } = state;
  const base: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    top: `${caption.verticalPos}%`,
    width: "90%",
    textAlign: "center",
    fontSize: `${caption.fontSize}px`,
    color: caption.color,
    zIndex: 20,
    pointerEvents: "none",
    lineHeight: 1.4,
    padding: "4px 10px",
    borderRadius: "6px",
    backgroundColor: `${caption.bgColor}${Math.round(
      (caption.bgOpacity / 100) * 255,
    )
      .toString(16)
      .padStart(2, "0")}`,
    fontWeight: caption.style === "bold" ? 700 : 400,
    fontFamily: caption.style === "neon" ? "monospace" : "inherit",
    textShadow:
      caption.style === "neon"
        ? `0 0 8px ${caption.color}, 0 0 16px ${caption.color}`
        : caption.style === "bold"
          ? "1px 1px 4px rgba(0,0,0,0.8)"
          : "none",
  };
  return base;
}

export default function EditorPreviewCanvas({
  mediaUrl,
  mediaKind,
  state,
  videoDuration: _videoDuration,
  onOverlayPositionChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState<{
    id: string;
    type: "text" | "sticker" | "pip";
  } | null>(null);
  const [justDropped, setJustDropped] = useState<string | null>(null);
  // Outer wrapper (for mouse events)
  const canvasRef = useRef<HTMLDivElement>(null);
  // Inner frame — the actual editing canvas; drag coords are relative to this
  const frameRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const cssFilter = buildCssFilter(state);
  const transform = buildTransform(state);
  const cropPath = buildClipPath(state);
  const cutoutPath = buildCutoutClipPath(state);

  const effectiveClipPath =
    cropPath !== "none"
      ? cropPath
      : cutoutPath !== "none"
        ? cutoutPath
        : "none";

  // Reverse playback via rAF
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.isReversed) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const tick = () => {
      if (!videoRef.current) return;
      if (!videoRef.current.paused) {
        videoRef.current.currentTime = Math.max(
          state.trimStart,
          videoRef.current.currentTime - 0.033,
        );
        if (videoRef.current.currentTime <= state.trimStart) {
          videoRef.current.currentTime =
            state.trimEnd || videoRef.current.duration;
        }
      }
      setCurrentTime(videoRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isReversed, state.trimStart, state.trimEnd]);

  // Track current time for keyframe interpolation
  useEffect(() => {
    const video = videoRef.current;
    if (!video || state.isReversed) return;
    const handler = () => setCurrentTime(video.currentTime);
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [state.isReversed]);

  // Freeze frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.freezeActive) return;
    video.currentTime = state.freezeTime;
    video.pause();
    const resumeTimer = setTimeout(
      () => {
        if (videoRef.current) videoRef.current.play().catch(() => undefined);
      },
      (state.freezeDuration ?? 2) * 1000,
    );
    return () => clearTimeout(resumeTimer);
  }, [state.freezeActive, state.freezeTime, state.freezeDuration]);

  // Listen for 'editor-drag-move' CustomEvent — constrain to 5–95% and call callback
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleEditorDragMove = (e: Event) => {
      const { id, type, x, y } = (
        e as CustomEvent<{
          id: string;
          type: "text" | "sticker" | "pip";
          x: number;
          y: number;
        }>
      ).detail;
      const cx = Math.max(5, Math.min(95, x));
      const cy = Math.max(5, Math.min(95, y));
      if (onOverlayPositionChange) {
        onOverlayPositionChange(id, type, cx, cy);
      }
    };

    canvas.addEventListener("editor-drag-move", handleEditorDragMove);
    return () =>
      canvas.removeEventListener("editor-drag-move", handleEditorDragMove);
  }, [onOverlayPositionChange]);

  // Keyframe interpolation result (main media)
  const kfValues = state.keyframes?.length
    ? interpolateKeyframesFor(state.keyframes, "media", currentTime)
    : { opacity: 100, scale: 100, x: 0, y: 0 };

  // Apply voice changer / speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const preset = state.voicePreset ?? "normal";
    if (preset === "normal") {
      video.playbackRate = state.speed;
    }
  }, [state.voicePreset, state.speed]);

  const animInClass =
    state.animationIn && state.animationIn !== "none"
      ? (ANIM_CSS[state.animationIn] ?? "")
      : "";

  // Effect overlays
  const renderEffectOverlays = () => {
    const { activeEffects } = state;
    const overlays: React.ReactNode[] = [];

    if (activeEffects.includes("vignette")) {
      overlays.push(
        <div
          key="vignette"
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
          }}
        />,
      );
    }
    if (activeEffects.includes("glitch")) {
      overlays.push(
        <div
          key="glitch"
          className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.4,
              animation: "glitch-h 0.4s infinite",
              background: "rgba(255,0,80,0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.3,
              animation: "glitch-h 0.6s 0.1s infinite",
              background: "rgba(0,200,255,0.2)",
            }}
          />
        </div>,
      );
    }
    if (activeEffects.includes("film-grain")) {
      overlays.push(
        <div
          key="grain"
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\")",
            opacity: 0.5,
            mixBlendMode: "overlay",
          }}
        />,
      );
    }
    if (activeEffects.includes("zoom")) {
      overlays.push(
        <div
          key="zoom"
          className="absolute inset-0 pointer-events-none z-10"
          style={{ animation: "slowZoom 4s ease-in-out infinite alternate" }}
        />,
      );
    }
    if (activeEffects.includes("shake")) {
      overlays.push(
        <div
          key="shake"
          className="absolute inset-0 pointer-events-none z-10"
          style={{ animation: "shake 0.3s infinite" }}
        />,
      );
    }
    if (state.removeBackground && state.cutoutShape !== "none") {
      overlays.push(
        <div
          key="cutout-bg"
          className="absolute inset-0 z-0"
          style={{ background: "black" }}
        />,
      );
    }
    return overlays;
  };

  // ── Drag system — positions relative to frameRef so they stay inside the frame ─

  const startDrag = (
    e: React.MouseEvent | React.TouchEvent,
    id: string,
    type: "text" | "sticker" | "pip",
  ) => {
    e.preventDefault();
    setIsDragging({ id, type });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    // Use frameRef so position % is relative to the actual video frame bounds
    const target = frameRef.current ?? canvasRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;
    const ev = new CustomEvent("editor-drag-move", {
      detail: { id: isDragging.id, type: isDragging.type, x: xPct, y: yPct },
    });
    canvasRef.current?.dispatchEvent(ev);
  };

  const stopDrag = () => {
    if (isDragging) {
      setJustDropped(isDragging.id);
      setTimeout(() => setJustDropped(null), 500);
    }
    setIsDragging(null);
  };

  const mediaOpacity =
    ((state.clipOpacity ?? 100) / 100) * (kfValues.opacity / 100);

  const kfTransformExtra = state.keyframes?.length
    ? `scale(${kfValues.scale / 100}) translate(${kfValues.x}px, ${kfValues.y}px)`
    : "";

  const featherFilter =
    state.cutoutShape !== "none" && state.cutoutFeather > 0
      ? `drop-shadow(0 0 ${state.cutoutFeather}px rgba(0,0,0,0.8))`
      : "";

  const currentDragId = isDragging?.id ?? null;

  return (
    <div
      ref={canvasRef}
      data-ocid="editor.canvas_target"
      className="relative w-full select-none bg-black"
      style={{
        aspectRatio: "9/16",
        maxHeight: "55vh",
        cursor: isDragging ? "grabbing" : "default",
      }}
      onMouseMove={handleDragMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchMove={handleDragMove}
      onTouchEnd={stopDrag}
    >
      {/* Inner frame — the bounded editing canvas. All overlays rendered inside here
          so they cannot escape the video frame boundary. */}
      <div
        ref={frameRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: "12px",
          border: "1.5px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 0 0 1px rgba(255,215,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Background layer */}
        {mediaKind === "image" && state.bgMode !== "original" && (
          <div className="absolute inset-0 z-0">
            {state.bgMode === "color" && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: state.bgColor,
                }}
              />
            )}
            {state.bgMode === "blur" && mediaUrl && (
              <img
                src={mediaUrl}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: `blur(${state.bgBlur}px)`,
                  transform: "scale(1.1)",
                }}
              />
            )}
            {state.bgMode === "gradient" && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: state.bgGradient,
                }}
              />
            )}
          </div>
        )}

        {/* Main media */}
        <div
          className={`absolute inset-0 flex items-center justify-center z-1 ${
            animInClass
          }`}
          style={{
            filter:
              [cssFilter, featherFilter].filter(Boolean).join(" ") || undefined,
            transform:
              [transform, kfTransformExtra].filter(Boolean).join(" ") || "none",
            opacity: mediaOpacity,
            clipPath:
              effectiveClipPath !== "none" ? effectiveClipPath : undefined,
            animationDuration: `${state.animationDuration ?? 0.6}s`,
          }}
        >
          {mediaKind === "video" && mediaUrl && (
            <video
              id="editor-main-video"
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-contain"
              style={{ maxHeight: "100%" }}
              muted={state.muteOriginal}
              playsInline
              loop={!state.isReversed}
              autoPlay
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.playbackRate = state.isReversed
                    ? 1
                    : state.speed;
                  videoRef.current.volume = state.videoVolume / 100;
                  if (state.trimStart > 0) {
                    videoRef.current.currentTime = state.isReversed
                      ? state.trimEnd || videoRef.current.duration
                      : state.trimStart;
                  }
                }
              }}
            >
              <track kind="captions" />
            </video>
          )}
          {mediaKind === "image" && mediaUrl && (
            <img
              src={mediaUrl}
              alt="Editor preview"
              className="w-full h-full"
              style={{ objectFit: "contain" }}
            />
          )}
        </div>

        {/* Effect overlays */}
        {renderEffectOverlays()}

        {/* PiP overlay — draggable, constrained inside frame */}
        {state.pip && (
          <div
            className={`absolute z-15 transition-all duration-75 ${
              currentDragId === "pip"
                ? "outline outline-2 outline-dashed outline-amber-400/80 cursor-grabbing"
                : "cursor-grab"
            } ${justDropped === "pip" ? "outline outline-2 outline-amber-400 shadow-[0_0_12px_rgba(245,200,66,0.6)]" : ""}`}
            style={{
              left: `${Math.max(2, Math.min(88, state.pip.x))}%`,
              top: `${Math.max(2, Math.min(88, state.pip.y))}%`,
              width: `${state.pip.scale}%`,
              opacity: state.pip.opacity / 100,
              borderRadius: "8px",
            }}
            onMouseDown={(e) => startDrag(e, "pip", "pip")}
            onTouchStart={(e) => startDrag(e, "pip", "pip")}
          >
            {state.pip.type === "image" ? (
              <img
                src={state.pip.src}
                alt="PiP"
                className="w-full h-full object-contain rounded-lg shadow-xl"
              />
            ) : (
              <video
                src={state.pip.src}
                className="w-full h-full object-contain rounded-lg shadow-xl"
                autoPlay
                muted
                loop
                playsInline
              >
                <track kind="captions" />
              </video>
            )}
          </div>
        )}

        {/* Text overlays — draggable, constrained inside frame, per-element keyframes */}
        {state.textOverlays.map((overlay: TextOverlay) => {
          const kft = state.keyframes?.length
            ? interpolateKeyframesFor(state.keyframes, overlay.id, currentTime)
            : { opacity: 100, scale: 100, x: 0, y: 0 };
          const hasKF = state.keyframes?.some((k) =>
            k.id.startsWith(`${overlay.id}::kf-`),
          );
          return (
            <div
              key={overlay.id}
              onMouseDown={(e) => startDrag(e, overlay.id, "text")}
              onTouchStart={(e) => startDrag(e, overlay.id, "text")}
              className={`absolute z-20 select-none transition-all duration-75 ${
                currentDragId === overlay.id
                  ? "outline outline-2 outline-dashed outline-amber-400/80 cursor-grabbing"
                  : "cursor-grab active:cursor-grabbing"
              } ${
                justDropped === overlay.id
                  ? "outline outline-2 outline-amber-400 shadow-[0_0_10px_rgba(245,200,66,0.5)]"
                  : ""
              }`}
              style={{
                left: `${Math.max(2, Math.min(96, overlay.x))}%`,
                top: `${Math.max(2, Math.min(96, overlay.y))}%`,
                transform: `translate(-50%, -50%) scale(${hasKF ? kft.scale / 100 : 1}) translate(${hasKF ? kft.x : 0}px, ${hasKF ? kft.y : 0}px)`,
                fontSize: `${overlay.fontSize}px`,
                color: overlay.color,
                opacity: hasKF
                  ? (overlay.opacity / 100) * (kft.opacity / 100)
                  : overlay.opacity / 100,
                fontFamily:
                  overlay.fontFamily === "serif"
                    ? "Playfair Display, serif"
                    : overlay.fontFamily === "mono"
                      ? "monospace"
                      : "Plus Jakarta Sans, sans-serif",
                userSelect: "none",
                textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
                maxWidth: "90%",
                textAlign: "center",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {overlay.text}
            </div>
          );
        })}

        {/* Sticker overlays — draggable, constrained inside frame, per-element keyframes */}
        {state.stickers.map((s: StickerOverlay) => {
          const kfs = state.keyframes?.length
            ? interpolateKeyframesFor(state.keyframes, s.id, currentTime)
            : { opacity: 100, scale: 100, x: 0, y: 0 };
          const hasKFS = state.keyframes?.some((k) =>
            k.id.startsWith(`${s.id}::kf-`),
          );
          return (
            <div
              key={s.id}
              onMouseDown={(e) => startDrag(e, s.id, "sticker")}
              onTouchStart={(e) => startDrag(e, s.id, "sticker")}
              className={`absolute z-20 select-none transition-all duration-75 ${
                currentDragId === s.id
                  ? "outline outline-2 outline-dashed outline-amber-400/80 cursor-grabbing"
                  : "cursor-grab active:cursor-grabbing"
              } ${
                justDropped === s.id
                  ? "outline outline-2 outline-amber-400 shadow-[0_0_10px_rgba(245,200,66,0.5)]"
                  : ""
              }`}
              style={{
                left: `${Math.max(2, Math.min(96, s.x))}%`,
                top: `${Math.max(2, Math.min(96, s.y))}%`,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${hasKFS ? kfs.scale / 100 : 1}) translate(${hasKFS ? kfs.x : 0}px, ${hasKFS ? kfs.y : 0}px)`,
                fontSize: `${s.size}px`,
                opacity: hasKFS
                  ? (s.opacity / 100) * (kfs.opacity / 100)
                  : s.opacity / 100,
                lineHeight: 1,
              }}
            >
              {s.emoji}
            </div>
          );
        })}

        {/* Caption overlay */}
        {state.caption.text && (
          <div style={captionStyle(state)}>{state.caption.text}</div>
        )}

        {/* Reverse indicator */}
        {state.isReversed && (
          <div className="absolute top-2 left-2 z-30 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 border border-amber-400/40">
            <span className="text-amber-400 text-xs font-bold">◀◀</span>
            <span className="text-[10px] text-amber-400">Reversed</span>
          </div>
        )}

        {/* Freeze indicator */}
        {state.freezeActive && (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 border border-amber-400/40">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] text-amber-400">Frozen</span>
          </div>
        )}

        {/* Drag hint */}
        {isDragging && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 rounded-lg bg-black/70 border border-amber-400/40 pointer-events-none">
            <span className="text-[10px] text-amber-400 font-semibold">
              Drag to reposition
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes glitch-h {
          0%   { clip-path: inset(20% 0 60% 0); transform: translate(-4px, 2px); }
          25%  { clip-path: inset(60% 0 10% 0); transform: translate(4px, -2px); }
          50%  { clip-path: inset(40% 0 30% 0); transform: translate(-2px, 4px); }
          75%  { clip-path: inset(10% 0 70% 0); transform: translate(2px, -4px); }
          100% { clip-path: inset(50% 0 20% 0); transform: translate(-4px, 2px); }
        }
        @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.05); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideInLeft { from { transform:translateX(-60px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes slideInRight { from { transform:translateX(60px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes slideInUp { from { transform:translateY(60px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes slideInDown { from { transform:translateY(-60px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes zoomIn { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
        @keyframes bounceIn { 0%{transform:scale(0.3);opacity:0;} 50%{transform:scale(1.05);} 70%{transform:scale(0.9);} 100%{transform:scale(1);opacity:1;} }
        @keyframes rotateIn { from { transform:rotate(-90deg); opacity:0; } to { transform:rotate(0); opacity:1; } }
        @keyframes flipIn { from { transform:rotateY(-90deg); opacity:0; } to { transform:rotateY(0); opacity:1; } }
        @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
        @keyframes slideOutLeft { from { transform:translateX(0); opacity:1; } to { transform:translateX(-60px); opacity:0; } }
        @keyframes slideOutRight { from { transform:translateX(0); opacity:1; } to { transform:translateX(60px); opacity:0; } }
        @keyframes slideOutUp { from { transform:translateY(0); opacity:1; } to { transform:translateY(-60px); opacity:0; } }
        @keyframes slideOutDown { from { transform:translateY(0); opacity:1; } to { transform:translateY(60px); opacity:0; } }
        @keyframes zoomOut { from { transform:scale(1); opacity:1; } to { transform:scale(0.5); opacity:0; } }
        @keyframes bounceOut { 0%{opacity:1;} 25%{transform:scale(0.95);} 55%{transform:scale(1.1);} 100%{transform:scale(0.3);opacity:0;} }
        @keyframes rotateOut { from { transform:rotate(0); opacity:1; } to { transform:rotate(90deg); opacity:0; } }
        @keyframes flipOut { from { transform:rotateY(0); opacity:1; } to { transform:rotateY(90deg); opacity:0; } }
        @keyframes flash { 0%,100%{opacity:1;} 50%{opacity:0;} }
        .editor-anim-fadeIn { animation: fadeIn var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-slideInLeft { animation: slideInLeft var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-slideInRight { animation: slideInRight var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-slideInUp { animation: slideInUp var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-slideInDown { animation: slideInDown var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-zoomIn { animation: zoomIn var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-bounceIn { animation: bounceIn var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-rotateIn { animation: rotateIn var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-flipIn { animation: flipIn var(--anim-dur,0.6s) ease-out both; }
        .editor-anim-fadeOut { animation: fadeOut var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-slideOutLeft { animation: slideOutLeft var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-slideOutRight { animation: slideOutRight var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-slideOutUp { animation: slideOutUp var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-slideOutDown { animation: slideOutDown var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-zoomOut { animation: zoomOut var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-bounceOut { animation: bounceOut var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-rotateOut { animation: rotateOut var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-flipOut { animation: flipOut var(--anim-dur,0.6s) ease-in both; }
        .editor-anim-flash { animation: flash var(--anim-dur,0.6s) ease-in-out both; }
      `}</style>
    </div>
  );
}
