/**
 * TransitionsPanel — 50+ CSS-animated transitions for the video editor.
 * Only this file was changed. No other files were touched.
 */
import { cn } from "@/lib/utils";
import type { EditorState } from "@/pages/EditorPage";
import { useEffect, useRef, useState } from "react";
import type { MediaEditorState } from "./MediaEditorTab";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransitionDef {
  id: string;
  label: string;
  group: string;
  /** gradient used as preview thumbnail background */
  gradient: string;
  /** CSS keyframe animation name for the preview thumbnail hover */
  animClass: string;
}

/** Minimal shape required by TransitionsPanel — both EditorState and
 *  MediaEditorState satisfy this interface via the adapter below. */
interface TransitionsCompatState {
  clips: { id: string }[];
  transitions: Record<string, string>;
}

interface TransitionsPanelProps {
  state: TransitionsCompatState;
  onUpdate: (updates: Partial<TransitionsCompatState>) => void;
}

/** Narrow adapter: wrap a MediaEditorState so TransitionsPanel can consume it */
export function mediaStateToTransitionsAdapter(
  state: MediaEditorState,
  onUpdate: (u: Partial<MediaEditorState>) => void,
): {
  state: TransitionsCompatState;
  onUpdate: (u: Partial<TransitionsCompatState>) => void;
} {
  const compat: TransitionsCompatState = {
    clips: state.clips.map((_, i) => ({ id: `clip-${i}` })),
    transitions: state.transitions ?? {},
  };
  return {
    state: compat,
    onUpdate: (u) => {
      const patch: Partial<MediaEditorState> = {};
      if (u.transitions !== undefined) patch.transitions = u.transitions;
      onUpdate(patch);
    },
  };
}

/** Narrow adapter: wrap an EditorState so TransitionsPanel can consume it.
 *  EditorState already has .clips (Clip[]) and .transitions, so just cast. */
export function editorStateToTransitionsAdapter(
  state: EditorState,
  onUpdate: (u: Partial<EditorState>) => void,
): {
  state: TransitionsCompatState;
  onUpdate: (u: Partial<TransitionsCompatState>) => void;
} {
  return {
    state: { clips: state.clips, transitions: state.transitions },
    onUpdate: onUpdate as (u: Partial<TransitionsCompatState>) => void,
  };
}

// ─── Transition Definitions ───────────────────────────────────────────────────

