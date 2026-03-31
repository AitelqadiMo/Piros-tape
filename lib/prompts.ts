import { Job, StyleName } from "./types";

export const defaultMoodLines: Record<StyleName, string> = {
  "Funk Noir": "dark, cinematic, urban night — smoky basement club in Budapest, [YEAR]",
  "Cold War Funk Noir": "paranoid, political, apocalyptic — a government broadcast from a collapsing empire, Budapest [YEAR]",
  "Political Soul": "bittersweet, isolated, melancholic — a musician who won everything and feels nothing, Budapest [YEAR]",
  "Funk Soul": "warm, alive, nostalgic — a crowded dance floor on a summer night, Budapest [YEAR]",
  "Cinematic Soul Funk": "fatalistic, cinematic, slow-burning — a man walking home alone through Pest at midnight, Budapest [YEAR]",
  "Upbeat Cinematic Soul Funk": "euphoric, danceable, electric — a rooftop party above the city, Budapest [YEAR]",
};

const imageMoodSentences: Record<StyleName, string> = {
  "Funk Noir": "The mood is tense and nocturnal — cigarette smoke barely visible in the light.",
  "Cold War Funk Noir": "The mood is paranoid and formal — a press photograph from a regime that smiles only for cameras.",
  "Political Soul": "The mood is mournful and dignified — as if they have just returned from a funeral.",
  "Funk Soul": "The mood is warm and alive — a quiet pride, not quite smiling.",
  "Cinematic Soul Funk": "The mood is heavy with fatalism — one last photograph before something ends.",
  "Upbeat Cinematic Soul Funk": "The mood is electric and celebratory — a last great night before the city changes.",
};

/**
 * Style string for sunoapi.org custom mode (concise, describes the sonic palette).
 */
export function buildSunoStyle(job: Job): string {
  const base: Record<string, string> = {
    "Funk Noir": "dark noir funk, gritty soul, minor key, smoky",
    "Cold War Funk Noir": "cold war spy funk, paranoid soul, Eastern European, political",
    "Political Soul": "bittersweet soul, melancholic funk, cinematic, isolated",
    "Funk Soul": "warm funk soul, nostalgic, melodic, joyful groove",
    "Cinematic Soul Funk": "cinematic soul funk, fatalistic, atmospheric, slow-burn",
    "Upbeat Cinematic Soul Funk": "upbeat soul funk, euphoric, danceable, celebratory",
  };
  const descriptor = base[job.style] || "vintage funk soul";
  return `${job.decade}s Hungarian ${descriptor}, vintage analog, ${job.bpm} BPM`;
}

/**
 * Detailed prompt for sunoapi.org custom mode (instruments, arrangement, mood).
 * Used as the 'prompt' field. Limit: 5000 chars for V4_5ALL.
 */
export function buildSunoPrompt(job: Job): string {
  const moodLine =
    job.moodLine ||
    defaultMoodLines[job.style].replace("[YEAR]", String(job.budapestYear));

  const prompt = `Instruments: deep electric bass, dry acoustic drums, tight snare, brushed cymbals, rhythm guitar with wah, Hammond organ swells, dirty Rhodes piano, muted brass stabs (trumpet, trombone, baritone sax), analog tape noise.
Tempo: ${job.bpm} BPM, laid-back swing.
Mood: ${moodLine}
Arrangement: intro (bass riff + drums), verse (rhythm + sparse organ), chorus (full horns + accents), instrumental break (guitar + organ solo), outro fading into tape hiss.
Production: analog tape compression, mono reverb plate, low-shelf warmth, mild saturation; no digital synths or trap.
Setting: Budapest ${job.budapestYear}, smoky soul groove, vintage noir atmosphere.`;

  return prompt;
}

export function buildImagePrompt(job: Job): string {
  const moodSentence = imageMoodSentences[job.style];

  return `Cinematic 16:9 studio portrait photograph. Four people standing close together in dark formal suits and ties, white dress shirts. Deep crimson red velvet curtain fills the entire background. A vintage 1950s-era gold microphone on a tall stand centered between them. Formally posed — serious, composed, slightly intimidating. Royal and classic mood. One figure has their face obscured or abstracted — masked, turned away, or hidden in shadow — this is intentional. ${moodSentence} Lighting: dramatic single-source studio light from slightly above, soft shadows. Film grain, faded Kodak color palette, slight vignette. Shot on 35mm. No text. No modern elements. Background is exclusively the red curtain.`;
}

export function buildYouTubeTitle(job: Job): string {
  return `${job.artists} – ${job.title} | PIROS TAPE VERZIÓ (${job.decade}s ${job.style} Re-Edit)`;
}

export function buildYouTubeDescription(job: Job, huScene?: string): string {
  const styleLine = `${job.decade}s ${job.style} újraértelmezés`;
  const releaseInfo = job.releaseYear ? ` (${job.releaseYear})` : "";

  const artistTags = job.artists
    .split(" × ")
    .map((a) => `#${a.replace(/[.\s]/g, "")}`)
    .join(" ");
  const titleTag = `#${job.title.replace(/\s+/g, "")}`;

  const scene = huScene || "";

  return `${job.artists} – ${job.title}
(${styleLine})

Üdv a Piros Tape korszakban:
nincs címke, nincs arc — csak a hang.

${scene}

Eredeti dal: ${job.artists} – ${job.title}${releaseInfo}
• Újrahangszerelve: Piros Tape

Instagram: /piros_tapemusic

${artistTags} ${titleTag} #PirosTape #HungarianRap #${job.decade}s #VintageEdit #RetroSound #SoulFunk`;
}

export function buildScenePrompt(job: Job): string {
  const themes = job.moodLine || defaultMoodLines[job.style];
  return `Write a 2-3 line cinematic Hungarian scene set in Budapest ${job.budapestYear} that captures the emotional essence of a song about ${themes}. First-person or observational. Poetic, specific, not generic. Write in Hungarian.`;
}

export const RESEARCH_SYSTEM_PROMPT = `You are a Hungarian rap music expert for the Piros Tape channel. Return ONLY valid JSON: an array of 3 objects with keys: artists (string, × separated), title (string, ALL CAPS), style (one of: "Funk Soul", "Funk Noir", "Cold War Funk Noir", "Political Soul", "Cinematic Soul Funk", "Upbeat Cinematic Soul Funk"), decade (string: "1960" or "1970"), bpm (number), reasoning (string, 1-2 sentences).
Avoid these already-produced tracks: PANNONIA, WOLT, HOMO HOMINI LUPUS EST, KRÚBI INTERJÚ, HOLNAP MEGÁLLNAK AZ ÓRÁK, PURGATÓRIUM.
Artist pool — Tier 1: Azahriah, Beton.Hofi, TIRPA, Krúbi, AK26.
Tier 2: Funktasztikus, Sub Bass Monster, Bankos, Siska Finuccsi, Ketioz.`;
