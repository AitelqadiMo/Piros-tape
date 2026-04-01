"use client";

import { useState, useEffect } from "react";
import { Asset } from "@/lib/types";

type Phase = "select" | "configure" | "assembling" | "preview";

export default function VideoPage() {
  const [songs, setSongs] = useState<Asset[]>([]);
  const [thumbnails, setThumbnails] = useState<Asset[]>([]);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [selectedThumb, setSelectedThumb] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [crf, setCrf] = useState(18);
  const [audioBitrate, setAudioBitrate] = useState("320k");
  const [applyBranding, setApplyBranding] = useState(true);

  const [phase, setPhase] = useState<Phase>("select");
  const [result, setResult] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/assets?type=song").then((r) => r.json()),
      fetch("/api/assets?type=thumbnail").then((r) => r.json()),
    ]).then(([s, t]) => {
      setSongs(s);
      setThumbnails(t);
    });
  }, []);

  const selectedSongAsset = songs.find((s) => s.id === selectedSong);
  const selectedThumbAsset = thumbnails.find((t) => t.id === selectedThumb);

  const proceedToConfigure = () => {
    if (!selectedSong || !selectedThumb) return;
    // Pre-fill from selected assets
    if (selectedSongAsset) {
      setTitle(selectedSongAsset.title || "");
      setArtists(selectedSongAsset.artists || "");
    }
    setPhase("configure");
  };

  const assemble = async () => {
    setLoading(true);
    setError(null);
    setPhase("assembling");

    try {
      const resp = await fetch("/api/video/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songAssetId: selectedSong,
          thumbnailAssetId: selectedThumb,
          title,
          artists,
          crf,
          audioBitrate,
          applyBranding,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `Request failed: ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data.asset);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("configure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display italic text-3xl text-paper mb-2">Video Assembly</h1>
        <p className="font-mono text-xs text-dust tracking-wide uppercase">
          Combine a song and thumbnail into a YouTube-ready video
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-crimson/30 bg-crimson/5 rounded">
          <p className="font-mono text-sm text-crimson">{error}</p>
        </div>
      )}

      {phase === "select" && (
        <div className="space-y-8 animate-fade-in">
          {/* Song selection */}
          <div>
            <h2 className="font-mono text-sm text-tape uppercase tracking-wider mb-4">Select a Song</h2>
            {songs.length === 0 ? (
              <div className="p-6 border border-dust/10 rounded text-center">
                <p className="font-mono text-sm text-dust">No songs yet. <a href="/music" className="text-tape underline">Generate one first.</a></p>
              </div>
            ) : (
              <div className="grid gap-3">
                {songs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => setSelectedSong(song.id)}
                    className={`p-4 border rounded text-left flex items-center gap-4 transition-all ${
                      selectedSong === song.id
                        ? "border-tape bg-tape/10"
                        : "border-dust/20 hover:border-dust/40"
                    }`}
                  >
                    <div className="w-10 h-10 rounded bg-noir-3 flex items-center justify-center text-tape">
                      {selectedSong === song.id ? "\u2713" : "\u266B"}
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-sm text-paper">{song.title}</div>
                      <div className="font-mono text-xs text-dust">{song.artists}</div>
                    </div>
                    <div className="font-mono text-xs text-dust">
                      {song.duration ? `${Math.round(song.duration)}s` : ""}
                      {song.fileSize ? ` / ${(song.fileSize / 1024 / 1024).toFixed(1)}MB` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail selection */}
          <div>
            <h2 className="font-mono text-sm text-tape uppercase tracking-wider mb-4">Select a Thumbnail</h2>
            {thumbnails.length === 0 ? (
              <div className="p-6 border border-dust/10 rounded text-center">
                <p className="font-mono text-sm text-dust">No thumbnails yet. <a href="/thumbnails" className="text-tape underline">Generate one first.</a></p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {thumbnails.map((thumb) => (
                  <button
                    key={thumb.id}
                    onClick={() => setSelectedThumb(thumb.id)}
                    className={`border rounded overflow-hidden transition-all ${
                      selectedThumb === thumb.id
                        ? "border-tape ring-2 ring-tape/30"
                        : "border-dust/20 hover:border-dust/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/assets/${thumb.id}`}
                      alt={thumb.title}
                      className="w-full aspect-video object-cover"
                    />
                    <div className="p-2">
                      <div className="font-mono text-xs text-paper truncate">{thumb.title}</div>
                      <div className="font-mono text-xs text-dust truncate">{thumb.artists}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={proceedToConfigure}
            disabled={!selectedSong || !selectedThumb}
            className="btn-primary w-full"
          >
            Continue to Settings
          </button>
        </div>
      )}

      {phase === "configure" && (
        <div className="space-y-6 animate-fade-in">
          {/* Preview selected assets */}
          <div className="grid grid-cols-2 gap-4">
            {selectedSongAsset && (
              <div className="p-4 border border-dust/20 rounded bg-noir-2">
                <div className="font-mono text-xs text-dust uppercase mb-2">Song</div>
                <div className="font-mono text-sm text-paper">{selectedSongAsset.title}</div>
                <div className="font-mono text-xs text-dust">{selectedSongAsset.artists}</div>
                <audio controls className="w-full mt-3" src={`/api/assets/${selectedSongAsset.id}`} />
              </div>
            )}
            {selectedThumbAsset && (
              <div className="p-4 border border-dust/20 rounded bg-noir-2">
                <div className="font-mono text-xs text-dust uppercase mb-2">Thumbnail</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/assets/${selectedThumbAsset.id}`}
                  alt="Selected thumbnail"
                  className="w-full aspect-video object-cover rounded"
                />
              </div>
            )}
          </div>

          {/* Video settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">Video Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">Artists</label>
              <input value={artists} onChange={(e) => setArtists(e.target.value)} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">
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
              <div className="flex justify-between font-mono text-xs text-dust mt-1">
                <span>Higher quality</span>
                <span>Smaller file</span>
              </div>
            </div>
            <div>
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">Audio Bitrate</label>
              <select value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} className="w-full">
                <option value="128k">128k</option>
                <option value="192k">192k</option>
                <option value="256k">256k</option>
                <option value="320k">320k</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyBranding}
                  onChange={(e) => setApplyBranding(e.target.checked)}
                  className="accent-tape"
                />
                <span className="font-mono text-xs text-dust uppercase">Apply branding overlay</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPhase("select")} className="btn-secondary flex-1">
              Back
            </button>
            <button onClick={assemble} disabled={!title || !artists} className="btn-primary flex-1">
              Assemble Video
            </button>
          </div>
        </div>
      )}

      {phase === "assembling" && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="flex gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="waveform-bar" />
            ))}
          </div>
          <p className="font-mono text-sm text-tape uppercase">Assembling video with FFmpeg...</p>
          <p className="font-mono text-xs text-dust mt-2">This may take several minutes depending on song length</p>
        </div>
      )}

      {phase === "preview" && result && (
        <div className="space-y-6 animate-fade-in">
          <div className="border border-dust/20 rounded overflow-hidden bg-noir-2">
            <video
              controls
              className="w-full aspect-video"
              src={`/api/assets/${result.id}`}
            />
          </div>

          <div className="p-4 border border-dust/10 rounded bg-noir-3">
            <div className="grid grid-cols-4 gap-4 font-mono text-xs">
              <div>
                <span className="text-dust uppercase">Title</span>
                <p className="text-paper mt-1">{result.title}</p>
              </div>
              <div>
                <span className="text-dust uppercase">Artists</span>
                <p className="text-paper mt-1">{result.artists}</p>
              </div>
              <div>
                <span className="text-dust uppercase">Size</span>
                <p className="text-paper mt-1">{result.fileSize ? `${(result.fileSize / 1024 / 1024).toFixed(1)} MB` : "—"}</p>
              </div>
              <div>
                <span className="text-dust uppercase">CRF</span>
                <p className="text-paper mt-1">{crf}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setResult(null);
                setPhase("configure");
              }}
              className="btn-secondary flex-1"
            >
              Re-render with Changes
            </button>
            <a
              href={`/api/assets/${result.id}`}
              download={result.fileName}
              className="btn-primary flex-1 text-center"
            >
              Download Video
            </a>
            <a href="/assets?type=video" className="btn-secondary flex-1 text-center">
              View in Assets
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
