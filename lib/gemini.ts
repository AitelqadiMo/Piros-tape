import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";

// Nano Banana 2 = gemini-3.1-flash-image-preview
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const TEXT_MODEL = "gemini-2.0-flash";

export async function generateThumbnail(
  imagePrompt: string,
  apiKey: string,
  outputPath: string
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: IMAGE_MODEL });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
    } as unknown as undefined,
  });

  const response = result.response;
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidates[0].content.parts;
  for (const part of parts) {
    const inlineData = (
      part as { inlineData?: { mimeType: string; data: string } }
    ).inlineData;
    if (inlineData && inlineData.mimeType.startsWith("image/")) {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      const buffer = Buffer.from(inlineData.data, "base64");
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
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function researchSongs(
  query: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: TEXT_MODEL,
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(query);
  return result.response.text();
}

/**
 * Test whether a Gemini API key is valid with a tiny text generation.
 */
export async function testGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
    const result = await model.generateContent("Say ok");
    return !!result.response.text();
  } catch {
    return false;
  }
}
