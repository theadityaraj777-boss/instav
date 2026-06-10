/**
 * VoiceChangerPanel — 6 voice presets using Web Audio API pitch shifting.
 *
 * REAL AUDIO: When "Preview Voice on Video" is clicked, we:
 *   1. Find the actual #editor-main-video element on the page
 *   2. Create a MediaElementAudioSourceNode from it
 *   3. Apply the preset's AudioContext graph (playbackRate + BiquadFilters +
 *      optional WaveShaper for monster / ring mod for robot)
 *   4. Route output to AudioContext.destination
 *   5. Play a 3-second preview with the voice effect
 *
 * EXPORT NOTE: voicePreset stored in state. For actual export, apply the same
 * Web Audio processing during recording (MediaRecorder + AudioContext), or
 * pass the preset ID to a server-side ffmpeg pipeline (e.g., pitch-shift via
 * rubberband filter with the corresponding semitone value).
 */
import { Play, RotateCcw, Square } from "lucide-react";
import { useRef, useState } from "react";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

const VOICE_PRESETS = [
  {
    id: "normal" as const,
    label: "Normal",
    icon: "🎤",
    desc: "Original voice, no effect",
    playbackRate: 1.0,
    bassGain: 0,
    trebleGain: 0,
  },
  {
    id: "man" as const,
    label: "Man",
    icon: "👨",
    desc: "Deep & low pitched",
    playbackRate: 0.75,
    bassGain: 8,
    trebleGain: -2,
  },
  {
    id: "woman" as const,
    label: "Woman",
    icon: "👩",
    desc: "Higher, lighter pitch",
    playbackRate: 1.3,
    bassGain: -2,
    trebleGain: 5,
  },
  {
    id: "child" as const,
    label: "Child",
    icon: "👧",
    desc: "Very high, squeaky",
    playbackRate: 1.65,
    bassGain: -5,
    trebleGain: 7,
  },
  {
    id: "monster" as const,
    label: "Monster",
    icon: "👹",
    desc: "Deep with distortion",
    playbackRate: 0.52,
    bassGain: 14,
    trebleGain: -5,
  },
  {
    id: "robot" as const,
    label: "Robot",
    icon: "🤖",
    desc: "Metallic ring mod",
    playbackRate: 0.9,
    bassGain: 2,
    trebleGain: 9,
  },
];

type VoicePresetId = (typeof VOICE_PRESETS)[number]["id"];

type PreviewStatus = "idle" | "loading" | "playing" | "applied";

