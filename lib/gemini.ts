import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";

export async function generateThumbnail(
  imagePrompt: string,
  apiKey: string,
  outputPath: string
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-preview-image-generation",
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE"] as unknown as undefined,
    } as unknown as undefined,
  });

  const response = result.response;
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidates[0].content.parts;
  for (const part of parts) {
    const inlineData = (part as { inlineData?: { mimeType: string; data: string } }).inlineData;
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(query);
  return result.response.text();
}
