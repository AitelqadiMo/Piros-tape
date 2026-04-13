"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StyleCard from "@/components/StyleCard";
import { defaultMoodLines } from "@/lib/prompts";
import { STYLE_OPTIONS, StyleOption } from "@/lib/types";
import type { GenerationEngine, ResearchCandidate, SavedResearchSuggestion, StyleName } from "@/lib/types";

type WizardStep = "discover" | "verify" | "configure";

const STEP_META: Array<{
  key: WizardStep;
  label: string;
  title: string;
  description: string;
}> = [
  {
    key: "discover",
    label: "01",
    title: "Discover The Source",
    description: "Search with AI or type the record manually.",
  },
  {
    key: "verify",
    label: "02",
    title: "Verify The Material",
    description: "Confirm the track identity and lyric context.",
  },
  {
    key: "configure",
    label: "03",
    title: "Shape The Session",
    description: "Define the era, mood, and production brief.",
  },
];

function buildPromptPreview(
  selectedStyle: StyleOption | null,
  moodLine: string,
  budapestYear: string,
  bpm: string,
  lyrics: string | null
) {
  if (!selectedStyle) return "";
  const mood =
    moodLine || defaultMoodLines[selectedStyle.name as StyleName].replace("[YEAR]", budapestYear);

  const vocalSection = lyrics?.trim()
    ? `Vocal direction: derive an original Hungarian vocal from the source lyrics, preserving the themes and emotional arc without quoting the text verbatim.
Source lyrics attached for inspiration: yes`
    : "Vocal direction: write and perform original Hungarian vocals that match the mood and title. Do not make it instrumental.";

  return `Genre: Dark 1960s Funk / Hungarian Rap Fusion
Instruments: deep electric bass, dry acoustic drums, tight snare, brushed cymbals, rhythm guitar with wah, Hammond organ swells, dirty Rhodes piano, muted brass stabs (trumpet, trombone, baritone sax), analog tape noise.
Tempo: ${bpm} BPM, laid-back swing.
Mood: ${mood}
${vocalSection}
Vocal style: raw Hungarian rap, close-mic delivery, overdriven tape tone, minimal reverb.
Arrangement: intro (bass riff + drums), verse (rhythm + sparse organ), chorus (full horns + accents), instrumental break (guitar + organ solo), outro fading into tape hiss.
Production: analog tape compression, mono reverb plate, low-shelf warmth, mild saturation; no digital synths or trap.
Keywords: vintage, noir funk, Budapest ${budapestYear}, smoky soul groove`;
}

