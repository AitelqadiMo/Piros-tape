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

export function buildLyriaPrompt(job: Job): string {
  const basePrompt = `${buildSunoStyle(job)}\n\n${buildSunoPrompt(job)}`;
  const lyrics = job.lyrics?.trim();

  if (!lyrics) {
    return `${basePrompt}

Vocal direction: strong Hungarian lead vocal, close-mic presence, emotionally direct phrasing.
Write and perform original vocals that fit the title, mood, and arrangement. Do not make this instrumental.`;
  }

  const lyricGuide = buildLyricGuide(job);

  return `${basePrompt}

Vocal direction: write and perform original Hungarian vocals inspired by the supplied source lyrics. Do not quote or closely reproduce any existing lyrics verbatim. Preserve the energy, imagery, and vocal interplay from the lyric guide below. Do not make this instrumental.

LYRIC GUIDE:
${lyricGuide}`;
}

function buildLyricGuide(job: Job): string {
  const lyrics = job.lyrics?.trim();
  if (!lyrics) {
    return `- Hook center: ${job.title}
- Mood: ${job.moodLine || "vintage Hungarian soul-funk atmosphere"}
- Write fresh lyrics in Hungarian that fit the title and setting.`;
  }

  const lines = lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = Array.from(
    new Set(
      lines
        .map((line) => {
          const bracket = line.match(/^\[([^\]]+)\]$/);
          if (bracket) return bracket[1].trim();

          const colon = line.match(/^([^:]{2,40}):$/);
          if (colon) return colon[1].trim();

          return null;
        })
        .filter((value): value is string => Boolean(value))
    )
  );

  const stopwords = new Set([
    "vagy", "vagyok", "hogy", "mert", "ahol", "ami", "ez", "ezek", "az", "egy", "van",
    "volt", "lesz", "meg", "már", "csak", "mint", "nekem", "neked", "én", "te", "mi",
    "ti", "ők", "de", "és", "is", "ha", "itt", "ott", "ami", "aki", "akkor", "majd",
    "minden", "mindig", "soha", "saját", "velem", "veled", "belém", "nekünk", "város",
  ]);

  const tokenCounts = new Map<string, number>();
  for (const line of lines) {
    for (const token of line.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []) {
      if (stopwords.has(token)) continue;
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }
  }

  const topThemes = Array.from(tokenCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token]) => token);

  const vocalSetup =
    sections.length >= 2
      ? `multi-voice exchange between ${sections.join(", ")}`
      : sections.length === 1
        ? `single lead vocal in the voice of ${sections[0]}`
        : `Hungarian lead vocal with a strong refrain`;

  const themeLine =
    topThemes.length > 0
      ? topThemes.join(", ")
      : "urban movement, tension, release, inner resolve";

  return [
    `- Hook center: ${job.title}`,
    `- Vocal setup: ${vocalSetup}`,
    `- Themes and imagery to preserve: ${themeLine}`,
    `- Mood to preserve: ${job.moodLine || "vintage Hungarian soul-funk atmosphere"}`,
    "- Write fresh Hungarian lyrics with a memorable repeating chorus built around the title.",
  ].join("\n");
}

export function buildImagePrompt(job: Job, artistImages?: string[]): string {
  // Ultra-minimal prompt to avoid Gemini timeout
  // Gemini is very slow with complex instructions - this is just the bare essentials
  let prompt = `Four people in dark suits. Red velvet background. Vintage 1950s microphone. 35mm photograph.`;
  
  // If we have artist images, add a reference instruction
  if (artistImages && artistImages.length > 0) {
    prompt += ` Reference the real performers in the images.`;
  }
  
  return prompt;
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
