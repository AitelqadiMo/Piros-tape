"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StyleCard from "@/components/StyleCard";
import { STYLE_OPTIONS, StyleOption } from "@/lib/types";
import { defaultMoodLines } from "@/lib/prompts";
import type { StyleName, ResearchCandidate } from "@/lib/types";

export default function StudioPage() {
  const router = useRouter();

  // Song input state
  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [releaseYear, setReleaseYear] = useState("");

  // Research state
  const [researchQuery, setResearchQuery] = useState("");
  const [candidates, setCandidates] = useState<ResearchCandidate[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState("");

  // Style state
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [budapestYear, setBudapestYear] = useState("");
  const [bpm, setBpm] = useState("");
  const [moodLine, setMoodLine] = useState("");

  // UI state
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleStyleSelect = (style: StyleOption) => {
    setSelectedStyle(style);
    setBudapestYear(String(style.defaultYear));
    setBpm(String(style.defaultBpm));
    const defaultMood = defaultMoodLines[style.name as StyleName].replace(
      "[YEAR]",
      String(style.defaultYear)
    );
    setMoodLine(defaultMood);
  };

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setResearching(true);
    setResearchError("");
    setCandidates([]);

    try {
      const resp = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setCandidates(data.candidates || []);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setResearching(false);
    }
  };

  const handleSelectCandidate = (candidate: ResearchCandidate) => {
    setTitle(candidate.title);
    setArtists(candidate.artists);
    const style = STYLE_OPTIONS.find((s) => s.name === candidate.style);
    if (style) {
      handleStyleSelect(style);
    }
    setBpm(String(candidate.bpm));
  };

  const buildPreviewPrompt = () => {
    if (!selectedStyle) return "";
    const mood = moodLine || defaultMoodLines[selectedStyle.name as StyleName].replace("[YEAR]", budapestYear);
    return `Genre: Dark 1960s Funk / Hungarian Rap Fusion
Instruments: deep electric bass, dry acoustic drums, tight snare, brushed cymbals, rhythm guitar with wah, Hammond organ swells, dirty Rhodes piano, muted brass stabs (trumpet, trombone, baritone sax), analog tape noise.
Tempo: ${bpm} BPM, laid-back swing.
Mood: ${mood}
Vocal style: raw Hungarian rap, close-mic delivery, overdriven tape tone, minimal reverb.
Arrangement: intro (bass riff + drums), verse (rhythm + sparse organ), chorus (full horns + accents), instrumental break (guitar + organ solo), outro fading into tape hiss.
Production: analog tape compression, mono reverb plate, low-shelf warmth, mild saturation; no digital synths or trap.
Keywords: vintage, noir funk, Budapest ${budapestYear}, smoky soul groove`;
  };

  const promptPreview = buildPreviewPrompt();
  const promptLength = promptPreview.length;

  const handleGenerate = async () => {
    if (!title || !artists || !selectedStyle || !budapestYear || !bpm) return;
    setCreating(true);

    try {
      const resp = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artists,
          style: selectedStyle.name,
          decade: selectedStyle.decade.replace("s", ""),
          bpm: Number(bpm),
          budapestYear: Number(budapestYear),
          moodLine,
          releaseYear: releaseYear || undefined,
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      router.push(`/studio/${data.jobId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create job");
      setCreating(false);
    }
  };

  const isValid = title && artists && selectedStyle && budapestYear && bpm;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-paper animate-fade-in">
        New Production
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column — Song Input */}
        <div className="space-y-6 animate-fade-in animate-delay-1">
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Song Details
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />

            <div className="space-y-3">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-1">
                  Song Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.toUpperCase())}
                  placeholder="SONG TITLE"
                  className="w-full"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-1">
                  Artists
                </label>
                <input
                  type="text"
                  value={artists}
                  onChange={(e) => setArtists(e.target.value)}
                  placeholder="Use × separator"
                  className="w-full"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-1">
                  Release Year
                  <span className="text-dust opacity-50 ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  placeholder="2024"
                  className="w-32"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Research Assistant
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />

            <textarea
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              placeholder='e.g. "Something political, 3+ artists, bittersweet"'
              className="w-full h-20 resize-none"
            />

            <button
              onClick={handleResearch}
              disabled={researching || !researchQuery.trim()}
              className="btn-secondary mt-3"
            >
              {researching ? "Searching..." : "Find Songs"}
            </button>

            {researchError && (
              <p className="font-mono text-xs text-crimson mt-2">{researchError}</p>
            )}

            {candidates.length > 0 && (
              <div className="space-y-3 mt-4">
                {candidates.map((c, i) => (
                  <div
                    key={i}
                    className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-4"
                    style={{ borderRadius: "2px" }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wider text-paper">
                          {c.title}
                        </p>
                        <p className="font-body text-sm text-ash mt-1">{c.artists}</p>
                      </div>
                      <span
                        className="font-mono text-[10px] uppercase bg-crimson text-paper px-2 py-0.5 shrink-0"
                        style={{ borderRadius: "2px" }}
                      >
                        {c.style}
                      </span>
                    </div>
                    <p className="font-body italic text-sm text-dust mt-2">
                      {c.reasoning}
                    </p>
                    <button
                      onClick={() => handleSelectCandidate(c)}
                      className="font-mono text-[11px] text-tape hover:text-paper uppercase mt-3 transition-colors"
                    >
                      Select This Track →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column — Style Configuration */}
        <div className="space-y-6 animate-fade-in animate-delay-2">
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Era & Style
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />

            <div className="grid grid-cols-2 gap-3">
              {STYLE_OPTIONS.map((style) => (
                <StyleCard
                  key={style.name}
                  style={style}
                  selected={selectedStyle?.name === style.name}
                  onClick={() => handleStyleSelect(style)}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Budapest Year
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />
            <input
              type="text"
              value={budapestYear}
              onChange={(e) => setBudapestYear(e.target.value)}
              placeholder="1974"
              className="w-32"
            />
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              BPM
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="90"
              className="w-32"
            />
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Mood Line
              <span className="text-dust opacity-50 ml-2 normal-case tracking-normal">
                (the only thing that changes per track)
              </span>
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />
            <textarea
              value={moodLine}
              onChange={(e) => setMoodLine(e.target.value.slice(0, 120))}
              placeholder="Auto-populated when style is selected"
              className="w-full h-12 resize-none"
              maxLength={120}
            />
            <p className={`font-mono text-[10px] text-right mt-1 ${moodLine.length > 100 ? "text-crimson" : "text-dust"}`}>
              {moodLine.length} / 120
            </p>
          </section>
        </div>
      </div>

      {/* Bottom — Generation Controls */}
      <div className="space-y-4 animate-fade-in animate-delay-3">
        <button
          onClick={() => setShowPromptPreview(!showPromptPreview)}
          className="font-mono text-[11px] text-tape hover:text-paper uppercase tracking-wider transition-colors"
        >
          {showPromptPreview ? "▾ Hide" : "▸ Show"} Suno Prompt Preview
        </button>

        {showPromptPreview && promptPreview && (
          <div
            className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-4"
            style={{ borderRadius: "2px" }}
          >
            <pre className="font-mono text-xs text-ash whitespace-pre-wrap">
              {promptPreview}
            </pre>
            <p className={`font-mono text-[10px] text-right mt-2 ${promptLength > 950 ? "text-crimson" : "text-dust"}`}>
              {promptLength} / 950
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!isValid || creating}
          className="btn-primary w-full py-4 text-sm"
        >
          {creating ? "Creating..." : "▶ Generate Track"}
        </button>
      </div>
    </div>
  );
}
