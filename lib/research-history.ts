import { promises as fs } from "fs";
import path from "path";
import { ResearchCandidate, SavedResearchSuggestion } from "./types";

const RESEARCH_FILE = path.join(process.cwd(), "research-suggestions.json");

export async function readResearchSuggestions(): Promise<SavedResearchSuggestion[]> {
  try {
    const data = await fs.readFile(RESEARCH_FILE, "utf-8");
    return JSON.parse(data) as SavedResearchSuggestion[];
  } catch {
    return [];
  }
}

async function writeResearchSuggestions(items: SavedResearchSuggestion[]): Promise<void> {
  await fs.writeFile(RESEARCH_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function saveResearchSuggestions(
  query: string,
  candidates: ResearchCandidate[]
): Promise<SavedResearchSuggestion[]> {
  const existing = await readResearchSuggestions();
  const now = new Date().toISOString();

  const next = [...existing];

  for (const candidate of candidates) {
    const existingIndex = next.findIndex(
      (item) =>
        item.title === candidate.title &&
        item.artists === candidate.artists &&
        item.style === candidate.style
    );

    const saved: SavedResearchSuggestion = {
      ...candidate,
      id:
        existingIndex >= 0
          ? next[existingIndex].id
          : `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query,
      createdAt: now,
    };

    if (existingIndex >= 0) {
      next[existingIndex] = saved;
    } else {
      next.push(saved);
    }
  }

  next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const trimmed = next.slice(0, 60);
  await writeResearchSuggestions(trimmed);
  return trimmed;
}
