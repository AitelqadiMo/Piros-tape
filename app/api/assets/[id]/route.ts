import { NextRequest, NextResponse } from "next/server";
import { getAsset, deleteAsset } from "@/lib/assets";
import { promises as fs } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await getAsset(id);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const wantsMeta = request.nextUrl.searchParams.get("meta") === "1";
  if (wantsMeta) {
    return NextResponse.json(asset);
  }

  try {
    const data = await fs.readFile(asset.filePath);
    const contentTypes: Record<string, string> = {
      song: "audio/mpeg",
      thumbnail: "image/jpeg",
      video: "video/mp4",
    };
    const inline = request.nextUrl.searchParams.get("inline") === "1";

    return new Response(data, {
      headers: {
        "Content-Type": contentTypes[asset.type] || "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asset.fileName}"`,
        "Content-Length": String(data.length),
        "Cache-Control": inline ? "public, max-age=60" : "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteAsset(id);

  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
