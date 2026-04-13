import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { submitPendingAction, hasPendingAction } from "@/lib/actions";
import { AwaitingInputType } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await request.json();
  const { type, ...payload } = body;

  if (!type) {
    return NextResponse.json({ error: "Missing action type" }, { status: 400 });
  }

  const typedAction = type as AwaitingInputType;

  if (!(await hasPendingAction(jobId, typedAction))) {
    return NextResponse.json(
      { error: "No pending action for this job" },
      { status: 409 }
    );
  }

  const resolved = await submitPendingAction(jobId, typedAction, payload);
  if (!resolved) {
    return NextResponse.json(
      { error: "Failed to resolve action" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
