import { promises as fs } from "fs";
import path from "path";
import { Asset, AssetType } from "./types";

const ASSETS_FILE = path.join(process.cwd(), "assets.json");

export async function readAssets(): Promise<Asset[]> {
  try {
    const data = await fs.readFile(ASSETS_FILE, "utf-8");
    return JSON.parse(data) as Asset[];
  } catch {
    return [];
  }
}

async function writeAssets(assets: Asset[]): Promise<void> {
  await fs.writeFile(ASSETS_FILE, JSON.stringify(assets, null, 2), "utf-8");
}

export async function createAsset(
  data: Omit<Asset, "id" | "createdAt">
): Promise<Asset> {
  const assets = await readAssets();
  const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const asset: Asset = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  assets.push(asset);
  await writeAssets(assets);
  return asset;
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  const assets = await readAssets();
  return assets.find((a) => a.id === id);
}

export async function getAssetsByType(type: AssetType): Promise<Asset[]> {
  const assets = await readAssets();
  return assets.filter((a) => a.type === type).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAssetsByJob(jobId: string): Promise<Asset[]> {
  const assets = await readAssets();
  return assets.filter((a) => a.jobId === jobId);
}

export async function deleteAsset(id: string): Promise<boolean> {
  const assets = await readAssets();
  const index = assets.findIndex((a) => a.id === id);
  if (index === -1) return false;

  const asset = assets[index];
  try {
    await fs.unlink(asset.filePath);
  } catch {
    // File may already be gone
  }

  assets.splice(index, 1);
  await writeAssets(assets);
  return true;
}
