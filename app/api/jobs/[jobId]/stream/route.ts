import { NextRequest } from "next/server";
import { getJob } from "@/lib/jobs";
import { runPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

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
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      // Already complete / legacy
      if (job.status === "complete" || job.status === "legacy") {
        for (let i = 0; i < 5; i++) {
          emit("step", { step: i + 1, status: "done", progress: 100, message: "Complete" });
        }
        emit("complete", {
          videoPath: job.outputDir || "",
          thumbnailPath: job.outputDir || "",
          metadataPath: job.outputDir || "",
        });
        controller.close();
        return;
      }

      if (job.status === "error") {
        emit("error", { step: job.currentStep, message: "Job previously failed" });
        controller.close();
        return;
      }

      // Reconnect: replay current known step states
      if (job.status === "running") {
        for (let i = 0; i < job.stepStatuses.length; i++) {
          const s = job.stepStatuses[i];
          emit("step", {
            step: i + 1,
            status: s,
            progress: s === "done" ? 100 : 0,
            message: s === "done" ? "Complete" : s === "running" ? "In progress..." : "",
          });
        }

        // If pipeline is paused waiting for user input, re-emit that event
        if (job.waitingFor && job.waitingPayload) {
          emit("awaiting_input", {
            type: job.waitingFor,
            payload: job.waitingPayload,
          });
        }
      }

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Start pipeline if pending
      if (job.status === "pending") {
        console.log(`[Stream.GET] Job status is pending, starting pipeline for ${jobId}`);
        try {
          console.log(`[Stream.GET] Calling runPipeline...`);
          await runPipeline(job, emit);
          console.log(`[Stream.GET] runPipeline completed successfully for ${jobId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[Stream.GET] runPipeline threw error for ${jobId}:`, message);
          emit("error", { step: 0, message });
        }
      } else {
        console.log(`[Stream.GET] Job ${jobId} already ${job.status}, skipping pipeline start`);
      }
      // If running (reconnect), the pipeline is already running in another async context —
      // this SSE connection is just a new listener. The pipeline will emit to the original
      // controller, not this one. To fix for reconnect we'd need a pub/sub, but for a
      // single-tab local app the page reload scenario is handled by replaying state above.

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