export default function StudioPage() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>("discover");

  const [researchQuery, setResearchQuery] = useState("");
  const [candidates, setCandidates] = useState<ResearchCandidate[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtists, setManualArtists] = useState("");
  const [generationEngine, setGenerationEngine] = useState<GenerationEngine>("lyria");
  const [savedSuggestions, setSavedSuggestions] = useState<SavedResearchSuggestion[]>([]);

  const [title, setTitle] = useState("");
  const [artists, setArtists] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<ResearchCandidate | null>(null);

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsFound, setLyricsFound] = useState(false);

  const [releaseYear, setReleaseYear] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [budapestYear, setBudapestYear] = useState("");
  const [bpm, setBpm] = useState("");
  const [moodLine, setMoodLine] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(true);
  const [creating, setCreating] = useState(false);

  const stepIndex = STEP_META.findIndex((item) => item.key === step);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/research", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { suggestions?: SavedResearchSuggestion[] };
        setSavedSuggestions(data.suggestions || []);
      } catch {
        // Ignore saved suggestion load failures on initial render.
      }
    })();
  }, []);

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;

    setResearching(true);
    setResearchError("");
    setCandidates([]);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCandidates(data.candidates || []);
      setSavedSuggestions(data.suggestions || []);
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : String(error));
    } finally {
      setResearching(false);
    }
  };

  const fetchLyricsForSong = async (songTitle: string, songArtists: string) => {
    setLyricsLoading(true);
    try {
      const response = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: songTitle, artist: songArtists }),
      });
      const data = await response.json();
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

  const goToVerify = (nextTitle: string, nextArtists: string, candidate?: ResearchCandidate) => {
    setTitle(nextTitle.toUpperCase());
    setArtists(nextArtists);
    setSelectedCandidate(candidate ?? null);

    if (candidate) {
      const style = STYLE_OPTIONS.find((option) => option.name === candidate.style);
      if (style) {
        setSelectedStyle(style);
        setBudapestYear(String(style.defaultYear));
        setBpm(String(candidate.bpm));
        setMoodLine(
          defaultMoodLines[style.name as StyleName].replace("[YEAR]", String(style.defaultYear))
        );
      }
    }

    setLyrics(null);
    setLyricsFound(false);
    setStep("verify");
    fetchLyricsForSong(nextTitle, nextArtists);
  };

  const handleStyleSelect = (style: StyleOption) => {
    setSelectedStyle(style);
    setBudapestYear(String(style.defaultYear));
    if (!bpm || (selectedCandidate && String(selectedCandidate.bpm) !== bpm)) {
      setBpm(String(style.defaultBpm));
    }
    setMoodLine(
      defaultMoodLines[style.name as StyleName].replace("[YEAR]", String(style.defaultYear))
    );
  };

  const handleGenerate = async () => {
    if (!title || !artists || !selectedStyle || !budapestYear || !bpm) return;

    setCreating(true);
    try {
      const response = await fetch("/api/jobs", {
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
          generationEngine,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      router.push(`/studio/${data.jobId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create job");
      setCreating(false);
    }
  };

  const promptPreview = buildPromptPreview(selectedStyle, moodLine, budapestYear, bpm, lyrics);
  const promptLength = promptPreview.length;
  const configValid = Boolean(title && artists && selectedStyle && budapestYear && bpm);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[rgba(212,168,83,0.16)] bg-[linear-gradient(135deg,rgba(160,28,18,0.3),rgba(18,12,8,0.98)_44%,rgba(212,168,83,0.08))] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_55%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-tape">
              Piros Tape Studio
            </p>
            <h1 className="mt-3 font-display text-4xl leading-none text-paper md:text-6xl">
              Build A Better Session Flow
            </h1>
            <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-ash">
              Find the source track, verify the lyrical context, and launch a generation run with a production brief that stays visible the whole time.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Track</p>
              <p className="mt-2 font-display text-2xl text-paper">{title || "Not chosen"}</p>
            </div>
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Lyrics</p>
              <p className={`mt-2 font-display text-2xl ${lyricsLoading ? "text-paper" : lyricsFound ? "text-tape" : "text-dust"}`}>
                {lyricsLoading ? "Checking" : lyricsFound ? "Found" : "Optional"}
              </p>
            </div>
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Engine</p>
              <p className="mt-2 font-display text-2xl text-paper">{generationEngine === "lyria" ? "Lyria" : "Suno"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
          <div className="grid gap-3 md:grid-cols-3">
            {STEP_META.map((item, index) => {
              const active = item.key === step;
              const done = index < stepIndex;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (index <= stepIndex) setStep(item.key);
                  }}
                  disabled={index > stepIndex}
                  className={`rounded-[20px] border px-4 py-4 text-left transition-all ${
                    active
                      ? "border-[rgba(212,168,83,0.3)] bg-[rgba(160,28,18,0.12)]"
                      : done
                        ? "border-[rgba(212,168,83,0.18)] bg-noir-3/70"
                        : "border-[rgba(212,168,83,0.08)] bg-noir-3/30 opacity-60"
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tape">
                    {done ? "Done" : item.label}
                  </p>
                  <h2 className="mt-2 font-display text-xl text-paper">{item.title}</h2>
                  <p className="mt-2 font-body text-sm leading-6 text-dust">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)] xl:sticky xl:top-6 xl:self-start">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Session Brief</p>
          <div className="mt-4 space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Track</p>
              <p className="mt-1 font-display text-2xl text-paper">{title || "Choose a source"}</p>
              <p className="mt-1 font-body text-sm text-ash">{artists || "Artist line will appear here."}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Style</p>
                <p className="mt-1 font-mono text-sm text-paper">{selectedStyle?.name || "—"}</p>
              </div>
              <div className="rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">BPM</p>
                <p className="mt-1 font-mono text-sm text-paper">{bpm || "—"}</p>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Lyrics Context</p>
              <p className="mt-2 font-body text-sm leading-6 text-ash">
                {lyricsLoading
                  ? "Checking lyric availability now."
                  : lyricsFound
                    ? "Lyrics were found and will be included in the generation brief."
                    : "No lyrics attached yet. The session can still proceed."}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Mood</p>
              <p className="mt-2 font-body text-sm leading-6 text-ash">
                {moodLine || "Pick a style to auto-fill the emotional direction."}
              </p>
            </div>
          </div>
        </aside>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          {step === "discover" && (
            <>
              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Generation Engine</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">Choose The Music Model</h2>
                  </div>
                  <p className="max-w-md font-body text-sm leading-6 text-dust">
                    Lyria is the richer vocal path for the current workflow. Suno is available as an alternate music engine for step 1.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setGenerationEngine("lyria")}
                    className={`rounded-[22px] border p-5 text-left transition ${
                      generationEngine === "lyria"
                        ? "border-[rgba(212,168,83,0.32)] bg-[rgba(160,28,18,0.12)]"
                        : "border-[rgba(212,168,83,0.12)] bg-noir-3/70"
                    }`}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tape">Recommended</p>
                    <h3 className="mt-2 font-display text-2xl text-paper">Lyria 3</h3>
                    <p className="mt-2 font-body text-sm leading-6 text-ash">
                      Stronger vocal generation in the current pipeline. Best choice when you want lyric-informed output.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerationEngine("suno")}
                    className={`rounded-[22px] border p-5 text-left transition ${
                      generationEngine === "suno"
                        ? "border-[rgba(212,168,83,0.32)] bg-[rgba(160,28,18,0.12)]"
                        : "border-[rgba(212,168,83,0.12)] bg-noir-3/70"
                    }`}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tape">Alternate Engine</p>
                    <h3 className="mt-2 font-display text-2xl text-paper">Suno V4.5</h3>
                    <p className="mt-2 font-body text-sm leading-6 text-ash">
                      Uses the same studio brief but runs the music step through Suno before returning to the normal review flow.
                    </p>
                  </button>
                </div>
              </section>

              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">AI Research</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">Describe The Record You Want</h2>
                  </div>
                  <p className="max-w-md font-body text-sm leading-6 text-dust">
                    Search by mood, artist mix, energy, or era. The assistant will return three candidate tracks tuned to the PIROS TAPE palette.
                  </p>
                </div>

                <textarea
                  value={researchQuery}
                  onChange={(event) => setResearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleResearch();
                    }
                  }}
                  placeholder='Try "political posse cut, bittersweet, 1970s soul energy" or "Azahriah collaboration, warmer and more danceable".'
                  className="min-h-[124px] w-full resize-none rounded-[20px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-4 font-mono text-sm leading-6"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button onClick={handleResearch} disabled={researching || !researchQuery.trim()} className="btn-primary">
                    {researching ? "Searching..." : "Find candidates"}
                  </button>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                    {researching ? "Gemini is building options" : "Press Enter to search"}
                  </span>
                </div>

                {researchError && (
                  <p className="mt-4 rounded-[18px] border border-crimson/50 bg-[rgba(160,28,18,0.08)] px-4 py-3 font-body text-sm text-ash">
                    {researchError}
                  </p>
                )}
              </section>

              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Manual Entry</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">Know The Track Already?</h2>
                  </div>
                  <p className="max-w-md font-body text-sm leading-6 text-dust">
                    Skip the search and move straight into verification. This is useful when you already know the source material.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                      Song Title
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(event) => setManualTitle(event.target.value)}
                      placeholder="KRÚBI INTERJÚ"
                      className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                      Artists
                    </label>
                    <input
                      type="text"
                      value={manualArtists}
                      onChange={(event) => setManualArtists(event.target.value)}
                      placeholder="Use × between artists"
                      className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                    />
                  </div>
                </div>

                <button
                  onClick={() => goToVerify(manualTitle, manualArtists)}
                  disabled={!manualTitle.trim() || !manualArtists.trim()}
                  className="btn-secondary mt-4"
                >
                  Continue to verification
                </button>
              </section>

              {candidates.length > 0 && (
                <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Shortlist</p>
                      <h2 className="mt-2 font-display text-3xl text-paper">Pick The Best Seed Track</h2>
                    </div>
                    <p className="max-w-md font-body text-sm leading-6 text-dust">
                      Each suggestion includes a proposed style direction so you can move into configuration faster.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {candidates.map((candidate, index) => (
                      <article
                        key={`${candidate.title}-${candidate.artists}-${index}`}
                        className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-5 transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-2xl">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tape">
                              Candidate {index + 1}
                            </p>
                            <h3 className="mt-2 font-display text-2xl text-paper">{candidate.title}</h3>
                            <p className="mt-1 font-body text-base text-ash">{candidate.artists}</p>
                            <p className="mt-3 font-body text-sm leading-7 text-dust">{candidate.reasoning}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
                              {candidate.style}
                            </span>
                            <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                              {candidate.decade}s
                            </span>
                            <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                              {candidate.bpm} BPM
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button onClick={() => goToVerify(candidate.title, candidate.artists, candidate)} className="btn-primary">
                            Use this track
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {savedSuggestions.length > 0 && (
                <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Saved Suggestions</p>
                      <h2 className="mt-2 font-display text-3xl text-paper">Reusable Shortlist</h2>
                    </div>
                    <p className="max-w-md font-body text-sm leading-6 text-dust">
                      Previous research results are saved locally, so you can jump back into promising ideas without running a new search.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {savedSuggestions.slice(0, 8).map((candidate) => (
                      <article
                        key={candidate.id}
                        className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-2xl">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tape">
                              Saved {candidate.query ? `• ${candidate.query}` : ""}
                            </p>
                            <h3 className="mt-2 font-display text-2xl text-paper">{candidate.title}</h3>
                            <p className="mt-1 font-body text-base text-ash">{candidate.artists}</p>
                            <p className="mt-3 font-body text-sm leading-7 text-dust">{candidate.reasoning}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
                              {candidate.style}
                            </span>
                            <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                              {candidate.decade}s
                            </span>
                            <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                              {candidate.bpm} BPM
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button onClick={() => goToVerify(candidate.title, candidate.artists, candidate)} className="btn-secondary">
                            Use saved suggestion
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {step === "verify" && (
            <>
              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Selected Source</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">Verify The Track Identity</h2>
                  </div>
                  {selectedCandidate && (
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
                        {selectedCandidate.style}
                      </span>
                      <span className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                        {selectedCandidate.decade}s
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-5">
                  <h3 className="font-display text-3xl text-paper">{title}</h3>
                  <p className="mt-2 font-body text-lg text-ash">{artists}</p>
                </div>
              </section>

              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Lyrics Context</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">Check What We Can Carry Into The Brief</h2>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${lyricsLoading ? "border-[rgba(237,232,226,0.12)] text-paper" : lyricsFound ? "border-[rgba(212,168,83,0.18)] text-tape" : "border-[rgba(212,168,83,0.12)] text-dust"}`}>
                    {lyricsLoading ? "Searching" : lyricsFound ? "Lyrics found" : "Optional"}
                  </span>
                </div>

                {lyricsLoading && (
                  <div className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-5 py-6">
                    <p className="font-body text-base text-ash">Searching for lyric context now...</p>
                  </div>
                )}

                {!lyricsLoading && lyricsFound && lyrics && (
                  <div className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-5">
                    <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap font-body text-sm leading-7 text-ash">
                      {lyrics}
                    </pre>
                  </div>
                )}

                {!lyricsLoading && !lyricsFound && (
                  <div className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-5 py-6">
                    <p className="font-body text-base leading-7 text-ash">
                      No lyrics were found for this track. That is fine: the generation brief will rely on the title, artist, style, and mood direction.
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => setStep("discover")} className="btn-secondary">
                    Back to discovery
                  </button>
                  <button onClick={() => setStep("configure")} disabled={lyricsLoading} className="btn-primary">
                    Continue to configuration
                  </button>
                </div>
              </section>
            </>
          )}

          {step === "configure" && (
            <>
              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Style Direction</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">Choose The Sonic Frame</h2>
                  </div>
                  <p className="max-w-md font-body text-sm leading-6 text-dust">
                    The style presets define the era cues, mood defaults, and the production vocabulary sent to Lyria 3.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
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

              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Production Settings</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">Dial In The Era Details</h2>
                  </div>
                  <p className="max-w-md font-body text-sm leading-6 text-dust">
                    These values feed the prompt builder and help keep the session internally consistent.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                      Budapest Year
                    </label>
                    <input
                      type="text"
                      value={budapestYear}
                      onChange={(event) => setBudapestYear(event.target.value)}
                      placeholder="1974"
                      className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                      BPM
                    </label>
                    <input
                      type="number"
                      value={bpm}
                      onChange={(event) => setBpm(event.target.value)}
                      placeholder="90"
                      className="w-full rounded-[18px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
                      Release Year
                    </label>
                    <input
                      type="text"
                      value={releaseYear}
                      onChange={(event) => setReleaseYear(event.target.value)}
                      placeholder="2024"
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
                    onChange={(event) => setMoodLine(event.target.value.slice(0, 120))}
                    placeholder="Pick a style to prefill this line."
                    maxLength={120}
                    className="min-h-[94px] w-full resize-none rounded-[20px] border border-[rgba(212,168,83,0.15)] bg-noir-3/80 px-4 py-4 font-mono text-sm leading-6"
                  />
                  <p className={`mt-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] ${moodLine.length > 100 ? "text-crimson" : "text-dust"}`}>
                    {moodLine.length} / 120
                  </p>
                </div>
              </section>

              <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Prompt Preview</p>
                    <h2 className="mt-2 font-display text-3xl text-paper">See The Brief Before Launch</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptPreview((current) => !current)}
                    className="rounded-full border border-[rgba(212,168,83,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-tape transition-colors hover:text-paper"
                  >
                    {showPromptPreview ? "Hide preview" : "Show preview"}
                  </button>
                </div>

                {showPromptPreview && promptPreview && (
                  <div className="rounded-[22px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-5">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-ash">
                      {promptPreview}
                    </pre>
                    <p className={`mt-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] ${promptLength > 950 ? "text-crimson" : "text-dust"}`}>
                      {promptLength} / 950
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => setStep("verify")} className="btn-secondary">
                    Back to verification
                  </button>
                  <button onClick={handleGenerate} disabled={!configValid || creating} className="btn-primary">
                    {creating ? "Creating session..." : "Launch production"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Launch Checklist</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Source selected</span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${title ? "text-tape" : "text-dust"}`}>
                  {title ? "Ready" : "Missing"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Lyrics context</span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${lyricsFound ? "text-tape" : "text-dust"}`}>
                  {lyricsFound ? "Attached" : "Optional"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Style set</span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${selectedStyle ? "text-tape" : "text-dust"}`}>
                  {selectedStyle ? "Ready" : "Missing"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Engine</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-tape">
                  {generationEngine}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">What Happens Next</p>
            <div className="mt-4 space-y-4 font-body text-sm leading-7 text-ash">
              <p>1. Lyria 3 generates two candidate vocal takes from your brief and attached lyrics.</p>
              <p>2. You choose the winning take and review the thumbnail concept.</p>
              <p>3. The system composites branding, renders video, and writes metadata.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
