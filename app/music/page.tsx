"use client";

import { useState, useRef } from "react";
import { STYLE_OPTIONS, StyleName } from "@/lib/types";
import { buildSunoStyle } from "@/lib/prompts";

interface GeneratedClip {
  id: string;
  title: string;
  artists: string;
  assetId?: string;
  duration?: number;
  filePath?: string;
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

  const abortRef = useRef<AbortController | null>(null);

  const selectedStyle = STYLE_OPTIONS.find((s) => s.name === style);

  const generate = async () => {
    setPhase("generating");
    setProgress(0);
    setLogs([]);
    setClips([]);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const prompt = useCustom
      ? customPrompt
      : `Instruments: deep electric bass, dry acoustic drums, tight snare, brushed cymbals, rhythm guitar with wah, Hammond organ swells, dirty Rhodes piano, muted brass stabs, analog tape noise.\nTempo: ${bpm} BPM, laid-back swing.\nProduction: analog tape compression, mono reverb plate, low-shelf warmth, mild saturation; no digital synths or trap.`;

    const styleStr = useCustom
      ? customPrompt.slice(0, 50)
      : buildSunoStyle({ style, decade, bpm } as Parameters<typeof buildSunoStyle>[0]);

    try {
      const resp = await fetch("/api/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style: styleStr, title, artists }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Request failed: ${resp.status}`);
      }

      const reader = resp.body.getReader();
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
                setLogs((prev) => [...prev, data.message]);
              } else if (eventType === "progress") {
                setProgress(data.percent || 0);
              } else if (eventType === "complete") {
                setClips(
                  (data.assets || []).map((a: Record<string, unknown>) => ({
                    id: a.id,
                    title: a.title,
                    artists: a.artists,
                    assetId: a.id,
                    duration: a.duration,
                  }))
                );
                setPhase("done");
              } else if (eventType === "error") {
                setError(data.message);
                setPhase("configure");
              }
            } catch {
              // skip malformed JSON
            }
            eventType = "";
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("configure");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display italic text-3xl text-paper mb-2">Music Generation</h1>
        <p className="font-mono text-xs text-dust tracking-wide uppercase">
          Standalone Suno AI music generation — create tracks independently
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-crimson/30 bg-crimson/5 rounded">
          <p className="font-mono text-sm text-crimson">{error}</p>
        </div>
      )}

      {phase === "configure" && (
        <div className="space-y-6 animate-fade-in">
          {/* Track details */}
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

          {/* Style selection */}
          <div>
            <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-3">Style</label>
            <div className="grid grid-cols-3 gap-3">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => {
                    setStyle(opt.name);
                    setDecade(opt.decade.replace("s", ""));
                    setBpm(opt.defaultBpm);
                  }}
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

          {/* BPM */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">
                BPM: {bpm}
              </label>
              <input
                type="range"
                min={70}
                max={120}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-tape"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-dust uppercase tracking-wider block mb-2">Decade</label>
              <select value={decade} onChange={(e) => setDecade(e.target.value)} className="w-32">
                <option value="1960">1960s</option>
                <option value="1970">1970s</option>
              </select>
            </div>
          </div>

          {/* Custom prompt toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="accent-tape"
              />
              <span className="font-mono text-xs text-dust uppercase">Use custom prompt</span>
            </label>
            {useCustom && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={6}
                placeholder="Enter your custom Suno prompt..."
                className="w-full mt-3"
              />
            )}
          </div>

          <button
            onClick={generate}
            disabled={!title || !artists}
            className="btn-primary w-full"
          >
            Generate Music
          </button>
        </div>
      )}

      {phase === "generating" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 border border-tape/20 rounded bg-noir-2">
            <div className="flex justify-between items-center mb-4">
              <span className="font-mono text-sm text-tape uppercase">Generating...</span>
              <span className="font-mono text-sm text-dust">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-noir-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-tape transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="p-4 border border-dust/10 rounded bg-noir-3 max-h-60 overflow-y-auto font-mono text-xs text-dust space-y-1">
            {logs.map((msg, i) => (
              <div key={i} className="log-entry">{msg}</div>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-4 border border-tape/30 bg-tape/5 rounded">
            <p className="font-mono text-sm text-tape">Generation complete — {clips.length} variation(s) saved to assets.</p>
          </div>

          <div className="grid gap-4">
            {clips.map((clip, i) => (
              <div key={clip.id} className="p-4 border border-dust/20 rounded bg-noir-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-sm text-paper">Variation {i + 1}</span>
                  {clip.duration && (
                    <span className="font-mono text-xs text-dust">{Math.round(clip.duration)}s</span>
                  )}
                </div>
                <audio
                  controls
                  className="w-full"
                  src={clip.assetId ? `/api/assets/${clip.assetId}` : undefined}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPhase("configure")} className="btn-secondary flex-1">
              Generate Again
            </button>
            <a href="/assets?type=song" className="btn-primary flex-1 text-center">
              View in Assets
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
