"use client";

import { useState } from "react";

interface VideoReviewProps {
  videoUrl: string;
  thumbnailUrl?: string;
  onAccept: () => void;
  onReRender: (settings: { crf?: number; audioBitrate?: string }) => void;
}

export default function VideoReview({ videoUrl, thumbnailUrl, onAccept, onReRender }: VideoReviewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [crf, setCrf] = useState(18);
  const [audioBitrate, setAudioBitrate] = useState("320k");
  const [loading, setLoading] = useState(false);

  const withInline = (url?: string) => {
    if (!url) return undefined;
    return `${url}${url.includes("?") ? "&" : "?"}inline=1`;
  };

  const handleReRender = () => {
    setLoading(true);
    onReRender({ crf, audioBitrate });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="border border-dust/20 rounded overflow-hidden bg-noir-2">
        <video
          controls
          className="w-full aspect-video"
          src={withInline(videoUrl)}
          poster={withInline(thumbnailUrl)}
        />
      </div>

      {showSettings && (
        <div className="p-4 border border-dust/15 rounded bg-noir-3 space-y-4 animate-fade-in">
          <div className="font-mono text-xs text-dust uppercase tracking-wider mb-2">Re-render Settings</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs text-dust uppercase block mb-1">
                Quality (CRF): {crf}
              </label>
              <input
                type="range"
                min={10}
                max={28}
                value={crf}
                onChange={(e) => setCrf(Number(e.target.value))}
                className="w-full accent-tape"
              />
              <div className="flex justify-between font-mono text-xs text-dust/50 mt-1">
                <span>Higher quality</span>
                <span>Smaller file</span>
              </div>
            </div>
            <div>
              <label className="font-mono text-xs text-dust uppercase block mb-1">Audio Bitrate</label>
              <select
                value={audioBitrate}
                onChange={(e) => setAudioBitrate(e.target.value)}
                className="w-full"
              >
                <option value="128k">128k</option>
                <option value="192k">192k</option>
                <option value="256k">256k</option>
                <option value="320k">320k</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          {showSettings ? "Hide Settings" : "Adjust Settings"}
        </button>
        {showSettings && (
          <button
            onClick={handleReRender}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            {loading ? "Re-rendering..." : "Re-render Video"}
          </button>
        )}
        <button
          onClick={onAccept}
          className="btn-primary flex-1"
          disabled={loading}
        >
          Accept Video
        </button>
      </div>
    </div>
  );
}
