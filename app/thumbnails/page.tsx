"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import StyleCard from "@/components/StyleCard";
import { buildImagePrompt, defaultMoodLines } from "@/lib/prompts";
import { Asset, STYLE_OPTIONS, StyleName } from "@/lib/types";

type Phase = "configure" | "generating" | "preview";

export default function ThumbnailsPage() {
  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [style, setStyle] = useState<StyleName>("Funk Soul");
  const [decade, setDecade] = useState("1970");
  const [budapestYear, setBudapestYear] = useState(1974);
  const [moodLine, setMoodLine] = useState(defaultMoodLines["Funk Soul"].replace("[YEAR]", "1974"));
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const [phase, setPhase] = useState<Phase>("configure");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStyle = useMemo(
    () => STYLE_OPTIONS.find((option) => option.name === style) ?? STYLE_OPTIONS[0],
    [style]
  );

  const promptPreview = useMemo(() => {
    if (useCustom) return customPrompt;

    return buildImagePrompt({
      id: "preview",
      title: title || "UNTITLED",
      artists: artists || "Unknown",
      style,
      decade,
      bpm: selectedStyle.defaultBpm,
      budapestYear,
      moodLine,
      status: "pending",
      currentStep: 0,
      stepStatuses: [],
      createdAt: "",
    });
  }, [artists, budapestYear, customPrompt, decade, moodLine, selectedStyle.defaultBpm, style, title, useCustom]);

  const canGenerate = title.trim() && artists.trim() && (!useCustom || customPrompt.trim());

  const generate = async () => {
    setError(null);
    setAsset(null);
    setPreviewUrl(null);
    setPhase("generating");

    try {
      const resp = await fetch("/api/thumbnails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artists,
          style,
          decade,
          budapestYear,
          moodLine,
          customPrompt: useCustom ? customPrompt : undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `Request failed: ${resp.status}`);
      }

      const data = await resp.json();
      setAsset(data.asset);
      setPreviewUrl(`/api/assets/${data.asset.id}?inline=1`);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("configure");
    }
  };

  const regenerate = () => {
    void generate();
  };

  const reset = () => {
    setAsset(null);
    setPreviewUrl(null);
    setPhase("configure");
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[rgba(212,168,83,0.16)] bg-[linear-gradient(135deg,rgba(212,168,83,0.18),rgba(18,12,8,0.98)_45%,rgba(160,28,18,0.14))] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.16),transparent_55%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-tape">Standalone Thumbnail Tool</p>
            <h1 className="mt-3 font-display text-4xl leading-none text-paper md:text-6xl">
              Direct the cover art before you ever hit render.
            </h1>
            <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-ash">
              Shape the visual mood, keep the Budapest-era framing intact, and generate artwork you can send straight into the video assembler.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard label="Engine" value="Gemini" meta="Image generation" />
            <MetricCard label="Style" value={selectedStyle.name} meta={selectedStyle.energy} />
            <MetricCard label="Era" value={String(budapestYear)} meta={`${decade}s Budapest framing`} />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[24px] border border-crimson/40 bg-[rgba(160,28,18,0.08)] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-crimson">Generation Error</p>
          <p className="mt-2 font-body text-base text-ash">{error}</p>
        </div>
      )}

      {phase === "configure" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Artwork Identity</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Name The Sleeve</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Title
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="SONG TITLE"
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
                    placeholder="Artist 1 × Artist 2"
                    className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Visual Direction</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Pick The Mood System</h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {STYLE_OPTIONS.map((option) => (
                  <StyleCard
                    key={option.name}
                    style={option}
                    selected={style === option.name}
                    onClick={() => {
                      setStyle(option.name);
                      setDecade(option.decade.replace("s", ""));
                      setBudapestYear(option.defaultYear);
                      setMoodLine(
                        defaultMoodLines[option.name].replace("[YEAR]", String(option.defaultYear))
                      );
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Scene Controls</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Tune The Photograph</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    Budapest Year
                  </label>
                  <input
                    type="number"
                    min={1960}
                    max={1979}
                    value={budapestYear}
                    onChange={(event) => setBudapestYear(Number(event.target.value))}
                    className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                  Mood Line
                </label>
                <textarea
                  value={moodLine}
                  onChange={(event) => setMoodLine(event.target.value)}
                  rows={4}
                  placeholder="Describe the emotional framing for the artwork..."
                  className="min-h-[120px] w-full resize-none rounded-[20px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-4 font-mono text-sm leading-6"
                />
              </div>

              <div className="mt-5">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={(event) => setUseCustom(event.target.checked)}
                    className="accent-tape"
                  />
                  <span className="font-mono text-xs uppercase text-dust">Use custom image prompt</span>
                </label>

                {useCustom && (
                  <textarea
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    rows={7}
                    placeholder="Describe the thumbnail you want in full detail..."
                    className="mt-4 min-h-[180px] w-full resize-none rounded-[20px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-4 font-mono text-sm leading-6"
                  />
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Preview</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Cover Reference</p>
                  <p className="mt-1 font-display text-2xl text-paper">{title || "Untitled sleeve"}</p>
                  <p className="mt-1 font-body text-sm text-ash">{artists || "Artist line will appear here."}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InfoPill label="Style" value={selectedStyle.name} />
                  <InfoPill label="Year" value={String(budapestYear)} />
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Gemini Brief</p>
                  <pre className="mt-2 max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-4 font-mono text-xs leading-6 text-ash">
                    {promptPreview || "Your image prompt preview will appear here."}
                  </pre>
                </div>

                <button
                  onClick={generate}
                  disabled={!canGenerate}
                  className="btn-primary w-full"
                >
                  Generate Thumbnail
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {phase === "generating" && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Generating</p>
            <h2 className="mt-2 font-display text-3xl text-paper">Gemini Is Composing The Artwork</h2>
            <p className="mt-3 font-body text-base text-ash">
              The image model is rendering a PIROS TAPE sleeve from the visual direction you set.
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-5 py-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="waveform-bar" />
              ))}
              <span className="ml-3 font-mono text-xs uppercase tracking-[0.16em] text-dust">
                Rendering visual
              </span>
            </div>
          </div>

          <div className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Direction Locked</p>
            <div className="mt-4 space-y-4">
              <InfoPill label="Title" value={title || "Untitled"} />
              <InfoPill label="Artists" value={artists || "Unknown"} />
              <InfoPill label="Style" value={selectedStyle.name} />
            </div>
          </div>
        </section>
      )}

      {phase === "preview" && previewUrl && asset && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <section className="overflow-hidden rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Thumbnail for ${title}`}
              className="w-full aspect-video object-cover"
            />
          </section>

          <aside className="space-y-6">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Ready</p>
              <h2 className="mt-2 font-display text-3xl text-paper">Artwork Saved To Assets</h2>
              <div className="mt-5 space-y-4">
                <InfoPill label="Title" value={asset.title} />
                <InfoPill label="Artists" value={asset.artists} />
                <InfoPill
                  label="File Size"
                  value={asset.fileSize ? `${(asset.fileSize / 1024).toFixed(0)} KB` : "Unknown"}
                />
              </div>
            </section>

            <div className="flex flex-col gap-3">
              <button onClick={regenerate} className="btn-secondary w-full">
                Regenerate
              </button>
              <button onClick={reset} className="btn-secondary w-full">
                New Thumbnail
              </button>
              <Link href="/video" className="btn-secondary text-center">
                Send To Video Tool
              </Link>
              <a href="/assets?type=thumbnail" className="btn-primary text-center">
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
