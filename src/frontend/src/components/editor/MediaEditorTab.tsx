/**
 * MediaEditorTab — Full CapCut-style inline editor embedded in CreatePostPage.
 * Manages all editor state, undo/redo, tool selection, and the publish flow.
 */
import { Slider } from "@/components/ui/slider";
import { useCreatePost, useGetCallerUserProfile } from "@/hooks/useQueries";
import * as localPosts from "@/lib/localPosts";
import type { Clip, EditorState } from "@/pages/EditorPage";
import {
  AlignJustify,
  Camera,
  ChevronLeft,
  Copy,
  Crop,
  Eye,
  Film,
  Frame,
  GitMerge,
  Image,
  Loader2,
  Music,
  Redo2,
  RefreshCw,
  Rewind,
  RotateCcw,
  Scissors,
  ScissorsSquare,
  Sliders,
  Sparkles,
  Sticker,
  Timer,
  Trash2,
  Type,
  Undo2,
  Upload,
  Video,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import AnimationPanel from "./AnimationPanel";
import AudioPanelV2 from "./AudioPanelV2";
import BackgroundPanel from "./BackgroundPanel";
import CaptionPanel from "./CaptionPanel";
import CopyPanel from "./CopyPanel";
import CropPanel from "./CropPanel";
import CutoutPanel from "./CutoutPanel";
import DeletePanel from "./DeletePanel";
import EditorPreviewCanvas from "./EditorPreviewCanvas";
import EditorTimeline from "./EditorTimeline";
import EffectsPanelV2 from "./EffectsPanelV2";
import FrameOverlay from "./FrameOverlay";
import FreezePanel from "./FreezePanel";
import KeyframePanel from "./KeyframePanel";
import OpacityPanel from "./OpacityPanel";
import PipPanel from "./PipPanel";
import ReplacePanel from "./ReplacePanel";
import ReversePanel from "./ReversePanel";
import RotateFlipPanel from "./RotateFlipPanel";
import SoundVolumePanel from "./SoundVolumePanel";
import SpeedPanel from "./SpeedPanel";
import SplitPanel from "./SplitPanel";
import TextOverlayPanel from "./TextOverlayPanel";
import ThumbnailPanel from "./ThumbnailPanel";
import TransitionsPanel, {
  mediaStateToTransitionsAdapter,
} from "./TransitionsPanel";
import TrimPanel from "./TrimPanel";
import VoiceChangerPanel from "./VoiceChangerPanel";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // percent
  y: number; // percent
  fontSize: number;
  fontFamily: "serif" | "sans" | "mono";
  color: string;
  opacity: number;
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
}

export interface PipOverlay {
  src: string;
  type: "image" | "video";
  x: number;
  y: number;
  scale: number; // 10–100
  opacity: number;
}

export interface CaptionSettings {
  text: string;
  style: "classic" | "neon" | "bold";
  color: string;
  bgColor: string;
  bgOpacity: number;
  fontSize: number;
  verticalPos: number; // 10–90 percent
}

export interface KeyframePoint {
  id: string;
  time: number;
  opacity?: number;
  scale?: number;
  x?: number;
  y?: number;
}

export interface ClipSegment {
  start: number;
  end: number;
}

export interface MediaEditorState {
  // Trim
  trimStart: number;
  trimEnd: number;
  // Filters (CSS filter string built from these)
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  filterPreset: string;
  // Effects
  activeEffects: string[];
  // Text overlays
  textOverlays: TextOverlay[];
  // Stickers
  stickers: StickerOverlay[];
  // PiP
  pip: PipOverlay | null;
  // Speed
  speed: number;
  // Audio tracks
  audioTracks: {
    id: string;
    name: string;
    src: string;
    volume: number;
    muted: boolean;
    duration: number;
  }[];
  // Caption
  caption: CaptionSettings;
  // Background
  bgMode: "original" | "color" | "blur" | "gradient";
  bgColor: string;
  bgBlur: number;
  bgGradient: string;
  // Sound volume
  videoVolume: number;
  muteOriginal: boolean;
  bgMusicVolume: number;
  // Rotate / Flip
  rotation: number; // 0 | 90 | 180 | 270
  flipH: boolean;
  flipV: boolean;
  // ── New tools ────────────────────────────────────────────────────────────────
  // Keyframe
  keyframes: KeyframePoint[];
  // Split / multi-clip timeline
  clips: ClipSegment[];
  // Animation
  animationIn: string;
  animationOut: string;
  animationDuration: number;
  // Crop
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  cropAspect: string;
  // Cutout
  cutoutShape: string;
  cutoutFeather: number;
  removeBackground: boolean;
  // Opacity
  clipOpacity: number;
  // Replace
  replacementFile: File | null;
  // Voice changer
  voicePreset: string;
  // Freeze
  freezeTime: number;
  freezeDuration: number;
  freezeActive: boolean;
  // Reverse
  isReversed: boolean;
  // Transitions between clips
  transitions: Record<string, string>;
}