const TRANSITION_GROUPS: { group: string; transitions: TransitionDef[] }[] = [
  {
    group: "Fades & Mix",
    transitions: [
      {
        id: "mix",
        label: "Mix",
        group: "Fades & Mix",
        gradient: "linear-gradient(135deg,#a78bfa,#06b6d4)",
        animClass: "tp-mix",
      },
      {
        id: "fade-b",
        label: "Fade B",
        group: "Fades & Mix",
        gradient: "linear-gradient(135deg,#1a1a1a,#374151)",
        animClass: "tp-fade-b",
      },
      {
        id: "fade-w",
        label: "Fade W",
        group: "Fades & Mix",
        gradient: "linear-gradient(135deg,#e5e7eb,#f9fafb)",
        animClass: "tp-fade-w",
      },
    ],
  },
  {
    group: "Move",
    transitions: [
      {
        id: "move-u",
        label: "Move U",
        group: "Move",
        gradient: "linear-gradient(135deg,#f59e0b,#ef4444)",
        animClass: "tp-move-u",
      },
      {
        id: "move-d",
        label: "Move D",
        group: "Move",
        gradient: "linear-gradient(135deg,#ef4444,#f59e0b)",
        animClass: "tp-move-d",
      },
      {
        id: "move-l",
        label: "Move L",
        group: "Move",
        gradient: "linear-gradient(135deg,#10b981,#06b6d4)",
        animClass: "tp-move-l",
      },
      {
        id: "move-r",
        label: "Move R",
        group: "Move",
        gradient: "linear-gradient(135deg,#06b6d4,#10b981)",
        animClass: "tp-move-r",
      },
    ],
  },
  {
    group: "Wipe",
    transitions: [
      {
        id: "wipe-u",
        label: "Wipe U",
        group: "Wipe",
        gradient: "linear-gradient(135deg,#8b5cf6,#ec4899)",
        animClass: "tp-wipe-u",
      },
      {
        id: "wipe-d",
        label: "Wipe D",
        group: "Wipe",
        gradient: "linear-gradient(135deg,#ec4899,#8b5cf6)",
        animClass: "tp-wipe-d",
      },
      {
        id: "wipe-l",
        label: "Wipe L",
        group: "Wipe",
        gradient: "linear-gradient(135deg,#f59e0b,#8b5cf6)",
        animClass: "tp-wipe-l",
      },
      {
        id: "wipe-r",
        label: "Wipe R",
        group: "Wipe",
        gradient: "linear-gradient(135deg,#8b5cf6,#f59e0b)",
        animClass: "tp-wipe-r",
      },
    ],
  },
  {
    group: "Noise & Glitch",
    transitions: [
      {
        id: "noise",
        label: "Noise",
        group: "Noise & Glitch",
        gradient: "linear-gradient(135deg,#374151,#6b7280)",
        animClass: "tp-noise",
      },
      {
        id: "vhs",
        label: "VHS",
        group: "Noise & Glitch",
        gradient: "linear-gradient(135deg,#065f46,#1e3a5f)",
        animClass: "tp-vhs",
      },
      {
        id: "mosaic",
        label: "Mosaic",
        group: "Noise & Glitch",
        gradient: "linear-gradient(135deg,#7c3aed,#db2777)",
        animClass: "tp-mosaic",
      },
      {
        id: "glitch-cut",
        label: "Glitch Cut",
        group: "Noise & Glitch",
        gradient: "linear-gradient(135deg,#ef4444,#06b6d4,#a78bfa)",
        animClass: "tp-glitch-cut",
      },
    ],
  },
  {
    group: "Scan",
    transitions: [
      {
        id: "scan-u",
        label: "Scan U",
        group: "Scan",
        gradient: "linear-gradient(180deg,#f0f9ff,#0ea5e9)",
        animClass: "tp-scan-u",
      },
      {
        id: "scan-d",
        label: "Scan D",
        group: "Scan",
        gradient: "linear-gradient(180deg,#0ea5e9,#f0f9ff)",
        animClass: "tp-scan-d",
      },
      {
        id: "scan-l",
        label: "Scan L",
        group: "Scan",
        gradient: "linear-gradient(90deg,#f0f9ff,#0ea5e9)",
        animClass: "tp-scan-l",
      },
      {
        id: "scan-r",
        label: "Scan R",
        group: "Scan",
        gradient: "linear-gradient(90deg,#0ea5e9,#f0f9ff)",
        animClass: "tp-scan-r",
      },
    ],
  },
  {
    group: "Flash & Spin",
    transitions: [
      {
        id: "flash",
        label: "Flash",
        group: "Flash & Spin",
        gradient: "linear-gradient(135deg,#fef9c3,#fde68a)",
        animClass: "tp-flash",
      },
      {
        id: "swirl-l",
        label: "Swirl L",
        group: "Flash & Spin",
        gradient: "linear-gradient(135deg,#0ea5e9,#6366f1)",
        animClass: "tp-swirl-l",
      },
      {
        id: "swirl-r",
        label: "Swirl R",
        group: "Flash & Spin",
        gradient: "linear-gradient(135deg,#6366f1,#0ea5e9)",
        animClass: "tp-swirl-r",
      },
      {
        id: "swirl-d",
        label: "Swirl D",
        group: "Flash & Spin",
        gradient: "linear-gradient(135deg,#f59e0b,#ef4444)",
        animClass: "tp-swirl-d",
      },
      {
        id: "spin",
        label: "Spin",
        group: "Flash & Spin",
        gradient: "conic-gradient(from 0deg,#a78bfa,#06b6d4,#a78bfa)",
        animClass: "tp-spin",
      },
      {
        id: "zoom-in",
        label: "Zoom In",
        group: "Flash & Spin",
        gradient: "radial-gradient(circle,#06b6d4 0%,#1e1b4b 100%)",
        animClass: "tp-zoom-in",
      },
      {
        id: "zoom-out",
        label: "Zoom Out",
        group: "Flash & Spin",
        gradient: "radial-gradient(circle,#1e1b4b 0%,#06b6d4 100%)",
        animClass: "tp-zoom-out",
      },
    ],
  },
  {
    group: "Radial & Geo",
    transitions: [
      {
        id: "radial",
        label: "Radial",
        group: "Radial & Geo",
        gradient: "radial-gradient(circle,#f59e0b 0%,#1e1b4b 70%)",
        animClass: "tp-radial",
      },
      {
        id: "blinds",
        label: "Blinds",
        group: "Radial & Geo",
        gradient:
          "repeating-linear-gradient(90deg,#1e3a5f 0px,#1e3a5f 6px,#06b6d4 6px,#06b6d4 12px)",
        animClass: "tp-blinds",
      },
      {
        id: "pane",
        label: "Pane",
        group: "Radial & Geo",
        gradient: "linear-gradient(135deg,#bfdbfe,#93c5fd,#60a5fa)",
        animClass: "tp-pane",
      },
      {
        id: "windmill",
        label: "Windmill",
        group: "Radial & Geo",
        gradient: "conic-gradient(from 45deg,#7c3aed,#06b6d4,#7c3aed)",
        animClass: "tp-windmill",
      },
    ],
  },
  {
    group: "Memory & Open",
    transitions: [
      {
        id: "memory-1",
        label: "Memory 1",
        group: "Memory & Open",
        gradient: "linear-gradient(135deg,#d97706,#92400e)",
        animClass: "tp-memory-1",
      },
      {
        id: "memory-2",
        label: "Memory 2",
        group: "Memory & Open",
        gradient: "linear-gradient(135deg,#6b7280,#1f2937)",
        animClass: "tp-memory-2",
      },
      {
        id: "open-h",
        label: "Open H",
        group: "Memory & Open",
        gradient: "linear-gradient(90deg,#1e3a5f 50%,#065f46 50%)",
        animClass: "tp-open-h",
      },
      {
        id: "open-v",
        label: "Open V",
        group: "Memory & Open",
        gradient: "linear-gradient(180deg,#1e3a5f 50%,#065f46 50%)",
        animClass: "tp-open-v",
      },
    ],
  },
  {
    group: "Ink & Page",
    transitions: [
      {
        id: "ink-1",
        label: "Ink 1",
        group: "Ink & Page",
        gradient: "radial-gradient(circle,#1a1a2e 0%,#7c3aed 80%)",
        animClass: "tp-ink-1",
      },
      {
        id: "ink-2",
        label: "Ink 2",
        group: "Ink & Page",
        gradient: "radial-gradient(ellipse at 0% 0%,#1a1a2e 0%,#db2777 80%)",
        animClass: "tp-ink-2",
      },
      {
        id: "turn-page",
        label: "Turn Page",
        group: "Ink & Page",
        gradient: "linear-gradient(135deg,#fef3c7,#fde68a)",
        animClass: "tp-turn-page",
      },
      {
        id: "blink",
        label: "Blink",
        group: "Ink & Page",
        gradient: "linear-gradient(135deg,#f8fafc,#0ea5e9)",
        animClass: "tp-blink",
      },
    ],
  },
  {
    group: "Circular",
    transitions: [
      {
        id: "circular-1",
        label: "Circular 1",
        group: "Circular",
        gradient:
          "conic-gradient(from 270deg,#a78bfa 0%,#06b6d4 50%,#a78bfa 100%)",
        animClass: "tp-circular-1",
      },
      {
        id: "circular-2",
        label: "Circular 2",
        group: "Circular",
        gradient:
          "conic-gradient(from 90deg,#06b6d4 0%,#a78bfa 50%,#06b6d4 100%)",
        animClass: "tp-circular-2",
      },
      {
        id: "heart",
        label: "Heart",
        group: "Circular",
        gradient:
          "radial-gradient(circle at 50% 40%,#ec4899 0%,#be185d 60%,#1a1a2e 100%)",
        animClass: "tp-heart",
      },
      {
        id: "clockwipe",
        label: "Clockwipe",
        group: "Circular",
        gradient: "conic-gradient(#f59e0b 0deg,#1a1a2e 0deg)",
        animClass: "tp-clockwipe",
      },
      {
        id: "ripple",
        label: "Ripple",
        group: "Circular",
        gradient: "radial-gradient(circle,#06b6d4 0%,#7c3aed 40%,#1a1a2e 100%)",
        animClass: "tp-ripple",
      },
    ],
  },
  {
    group: "Fun",
    transitions: [
      {
        id: "emoji-d",
        label: "Emoji D",
        group: "Fun",
        gradient: "linear-gradient(135deg,#fde68a,#fca5a5)",
        animClass: "tp-emoji-d",
      },
      {
        id: "roll-film",
        label: "Roll Film",
        group: "Fun",
        gradient:
          "linear-gradient(90deg,#1a1a1a 0%,#374151 15%,#1a1a1a 30%,#374151 45%,#1a1a1a 60%,#374151 75%,#1a1a1a 90%)",
        animClass: "tp-roll-film",
      },
    ],
  },
  {
    group: "Blur",
    transitions: [
      {
        id: "blur-out-in",
        label: "Blur Out/In",
        group: "Blur",
        gradient: "radial-gradient(circle,#a78bfa 0%,#1e1b4b 100%)",
        animClass: "tp-blur-out-in",
      },
    ],
  },
  {
    group: "Slides",
    transitions: [
      {
        id: "slide-l",
        label: "Slide L",
        group: "Slides",
        gradient: "linear-gradient(90deg,#f59e0b,#ef4444)",
        animClass: "tp-slide-l",
      },
      {
        id: "slide-r",
        label: "Slide R",
        group: "Slides",
        gradient: "linear-gradient(90deg,#06b6d4,#6366f1)",
        animClass: "tp-slide-r",
      },
      {
        id: "up-left",
        label: "Up Left",
        group: "Slides",
        gradient: "linear-gradient(225deg,#10b981,#0ea5e9)",
        animClass: "tp-up-left",
      },
      {
        id: "up-right",
        label: "Up Right",
        group: "Slides",
        gradient: "linear-gradient(315deg,#a78bfa,#f59e0b)",
        animClass: "tp-up-right",
      },
    ],
  },
];

