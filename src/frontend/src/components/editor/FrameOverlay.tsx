/**
 * FrameOverlay — A resizable, rotatable golden guide frame overlaid on the video preview.
 * 16:9 for feed, 9:16 for ShortSport. Drag edges to resize. Drag rotation handle to rotate.
 * This is a visual guide only — it does NOT crop the video.
 */
import { useEffect, useRef, useState } from "react";

interface FrameOverlayProps {
  containerWidth: number;
  containerHeight: number;
  /** ratio string e.g. "16:9" or "9:16" */
  ratio: "16:9" | "9:16";
  onRatioToggle: () => void;
}

const MIN_DIM = 40;

export default function FrameOverlay({
  containerWidth,
  containerHeight,
  ratio,
  onRatioToggle,
}: FrameOverlayProps) {
  // Frame geometry (pixels, relative to container)
  const initW = Math.round(containerWidth * 0.6);
  const initH =
    ratio === "16:9"
      ? Math.round(initW * (9 / 16))
      : Math.round(initW * (16 / 9));

  const [frameX, setFrameX] = useState((containerWidth - initW) / 2);
  const [frameY, setFrameY] = useState((containerHeight - initH) / 2);
  const [frameW, setFrameW] = useState(initW);
  const [frameH, setFrameH] = useState(initH);
  const [rotation, setRotation] = useState(0);

  // Reinit when ratio or container size changes
  useEffect(() => {
    const w = Math.round(containerWidth * 0.6);
    const h =
      ratio === "16:9" ? Math.round(w * (9 / 16)) : Math.round(w * (16 / 9));
    setFrameW(w);
    setFrameH(h);
    setFrameX((containerWidth - w) / 2);
    setFrameY((containerHeight - h) / 2);
  }, [ratio, containerWidth, containerHeight]);

  // Drag state
  type DragKind =
    | "move"
    | "resize-r"
    | "resize-b"
    | "resize-l"
    | "resize-t"
    | "rotate";
  const dragRef = useRef<{
    kind: DragKind;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRot: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = clientX - d.startX;
      const dy = clientY - d.startY;
      if (d.kind === "move") {
        setFrameX(d.origX + dx);
        setFrameY(d.origY + dy);
      } else if (d.kind === "resize-r") {
        setFrameW(Math.max(MIN_DIM, d.origW + dx));
      } else if (d.kind === "resize-b") {
        setFrameH(Math.max(MIN_DIM, d.origH + dy));
      } else if (d.kind === "resize-l") {
        const newW = Math.max(MIN_DIM, d.origW - dx);
        setFrameX(d.origX + d.origW - newW);
        setFrameW(newW);
      } else if (d.kind === "resize-t") {
        const newH = Math.max(MIN_DIM, d.origH - dy);
        setFrameY(d.origY + d.origH - newH);
        setFrameH(newH);
      } else if (d.kind === "rotate") {
        // Angle from center
        const angle =
          Math.atan2(clientY - d.centerY, clientX - d.centerX) *
          (180 / Math.PI);
        setRotation(angle + 90);
      }
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) =>
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    const onUp = () => {
      dragRef.current = null;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onUp);
    };
  }, []);

  const startDrag = (
    e: React.MouseEvent | React.TouchEvent,
    kind: DragKind,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = {
      kind,
      startX: clientX,
      startY: clientY,
      origX: frameX,
      origY: frameY,
      origW: frameW,
      origH: frameH,
      origRot: rotation,
      centerX: frameX + frameW / 2,
      centerY: frameY + frameH / 2,
    };
  };

  const HANDLE = 10; // handle size in px
  const HANDLE_STYLE = {
    width: HANDLE,
    height: HANDLE,
    background: "rgba(255,215,0,0.85)",
    border: "1.5px solid rgba(255,215,0,1)",
    borderRadius: 2,
    position: "absolute" as const,
    zIndex: 10,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: frameX,
        top: frameY,
        width: frameW,
        height: frameH,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {/* Golden frame border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "2px solid rgba(255,215,0,0.8)",
          borderRadius: 4,
          boxShadow:
            "0 0 8px rgba(255,215,0,0.3), inset 0 0 8px rgba(255,215,0,0.05)",
          pointerEvents: "none",
        }}
      />

      {/* Ratio label */}
      <div
        style={{
          position: "absolute",
          top: 4,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,215,0,0.85)",
          color: "#000",
          fontSize: 9,
          fontWeight: 700,
          padding: "1px 6px",
          borderRadius: 3,
          pointerEvents: "auto",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        onKeyDown={(e) => e.key === "Enter" && onRatioToggle()}
        aria-label="Toggle aspect ratio"
      >
        {ratio}
      </div>

      {/* Drag to move (whole frame) */}
      <div
        style={{
          position: "absolute",
          inset: HANDLE,
          cursor: "move",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => startDrag(e, "move")}
        onTouchStart={(e) => startDrag(e, "move")}
        role="presentation"
      />

      {/* Edge resize handles */}
      {/* Right */}
      <div
        style={{
          ...HANDLE_STYLE,
          right: -HANDLE / 2,
          top: "50%",
          marginTop: -HANDLE / 2,
          cursor: "ew-resize",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => startDrag(e, "resize-r")}
        onTouchStart={(e) => startDrag(e, "resize-r")}
        role="presentation"
      />
      {/* Left */}
      <div
        style={{
          ...HANDLE_STYLE,
          left: -HANDLE / 2,
          top: "50%",
          marginTop: -HANDLE / 2,
          cursor: "ew-resize",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => startDrag(e, "resize-l")}
        onTouchStart={(e) => startDrag(e, "resize-l")}
        role="presentation"
      />
      {/* Bottom */}
      <div
        style={{
          ...HANDLE_STYLE,
          bottom: -HANDLE / 2,
          left: "50%",
          marginLeft: -HANDLE / 2,
          cursor: "ns-resize",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => startDrag(e, "resize-b")}
        onTouchStart={(e) => startDrag(e, "resize-b")}
        role="presentation"
      />
      {/* Top */}
      <div
        style={{
          ...HANDLE_STYLE,
          top: -HANDLE / 2,
          left: "50%",
          marginLeft: -HANDLE / 2,
          cursor: "ns-resize",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => startDrag(e, "resize-t")}
        onTouchStart={(e) => startDrag(e, "resize-t")}
        role="presentation"
      />

      {/* Rotation handle — above top-center */}
      <div
        style={{
          position: "absolute",
          top: -28,
          left: "50%",
          marginLeft: -8,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "rgba(255,215,0,0.9)",
          border: "1.5px solid rgba(255,215,0,1)",
          cursor: "grab",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseDown={(e) => startDrag(e, "rotate")}
        onTouchStart={(e) => startDrag(e, "rotate")}
        role="presentation"
        title="Rotate"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>

      {/* Connector line from rotation handle */}
      <div
        style={{
          position: "absolute",
          top: -16,
          left: "50%",
          marginLeft: -0.5,
          width: 1,
          height: 16,
          background: "rgba(255,215,0,0.6)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
