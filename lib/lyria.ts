import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";

const CLIP_MODEL = "lyria-3-clip-preview"; // 30-second clips
const PRO_MODEL = "lyria-3-pro-preview"; // Full-length songs

export interface LyriaResult {
  audioData: Buffer;
  lyrics: string | null;
  mimeType: string;
}

/**
 * Generate a full-length instrumental song using Lyria 3 Pro.
 * Returns the audio buffer and any generated lyrics/structure text.
 */
export async function generateSong(params: {
  prompt: string;
  apiKey: string;
  useClip?: boolean;
}): Promise<LyriaResult> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const model = params.useClip ? CLIP_MODEL : PRO_MODEL;

  const response = await ai.models.generateContent({
    model,
    contents: params.prompt,
    config: {
      responseModalities: ["AUDIO", "TEXT"],
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Lyria 3 returned no candidates");
  }

  let audioData: Buffer | null = null;
  let mimeType = "audio/mpeg";
  const lyricsArr: string[] = [];

  for (const part of candidates[0].content?.parts || []) {
    if (part.text) {
      lyricsArr.push(part.text);
    } else if (part.inlineData) {
      audioData = Buffer.from(part.inlineData.data!, "base64");
      mimeType = part.inlineData.mimeType || "audio/mpeg";
    }
  }

  if (!audioData) {
    throw new Error("Lyria 3 response did not contain audio data");
  }

  return {
    audioData,
    lyrics: lyricsArr.length > 0 ? lyricsArr.join("\n") : null,
    mimeType,
  };
}

/**
 * Generate two song variations by making two parallel Lyria 3 calls.
 * Each returns independently generated audio.
 */
export async function generateTwoVariations(params: {
  prompt: string;
  apiKey: string;
  useClip?: boolean;
}): Promise<LyriaResult[]> {
  const [a, b] = await Promise.all([
    generateSong(params),
    generateSong(params),
  ]);
  return [a, b];
}

/**
 * Save Lyria audio to disk.
 */
export async function saveLyriaAudio(
  result: LyriaResult,
  outputPath: string
): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, result.audioData);
}

/**
 * Test whether a Gemini API key works with Lyria 3
 * by attempting a tiny clip generation.
 */
export async function testLyriaKey(apiKey: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Just test that the model is accessible with a minimal text request
    const response = await ai.models.generateContent({
      model: CLIP_MODEL,
      contents: "A 5-second silent test tone.",
      config: {
        responseModalities: ["AUDIO", "TEXT"],
      },
    });
    return !!(response.candidates && response.candidates.length > 0);
  } catch {
    return false;
  }
}
