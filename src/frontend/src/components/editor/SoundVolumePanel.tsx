/**
 * SoundVolumePanel — Master video volume, mute original audio toggle,
 * background music volume.
 */
import { Slider } from "@/components/ui/slider";
import { Volume, Volume1, Volume2, VolumeX } from "lucide-react";
import type { MediaEditorState } from "./MediaEditorTab";

interface Props {
  state: MediaEditorState;
  onUpdate: (u: Partial<MediaEditorState>) => void;
}

function VolumeIcon({ vol, muted }: { vol: number; muted: boolean }) {
  if (muted || vol === 0) return <VolumeX className="w-4 h-4" />;
  if (vol < 40) return <Volume className="w-4 h-4" />;
  if (vol < 75) return <Volume1 className="w-4 h-4" />;
  return <Volume2 className="w-4 h-4" />;
}

export default function SoundVolumePanel({ state, onUpdate }: Props) {
  return (
    <div className="p-4 space-y-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Sound & Volume
      </h3>

      {/* Mute original toggle */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 rounded-xl border border-border/30 bg-surface-1 cursor-pointer text-left"
        onClick={() => onUpdate({ muteOriginal: !state.muteOriginal })}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${state.muteOriginal ? "bg-red-500/20" : "bg-amber-400/10"}`}
          >
            {state.muteOriginal ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Original Audio
            </p>
            <p className="text-xs text-muted-foreground">
              {state.muteOriginal ? "Muted" : "Playing"}
            </p>
          </div>
        </div>
        <div
          data-ocid="editor.mute_original_toggle"
          className={`w-11 h-6 rounded-full transition-all ${state.muteOriginal ? "bg-red-500/30" : "bg-amber-400/30"}`}
        >
          <div
            className={`w-5 h-5 rounded-full mt-0.5 transition-all shadow-md ${
              state.muteOriginal
                ? "translate-x-5 bg-red-400"
                : "translate-x-0.5 bg-amber-400"
            }`}
          />
        </div>
      </button>

      {/* Video volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Video Volume
          </span>
          <span className="text-sm text-amber-400 tabular-nums font-semibold">
            {state.videoVolume}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <VolumeIcon vol={state.videoVolume} muted={state.muteOriginal} />
          <Slider
            data-ocid="editor.video_volume_slider"
            value={[state.videoVolume]}
            onValueChange={([v]) => onUpdate({ videoVolume: v })}
            min={0}
            max={100}
            step={1}
            className="flex-1"
            disabled={state.muteOriginal}
          />
          <VolumeX className="w-4 h-4 text-muted-foreground/50" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Background music volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Background Music
          </span>
          <span className="text-sm text-cyan-400 tabular-nums font-semibold">
            {state.bgMusicVolume}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Volume className="w-4 h-4 text-cyan-400" />
          <Slider
            data-ocid="editor.bg_music_volume_slider"
            value={[state.bgMusicVolume]}
            onValueChange={([v]) => onUpdate({ bgMusicVolume: v })}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <Volume2 className="w-4 h-4 text-muted-foreground/50" />
        </div>
        <p className="text-xs text-muted-foreground">
          Controls the volume of audio tracks added in the Music panel.
        </p>
      </div>

      {/* Visual meter */}
      <div className="flex items-end gap-0.5 h-10 px-2 bg-surface-1 rounded-xl border border-border/30 overflow-hidden">
        {Array.from({ length: 24 }, (_, i) => i).map((i) => {
          const active = !state.muteOriginal;
          const height = active
            ? 20 +
              Math.abs(Math.sin(i * 0.6)) * 60 +
              (state.videoVolume / 100) * 20
            : 5;
          return (
            <div
              key={`meter-${i}`}
              className={`flex-1 rounded-t transition-all duration-300 ${
                active
                  ? "bg-gradient-to-t from-amber-400/80 to-amber-400/30"
                  : "bg-muted/30"
              }`}
              style={{ height: `${Math.min(height, 100)}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
