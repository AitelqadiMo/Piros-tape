"use client";

import Image from "next/image";
import { useState } from "react";

interface ThumbnailReviewProps {
  thumbnailUrl: string;
  onAccept: () => void;
  onRegenerate: () => void;
  disabled?: boolean;
}

export default function ThumbnailReview({
  thumbnailUrl,
  onAccept,
  onRegenerate,
  disabled,
}: ThumbnailReviewProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="border-[0.5px] border-tape bg-noir-2 p-6 space-y-4"
      style={{ borderRadius: "2px" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-tape animate-pulse-opacity" />
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-tape">
          Review Thumbnail
        </h3>
      </div>
      <p className="font-body text-sm text-dust">
        Gemini (Nano Banana 2) generated this thumbnail. Accept to brand it, or regenerate for a new one.
      </p>

      <div
        className="relative aspect-video bg-noir-3 overflow-hidden"
        style={{ borderRadius: "2px" }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[11px] text-dust animate-pulse-opacity">
              Loading thumbnail...
            </span>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt="Generated thumbnail"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onAccept}
          disabled={disabled}
          className="btn-primary flex-1 py-3"
        >
          ✓ Accept & Brand
        </button>
        <button
          onClick={onRegenerate}
          disabled={disabled}
          className="btn-secondary flex-1 py-3"
        >
          ↺ Regenerate
        </button>
      </div>
    </div>
  );
}
