import { NextRequest, NextResponse } from "next/server";
import { testSunoKey } from "@/lib/suno";

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }
    const valid = await testSunoKey(key);
    return NextResponse.json({ valid });
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}