const ALL_TRANSITIONS: TransitionDef[] = TRANSITION_GROUPS.flatMap(
  (g) => g.transitions,
);

// ─── CSS keyframes injected once ─────────────────────────────────────────────

const TRANSITION_CSS = `
/* TransitionsPanel preview animations */
.tp-preview { width: 70px; height: 70px; border-radius: 10px; overflow: hidden; transition: transform 0.2s; }
.tp-preview:hover { transform: scale(1.06); }
.tp-preview .tp-thumb { width: 100%; height: 100%; border-radius: 10px; }

/* Group 1 — Fades */
@keyframes tp-mix-anim { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.95)} }
.tp-mix:hover .tp-thumb { animation: tp-mix-anim 1s ease-in-out infinite; }

@keyframes tp-fade-b-anim { 0%,100%{opacity:1} 50%{opacity:0;background:#000 !important} }
.tp-fade-b:hover .tp-thumb { animation: tp-fade-b-anim 1s ease-in-out infinite; }

@keyframes tp-fade-w-anim { 0%,100%{opacity:1} 50%{opacity:0;background:#fff !important} }
.tp-fade-w:hover .tp-thumb { animation: tp-fade-w-anim 1s ease-in-out infinite; }

/* Group 2 — Move */
@keyframes tp-move-u-anim { 0%{transform:translateY(0)} 50%{transform:translateY(-100%)} 51%{transform:translateY(100%)} 100%{transform:translateY(0)} }
.tp-move-u:hover .tp-thumb { animation: tp-move-u-anim 1s ease-in-out infinite; }

@keyframes tp-move-d-anim { 0%{transform:translateY(0)} 50%{transform:translateY(100%)} 51%{transform:translateY(-100%)} 100%{transform:translateY(0)} }
.tp-move-d:hover .tp-thumb { animation: tp-move-d-anim 1s ease-in-out infinite; }

@keyframes tp-move-l-anim { 0%{transform:translateX(0)} 50%{transform:translateX(-100%)} 51%{transform:translateX(100%)} 100%{transform:translateX(0)} }
.tp-move-l:hover .tp-thumb { animation: tp-move-l-anim 1s ease-in-out infinite; }

@keyframes tp-move-r-anim { 0%{transform:translateX(0)} 50%{transform:translateX(100%)} 51%{transform:translateX(-100%)} 100%{transform:translateX(0)} }
.tp-move-r:hover .tp-thumb { animation: tp-move-r-anim 1s ease-in-out infinite; }

/* Group 3 — Wipe (clip-path) */
@keyframes tp-wipe-u-anim { 0%{clip-path:inset(100% 0 0 0)} 50%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 100% 0)} }
.tp-wipe-u:hover .tp-thumb { animation: tp-wipe-u-anim 1.2s ease-in-out infinite; }

@keyframes tp-wipe-d-anim { 0%{clip-path:inset(0 0 100% 0)} 50%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(100% 0 0 0)} }
.tp-wipe-d:hover .tp-thumb { animation: tp-wipe-d-anim 1.2s ease-in-out infinite; }

@keyframes tp-wipe-l-anim { 0%{clip-path:inset(0 100% 0 0)} 50%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 0 100%)} }
.tp-wipe-l:hover .tp-thumb { animation: tp-wipe-l-anim 1.2s ease-in-out infinite; }

@keyframes tp-wipe-r-anim { 0%{clip-path:inset(0 0 0 100%)} 50%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 100% 0 0)} }
.tp-wipe-r:hover .tp-thumb { animation: tp-wipe-r-anim 1.2s ease-in-out infinite; }

/* Group 4 — Noise */
@keyframes tp-noise-anim { 0%,100%{filter:none;opacity:1} 25%{filter:contrast(200%) brightness(150%);opacity:0.7} 50%{filter:saturate(0) contrast(300%);opacity:0.5} 75%{filter:hue-rotate(90deg) contrast(200%);opacity:0.7} }
.tp-noise:hover .tp-thumb { animation: tp-noise-anim 0.4s steps(2) infinite; }

@keyframes tp-vhs-anim { 0%,100%{transform:translateX(0) skewX(0deg)} 20%{transform:translateX(4px) skewX(-2deg)} 40%{transform:translateX(-4px) skewX(2deg);filter:hue-rotate(90deg)} 60%{transform:translateX(3px) skewX(-1deg)} 80%{transform:translateX(-2px) skewX(1deg);filter:hue-rotate(-45deg)} }
.tp-vhs:hover .tp-thumb { animation: tp-vhs-anim 0.5s steps(3) infinite; }

@keyframes tp-mosaic-anim { 0%,100%{filter:none} 33%{filter:blur(0px) contrast(200%)} 66%{filter:blur(2px) contrast(150%)} }
.tp-mosaic:hover .tp-thumb { animation: tp-mosaic-anim 0.6s steps(4) infinite; }

/* Group 5 — Scan */
@keyframes tp-scan-u-anim { 0%{background-position:50% 100%} 100%{background-position:50% -100%} }
.tp-scan-u:hover .tp-thumb { background-image: linear-gradient(180deg, transparent 45%, rgba(255,255,255,0.9) 50%, transparent 55%) !important; background-size: 100% 200%; animation: tp-scan-u-anim 0.8s linear infinite; }

@keyframes tp-scan-d-anim { 0%{background-position:50% -100%} 100%{background-position:50% 100%} }
.tp-scan-d:hover .tp-thumb { background-image: linear-gradient(180deg, transparent 45%, rgba(255,255,255,0.9) 50%, transparent 55%) !important; background-size: 100% 200%; animation: tp-scan-d-anim 0.8s linear infinite; }

@keyframes tp-scan-l-anim { 0%{background-position:100% 50%} 100%{background-position:-100% 50%} }
.tp-scan-l:hover .tp-thumb { background-image: linear-gradient(90deg, transparent 45%, rgba(255,255,255,0.9) 50%, transparent 55%) !important; background-size: 200% 100%; animation: tp-scan-l-anim 0.8s linear infinite; }

@keyframes tp-scan-r-anim { 0%{background-position:-100% 50%} 100%{background-position:100% 50%} }
.tp-scan-r:hover .tp-thumb { background-image: linear-gradient(90deg, transparent 45%, rgba(255,255,255,0.9) 50%, transparent 55%) !important; background-size: 200% 100%; animation: tp-scan-r-anim 0.8s linear infinite; }

/* Group 6 — Flash & Spin */
@keyframes tp-flash-anim { 0%,100%{opacity:1} 20%,40%,60%,80%{opacity:0} 10%,30%,50%,70%,90%{opacity:1;filter:brightness(10)} }
.tp-flash:hover .tp-thumb { animation: tp-flash-anim 0.6s ease-in-out; }

@keyframes tp-swirl-l-anim { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(-360deg)} }
.tp-swirl-l:hover .tp-thumb { transform-style: preserve-3d; animation: tp-swirl-l-anim 0.8s ease-in-out infinite; }

@keyframes tp-swirl-r-anim { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(360deg)} }
.tp-swirl-r:hover .tp-thumb { transform-style: preserve-3d; animation: tp-swirl-r-anim 0.8s ease-in-out infinite; }

@keyframes tp-swirl-d-anim { 0%{transform:rotateX(0deg)} 100%{transform:rotateX(-360deg)} }
.tp-swirl-d:hover .tp-thumb { transform-style: preserve-3d; animation: tp-swirl-d-anim 0.8s ease-in-out infinite; }

@keyframes tp-spin-anim { 0%{transform:rotate(0deg) scale(0.8);opacity:0.5} 50%{transform:rotate(180deg) scale(1.1);opacity:1} 100%{transform:rotate(360deg) scale(0.8);opacity:0.5} }
.tp-spin:hover .tp-thumb { animation: tp-spin-anim 0.9s ease-in-out infinite; }

/* Group 7 — Radial & Geo */
@keyframes tp-radial-anim { 0%{clip-path:circle(0% at 50% 50%)} 50%{clip-path:circle(80% at 50% 50%)} 100%{clip-path:circle(0% at 50% 50%)} }
.tp-radial:hover .tp-thumb { animation: tp-radial-anim 1s ease-in-out infinite; }

@keyframes tp-blinds-anim { 0%,100%{clip-path:inset(0 100% 0 0)} 50%{clip-path:inset(0 0 0 0)} }
.tp-blinds:hover .tp-thumb { animation: tp-blinds-anim 1s steps(6) infinite; }

@keyframes tp-pane-anim { 0%{transform:scale(1) skewX(0)} 33%{transform:scale(0.8) skewX(-15deg);opacity:0.7} 66%{transform:scale(1.1) skewX(8deg);opacity:0.9} 100%{transform:scale(1) skewX(0);opacity:1} }
.tp-pane:hover .tp-thumb { animation: tp-pane-anim 0.9s ease-in-out infinite; }

@keyframes tp-windmill-anim { 0%{transform:rotate(0deg);transform-origin:0% 100%} 100%{transform:rotate(360deg);transform-origin:0% 100%} }
.tp-windmill:hover .tp-thumb { animation: tp-windmill-anim 1s ease-in-out infinite; }

/* Group 8 — Memory & Open */
@keyframes tp-memory-1-anim { 0%,100%{filter:none;transform:scale(1)} 50%{filter:sepia(100%) brightness(70%);transform:scale(0.85)} }
.tp-memory-1:hover .tp-thumb { animation: tp-memory-1-anim 1.2s ease-in-out infinite; }

@keyframes tp-memory-2-anim { 0%,100%{filter:none;transform:scale(1)} 50%{filter:grayscale(100%) blur(3px) brightness(60%);transform:scale(0.9)} }
.tp-memory-2:hover .tp-thumb { animation: tp-memory-2-anim 1.2s ease-in-out infinite; }

@keyframes tp-open-h-anim { 0%{clip-path:inset(0 50% 0 50%)} 50%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 50% 0 50%)} }
.tp-open-h:hover .tp-thumb { animation: tp-open-h-anim 1s ease-in-out infinite; }

@keyframes tp-open-v-anim { 0%{clip-path:inset(50% 0 50% 0)} 50%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(50% 0 50% 0)} }
.tp-open-v:hover .tp-thumb { animation: tp-open-v-anim 1s ease-in-out infinite; }

/* Group 9 — Ink & Page */
@keyframes tp-ink-1-anim { 0%{clip-path:circle(0% at 50% 50%);opacity:0} 50%{clip-path:circle(80% at 50% 50%);opacity:1} 100%{clip-path:circle(0% at 50% 50%);opacity:0} }
.tp-ink-1:hover .tp-thumb { animation: tp-ink-1-anim 1s ease-in-out infinite; }

@keyframes tp-ink-2-anim { 0%{clip-path:ellipse(0% 0% at 0% 0%);opacity:0} 50%{clip-path:ellipse(120% 120% at 0% 0%);opacity:1} 100%{clip-path:ellipse(0% 0% at 0% 0%);opacity:0} }
.tp-ink-2:hover .tp-thumb { animation: tp-ink-2-anim 1s ease-in-out infinite; }

@keyframes tp-turn-page-anim { 0%{transform:perspective(200px) rotateY(0deg)} 50%{transform:perspective(200px) rotateY(-90deg);opacity:0.4} 100%{transform:perspective(200px) rotateY(0deg)} }
.tp-turn-page:hover .tp-thumb { transform-origin: left center; animation: tp-turn-page-anim 1s ease-in-out infinite; }

@keyframes tp-blink-anim { 0%,100%{opacity:1} 10%,30%,50%,70%{opacity:0} 20%,40%,60%,80%{opacity:1} }
.tp-blink:hover .tp-thumb { animation: tp-blink-anim 0.5s linear; }

/* Group 10 — Circular */
@keyframes tp-circular-1-anim { 0%{clip-path:polygon(50% 50%,50% 0%,50% 0%)} 50%{clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 100%,0 100%,0 0%,50% 0%)} 100%{clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 100%,0 100%,0 0%,50% 0%,50% 50%)} }
.tp-circular-1:hover .tp-thumb { animation: tp-circular-1-anim 1s ease-in-out infinite; }

@keyframes tp-circular-2-anim { 0%{clip-path:polygon(50% 50%,50% 100%,50% 100%)} 50%{clip-path:polygon(50% 50%,50% 100%,0 100%,0 0%,100% 0%,100% 100%,50% 100%)} 100%{clip-path:polygon(50% 50%,50% 100%,0 100%,0 0%,100% 0%,100% 100%,50% 100%,50% 50%)} }
.tp-circular-2:hover .tp-thumb { animation: tp-circular-2-anim 1s ease-in-out infinite; }

@keyframes tp-heart-anim { 0%{clip-path:polygon(50% 30%,50% 30%,50% 30%,50% 30%)} 50%{clip-path:polygon(50% 80%, 10% 40%, 20% 10%, 50% 30%, 80% 10%, 90% 40%)} 100%{clip-path:polygon(50% 30%,50% 30%,50% 30%,50% 30%)} }
.tp-heart:hover .tp-thumb { animation: tp-heart-anim 1.2s ease-in-out infinite; }

@keyframes tp-clockwipe-anim { 0%{clip-path:polygon(50% 50%,50% 0%,50% 0%)} 25%{clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 50%)} 50%{clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 100%,50% 100%)} 75%{clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 100%,0 100%,0 50%)} 100%{clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 100%,0 100%,0 0%,50% 0%)} }
.tp-clockwipe:hover .tp-thumb { animation: tp-clockwipe-anim 1.2s linear infinite; }

/* Group 11 — Fun */
@keyframes tp-emoji-d-anim { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(100%);opacity:0} }
.tp-emoji-d:hover .tp-thumb { animation: tp-emoji-d-anim 0.8s ease-in infinite; }

@keyframes tp-roll-film-anim { 0%{background-position:0% 50%} 100%{background-position:100% 50%} }
.tp-roll-film:hover .tp-thumb { background-size: 400% 100% !important; animation: tp-roll-film-anim 0.6s linear infinite; }

/* Group 12 — Blur */
@keyframes tp-blur-out-in-anim { 0%,100%{filter:blur(0px)} 50%{filter:blur(12px) brightness(0.7)} }
.tp-blur-out-in:hover .tp-thumb { animation: tp-blur-out-in-anim 1s ease-in-out infinite; }

/* Group 13 — Slides */
@keyframes tp-slide-l-anim { 0%{transform:translateX(0)} 100%{transform:translateX(-100%)} }
.tp-slide-l:hover .tp-thumb { animation: tp-slide-l-anim 0.7s ease-in-out infinite alternate; }

@keyframes tp-slide-r-anim { 0%{transform:translateX(0)} 100%{transform:translateX(100%)} }
.tp-slide-r:hover .tp-thumb { animation: tp-slide-r-anim 0.7s ease-in-out infinite alternate; }

@keyframes tp-up-left-anim { 0%{transform:translate(0,0)} 100%{transform:translate(-70%,-70%)} }
.tp-up-left:hover .tp-thumb { animation: tp-up-left-anim 0.7s ease-in-out infinite alternate; }

@keyframes tp-up-right-anim { 0%{transform:translate(0,0)} 100%{transform:translate(70%,-70%)} }
.tp-up-right:hover .tp-thumb { animation: tp-up-right-anim 0.7s ease-in-out infinite alternate; }

/* Group 14 — New: Zoom In, Zoom Out, Glitch Cut, Ripple */
@keyframes tp-zoom-in-anim { 0%{transform:scale(0.8);opacity:0} 50%{transform:scale(1);opacity:1} 100%{transform:scale(0.8);opacity:0} }
.tp-zoom-in:hover .tp-thumb { animation: tp-zoom-in-anim 1s ease-in-out infinite; }

@keyframes tp-zoom-out-anim { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.2);opacity:0} 100%{transform:scale(1);opacity:1} }
.tp-zoom-out:hover .tp-thumb { animation: tp-zoom-out-anim 1s ease-in-out infinite; }

@keyframes tp-glitch-cut-anim { 0%,100%{transform:translateX(0);filter:none} 10%{transform:translateX(-6px);filter:drop-shadow(4px 0 0 #ef4444) drop-shadow(-4px 0 0 #06b6d4)} 20%{transform:translateX(6px);filter:drop-shadow(-4px 0 0 #ef4444) drop-shadow(4px 0 0 #a78bfa)} 30%{transform:translateX(-3px);filter:none} 40%{transform:translateX(3px);filter:drop-shadow(2px 0 0 #ef4444)} 50%{transform:translateX(0);filter:none} }
.tp-glitch-cut:hover .tp-thumb { animation: tp-glitch-cut-anim 0.4s steps(3) infinite; }

@keyframes tp-ripple-anim { 0%{transform:perspective(300px) rotateX(0deg);opacity:1} 50%{transform:perspective(300px) rotateX(20deg);opacity:0.7} 100%{transform:perspective(300px) rotateX(0deg);opacity:1} }
.tp-ripple:hover .tp-thumb { transform-origin: center bottom; animation: tp-ripple-anim 0.9s ease-in-out infinite; }
`;

