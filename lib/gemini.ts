import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";

// Nano Banana 2 = gemini-3.1-flash-image-preview
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const TEXT_MODEL = "gemini-2.5-flash";

export async function generateThumbnail(
  imagePrompt: string,
  apiKey: string,
  outputPath: string
): Promise<void> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: imagePrompt,
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidates[0].content?.parts || [];
  for (const part of parts) {
    if (part.inlineData && part.inlineData.mimeType?.startsWith("image/")) {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      await fs.writeFile(outputPath, buffer);
      return;
    }
  }

  throw new Error("Gemini response did not contain image data");
}

export async function generateSceneDescription(
  prompt: string,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });
  return response.text || "";
}

export async function researchSongs(
  query: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: query,
    config: {
      systemInstruction: systemPrompt,
    },
  });
  return response.text || "";
}

export async function fetchLyrics(
  artist: string,
  title: string,
  apiKey: string
): Promise<{ lyrics: string | null; found: boolean }> {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Find the complete lyrics for the song "${title}" by ${artist}. Return ONLY the lyrics text, no commentary, no translations, no headings. If you cannot find the lyrics or are not confident they are accurate, respond with exactly the word: NOT_FOUND`;
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });
  const text = (response.text || "").trim();
  if (text === "NOT_FOUND" || text.length < 50) {
    return { lyrics: null, found: false };
  }
  return { lyrics: text, found: true };
}

/**
 * Test whether a Gemini API key is valid with a tiny text generation.
 */
export async function testGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: "Say ok",
    });
    return !!(response.text);
  } catch {
    return false;
  }
}