const DEFAULT_CAPTION: CaptionSettings = {
  text: "",
  style: "classic",
  color: "#ffffff",
  bgColor: "#000000",
  bgOpacity: 50,
  fontSize: 20,
  verticalPos: 80,
};

export const DEFAULT_EDITOR_STATE: MediaEditorState = {
  trimStart: 0,
  trimEnd: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  filterPreset: "none",
  activeEffects: [],
  textOverlays: [],
  stickers: [],
  pip: null,
  speed: 1,
  audioTracks: [],
  caption: DEFAULT_CAPTION,
  bgMode: "original",
  bgColor: "#1a1a2e",
  bgBlur: 10,
  bgGradient: "linear-gradient(135deg,#f5c842,#06b6d4)",
  videoVolume: 100,
  muteOriginal: false,
  bgMusicVolume: 80,
  rotation: 0,
  flipH: false,
  flipV: false,
  // New tools
  keyframes: [],
  clips: [],
  animationIn: "none",
  animationOut: "none",
  animationDuration: 0.6,
  cropX: 0,
  cropY: 0,
  cropW: 100,
  cropH: 100,
  cropAspect: "free",
  cutoutShape: "none",
  cutoutFeather: 0,
  removeBackground: false,
  clipOpacity: 100,
  replacementFile: null,
  voicePreset: "normal",
  freezeTime: 0,
  freezeDuration: 2,
  freezeActive: false,
  isReversed: false,
  transitions: {},
};

// ─── Undo/Redo reducer ─────────────────────────────────────────────────────────

type HistoryAction =
  | { type: "UPDATE"; state: Partial<MediaEditorState> }
  | { type: "UNDO" }
  | { type: "REDO" };

interface HistoryStack {
  past: MediaEditorState[];
  present: MediaEditorState;
  future: MediaEditorState[];
}

function historyReducer(
  stack: HistoryStack,
  action: HistoryAction,
): HistoryStack {
  switch (action.type) {
    case "UPDATE": {
      const next = { ...stack.present, ...action.state };
      return {
        past: [...stack.past.slice(-9), stack.present],
        present: next,
        future: [],
      };
    }
    case "UNDO": {
      if (!stack.past.length) return stack;
      const [prev, ...rest] = [...stack.past].reverse();
      return {
        past: rest.reverse(),
        present: prev,
        future: [stack.present, ...stack.future],
      };
    }
    case "REDO": {
      if (!stack.future.length) return stack;
      const [next, ...rest] = stack.future;
      return {
        past: [...stack.past, stack.present],
        present: next,
        future: rest,
      };
    }
  }
}

// ─── Tool definitions ──────────────────────────────────────────────────────────

type ToolId =
  | "trim"
  | "filters"
  | "effects"
  | "text"
  | "stickers"
  | "pip"
  | "speed"
  | "audio"
  | "caption"
  | "background"
  | "volume"
  | "rotate"
  | "keyframe"
  | "split"
  | "delete"
  | "animation"
  | "crop"
  | "cutout"
  | "copy"
  | "opacity"
  | "replace"
  | "voice"
  | "freeze"
  | "reverse"
  | "transitions"
  | "thumbnail"
  | "frame";

