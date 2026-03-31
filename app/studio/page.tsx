"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StyleCard from "@/components/StyleCard";
import { STYLE_OPTIONS, StyleOption } from "@/lib/types";
import { defaultMoodLines } from "@/lib/prompts";
import type { StyleName, ResearchCandidate } from "@/lib/types";

type WizardStep = "discover" | "verify" | "configure";

export default function StudioPage() {
  const router = useRouter();

  // Wizard step
  const [step, setStep] = useState<WizardStep>("discover");

  // Discover step state
  const [researchQuery, setResearchQuery] = useState("");
  const [candidates, setCandidates] = useState<ResearchCandidate[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtists, setManualArtists] = useState("");

  // Verified song state (set when a candidate or manual entry is confirmed)
  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<ResearchCandidate | null>(null);

  // Verify step state
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsFound, setLyricsFound] = useState(false);

  // Configure step state
  const [releaseYear, setReleaseYear] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [budapestYear, setBudapestYear] = useState("");
  const [bpm, setBpm] = useState("");
  const [moodLine, setMoodLine] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  // ── DISCOVER helpers ─────────────────────────────────────────────────────

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

  const goToVerify = (t: string, a: string, candidate?: ResearchCandidate) => {
    setTitle(t.toUpperCase());
    setArtists(a);
    setSelectedCandidate(candidate ?? null);

    // Pre-fill style if candidate has one
    if (candidate) {
      const style = STYLE_OPTIONS.find((s) => s.name === candidate.style);
      if (style) {
        setSelectedStyle(style);
        setBudapestYear(String(style.defaultYear));
        setBpm(String(candidate.bpm));
        const mood = defaultMoodLines[style.name as StyleName].replace(
          "[YEAR]",
          String(style.defaultYear)
        );
        setMoodLine(mood);
      }
    }

    setLyrics(null);
    setLyricsFound(false);
    setStep("verify");
    fetchLyricsForSong(t, a);
  };

  // ── VERIFY helpers ───────────────────────────────────────────────────────

  const fetchLyricsForSong = async (songTitle: string, songArtists: string) => {
    setLyricsLoading(true);
    try {
      const resp = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: songTitle, artist: songArtists }),
      });
      const data = await resp.json();
      if (data.found && data.lyrics) {
        setLyrics(data.lyrics);
        setLyricsFound(true);
      } else {
        setLyrics(null);
        setLyricsFound(false);
      }
    } catch {
      setLyrics(null);
      setLyricsFound(false);
    } finally {
      setLyricsLoading(false);
    }
  };

  // ── CONFIGURE helpers ────────────────────────────────────────────────────

  const handleStyleSelect = (style: StyleOption) => {
    setSelectedStyle(style);
    setBudapestYear(String(style.defaultYear));
    if (!bpm || (selectedCandidate && String(selectedCandidate.bpm) !== bpm)) {
      setBpm(String(style.defaultBpm));
    }
    const defaultMood = defaultMoodLines[style.name as StyleName].replace(
      "[YEAR]",
      String(style.defaultYear)
    );
    setMoodLine(defaultMood);
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
          lyrics: lyrics || undefined,
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

  const isConfigValid = title && artists && selectedStyle && budapestYear && bpm;

  // ── STEP INDICATOR ───────────────────────────────────────────────────────

  const steps: { key: WizardStep; label: string }[] = [
    { key: "discover", label: "DISCOVER" },
    { key: "verify", label: "VERIFY" },
    { key: "configure", label: "CONFIGURE" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Page title */}
      <h1 className="font-display text-2xl text-paper animate-fade-in">New Production</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-0 animate-fade-in">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className="flex items-center gap-2 cursor-default"
              style={{ opacity: i > stepIndex ? 0.35 : 1 }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px]"
                style={{
                  background: i < stepIndex ? "var(--tape)" : i === stepIndex ? "var(--crimson)" : "var(--noir-3)",
                  color: i <= stepIndex ? "var(--paper)" : "var(--dust)",
                }}
              >
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <span
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: i === stepIndex ? "var(--paper)" : "var(--dust)" }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="mx-3 h-[1px] w-12"
                style={{ background: i < stepIndex ? "var(--tape)" : "var(--noir-3)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: DISCOVER ── */}
      {step === "discover" && (
        <div className="space-y-8 animate-fade-in">
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              What are you looking for?
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />

            <textarea
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleResearch();
                }
              }}
              placeholder='e.g. "Something political with 3+ artists, bittersweet mood" or "Azahriah collab, upbeat"'
              className="w-full h-24 resize-none"
            />

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleResearch}
                disabled={researching || !researchQuery.trim()}
                className="btn-primary"
              >
                {researching ? "Searching..." : "Find Songs"}
              </button>
              {researching && (
                <span className="font-mono text-[11px] text-dust animate-pulse-opacity">
                  AI is searching...
                </span>
              )}
            </div>

            {researchError && (
              <p className="font-mono text-xs text-crimson mt-3">{researchError}</p>
            )}
          </section>

          {/* AI Suggestions */}
          {candidates.length > 0 && (
            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
                AI Suggestions — pick one
              </h2>
              <div className="h-[1px] bg-noir-3 mb-4" />
              <div className="space-y-3">
                {candidates.map((c, i) => (
                  <div
                    key={i}
                    className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-4"
                    style={{ borderRadius: "2px" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-mono text-xs uppercase tracking-wider text-paper">
                          {c.title}
                        </p>
                        <p className="font-body text-sm text-ash mt-0.5">{c.artists}</p>
                        <p className="font-body italic text-sm text-dust mt-2 leading-snug">
                          {c.reasoning}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span
                          className="font-mono text-[10px] uppercase bg-crimson text-paper px-2 py-0.5"
                          style={{ borderRadius: "2px" }}
                        >
                          {c.style}
                        </span>
                        <span className="font-mono text-[10px] text-dust">{c.decade} · {c.bpm} BPM</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-noir-3">
                      <button
                        onClick={() => goToVerify(c.title, c.artists, c)}
                        className="btn-primary text-xs py-1.5 px-4"
                      >
                        Select This Track →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Manual entry */}
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Or enter manually
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="font-mono text-[10px] uppercase tracking-wider text-dust block mb-1">
                  Song Title
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="SONG TITLE"
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-48">
                <label className="font-mono text-[10px] uppercase tracking-wider text-dust block mb-1">
                  Artists
                </label>
                <input
                  type="text"
                  value={manualArtists}
                  onChange={(e) => setManualArtists(e.target.value)}
                  placeholder="Use × separator"
                  className="w-full"
                />
              </div>
            </div>
            <button
              onClick={() => goToVerify(manualTitle, manualArtists)}
              disabled={!manualTitle.trim() || !manualArtists.trim()}
              className="btn-secondary mt-3"
            >
              Continue →
            </button>
          </section>
        </div>
      )}

      {/* ── STEP 2: VERIFY ── */}
      {step === "verify" && (
        <div className="space-y-8 animate-fade-in">
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Track Found
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />

            <div
              className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-5"
              style={{ borderRadius: "2px" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl text-paper leading-tight">{title}</p>
                  <p className="font-body text-base text-ash mt-1">{artists}</p>
                </div>
                {selectedCandidate && (
                  <div className="shrink-0 text-right">
                    <span
                      className="font-mono text-[10px] uppercase bg-crimson text-paper px-2 py-0.5 block"
                      style={{ borderRadius: "2px" }}
                    >
                      {selectedCandidate.style}
                    </span>
                    <span className="font-mono text-[10px] text-dust mt-1 block">
                      {selectedCandidate.decade} · {selectedCandidate.bpm} BPM
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Lyrics
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />

            {lyricsLoading && (
              <div className="flex items-center gap-2 py-6">
                <span className="font-mono text-xs text-dust animate-pulse-opacity">
                  Searching for lyrics...
                </span>
              </div>
            )}

            {!lyricsLoading && lyricsFound && lyrics && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="font-mono text-[10px] uppercase px-2 py-0.5 text-paper"
                    style={{ background: "var(--tape-dim)", borderRadius: "2px" }}
                  >
                    ✓ Lyrics Found
                  </span>
                </div>
                <div
                  className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-4 max-h-72 overflow-y-auto"
                  style={{ borderRadius: "2px" }}
                >
                  <pre className="font-body text-sm text-ash whitespace-pre-wrap leading-relaxed">
                    {lyrics}
                  </pre>
                </div>
              </div>
            )}

            {!lyricsLoading && !lyricsFound && (
              <div className="py-4">
                <p className="font-mono text-xs text-dust">
                  Lyrics not found — you can still proceed. The track will be generated without lyrics context.
                </p>
              </div>
            )}
          </section>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStep("discover")}
              className="btn-secondary"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep("configure")}
              disabled={lyricsLoading}
              className="btn-primary"
            >
              Continue to Configure →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: CONFIGURE ── */}
      {step === "configure" && (
        <div className="space-y-8 animate-fade-in">
          {/* Selected track summary */}
          <div
            className="flex items-center gap-3 p-3 bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)]"
            style={{ borderRadius: "2px" }}
          >
            <div className="min-w-0">
              <span className="font-mono text-[10px] text-dust uppercase tracking-wider">Track — </span>
              <span className="font-mono text-xs text-paper">{title}</span>
              <span className="font-mono text-xs text-dust"> / {artists}</span>
            </div>
            {lyricsFound && (
              <span
                className="font-mono text-[10px] uppercase px-2 py-0.5 text-paper shrink-0"
                style={{ background: "var(--tape-dim)", borderRadius: "2px" }}
              >
                Lyrics ✓
              </span>
            )}
          </div>

          {/* Era & Style */}
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

          {/* Parameters */}
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Parameters
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-dust block mb-1">
                  Budapest Year
                </label>
                <input
                  type="text"
                  value={budapestYear}
                  onChange={(e) => setBudapestYear(e.target.value)}
                  placeholder="1974"
                  className="w-full"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-dust block mb-1">
                  BPM
                </label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder="90"
                  className="w-full"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-dust block mb-1">
                  Release Year
                  <span className="text-dust opacity-50 ml-1">(opt)</span>
                </label>
                <input
                  type="text"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  placeholder="2024"
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Mood Line */}
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
              Mood Line
              <span className="text-dust opacity-50 ml-2 normal-case tracking-normal text-[10px]">
                (shapes the Suno prompt)
              </span>
            </h2>
            <div className="h-[1px] bg-noir-3 mb-4" />
            <textarea
              value={moodLine}
              onChange={(e) => setMoodLine(e.target.value.slice(0, 120))}
              placeholder="Auto-populated when a style is selected"
              className="w-full h-12 resize-none"
              maxLength={120}
            />
            <p
              className={`font-mono text-[10px] text-right mt-1 ${moodLine.length > 100 ? "text-crimson" : "text-dust"}`}
            >
              {moodLine.length} / 120
            </p>
          </section>

          {/* Prompt preview */}
          <div>
            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="font-mono text-[11px] text-tape hover:text-paper uppercase tracking-wider transition-colors"
            >
              {showPromptPreview ? "▾ Hide" : "▸ Show"} Suno Prompt Preview
            </button>

            {showPromptPreview && promptPreview && (
              <div
                className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-4 mt-3"
                style={{ borderRadius: "2px" }}
              >
                <pre className="font-mono text-xs text-ash whitespace-pre-wrap">
                  {promptPreview}
                </pre>
                <p
                  className={`font-mono text-[10px] text-right mt-2 ${promptLength > 950 ? "text-crimson" : "text-dust"}`}
                >
                  {promptLength} / 950
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => setStep("verify")} className="btn-secondary">
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!isConfigValid || creating}
              className="btn-primary flex-1 py-4 text-sm"
            >
              {creating ? "Creating job..." : "▶ Generate Track"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
