import { NextRequest } from "next/server";
import { getJob } from "@/lib/jobs";
import { runPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes max for pipeline

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream may be closed
        }
      };

      // If job is already complete or errored, send current state and close
      if (job.status === "complete" || job.status === "legacy") {
        emit("step", { step: 5, status: "done", progress: 100, message: "Already complete" });
        emit("complete", {
          videoPath: `${job.outputDir || ""}`,
          thumbnailPath: `${job.outputDir || ""}`,
          metadataPath: `${job.outputDir || ""}`,
        });
        controller.close();
        return;
      }

      if (job.status === "error") {
        emit("error", { step: job.currentStep, message: "Job previously failed" });
        controller.close();
        return;
      }

      // If already running, send current state
      if (job.status === "running") {
        for (let i = 0; i < job.stepStatuses.length; i++) {
          emit("step", {
            step: i + 1,
            status: job.stepStatuses[i],
            progress: job.stepStatuses[i] === "done" ? 100 : 0,
            message: job.stepStatuses[i] === "done" ? "Complete" : "Waiting...",
          });
        }
      }

      // Set up heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Start pipeline if pending
      if (job.status === "pending") {
        try {
          await runPipeline(job, emit);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          emit("error", { step: 0, message });
        }
      }

      clearInterval(heartbeat);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