const TOOLS: { id: ToolId; label: string; icon: React.ElementType }[] = [
  { id: "trim", label: "Trim", icon: Scissors },
  { id: "split", label: "Split", icon: ScissorsSquare },
  { id: "delete", label: "Delete", icon: Trash2 },
  { id: "copy", label: "Copy", icon: Copy },
  { id: "filters", label: "Filter", icon: Sliders },
  { id: "effects", label: "Effect", icon: Sparkles },
  { id: "animation", label: "Animate", icon: Wand2 },
  { id: "keyframe", label: "Keyframe", icon: Film },
  { id: "text", label: "Text", icon: Type },
  { id: "stickers", label: "Sticker", icon: Sticker },
  { id: "pip", label: "PiP", icon: Image },
  { id: "speed", label: "Speed", icon: Zap },
  { id: "audio", label: "Music", icon: Music },
  { id: "caption", label: "Caption", icon: AlignJustify },
  { id: "background", label: "BG", icon: Layers },
  { id: "volume", label: "Volume", icon: Volume2 },
  { id: "rotate", label: "Rotate", icon: RotateCcw },
  { id: "crop", label: "Crop", icon: Crop },
  { id: "cutout", label: "Cutout", icon: Frame },
  { id: "opacity", label: "Opacity", icon: Eye },
  { id: "replace", label: "Replace", icon: RefreshCw },
  { id: "voice", label: "Voice", icon: Timer },
  { id: "freeze", label: "Freeze", icon: Camera },
  { id: "reverse", label: "Reverse", icon: Rewind },
  { id: "transitions", label: "Transition", icon: GitMerge },
  { id: "thumbnail", label: "Thumbnail", icon: ThumbnailIcon },
  { id: "frame", label: "Frame", icon: FrameGuideIcon },
];

function ThumbnailIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function FrameGuideIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect x="4" y="4" width="16" height="16" rx="1" strokeDasharray="3 2" />
      <line x1="4" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="20" y2="12" />
      <line x1="12" y1="4" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="20" />
    </svg>
  );
}

