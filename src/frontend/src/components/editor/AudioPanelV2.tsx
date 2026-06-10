/**
 * AudioPanelV2 — Upload audio, record via getUserMedia, per-track volume/mute,
 * waveform visualization placeholder.
 */
import { Slider } from "@/components/ui/slider";
import { Mic, Plus, Trash2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

type Track = MediaEditorState["audioTracks"][0];

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioPanelV2({ state, onUpdate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    const audio = new Audio(src);
    audio.onloadedmetadata = () => {
      const track: Track = {
        id: `audio-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        src,
        volume: 80,
        muted: false,
        duration: audio.duration || 0,
      };
      onUpdate({ audioTracks: [...state.audioTracks, track] });
    };
    if (fileRef.current) fileRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecRef.current = rec;
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const src = URL.createObjectURL(blob);
        const track: Track = {
          id: `rec-${Date.now()}`,
          name: `Recording ${fmtDur(recSeconds)}`,
          src,
          volume: 80,
          muted: false,
          duration: recSeconds,
        };
        onUpdate({ audioTracks: [...state.audioTracks, track] });
        for (const t of stream.getTracks()) t.stop();
      };
      rec.start();
      setIsRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const updateTrack = (id: string, changes: Partial<Track>) => {
    onUpdate({
      audioTracks: state.audioTracks.map((t) =>
        t.id === id ? { ...t, ...changes } : t,
      ),
    });
  };

  const removeTrack = (id: string) => {
    onUpdate({ audioTracks: state.audioTracks.filter((t) => t.id !== id) });
  };

  return (
    <div className="p-3 space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          data-ocid="editor.audio_upload_button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 bg-surface-1 hover:bg-muted rounded-xl p-3 border border-border/30 hover:border-amber-400/30 transition-all text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          Add Audio
        </button>
        <button
          type="button"
          data-ocid="editor.audio_record_button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 border transition-all text-sm font-medium ${
            isRecording
              ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
              : "bg-surface-1 hover:bg-muted border-border/30 hover:border-red-400/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
          {isRecording ? `Stop ${fmtDur(recSeconds)}` : "Record"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/m4a,audio/*"
        className="hidden"
        onChange={addFile}
      />

      {/* Track list */}
      {state.audioTracks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-3xl mb-2">🎵</p>
          <p className="text-sm">No audio tracks added</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            Add music files or record your voice
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.audioTracks.map((track) => (
            <div
              key={track.id}
              className="bg-surface-1 rounded-xl p-3 border border-border/30 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg,oklch(0.78 0.16 75/0.3),oklch(0.82 0.18 200/0.3))",
                  }}
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {track.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtDur(track.duration)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateTrack(track.id, { muted: !track.muted })}
                  className={`transition-colors p-1 ${track.muted ? "text-red-400" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label={track.muted ? "Unmute" : "Mute"}
                >
                  {track.muted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeTrack(track.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  aria-label="Remove track"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Volume slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-12">
                  Volume
                </span>
                <Slider
                  value={[track.volume]}
                  onValueChange={([v]) => updateTrack(track.id, { volume: v })}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={track.muted}
                />
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                  {track.volume}%
                </span>
              </div>

              {/* Waveform placeholder */}
              <div className="h-8 bg-muted rounded-lg overflow-hidden flex items-center px-2 gap-0.5">
                {Array.from({ length: 40 }, (_, i) => i).map((i) => (
                  <div
                    key={`wv-${track.id}-${i}`}
                    className={`flex-1 rounded-full transition-all ${track.muted ? "bg-muted-foreground/20" : "bg-amber-400/60"}`}
                    style={{
                      height: `${15 + Math.abs(Math.sin(i * 0.7 + track.id.length)) * 70}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
