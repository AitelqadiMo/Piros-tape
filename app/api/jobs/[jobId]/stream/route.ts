import { getJob } from "@/lib/jobs";
import { subscribeToJob, ensureJobRunning, isJobRunning } from "@/lib/job-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

function buildReplay(job: NonNullable<Awaited<ReturnType<typeof getJob>>>) {
  const events: Array<{ event: string; data: unknown }> = [];

  for (let i = 0; i < job.stepStatuses.length; i++) {
    const status = job.stepStatuses[i];
    events.push({
      event: "step",
      data: {
        step: i + 1,
        status,
        progress: status === "done" || status === "error" ? 100 : status === "running" ? 10 : 0,
        message:
          status === "done"
            ? "Complete"
            : status === "error"
              ? job.errorMessage || "Step failed"
              : status === "running"
                ? "In progress..."
                : "",
      },
    });
  }

  if (job.status === "complete" || job.status === "legacy") {
    events.push({
      event: "complete",
      data: {
        videoPath: job.outputDir || "",
        thumbnailPath: job.outputDir || "",
        metadataPath: job.outputDir || "",
      },
    });
    return events;
  }

  if (job.status === "error") {
    events.push({
      event: "pipeline_error",
      data: { step: job.currentStep, message: job.errorMessage || "Job previously failed" },
    });
    return events;
  }

  if (job.waitingFor && job.waitingPayload) {
    events.push({
      event: "awaiting_input",
      data: { type: job.waitingFor, payload: job.waitingPayload },
    });
  }

  events.push({
    event: "runner",
    data: { active: isJobRunning(job.id) },
  });

  return events;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed by the client.
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      unsubscribe = subscribeToJob(jobId, (event, data) => {
        send(event, data);
        if (event === "complete" || event === "pipeline_error") {
          close();
        }
      });

      for (const event of buildReplay(job)) {
        send(event.event, event.data);
      }

      if (job.status === "complete" || job.status === "legacy" || job.status === "error") {
        close();
        return;
      }

      heartbeat = setInterval(() => {
        send("heartbeat", { at: Date.now() });
      }, 15000);

      try {
        await ensureJobRunning(jobId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        send("pipeline_error", { step: 0, message });
        close();
      }
    },
    cancel() {
      unsubscribe();
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
