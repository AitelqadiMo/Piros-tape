import { NextRequest, NextResponse } from "next/server";
import { readAssets, getAssetsByType } from "@/lib/assets";
import { AssetType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as AssetType | null;

  if (type && ["song", "thumbnail", "video"].includes(type)) {
    const assets = await getAssetsByType(type);
    return NextResponse.json(assets);
  }

  const assets = await readAssets();
  const sorted = assets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(sorted);
}
