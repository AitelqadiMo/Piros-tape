"use client";

import { useState, useEffect } from "react";
import { Asset, AssetType } from "@/lib/types";

const TYPE_LABELS: Record<AssetType | "all", string> = {
  all: "All Assets",
  song: "Songs",
  thumbnail: "Thumbnails",
  video: "Videos",
};

const TYPE_ICONS: Record<AssetType, string> = {
  song: "\u266B",
  thumbnail: "\u25A3",
  video: "\u25B6",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<AssetType | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, [filter]);

  const loadAssets = async () => {
    setLoading(true);
    const url = filter === "all" ? "/api/assets" : `/api/assets?type=${filter}`;
    const resp = await fetch(url);
    const data = await resp.json();
    setAssets(data);
    setLoading(false);
  };

  const deleteAsset = async (id: string) => {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Read initial filter from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type && ["song", "thumbnail", "video"].includes(type)) {
      setFilter(type as AssetType);
    }
  }, []);

  const counts = {
    all: assets.length,
    song: assets.filter((a) => a.type === "song").length,
    thumbnail: assets.filter((a) => a.type === "thumbnail").length,
    video: assets.filter((a) => a.type === "video").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display italic text-3xl text-paper mb-2">Assets</h1>
        <p className="font-mono text-xs text-dust tracking-wide uppercase">
          Browse all generated media — songs, thumbnails, and videos
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-8">
        {(["all", "song", "thumbnail", "video"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded transition-all ${
              filter === t
                ? "bg-tape/15 text-tape border border-tape/30"
                : "text-dust border border-dust/20 hover:border-dust/40"
            }`}
          >
            {TYPE_LABELS[t]}
            {filter === "all" && t !== "all" && (
              <span className="ml-2 text-dust/60">({counts[t]})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="waveform-bar" />
            ))}
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 border border-dust/10 rounded">
          <p className="font-mono text-sm text-dust">No assets yet.</p>
          <div className="flex gap-3 justify-center mt-4">
            <a href="/music" className="btn-secondary text-sm">Generate Music</a>
            <a href="/thumbnails" className="btn-secondary text-sm">Generate Thumbnails</a>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="p-4 border border-dust/15 rounded bg-noir-2 hover:border-dust/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Type icon / preview */}
                <div className="w-16 h-16 rounded bg-noir-3 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {asset.type === "thumbnail" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/assets/${asset.id}`}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-tape">{TYPE_ICONS[asset.type]}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-tape uppercase px-1.5 py-0.5 bg-tape/10 rounded">
                      {asset.type}
                    </span>
                    <span className="font-mono text-sm text-paper truncate">{asset.title}</span>
                  </div>
                  <div className="font-mono text-xs text-dust">{asset.artists}</div>
                  <div className="flex gap-4 mt-2 font-mono text-xs text-dust/60">
                    <span>{formatSize(asset.fileSize)}</span>
                    {asset.duration && <span>{Math.round(asset.duration)}s</span>}
                    <span>{formatDate(asset.createdAt)}</span>
                    {asset.jobId && <span>Job: {asset.jobId.slice(0, 12)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {asset.type === "song" && (
                    <audio controls className="h-8" src={`/api/assets/${asset.id}`} />
                  )}
                  <a
                    href={`/api/assets/${asset.id}`}
                    download={asset.fileName}
                    className="px-3 py-1.5 font-mono text-xs text-tape border border-tape/30 rounded hover:bg-tape/10 transition-colors"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="px-3 py-1.5 font-mono text-xs text-crimson border border-crimson/30 rounded hover:bg-crimson/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
