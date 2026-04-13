"use client";

import { useEffect, useMemo, useState } from "react";
import { Asset, AssetType } from "@/lib/types";

const TYPE_LABELS: Record<AssetType | "all", string> = {
  all: "All Assets",
  song: "Songs",
  thumbnail: "Thumbnails",
  video: "Videos",
  artist_image: "Artist Images",
};

const TYPE_ICONS: Record<AssetType, string> = {
  song: "\u266B",
  thumbnail: "\u25A3",
  video: "\u25B6",
  artist_image: "\ud83d\udc65",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [filter, setFilter] = useState<AssetType | "all">(() => {
    if (typeof window === "undefined") return "all";
    const type = new URLSearchParams(window.location.search).get("type");
    return type && ["song", "thumbnail", "video", "artist_image"].includes(type) ? (type as AssetType) : "all";
  });

  useEffect(() => {
    let cancelled = false;

    const fetchAssets = async () => {
      const url = filter === "all" ? "/api/assets" : `/api/assets?type=${filter}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!cancelled) {
        setAssets(data);
      }
    };

    fetchAssets().catch(() => {
      if (!cancelled) {
        setAssets([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  const deleteAsset = async (id: string) => {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setAssets((prev) => (prev ?? []).filter((a) => a.id !== id));
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

  const counts = useMemo(() => ({
    all: assets?.length ?? 0,
    song: assets?.filter((a) => a.type === "song").length ?? 0,
    thumbnail: assets?.filter((a) => a.type === "thumbnail").length ?? 0,
    video: assets?.filter((a) => a.type === "video").length ?? 0,
  }), [assets]);

  const latestAsset = assets?.[0];
  const loading = assets === null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(212,168,83,0.16)] bg-[linear-gradient(135deg,rgba(160,28,18,0.24),rgba(18,12,8,0.98)_45%,rgba(212,168,83,0.08))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_55%)] lg:block" />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-tape">Asset Library</p>
            <h1 className="mt-3 font-display text-4xl leading-none text-paper md:text-5xl">Everything The Studio Has Produced</h1>
            <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-ash">
              Browse songs, thumbnails, and videos in one place, then jump back into generation or download the finished files directly.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Total Assets</p>
              <p className="mt-2 font-display text-3xl text-paper">{counts.all}</p>
            </div>
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Current Filter</p>
              <p className="mt-2 font-display text-3xl text-paper">{TYPE_LABELS[filter]}</p>
            </div>
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Latest Item</p>
              <p className="mt-2 truncate font-mono text-sm uppercase text-paper">{latestAsset?.title || "None yet"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "song", "thumbnail", "video"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setAssets(null);
              setFilter(t);
            }}
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all ${
              filter === t
                ? "border border-tape/40 bg-tape/15 text-tape"
                : "border border-dust/20 text-dust hover:border-dust/40"
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
        <div className="rounded-[26px] border border-dust/10 bg-noir-2/70 py-20 text-center">
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
              className="group rounded-[24px] border border-dust/15 bg-noir-2/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-dust/30"
            >
              <div className="flex items-start gap-4">
                {/* Type icon / preview */}
                <div className="flex size-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-noir-3">
                  {asset.type === "thumbnail" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/assets/${asset.id}?inline=1`}
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
                    <span className="rounded-full bg-tape/10 px-2 py-1 font-mono text-[10px] uppercase text-tape">
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
                    <audio controls className="h-8" src={`/api/assets/${asset.id}?inline=1`} />
                  )}
                  <a
                    href={`/api/assets/${asset.id}`}
                    download={asset.fileName}
                    className="rounded-full border border-tape/30 px-3 py-1.5 font-mono text-xs text-tape transition-colors hover:bg-tape/10"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="rounded-full border border-crimson/30 px-3 py-1.5 font-mono text-xs text-crimson transition-colors hover:bg-crimson/10"
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
