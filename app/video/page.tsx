"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Asset, STYLE_OPTIONS, StyleName } from "@/lib/types";

type Phase = "select" | "configure" | "assembling" | "preview";

export default function VideoPage() {
  const [songs, setSongs] = useState<Asset[]>([]);
  const [thumbnails, setThumbnails] = useState<Asset[]>([]);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [selectedThumb, setSelectedThumb] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [style, setStyle] = useState<StyleName>("Funk Soul");
  const [decade, setDecade] = useState("1970");
  const [crf, setCrf] = useState(18);
  const [audioBitrate, setAudioBitrate] = useState("320k");
  const [applyBranding, setApplyBranding] = useState(true);

  const [phase, setPhase] = useState<Phase>("select");
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [result, setResult] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAssets() {
      setLoadingAssets(true);

      try {
        const [songsResponse, thumbsResponse] = await Promise.all([
          fetch("/api/assets?type=song"),
          fetch("/api/assets?type=thumbnail"),
        ]);

        if (!songsResponse.ok || !thumbsResponse.ok) {
          throw new Error("Failed to load assets for video assembly.");
        }

        const [songsData, thumbsData] = (await Promise.all([
          songsResponse.json(),
          thumbsResponse.json(),
        ])) as [Asset[], Asset[]];

        if (!active) return;

        setSongs(songsData);
        setThumbnails(thumbsData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) {
          setLoadingAssets(false);
        }
      }
    }

    void loadAssets();

    return () => {
      active = false;
    };
  }, []);

  const selectedSongAsset = useMemo(
    () => songs.find((song) => song.id === selectedSong) ?? null,
    [selectedSong, songs]
  );

  const selectedThumbAsset = useMemo(
    () => thumbnails.find((thumb) => thumb.id === selectedThumb) ?? null,
    [selectedThumb, thumbnails]
  );

  const selectedStyle = useMemo(
    () => STYLE_OPTIONS.find((option) => option.name === style) ?? STYLE_OPTIONS[0],
    [style]
  );

  const canContinue = Boolean(selectedSongAsset && selectedThumbAsset);
  const canAssemble = Boolean(
    selectedSongAsset &&
      selectedThumbAsset &&
      title.trim() &&
      artists.trim()
  );

  const proceedToConfigure = () => {
    if (!selectedSongAsset || !selectedThumbAsset) return;

    setTitle(selectedSongAsset.title || "");
    setArtists(selectedSongAsset.artists || "");

    const nextStyle = selectedThumbAsset.style || selectedSongAsset.style || "Funk Soul";
    setStyle(nextStyle);

    const option = STYLE_OPTIONS.find((item) => item.name === nextStyle) ?? STYLE_OPTIONS[0];
    setDecade(option.decade.replace("s", ""));
    setPhase("configure");
  };

  const assemble = async () => {
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
          style,
          decade,
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
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[rgba(212,168,83,0.16)] bg-[linear-gradient(135deg,rgba(160,28,18,0.26),rgba(18,12,8,0.98)_45%,rgba(212,168,83,0.1))] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_55%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-tape">Standalone Video Tool</p>
            <h1 className="mt-3 font-display text-4xl leading-none text-paper md:text-6xl">
              Turn finished assets into a release-ready PIROS TAPE video.
            </h1>
            <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-ash">
              Pair a generated song with a thumbnail, tune the export profile, and render a branded video without touching the full studio pipeline.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard label="Songs" value={String(songs.length)} meta="Available in assets" />
            <MetricCard label="Thumbnails" value={String(thumbnails.length)} meta="Ready for assembly" />
            <MetricCard label="Branding" value={applyBranding ? "On" : "Off"} meta={`${audioBitrate} audio / CRF ${crf}`} />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[24px] border border-crimson/40 bg-[rgba(160,28,18,0.08)] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-crimson">Assembly Error</p>
          <p className="mt-2 font-body text-base text-ash">{error}</p>
        </div>
      )}

      {loadingAssets && phase === "select" && (
        <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="waveform-bar" />
            ))}
          </div>
          <p className="mt-4 font-display text-3xl text-paper">Loading available assets...</p>
          <p className="mt-2 font-body text-base text-ash">
            Pulling songs and thumbnails from the shared asset library.
          </p>
        </section>
      )}

      {!loadingAssets && phase === "select" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Step 1</p>
                  <h2 className="mt-2 font-display text-3xl text-paper">Choose The Audio Master</h2>
                </div>
                <Link href="/music" className="btn-secondary text-sm">
                  Generate Music
                </Link>
              </div>

              {songs.length === 0 ? (
                <EmptyState
                  title="No songs in the library"
                  detail="Generate a standalone music variation first, then come back here to assemble the release video."
                />
              ) : (
                <div className="space-y-3">
                  {songs.map((song) => {
                    const isSelected = selectedSong === song.id;
                    return (
                      <button
                        key={song.id}
                        onClick={() => setSelectedSong(song.id)}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${
                          isSelected
                            ? "border-[rgba(212,168,83,0.45)] bg-[rgba(212,168,83,0.08)]"
                            : "border-[rgba(212,168,83,0.12)] bg-noir-3/70 hover:border-[rgba(212,168,83,0.28)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tape">
                              {isSelected ? "Selected Track" : "Song Asset"}
                            </p>
                            <h3 className="mt-2 font-display text-2xl text-paper">{song.title}</h3>
                            <p className="mt-1 font-body text-sm text-ash">{song.artists}</p>
                          </div>
                          <div className="text-right font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
                            <p>{formatDuration(song.duration)}</p>
                            <p className="mt-2">{formatBytes(song.fileSize)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Step 2</p>
                  <h2 className="mt-2 font-display text-3xl text-paper">Choose The Key Art</h2>
                </div>
                <Link href="/thumbnails" className="btn-secondary text-sm">
                  Generate Art
                </Link>
              </div>

              {thumbnails.length === 0 ? (
                <EmptyState
                  title="No thumbnails in the library"
                  detail="Create cover art first so the video assembler has an image to brand and loop over the audio."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {thumbnails.map((thumb) => {
                    const isSelected = selectedThumb === thumb.id;
                    return (
                      <button
                        key={thumb.id}
                        onClick={() => setSelectedThumb(thumb.id)}
                        className={`overflow-hidden rounded-[22px] border text-left transition ${
                          isSelected
                            ? "border-[rgba(212,168,83,0.45)] bg-[rgba(212,168,83,0.08)]"
                            : "border-[rgba(212,168,83,0.12)] bg-noir-3/70 hover:border-[rgba(212,168,83,0.28)]"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/assets/${thumb.id}?inline=1`}
                          alt={thumb.title}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="p-4">
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tape">
                            {isSelected ? "Selected Artwork" : "Thumbnail Asset"}
                          </p>
                          <h3 className="mt-2 font-display text-2xl text-paper">{thumb.title}</h3>
                          <p className="mt-1 font-body text-sm text-ash">{thumb.artists}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Selection Summary</p>
              <div className="mt-4 space-y-4">
                <InfoPill
                  label="Song"
                  value={selectedSongAsset ? selectedSongAsset.title : "Pick a song asset"}
                />
                <InfoPill
                  label="Artwork"
                  value={selectedThumbAsset ? selectedThumbAsset.title : "Pick a thumbnail asset"}
                />

                {selectedSongAsset ? (
                  <audio
                    controls
                    className="w-full"
                    src={`/api/assets/${selectedSongAsset.id}?inline=1`}
                  />
                ) : null}

                {selectedThumbAsset ? (
                  <div className="overflow-hidden rounded-[18px] border border-[rgba(212,168,83,0.12)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/assets/${selectedThumbAsset.id}?inline=1`}
                      alt={selectedThumbAsset.title}
                      className="w-full aspect-video object-cover"
                    />
                  </div>
                ) : null}

                <button
                  onClick={proceedToConfigure}
                  disabled={!canContinue}
                  className="btn-primary w-full"
                >
                  Continue To Render Settings
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {phase === "configure" && selectedSongAsset && selectedThumbAsset && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Release Metadata</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Tune The Final Credits</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Video Title
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Artists
                  </label>
                  <input
                    value={artists}
                    onChange={(event) => setArtists(event.target.value)}
                    className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Branding Controls</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Set The Overlay Direction</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(event) => setStyle(event.target.value as StyleName)}
                    className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                  >
                    {STYLE_OPTIONS.map((option) => (
                      <option key={option.name} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Decade
                  </label>
                  <select
                    value={decade}
                    onChange={(event) => setDecade(event.target.value)}
                    className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                  >
                    <option value="1960">1960s</option>
                    <option value="1970">1970s</option>
                  </select>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyBranding}
                  onChange={(event) => setApplyBranding(event.target.checked)}
                  className="accent-tape"
                />
                <span className="font-mono text-xs uppercase text-dust">Apply PIROS TAPE branding overlay</span>
              </label>
            </section>

            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Export Profile</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Balance Quality And File Size</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Quality (CRF {crf})
                  </label>
                  <div className="rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-4">
                    <input
                      type="range"
                      min={10}
                      max={28}
                      value={crf}
                      onChange={(event) => setCrf(Number(event.target.value))}
                      className="w-full accent-tape"
                    />
                    <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
                      <span>Higher quality</span>
                      <span>Smaller file</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Audio Bitrate
                  </label>
                  <select
                    value={audioBitrate}
                    onChange={(event) => setAudioBitrate(event.target.value)}
                    className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                  >
                    <option value="128k">128k</option>
                    <option value="192k">192k</option>
                    <option value="256k">256k</option>
                    <option value="320k">320k</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Output Preview</p>
              <div className="mt-4 space-y-4">
                <div className="overflow-hidden rounded-[18px] border border-[rgba(212,168,83,0.12)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/assets/${selectedThumbAsset.id}?inline=1`}
                    alt={selectedThumbAsset.title}
                    className="w-full aspect-video object-cover"
                  />
                </div>

                <audio
                  controls
                  className="w-full"
                  src={`/api/assets/${selectedSongAsset.id}?inline=1`}
                />

                <div className="grid grid-cols-2 gap-3">
                  <InfoPill label="Style" value={selectedStyle.name} />
                  <InfoPill label="Export" value={`${audioBitrate} / CRF ${crf}`} />
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => setPhase("select")} className="btn-secondary w-full">
                    Back To Selection
                  </button>
                  <button
                    onClick={assemble}
                    disabled={!canAssemble}
                    className="btn-primary w-full"
                  >
                    Assemble Video
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}

      {phase === "assembling" && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Assembling</p>
            <h2 className="mt-2 font-display text-3xl text-paper">FFmpeg Is Building The Final Video</h2>
            <p className="mt-3 font-body text-base text-ash">
              Audio, cover art, and optional branding are being composed into a single release-ready render.
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-5 py-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="waveform-bar" />
              ))}
              <span className="ml-3 font-mono text-xs uppercase tracking-[0.16em] text-dust">
                Rendering video
              </span>
            </div>
          </div>

          <div className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Current Export Profile</p>
            <div className="mt-4 space-y-4">
              <InfoPill label="Branding" value={applyBranding ? "Enabled" : "Disabled"} />
              <InfoPill label="Audio" value={audioBitrate} />
              <InfoPill label="Quality" value={`CRF ${crf}`} />
            </div>
          </div>
        </section>
      )}

      {phase === "preview" && result && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <section className="overflow-hidden rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <video
              controls
              className="w-full aspect-video bg-black"
              src={`/api/assets/${result.id}?inline=1`}
            />
          </section>

          <aside className="space-y-6">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Complete</p>
              <h2 className="mt-2 font-display text-3xl text-paper">Video Saved To Assets</h2>
              <div className="mt-5 space-y-4">
                <InfoPill label="Title" value={result.title} />
                <InfoPill label="Artists" value={result.artists} />
                <InfoPill label="File Size" value={formatBytes(result.fileSize)} />
              </div>
            </section>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setResult(null);
                  setPhase("configure");
                }}
                className="btn-secondary w-full"
              >
                Re-render With Changes
              </button>
              <a
                href={`/api/assets/${result.id}`}
                download={result.fileName}
                className="btn-primary text-center"
              >
                Download Video
              </a>
              <a href="/assets?type=video" className="btn-secondary text-center">
                View In Assets
              </a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">{label}</p>
      <p className="mt-2 font-display text-3xl text-paper">{value}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dust">{meta}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">{label}</p>
      <p className="mt-1 font-mono text-sm text-paper">{value}</p>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-5 py-6">
      <p className="font-display text-2xl text-paper">{title}</p>
      <p className="mt-2 font-body text-sm text-ash">{detail}</p>
    </div>
  );
}

function formatBytes(bytes?: number) {
  if (!bytes) return "Unknown";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(duration?: number) {
  if (!duration) return "Length pending";
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
