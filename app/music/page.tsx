"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StyleCard from "@/components/StyleCard";
import { STYLE_OPTIONS, StyleName } from "@/lib/types";

interface GeneratedClip {
  id: string;
  title: string;
  artists: string;
  assetId?: string;
  duration?: number;
}

type Phase = "configure" | "generating" | "done";

export default function MusicPage() {
  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [style, setStyle] = useState<StyleName>("Funk Soul");
  const [decade, setDecade] = useState("1970");
  const [bpm, setBpm] = useState(90);
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const [phase, setPhase] = useState<Phase>("configure");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedStyle = useMemo(
    () => STYLE_OPTIONS.find((option) => option.name === style) ?? STYLE_OPTIONS[0],
    [style]
  );

  const generatedPrompt = useMemo(() => {
    if (useCustom) return customPrompt;

    return `${decade}s Hungarian vintage ${style.toLowerCase()}, ${bpm} BPM, laid-back swing.

Instruments: deep electric bass, dry acoustic drums, tight snare, brushed cymbals, rhythm guitar with wah, Hammond organ swells, dirty Rhodes piano, muted brass stabs, analog tape noise.
Tempo: ${bpm} BPM, laid-back swing.
Production: analog tape compression, mono reverb plate, low-shelf warmth, mild saturation; no digital synths or trap.
Instrumental only, no vocals.`;
  }, [bpm, customPrompt, decade, style, useCustom]);

  const canGenerate = title.trim() && artists.trim() && (!useCustom || customPrompt.trim());

  const generate = async () => {
    setPhase("generating");
    setProgress(0);
    setLogs([]);
    setClips([]);
    setError(null);

    try {
      const response = await fetch("/api/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: generatedPrompt, title, artists }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "log") {
                setLogs((previous) => [...previous, data.message]);
              } else if (eventType === "progress") {
                setProgress(data.percent || 0);
              } else if (eventType === "complete") {
                setClips(
                  (data.assets || []).map((asset: Record<string, unknown>) => ({
                    id: String(asset.id),
                    title: String(asset.title),
                    artists: String(asset.artists),
                    assetId: String(asset.id),
                    duration:
                      typeof asset.duration === "number" ? asset.duration : undefined,
                  }))
                );
                setPhase("done");
              } else if (eventType === "error") {
                setError(data.message);
                setPhase("configure");
              }
            } catch {
              // Ignore malformed event payloads.
            }

            eventType = "";
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("configure");
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[rgba(212,168,83,0.16)] bg-[linear-gradient(135deg,rgba(160,28,18,0.24),rgba(18,12,8,0.98)_45%,rgba(212,168,83,0.08))] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_55%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-tape">Standalone Music Tool</p>
            <h1 className="mt-3 font-display text-4xl leading-none text-paper md:text-6xl">
              Generate fresh variations without running the full pipeline.
            </h1>
            <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-ash">
              Use the PIROS TAPE style presets for a quick brief, or switch to a custom prompt when you want full control over the Lyria request.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard label="Engine" value="Lyria 3" meta="Standalone generation" />
            <MetricCard label="Style" value={selectedStyle.name} meta={selectedStyle.decade} />
            <MetricCard label="Tempo" value={`${bpm} BPM`} meta={useCustom ? "Custom prompt enabled" : "Preset brief"} />
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
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Track Details</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Name The Session</h2>
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
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Style Direction</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Choose The Sonic Frame</h2>
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
                      setBpm(option.defaultBpm);
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Prompt Controls</p>
                <h2 className="mt-2 font-display text-3xl text-paper">Shape The Lyria Brief</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    BPM
                  </label>
                  <div className="rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-4">
                    <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-dust">
                      <span>Tempo</span>
                      <span>{bpm}</span>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={120}
                      value={bpm}
                      onChange={(event) => setBpm(Number(event.target.value))}
                      className="w-full accent-tape"
                    />
                  </div>
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

              <div className="mt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={(event) => setUseCustom(event.target.checked)}
                    className="accent-tape"
                  />
                  <span className="font-mono text-xs text-dust uppercase">Use custom prompt</span>
                </label>
              </div>

              {useCustom && (
                <textarea
                  value={customPrompt}
                  onChange={(event) => setCustomPrompt(event.target.value)}
                  rows={7}
                  placeholder="Enter your custom Lyria 3 prompt..."
                  className="mt-4 min-h-[180px] w-full resize-none rounded-[20px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-4 font-mono text-sm leading-6"
                />
              )}
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Preview</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Title</p>
                  <p className="mt-1 font-display text-2xl text-paper">{title || "Untitled session"}</p>
                  <p className="mt-1 font-body text-sm text-ash">{artists || "Artist line will appear here."}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InfoPill label="Style" value={selectedStyle.name} />
                  <InfoPill label="Decade" value={`${decade}s`} />
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Prompt</p>
                  <pre className="mt-2 max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-4 font-mono text-xs leading-6 text-ash">
                    {generatedPrompt || "Your prompt preview will appear here."}
                  </pre>
                </div>

                <button
                  onClick={generate}
                  disabled={!canGenerate}
                  className="btn-primary w-full"
                >
                  Generate Music
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
            <h2 className="mt-2 font-display text-3xl text-paper">Lyria Is Building Two Variations</h2>
            <div className="mt-6 rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-dust">Progress</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-paper">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-noir">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--tape),#f0d48e,var(--crimson))] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Live Log</p>
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-4 font-mono text-xs text-dust">
              {logs.length === 0 ? (
                <p>Waiting for generation events...</p>
              ) : (
                logs.map((message, index) => (
                  <div key={`${message}-${index}`} className="log-entry py-1">
                    {message}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {phase === "done" && (
        <div className="space-y-6">
          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Complete</p>
            <h2 className="mt-2 font-display text-3xl text-paper">Two Variations Are Ready</h2>
            <p className="mt-3 font-body text-base text-ash">
              The generated clips were saved into the asset library, so you can move into video assembly or reuse them later.
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {clips.map((clip, index) => (
              <article
                key={clip.id}
                className="rounded-[24px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tape">Variation {index + 1}</p>
                    <h3 className="mt-2 font-display text-2xl text-paper">{clip.title}</h3>
                    <p className="mt-1 font-body text-sm text-ash">{clip.artists}</p>
                  </div>
                  {clip.duration ? (
                    <span className="rounded-full border border-dust/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
                      {Math.round(clip.duration)}s
                    </span>
                  ) : null}
                </div>

                <audio
                  controls
                  className="w-full"
                  src={clip.assetId ? `/api/assets/${clip.assetId}?inline=1` : undefined}
                />
              </article>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => setPhase("configure")} className="btn-secondary">
              Generate Again
            </button>
            <Link href="/video" className="btn-secondary">
              Send to Video Tool
            </Link>
            <a href="/assets?type=song" className="btn-primary">
              View in Assets
            </a>
          </div>
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
