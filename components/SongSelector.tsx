"use client";

import { useState, useRef } from "react";

export interface SongClip {
  id: string;
  streamUrl?: string;
  audioUrl?: string;
  title?: string;
  duration?: number;
}

interface SongSelectorProps {
  clips: SongClip[];
  onSelect: (clipIndex: number) => void;
  disabled?: boolean;
}

export default function SongSelector({ clips, onSelect, disabled }: SongSelectorProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const handlePlay = (index: number) => {
    // Pause the other one
    audioRefs.current.forEach((el, i) => {
      if (i !== index && el) {
        el.pause();
      }
    });
    setPlaying(index);
  };

  const handlePause = () => {
    setPlaying(null);
  };

  const handleConfirm = () => {
    if (selected !== null) {
      onSelect(selected);
    }
  };

  return (
    <div
      className="border-[0.5px] border-tape bg-noir-2 p-6 space-y-4"
      style={{ borderRadius: "2px" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-tape animate-pulse-opacity" />
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-tape">
          Choose Your Variation
        </h3>
      </div>
      <p className="font-body text-sm text-dust">
        Lyria 3 generated two variations. Listen to both and select the one to use.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clips.map((clip, i) => {
          const audioUrl = clip.streamUrl || clip.audioUrl;
          const isSelected = selected === i;
          const isPlaying = playing === i;

          return (
            <div
              key={clip.id}
              onClick={() => !disabled && setSelected(i)}
              className={`p-4 border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-l-[3px] border-l-tape bg-velvet border-t-[0.5px] border-r-[0.5px] border-b-[0.5px] border-t-tape/25 border-r-tape/25 border-b-tape/25"
                  : "border-[0.5px] border-[rgba(212,168,83,0.15)] bg-noir-3 hover:border-tape/30"
              }`}
              style={{ borderRadius: "2px" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-paper">
                  Variation {i + 1}
                </span>
                {isSelected && (
                  <span className="font-mono text-[10px] text-tape uppercase">Selected ✓</span>
                )}
              </div>

              {clip.duration && (
                <p className="font-mono text-[10px] text-dust mb-2">
                  {Math.round(clip.duration)}s
                </p>
              )}

              {audioUrl ? (
                <audio
                  ref={(el) => { audioRefs.current[i] = el; }}
                  controls
                  preload="none"
                  onPlay={() => handlePlay(i)}
                  onPause={handlePause}
                  className="w-full"
                  style={{ height: "32px", accentColor: "var(--tape)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <source src={audioUrl} type="audio/mpeg" />
                </audio>
              ) : (
                <p className="font-mono text-[10px] text-dust italic">
                  Audio URL pending...
                </p>
              )}

              {isPlaying && (
                <div className="flex items-center gap-[3px] mt-2">
                  {[1, 2, 3, 4, 5].map((b) => (
                    <div key={b} className="waveform-bar" style={{ height: "6px" }} />
                  ))}
                  <span className="font-mono text-[9px] text-tape ml-2 uppercase">Playing</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={selected === null || disabled}
        className="btn-primary w-full py-3"
      >
        {selected !== null
          ? `Use Variation ${selected + 1} →`
          : "Select a variation to continue"}
      </button>
    </div>
  );
}
