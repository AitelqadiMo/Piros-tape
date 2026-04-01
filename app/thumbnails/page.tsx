"use client";

import { useState } from "react";
import { STYLE_OPTIONS, StyleName, Asset } from "@/lib/types";

type Phase = "configure" | "generating" | "preview" | "done";

export default function ThumbnailsPage() {
  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [style, setStyle] = useState<StyleName>("Funk Soul");
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const [phase, setPhase] = useState<Phase>("configure");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setPhase("generating");

    try {
      const resp = await fetch("/api/thumbnails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artists,
          style,
          customPrompt: useCustom ? customPrompt : undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `Request failed: ${resp.status}`);
      }

      const data = await resp.json();
      setAsset(data.asset);
      setPreviewUrl(`/api/assets/${data.asset.id}`);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("configure");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = () => {
    setAsset(null);
    setPreviewUrl(null);
    generate();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display italic text-3xl text-paper mb-2">Thumbnail Generation</h1>
        <p className="font-mono text-xs text-dust tracking-wide uppercase">
          Standalone Gemini AI thumbnail generation — create artwork independently
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-crimson/30 bg-crimson/5 rounded">
          <p className="font-mono text-sm text-crimson">{error}</p>
        </div>
      )}

      {phase === "configure" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="SONG TITLE"
                className="w-full"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">Artists</label>
              <input
                value={artists}
                onChange={(e) => setArtists(e.target.value)}
                placeholder="Artist 1 × Artist 2"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-3">Style</label>
            <div className="grid grid-cols-3 gap-3">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => setStyle(opt.name)}
                  className={`p-3 border rounded text-left transition-all ${
                    style === opt.name
                      ? "border-tape bg-tape/10 text-paper"
                      : "border-dust/20 text-dust hover:border-dust/40"
                  }`}
                >
                  <div className="font-mono text-xs uppercase">{opt.name}</div>
                  <div className="font-body text-xs mt-1 opacity-60">{opt.energy}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="accent-tape"
              />
              <span className="font-mono text-xs text-dust uppercase">Use custom image prompt</span>
            </label>
            {useCustom && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={6}
                placeholder="Describe the thumbnail you want..."
                className="w-full mt-3"
              />
            )}
          </div>

          <button
            onClick={generate}
            disabled={!title || !artists}
            className="btn-primary w-full"
          >
            Generate Thumbnail
          </button>
        </div>
      )}

      {phase === "generating" && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="flex gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="waveform-bar" />
            ))}
          </div>
          <p className="font-mono text-sm text-tape uppercase">Generating with Gemini...</p>
          <p className="font-mono text-xs text-dust mt-2">This may take a moment</p>
        </div>
      )}

      {(phase === "preview" || phase === "done") && previewUrl && (
        <div className="space-y-6 animate-fade-in">
          <div className="border border-dust/20 rounded overflow-hidden bg-noir-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Thumbnail for ${title}`}
              className="w-full aspect-video object-cover"
            />
          </div>

          {asset && (
            <div className="p-4 border border-dust/10 rounded bg-noir-3">
              <div className="grid grid-cols-3 gap-4 font-mono text-xs">
                <div>
                  <span className="text-dust uppercase">Title</span>
                  <p className="text-paper mt-1">{asset.title}</p>
                </div>
                <div>
                  <span className="text-dust uppercase">Artists</span>
                  <p className="text-paper mt-1">{asset.artists}</p>
                </div>
                <div>
                  <span className="text-dust uppercase">Size</span>
                  <p className="text-paper mt-1">{asset.fileSize ? `${(asset.fileSize / 1024).toFixed(0)} KB` : "—"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={regenerate} className="btn-secondary flex-1">
              Regenerate
            </button>
            <button
              onClick={() => {
                setPhase("configure");
                setAsset(null);
                setPreviewUrl(null);
              }}
              className="btn-secondary flex-1"
            >
              New Thumbnail
            </button>
            <a href="/assets?type=thumbnail" className="btn-primary flex-1 text-center">
              View in Assets
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