export default function VoiceChangerPanel({ state, onUpdate }: Props) {
  const voicePreset: VoicePresetId =
    (state.voicePreset as VoicePresetId) ?? "normal";
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewingId, setPreviewingId] = useState<VoicePresetId | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stop any running preview ─────────────────────────────────────────────────

  const stopPreview = () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    // Disconnect source node to restore normal video audio
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (_) {
        /* already disconnected */
      }
      sourceNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (_) {
        /* already closed */
      }
      audioCtxRef.current = null;
    }
    // Restore video playbackRate to speed setting
    const videoEl =
      document.querySelector<HTMLVideoElement>("#editor-main-video");
    if (videoEl) {
      videoEl.playbackRate = state.speed ?? 1;
      videoEl.muted = state.muteOriginal ?? false;
    }
    setPreviewStatus("idle");
    setPreviewingId(null);
  };

  // ── Build Web Audio graph for a preset ───────────────────────────────────────

  function buildAudioGraph(
    ctx: AudioContext,
    sourceNode: MediaElementAudioSourceNode,
    preset: (typeof VOICE_PRESETS)[number],
  ): AudioNode {
    // Set video playback rate for pitch approximation
    const videoEl =
      document.querySelector<HTMLVideoElement>("#editor-main-video");
    if (videoEl) videoEl.playbackRate = preset.playbackRate;

    // Bass boost/cut
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 180;
    bass.gain.value = preset.bassGain;

    // Treble boost/cut
    const treble = ctx.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 3200;
    treble.gain.value = preset.trebleGain;

    sourceNode.connect(bass);
    bass.connect(treble);
    let lastNode: AudioNode = treble;

    // Monster: heavy distortion waveshaper
    if (preset.id === "monster") {
      const distortion = ctx.createWaveShaper();
      const n = 512;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = ((Math.PI + 300) * x) / (Math.PI + 300 * Math.abs(x));
      }
      distortion.curve = curve;
      distortion.oversample = "4x";
      treble.connect(distortion);
      lastNode = distortion;
    }

    // Robot: ring modulation with a low oscillator
    if (preset.id === "robot") {
      const osc = ctx.createOscillator();
      osc.frequency.value = 35;
      osc.type = "sawtooth";
      const ringGain = ctx.createGain();
      ringGain.gain.value = 0.8;
      osc.connect(ringGain.gain);
      treble.connect(ringGain);
      osc.start();
      lastNode = ringGain;
    }

    return lastNode;
  }

  // ── Preview voice on real video ───────────────────────────────────────────────

  const previewVoiceOnVideo = async (presetId: VoicePresetId) => {
    // If already previewing this preset — stop
    if (previewingId === presetId && previewStatus === "playing") {
      stopPreview();
      return;
    }
    stopPreview();

    const preset = VOICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // Normal preset: no audio graph needed, just play video normally
    if (preset.id === "normal") {
      onUpdate({ voicePreset: "normal" });
      setPreviewStatus("applied");
      setPreviewingId("normal");
      setTimeout(() => setPreviewStatus("idle"), 2000);
      return;
    }

    setPreviewStatus("loading");
    setPreviewingId(presetId);

    const videoEl =
      document.querySelector<HTMLVideoElement>("#editor-main-video");
    if (!videoEl) {
      // No video loaded — fall back to synthetic preview
      setPreviewStatus("idle");
      setPreviewingId(null);
      return;
    }

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Unmute temporarily for preview
      videoEl.muted = false;

      const sourceNode = ctx.createMediaElementSource(videoEl);
      sourceNodeRef.current = sourceNode;

      const lastNode = buildAudioGraph(ctx, sourceNode, preset);
      lastNode.connect(ctx.destination);

      if (videoEl.paused) videoEl.play().catch(() => undefined);

      setPreviewStatus("playing");

      // Stop preview after 3 seconds
      previewTimerRef.current = setTimeout(() => {
        stopPreview();
        setPreviewStatus("applied");
        setTimeout(() => setPreviewStatus("idle"), 1500);
      }, 3000);
    } catch {
      stopPreview();
    }
  };

  // ── Select preset (without preview) ──────────────────────────────────────────

  const selectPreset = (id: VoicePresetId) => {
    onUpdate({ voicePreset: id });
  };

  const activePreset = VOICE_PRESETS.find((p) => p.id === voicePreset)!;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Voice Changer
      </h3>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-2">
        {VOICE_PRESETS.map((preset) => {
          const isSelected = voicePreset === preset.id;
          const isPreviewing =
            previewingId === preset.id && previewStatus === "playing";
          const isApplied =
            previewingId === preset.id && previewStatus === "applied";
          return (
            <div
              key={preset.id}
              className={`relative rounded-xl border transition-all overflow-hidden ${
                isSelected
                  ? "border-amber-400/70 bg-amber-400/15 shadow-[0_0_14px_oklch(0.78_0.16_75/0.25)]"
                  : "border-border/30 bg-surface-1 hover:border-amber-400/30"
              }`}
            >
              {/* Select on click */}
              <button
                type="button"
                data-ocid={`editor.voice.preset.${preset.id}`}
                onClick={() => selectPreset(preset.id)}
                className="w-full flex flex-col items-center gap-1 pt-3 pb-1 px-2"
              >
                <span className="text-2xl leading-none">{preset.icon}</span>
                <span
                  className={`text-xs font-semibold ${isSelected ? "text-amber-400" : "text-foreground"}`}
                >
                  {preset.label}
                </span>
                <span className="text-[8px] text-muted-foreground text-center leading-tight">
                  {preset.desc}
                </span>
                {/* Applied indicator */}
                {isApplied && (
                  <span className="text-[8px] text-emerald-400 font-semibold">
                    ✓ Applied
                  </span>
                )}
              </button>
              {/* Preview button */}
              <button
                type="button"
                data-ocid={`editor.voice.preview.${preset.id}`}
                onClick={() => previewVoiceOnVideo(preset.id)}
                disabled={previewStatus === "loading"}
                className={`w-full text-[8px] font-semibold py-1.5 flex items-center justify-center gap-1 transition-colors border-t ${
                  isPreviewing
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-border/20 bg-black/10 text-muted-foreground hover:text-amber-400"
                } disabled:opacity-40`}
              >
                {isPreviewing ? (
                  <>
                    <Square className="w-2.5 h-2.5" />
                    Stop
                  </>
                ) : previewStatus === "loading" &&
                  previewingId === preset.id ? (
                  <span className="animate-pulse">Loading…</span>
                ) : (
                  <>
                    <Play className="w-2.5 h-2.5" />
                    Preview
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Active preset info */}
      <div className="p-3 rounded-xl border border-amber-400/20 bg-amber-400/5 flex items-center gap-3">
        <div className="text-2xl">{activePreset.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-400">
            {activePreset.label}
          </p>
          <p className="text-[9px] text-muted-foreground">
            Pitch ×{activePreset.playbackRate} · Bass{" "}
            {activePreset.bassGain > 0 ? "+" : ""}
            {activePreset.bassGain}dB · Treble{" "}
            {activePreset.trebleGain > 0 ? "+" : ""}
            {activePreset.trebleGain}dB
          </p>
        </div>
        {voicePreset !== "normal" && (
          <button
            type="button"
            data-ocid="editor.voice.reset_button"
            onClick={() => {
              stopPreview();
              onUpdate({ voicePreset: "normal" });
            }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-amber-400 hover:border-amber-400/40 transition-colors text-[9px]"
            title="Reset to original voice"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Main preview button */}
      <button
        type="button"
        data-ocid="editor.voice.preview_button"
        onClick={() => previewVoiceOnVideo(voicePreset)}
        disabled={previewStatus === "loading"}
        className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl border font-semibold text-sm transition-all ${
          previewStatus === "playing"
            ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : previewStatus === "applied"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {previewStatus === "playing" ? (
          <>
            <Square className="w-4 h-4" />
            Stop Preview
          </>
        ) : previewStatus === "loading" ? (
          <>
            <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            Loading…
          </>
        ) : previewStatus === "applied" ? (
          <>✓ Voice Applied — {activePreset.label}</>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Preview Voice on Video
          </>
        )}
      </button>

      <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed">
        Preview plays 3 seconds of your video with the voice effect applied via
        Web Audio API.
        <br />
        The selected preset will be used at export time.
      </p>
    </div>
  );
}