// Inline placeholder for Layers icon
function Layers(props: React.SVGProps<SVGSVGElement>) {
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
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function isPrincipalFormat(s: string | null | undefined): boolean {
  return !s || /^[a-z0-9]{5,}-[a-z0-9]/.test(s);
}

/**
 * Build a minimal EditorState-compatible object from MediaEditorState so
 * EditorTimeline can be reused without changes. ClipSegment → Clip mapping:
 * - id: generated from index
 * - type: "blank" (no file reference in ClipSegment)
 * - name: "Clip N"
 * - duration: segment length (end - start)
 * - startTime: rebuilt sequentially
 */
function buildTimelineState(
  state: MediaEditorState,
  onUpdate: (u: Partial<MediaEditorState>) => void,
): {
  timelineState: EditorState;
  onTimelineUpdate: (u: Partial<EditorState>) => void;
} {
  const clips: Clip[] = state.clips.map((seg, i) => ({
    id: `seg-${i}`,
    type: "blank" as const,
    name: `Clip ${i + 1}`,
    duration: Math.max(0.1, seg.end - seg.start),
    startTime: state.clips
      .slice(0, i)
      .reduce((acc, s) => acc + Math.max(0.1, s.end - s.start), 0),
  }));

  const totalDuration = clips.reduce((acc, c) => acc + c.duration, 0);

  const timelineState: EditorState = {
    mode: "video",
    clips,
    textLayers: [],
    stickerLayers: [],
    audioTracks: state.audioTracks.map((t) => ({
      id: t.id,
      name: t.name,
      src: t.src,
      volume: t.volume,
      muted: t.muted,
      startTime: 0,
      duration: t.duration,
    })),
    filters: {
      brightness: state.brightness,
      contrast: state.contrast,
      saturation: state.saturation,
      hue: state.hue,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      sharpness: 0,
      vignette: 0,
      preset: state.filterPreset,
    },
    effects: state.activeEffects,
    transitions: state.transitions,
    currentTime: 0,
    totalDuration,
    isPlaying: false,
    zoom: 1,
    aspectRatio: "9:16",
  };

  const onTimelineUpdate = (updates: Partial<EditorState>) => {
    const patch: Partial<MediaEditorState> = {};

    // Map clip updates back to ClipSegment[]
    if (updates.clips) {
      let cursor = 0;
      patch.clips = updates.clips.map((c) => {
        const seg: ClipSegment = { start: cursor, end: cursor + c.duration };
        cursor += c.duration;
        return seg;
      });
    }

    if (updates.transitions !== undefined)
      patch.transitions = updates.transitions;

    // Map audio track updates back
    if (updates.audioTracks) {
      patch.audioTracks = updates.audioTracks.map((t) => ({
        id: t.id,
        name: t.name,
        src: t.src ?? "",
        volume: t.volume,
        muted: t.muted,
        duration: t.duration,
      }));
    }

    if (Object.keys(patch).length > 0) onUpdate(patch);
  };

  return { timelineState, onTimelineUpdate };
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface MediaEditorTabProps {
  onNavigate: (to: string) => void;
}

export default function MediaEditorTab({ onNavigate }: MediaEditorTabProps) {
  const { identity } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();
  const createPost = useCreatePost();

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"video" | "image" | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [destination, setDestination] = useState<"feed" | "shortsport">("feed");
  // Thumbnail & frame state
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showFrame, setShowFrame] = useState(false);
  const [frameRatio, setFrameRatio] = useState<"16:9" | "9:16">("16:9");
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewDims, setPreviewDims] = useState({ w: 320, h: 180 });

  // Editor state with undo/redo
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: DEFAULT_EDITOR_STATE,
    future: [],
  });
  const editorState = history.present;

  // UI state
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [postCaption, setPostCaption] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const videoUploadRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  // Track preview container dimensions for frame overlay
  useEffect(() => {
    if (!previewContainerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPreviewDims({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    ro.observe(previewContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-set frame ratio based on destination
  useEffect(() => {
    setFrameRatio(destination === "shortsport" ? "9:16" : "16:9");
  }, [destination]);

  const authorName = (() => {
    const localName = identity
      ? localPosts.getUserName(identity.getPrincipal().toString())
      : null;
    return (
      (profile?.name && !isPrincipalFormat(profile.name)
        ? profile.name
        : null) ||
      (profile?.handle && !isPrincipalFormat(profile.handle)
        ? profile.handle
        : null) ||
      (!isPrincipalFormat(localName) ? localName : null) ||
      (identity
        ? `User ${identity.getPrincipal().toString().slice(0, 6)}`
        : "Anonymous")
    );
  })();

  const updateState = useCallback((updates: Partial<MediaEditorState>) => {
    dispatch({ type: "UPDATE", state: updates });
  }, []);

  // Handle media upload — also seeds the first clip in the timeline
  const handleMediaFile = (file: File) => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    const url = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaUrl(url);

    if (file.type.startsWith("video/")) {
      setMediaKind("video");
      const vid = document.createElement("video");
      vid.src = url;
      vid.onloadedmetadata = () => {
        const dur = vid.duration;
        setVideoDuration(dur);
        setDestination(dur <= 180 ? "shortsport" : "feed");
        dispatch({
          type: "UPDATE",
          state: {
            trimStart: 0,
            trimEnd: dur,
            clips: [{ start: 0, end: dur }],
          },
        });
      };
    } else {
      setMediaKind("image");
      setDestination("feed");
      dispatch({
        type: "UPDATE",
        state: { clips: [{ start: 0, end: 3 }] },
      });
    }
  };

  const handleVideoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleMediaFile(f);
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleMediaFile(f);
  };

  // Publish
  const handlePublish = async () => {
    if (!identity) {
      toast.error("Please log in to post.");
      return;
    }
    if (!mediaFile && mediaKind !== null) {
      toast.error("Please select a media file.");
      return;
    }
    setIsPublishing(true);
    try {
      await createPost.mutateAsync({
        authorName,
        mediaFile: mediaFile ?? undefined,
        mediaType: mediaFile?.type || "text",
        caption: postCaption.trim(),
        destination,
        thumbnailUrl: thumbnailUrl ?? undefined,
      });
      toast.success("Posted successfully!");
      onNavigate(destination === "shortsport" ? "/shortsport" : "/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post.";
      toast.error(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Render tool panel ──────────────────────────────────────────────────────

  const renderPanel = () => {
    if (!activeTool) return null;
    const props = { state: editorState, onUpdate: updateState };

    switch (activeTool) {
      case "trim":
        return (
          <TrimPanel
            {...props}
            videoDuration={videoDuration}
            mediaUrl={mediaUrl}
          />
        );
      case "filters":
        return <InlineFiltersPanel {...props} />;
      case "effects":
        return <EffectsPanelV2 {...props} />;
      case "text":
        return <TextOverlayPanel {...props} />;
      case "stickers":
        return <StickersPanelInline {...props} />;
      case "pip":
        return <PipPanel {...props} />;
      case "speed":
        return <SpeedPanel {...props} />;
      case "audio":
        return <AudioPanelV2 {...props} />;
      case "caption":
        return <CaptionPanel {...props} />;
      case "background":
        return <BackgroundPanel {...props} />;
      case "volume":
        return <SoundVolumePanel {...props} />;
      case "rotate":
        return <RotateFlipPanel {...props} />;
      // ── New tools ──────────────────────────────────────────────────────────
      case "keyframe":
        return <KeyframePanel {...props} />;
      case "split":
        return <SplitPanel {...props} />;
      case "delete":
        return <DeletePanel {...props} />;
      case "animation":
        return <AnimationPanel {...props} />;
      case "crop":
        return <CropPanel {...props} />;
      case "cutout":
        return <CutoutPanel {...props} />;
      case "copy":
        return <CopyPanel {...props} />;
      case "opacity":
        return <OpacityPanel {...props} />;
      case "replace":
        return (
          <ReplacePanel
            {...props}
            onReplaceMedia={(file) => handleMediaFile(file)}
          />
        );
      case "voice":
        return <VoiceChangerPanel {...props} />;
      case "freeze":
        return <FreezePanel {...props} />;
      case "reverse":
        return <ReversePanel {...props} />;
      case "transitions": {
        const adapted = mediaStateToTransitionsAdapter(
          editorState,
          updateState,
        );
        return (
          <TransitionsPanel state={adapted.state} onUpdate={adapted.onUpdate} />
        );
      }
      case "thumbnail":
        return (
          <ThumbnailPanel
            thumbnailUrl={thumbnailUrl}
            destination={destination}
            onThumbnailChange={(url) => {
              setThumbnailUrl(url);
              if (url) setActiveTool(null);
            }}
          />
        );
      case "frame":
        return (
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Frame Guide
            </h3>
            <p className="text-[11px] text-muted-foreground/70">
              A golden guide frame helps you position elements. Drag edges to
              resize, drag the handle to rotate.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">
                Show frame overlay
              </span>
              <button
                type="button"
                data-ocid="editor.frame.toggle"
                onClick={() => setShowFrame((v) => !v)}
                className={`w-10 h-5 rounded-full border transition-colors relative ${
                  showFrame
                    ? "bg-amber-400 border-amber-400"
                    : "bg-muted border-border"
                }`}
                aria-label="Toggle frame overlay"
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    showFrame ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="flex gap-2">
              {(["16:9", "9:16"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFrameRatio(r)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    frameRatio === r
                      ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                      : "border-border/40 bg-surface-1 text-muted-foreground hover:border-amber-400/30"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // ─── Upload entry ───────────────────────────────────────────────────────────

  if (!mediaFile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-6">
        <div className="text-center mb-2">
          <p className="text-foreground font-display font-semibold text-lg">
            Add Media to Edit
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a video or photo to get started
          </p>
        </div>
        <div className="flex gap-4 w-full max-w-xs">
          <button
            type="button"
            data-ocid="editor.upload_video_button"
            onClick={() => videoUploadRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-3 py-6 rounded-2xl border-2 border-dashed border-border hover:border-amber-400/60 bg-surface-1 transition-all duration-200 group"
          >
            <Video className="w-8 h-8 text-muted-foreground group-hover:text-amber-400 transition-colors" />
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Video
            </span>
            <span className="text-xs text-muted-foreground/70">
              MP4 · MOV · WebM
            </span>
          </button>
          <button
            type="button"
            data-ocid="editor.upload_photo_button"
            onClick={() => imageUploadRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-3 py-6 rounded-2xl border-2 border-dashed border-border hover:border-cyan-400/60 bg-surface-1 transition-all duration-200 group"
          >
            <Image className="w-8 h-8 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Photo
            </span>
            <span className="text-xs text-muted-foreground/70">
              JPG · PNG · WebP
            </span>
          </button>
        </div>
        <input
          ref={videoUploadRef}
          type="file"
          accept="video/mp4,video/mov,video/webm,video/*"
          className="hidden"
          onChange={handleVideoInput}
        />
        <input
          ref={imageUploadRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleImageInput}
        />
      </div>
    );
  }

  // ─── Editor UI ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ minHeight: "75vh" }}>
      {/* Top bar: undo/redo + change media */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-ocid="editor.undo_button"
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={!history.past.length}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-ocid="editor.redo_button"
            onClick={() => dispatch({ type: "REDO" })}
            disabled={!history.future.length}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setMediaFile(null);
            if (mediaUrl) URL.revokeObjectURL(mediaUrl);
            setMediaUrl(null);
            setMediaKind(null);
          }}
          className="text-xs text-muted-foreground hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" />
          Change Media
        </button>
      </div>

      {/* Preview canvas + frame overlay */}
      <div ref={previewContainerRef} className="relative">
        <EditorPreviewCanvas
          mediaUrl={mediaUrl}
          mediaKind={mediaKind}
          state={editorState}
          videoDuration={videoDuration}
          onOverlayPositionChange={(id, type, x, y) => {
            if (type === "text") {
              updateState({
                textOverlays: editorState.textOverlays.map((t) =>
                  t.id === id ? { ...t, x, y } : t,
                ),
              });
            } else if (type === "sticker") {
              updateState({
                stickers: editorState.stickers.map((s) =>
                  s.id === id ? { ...s, x, y } : s,
                ),
              });
            } else if (type === "pip" && editorState.pip) {
              updateState({ pip: { ...editorState.pip, x, y } });
            }
          }}
        />
        {showFrame && (
          <FrameOverlay
            containerWidth={previewDims.w || 320}
            containerHeight={previewDims.h || 180}
            ratio={frameRatio}
            onRatioToggle={() =>
              setFrameRatio((r) => (r === "16:9" ? "9:16" : "16:9"))
            }
          />
        )}
      </div>

      {/* Thumbnail indicator */}
      {thumbnailUrl && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-amber-400/30 bg-amber-400/8 mt-2">
          <img
            src={thumbnailUrl}
            alt="Thumbnail"
            className="w-8 h-5 rounded object-cover border border-amber-400/40"
          />
          <span className="text-[10px] text-amber-400 font-medium flex-1">
            Thumbnail set
          </span>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(thumbnailUrl);
              setThumbnailUrl(null);
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove thumbnail"
          >
            <span className="text-[10px]">Remove</span>
          </button>
        </div>
      )}

      {/* Tool selector */}
      <div className="overflow-x-auto scrollbar-hide mt-3 -mx-1 px-1">
        <div className="flex gap-1.5 min-w-max pb-1">
          {TOOLS.filter((t) =>
            mediaKind === "image" ? t.id !== "trim" && t.id !== "speed" : true,
          ).map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                type="button"
                key={tool.id}
                data-ocid={`editor.tool.${tool.id}`}
                onClick={() => setActiveTool(isActive ? null : tool.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all duration-200 min-w-[52px] ${
                  isActive
                    ? "border-amber-400/60 bg-amber-400/10"
                    : "border-border/40 bg-surface-1 hover:border-amber-400/30"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-[10px] font-medium ${isActive ? "text-amber-400" : "text-muted-foreground"}`}
                >
                  {tool.label}
                </span>
                {isActive && (
                  <div className="h-0.5 w-4 rounded-full bg-amber-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool panel (slide-in) */}
      {activeTool && (
        <div
          className="mt-3 rounded-2xl border border-border/30 overflow-hidden"
          style={{
            background: "oklch(0.10 0.012 265 / 0.85)",
            backdropFilter: "blur(20px)",
            animation: "slideUp 0.18s ease-out",
          }}
        >
          {renderPanel()}
        </div>
      )}

      {/* Multi-clip timeline */}
      {(() => {
        const { timelineState, onTimelineUpdate } = buildTimelineState(
          editorState,
          updateState,
        );
        return (
          <div
            className="mt-3 rounded-2xl border border-border/30 overflow-hidden"
            style={{
              background: "oklch(0.10 0.012 265 / 0.85)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="px-3 pt-2 pb-0 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Timeline
              </span>
            </div>
            <EditorTimeline state={timelineState} onUpdate={onTimelineUpdate} />
          </div>
        );
      })()}

      {/* Publish section */}
      <div className="mt-4 space-y-3">
        <div>
          <textarea
            data-ocid="editor.caption_input"
            value={postCaption}
            onChange={(e) => setPostCaption(e.target.value)}
            placeholder="Add a caption…"
            maxLength={500}
            rows={2}
            className="w-full bg-surface-1 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-amber-400/50 transition-colors"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {postCaption.length}/500
          </p>
        </div>

        {/* Destination badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-1 border border-border/40">
          {destination === "shortsport" ? (
            <Video className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Image className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span className="text-xs text-muted-foreground">
            Will be posted to{" "}
            <strong
              className={
                destination === "shortsport"
                  ? "text-amber-400"
                  : "text-cyan-400"
              }
            >
              {destination === "shortsport" ? "ShortSport" : "Feed"}
            </strong>
            {destination === "shortsport" ? " (video ≤3 min)" : ""}
          </span>
        </div>

        {/* Publish button */}
        <button
          type="button"
          data-ocid="editor.publish_button"
          onClick={handlePublish}
          disabled={isPublishing || createPost.isPending}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #f5c842 0%, #e8a020 45%, #06b6d4 100%)",
            color: "oklch(0.05 0.008 265)",
            boxShadow: "0 4px 24px oklch(0.78 0.16 75 / 0.3)",
          }}
        >
          {isPublishing || createPost.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Posting…
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              {destination === "shortsport"
                ? "Post to ShortSport"
                : "Post to Feed"}
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Inline mini panels (avoid import cycle with EditorPage types) ─────────────

interface InlinePanelProps {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

function InlineFiltersPanel({ state, onUpdate }: InlinePanelProps) {
  const PRESETS = [
    { id: "none", label: "Original", emoji: "🎞️", b: 100, c: 100, s: 100, h: 0 },
    { id: "moody", label: "Moody", emoji: "🌑", b: 90, c: 120, s: 70, h: 0 },
    { id: "warm", label: "Warm", emoji: "🌅", b: 105, c: 95, s: 80, h: 15 },
    { id: "cool", label: "Cool", emoji: "🧊", b: 100, c: 110, s: 90, h: -20 },
    { id: "cinema", label: "Cinema", emoji: "🎬", b: 95, c: 130, s: 85, h: 5 },
    { id: "noir", label: "Noir", emoji: "🖤", b: 85, c: 150, s: 0, h: 0 },
    { id: "pastel", label: "Pastel", emoji: "🌸", b: 115, c: 85, s: 60, h: 10 },
    { id: "vivid", label: "Vivid", emoji: "🌈", b: 105, c: 115, s: 150, h: 0 },
    { id: "faded", label: "Faded", emoji: "🌫️", b: 110, c: 80, s: 70, h: 0 },
    {
      id: "golden",
      label: "Golden",
      emoji: "✨",
      b: 110,
      c: 105,
      s: 110,
      h: 25,
    },
    {
      id: "teal-orange",
      label: "Teal",
      emoji: "🎨",
      b: 100,
      c: 120,
      s: 120,
      h: -10,
    },
  ];
  const SLIDERS = [
    { key: "brightness" as const, label: "Brightness", min: 50, max: 150 },
    { key: "contrast" as const, label: "Contrast", min: 50, max: 200 },
    { key: "saturation" as const, label: "Saturation", min: 0, max: 200 },
    { key: "hue" as const, label: "Hue Shift", min: -180, max: 180 },
  ];

  return (
    <div className="p-3 space-y-4">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-1 min-w-max">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() =>
                onUpdate({
                  brightness: p.b,
                  contrast: p.c,
                  saturation: p.s,
                  hue: p.h,
                  filterPreset: p.id,
                })
              }
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all min-w-[56px] ${
                state.filterPreset === p.id
                  ? "bg-amber-400/10 border-amber-400/50"
                  : "bg-muted/50 border-border/30 hover:border-amber-400/30"
              }`}
            >
              <span className="text-xl">{p.emoji}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {SLIDERS.map(({ key, label, min, max }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-18 flex-shrink-0">
              {label}
            </span>
            <Slider
              value={[state[key]]}
              onValueChange={([v]) =>
                onUpdate({ [key]: v, filterPreset: "custom" })
              }
              min={min}
              max={max}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-10 text-right tabular-nums">
              {state[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline stickers ───────────────────────────────────────────────────────────

const STICKER_CATEGORIES = [
  {
    id: "smileys",
    label: "😀",
    emojis: [
      "😀",
      "😂",
      "🥰",
      "😍",
      "🤩",
      "😎",
      "🥳",
      "😏",
      "🤔",
      "😴",
      "🥺",
      "😭",
      "😤",
      "🤯",
      "🤪",
      "😇",
      "🤗",
      "🫡",
      "😈",
      "👿",
      "💀",
      "🤡",
      "👹",
      "👻",
      "👽",
      "🤖",
      "💩",
      "😺",
    ],
  },
  {
    id: "hearts",
    label: "❤️",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "❣️",
      "🫶",
      "💌",
      "🔥",
      "✨",
      "⭐",
      "🌟",
      "💫",
      "🎉",
      "🎊",
      "🎈",
      "🎁",
    ],
  },
  {
    id: "gestures",
    label: "👋",
    emojis: [
      "👋",
      "🤚",
      "✋",
      "🖐",
      "👍",
      "👎",
      "👏",
      "🙌",
      "🤲",
      "🙏",
      "✌️",
      "🤞",
      "🤙",
      "💪",
      "🦾",
      "🫶",
      "🤜",
      "🤛",
      "🫵",
      "👆",
      "👇",
      "👉",
      "👈",
      "🫰",
      "🤟",
      "🤘",
    ],
  },
  {
    id: "nature",
    label: "🌸",
    emojis: [
      "🌸",
      "🌺",
      "🌹",
      "🌻",
      "🌷",
      "💐",
      "🌿",
      "🍀",
      "🌱",
      "🌲",
      "🌳",
      "🍁",
      "🍂",
      "🍃",
      "🌾",
      "🌴",
      "🌵",
      "🎋",
      "🎍",
      "🪴",
      "🌍",
      "🌊",
      "🌈",
      "⛅",
      "🌙",
      "⭐",
      "☀️",
      "❄️",
    ],
  },
  {
    id: "food",
    label: "🍕",
    emojis: [
      "🍕",
      "🍔",
      "🍟",
      "🌮",
      "🌯",
      "🥗",
      "🍣",
      "🍜",
      "🍩",
      "🍪",
      "🎂",
      "🍰",
      "🍭",
      "🍫",
      "🍿",
      "🥤",
      "☕",
      "🧋",
      "🍺",
      "🥂",
      "🍾",
      "🎂",
      "🍦",
      "🍧",
      "🍨",
      "🍡",
      "🧁",
      "🍮",
    ],
  },
  {
    id: "objects",
    label: "💎",
    emojis: [
      "💎",
      "👑",
      "🏆",
      "🥇",
      "🎖",
      "🎗",
      "🎀",
      "🎵",
      "🎶",
      "🎸",
      "🎹",
      "🎺",
      "🎻",
      "🥁",
      "🎯",
      "🎲",
      "🎮",
      "🎭",
      "🎨",
      "🖼",
      "📸",
      "📷",
      "🔮",
      "💡",
      "🔑",
      "🗝",
      "🎁",
      "📦",
    ],
  },
];

function StickersPanelInline({ state, onUpdate }: InlinePanelProps) {
  const [catIdx, setCatIdx] = useState(0);
  const [selSticker, setSelSticker] = useState<string | null>(null);

  const addSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: `sticker-${Date.now()}`,
      emoji,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      size: 60,
      rotation: 0,
      opacity: 100,
    };
    onUpdate({ stickers: [...state.stickers, newSticker] });
    setSelSticker(newSticker.id);
  };

  const updateSticker = (id: string, changes: Partial<StickerOverlay>) => {
    onUpdate({
      stickers: state.stickers.map((s) =>
        s.id === id ? { ...s, ...changes } : s,
      ),
    });
  };

  const removeSticker = (id: string) => {
    onUpdate({ stickers: state.stickers.filter((s) => s.id !== id) });
    if (selSticker === id) setSelSticker(null);
  };

  const selected = state.stickers.find((s) => s.id === selSticker);

  return (
    <div className="p-3 space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {STICKER_CATEGORIES.map((cat, i) => (
          <button
            type="button"
            key={cat.id}
            onClick={() => setCatIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-sm border flex-shrink-0 transition-all ${
              catIdx === i
                ? "border-amber-400/60 bg-amber-400/10"
                : "border-border/30 bg-surface-1"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-1 max-h-28 overflow-y-auto">
        {STICKER_CATEGORIES[catIdx].emojis.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => addSticker(emoji)}
            className="text-2xl p-1 rounded-lg hover:bg-surface-1 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Selected sticker controls */}
      {selected && (
        <div className="space-y-2 border-t border-border/30 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Selected: {selected.emoji}
            </span>
            <button
              type="button"
              onClick={() => removeSticker(selected.id)}
              className="text-xs text-destructive hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-12">Size</span>
            <Slider
              value={[selected.size]}
              onValueChange={([v]) => updateSticker(selected.id, { size: v })}
              min={20}
              max={200}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {selected.size}px
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-12">
              Rotate
            </span>
            <Slider
              value={[selected.rotation]}
              onValueChange={([v]) =>
                updateSticker(selected.id, { rotation: v })
              }
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {selected.rotation}°
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-12">
              Opacity
            </span>
            <Slider
              value={[selected.opacity]}
              onValueChange={([v]) =>
                updateSticker(selected.id, { opacity: v })
              }
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {selected.opacity}%
            </span>
          </div>
        </div>
      )}

      {/* Sticker list */}
      {state.stickers.length > 0 && (
        <div className="flex gap-2 flex-wrap pt-1 border-t border-border/30">
          {state.stickers.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setSelSticker(s.id === selSticker ? null : s.id)}
              className={`text-xl p-1.5 rounded-lg border transition-all ${
                s.id === selSticker
                  ? "border-amber-400/60 bg-amber-400/10"
                  : "border-border/30 hover:border-amber-400/30"
              }`}
            >
              {s.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