// ─── StyleInjector (inject once) ─────────────────────────────────────────────

function useTransitionStyles() {
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const el = document.createElement("style");
    el.id = "transitions-panel-css";
    el.textContent = TRANSITION_CSS;
    document.head.appendChild(el);
    return () => {
      const existing = document.getElementById("transitions-panel-css");
      if (existing) existing.remove();
      injected.current = false;
    };
  }, []);
}

// ─── TransitionCard ───────────────────────────────────────────────────────────

interface TransitionCardProps {
  transition: TransitionDef;
  selected: boolean;
  onClick: () => void;
}

function TransitionCard({
  transition,
  selected,
  onClick,
}: TransitionCardProps) {
  return (
    <button
      type="button"
      data-ocid={`transition.card.${transition.id}`}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-1.5 rounded-xl border transition-all duration-200 group",
        selected
          ? "border-[#F5A623] bg-[#F5A623]/10 shadow-[0_0_8px_rgba(245,166,35,0.35)]"
          : "border-white/10 bg-gray-900/60 hover:border-white/25 hover:bg-gray-800/60",
      )}
    >
      {/* Thumbnail */}
      <div className={cn("tp-preview", transition.animClass)}>
        <div className="tp-thumb" style={{ background: transition.gradient }} />
      </div>
      {/* Label */}
      <span
        className={cn(
          "text-[10px] font-medium leading-tight text-center w-full truncate px-0.5",
          selected
            ? "text-[#F5A623]"
            : "text-gray-400 group-hover:text-gray-200",
        )}
      >
        {transition.label}
      </span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TransitionsPanel({
  state,
  onUpdate,
}: TransitionsPanelProps) {
  useTransitionStyles();

  const [selectedClipIdx, setSelectedClipIdx] = useState(0);
  const [duration, setDuration] = useState(0.5);
  const [applyAll, setApplyAll] = useState(false);

  const clipPairCount = Math.max(0, state.clips.length - 1);

  const getKey = (idx: number) => `${idx}-${idx + 1}`;

  const currentTransition = state.transitions[getKey(selectedClipIdx)] ?? "";

  const handleSelectTransition = (id: string) => {
    const newVal = currentTransition === id ? "" : id;

    if (applyAll && clipPairCount > 0) {
      const updated: Record<string, string> = { ...state.transitions };
      for (let i = 0; i < clipPairCount; i++) {
        updated[getKey(i)] = newVal;
      }
      onUpdate({ transitions: updated });
    } else {
      onUpdate({
        transitions: {
          ...state.transitions,
          [getKey(selectedClipIdx)]: newVal,
        },
      });
    }
  };

  return (
    <div className="p-3 space-y-4">
      {/* Duration slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Duration
          </span>
          <span className="text-xs font-mono text-[#F5A623]">
            {duration.toFixed(1)}s
          </span>
        </div>
        <input
          data-ocid="transition.duration_slider"
          type="range"
          min={0.3}
          max={1.5}
          step={0.1}
          value={duration}
          onChange={(e) => setDuration(Number.parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #F5A623 0%, #F5A623 ${((duration - 0.3) / 1.2) * 100}%, rgba(255,255,255,0.15) ${((duration - 0.3) / 1.2) * 100}%, rgba(255,255,255,0.15) 100%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>0.3s</span>
          <span>1.5s</span>
        </div>
      </div>

      {/* Apply to All toggle */}
      <div className="flex items-center justify-between py-2 border-y border-white/10">
        <span className="text-xs text-gray-300 font-medium">
          Apply to All Clips
        </span>
        <button
          type="button"
          data-ocid="transition.apply_all_toggle"
          onClick={() => setApplyAll((v) => !v)}
          className={cn(
            "relative w-10 h-5 rounded-full transition-colors duration-200 border",
            applyAll
              ? "bg-[#F5A623]/80 border-[#F5A623]"
              : "bg-gray-700 border-white/10",
          )}
          aria-pressed={applyAll}
          aria-label="Apply transition to all clips"
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200 shadow",
              applyAll ? "left-[22px] bg-white" : "left-0.5 bg-gray-400",
            )}
          />
        </button>
      </div>

      {/* Clip pair selector */}
      {clipPairCount > 1 && (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Clip Pair
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {state.clips.slice(0, -1).map((_clip, i) => (
              <button
                type="button"
                key={_clip.id ?? `pair-${i}`}
                data-ocid={`transition.clip_pair.${i + 1}`}
                onClick={() => setSelectedClipIdx(i)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs border transition-all",
                  selectedClipIdx === i
                    ? "bg-[#F5A623]/15 border-[#F5A623]/60 text-[#F5A623]"
                    : "bg-gray-900/60 border-white/10 text-gray-400 hover:border-white/25",
                )}
              >
                {i + 1}→{i + 2}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No clips fallback */}
      {clipPairCount === 0 && (
        <div
          data-ocid="transition.empty_state"
          className="text-center py-8 text-gray-500"
        >
          <p className="text-3xl mb-2">🎬</p>
          <p className="text-sm">Add at least 2 clips to apply transitions</p>
        </div>
      )}

      {/* Transition grid — all groups */}
      <div className="space-y-4">
        {TRANSITION_GROUPS.map(({ group, transitions }) => (
          <div key={group}>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-0.5">
              {group}
            </h3>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {transitions.map((t) => (
                <TransitionCard
                  key={t.id}
                  transition={t}
                  selected={
                    applyAll
                      ? currentTransition === t.id
                      : state.transitions[getKey(selectedClipIdx)] === t.id
                  }
                  onClick={() => handleSelectTransition(t.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Currently active summary */}
      {currentTransition && clipPairCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30">
          <span className="text-[#F5A623] text-xs">✦</span>
          <span className="text-xs text-gray-300">
            <span className="text-[#F5A623] font-semibold">
              {ALL_TRANSITIONS.find((t) => t.id === currentTransition)?.label ??
                currentTransition}
            </span>{" "}
            applied{" "}
            {applyAll
              ? "to all clips"
              : `between clip ${selectedClipIdx + 1}→${selectedClipIdx + 2}`}{" "}
            · {duration.toFixed(1)}s
          </span>
        </div>
      )}
    </div>
  );
}
