import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { ensureJobRunning, isJobRunning } from "@/lib/job-runner";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "complete" || job.status === "legacy" || job.status === "error") {
    return NextResponse.json({ ok: true, status: job.status, started: false });
  }

  try {
    await ensureJobRunning(jobId);
    return NextResponse.json({
      ok: true,
      status: job.status,
      started: isJobRunning(jobId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
