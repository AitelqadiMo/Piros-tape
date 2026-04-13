import { AwaitingInputType } from "./types";
import { getJob, updateJob } from "./jobs";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForAction(
  jobId: string,
  type: AwaitingInputType,
  timeoutMs = 600_000
): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found while waiting for action`);
    }

    const pending = job.pendingAction;
    if (pending?.type === type) {
      await updateJob(jobId, { pendingAction: null });
      return pending.payload;
    }

    await sleep(750);
  }

  throw new Error(`Action timed out for job ${jobId}`);
}

export async function submitPendingAction(
  jobId: string,
  type: AwaitingInputType,
  payload: Record<string, unknown>
): Promise<boolean> {
  const job = await getJob(jobId);

  if (!job || job.waitingFor !== type) {
    return false;
  }

  await updateJob(jobId, {
    pendingAction: {
      type,
      payload,
      createdAt: new Date().toISOString(),
    },
  });

  return true;
}

export async function hasPendingAction(jobId: string, type?: AwaitingInputType): Promise<boolean> {
  const job = await getJob(jobId);
  if (!job?.waitingFor) return false;
  if (!type) return true;
  return job.waitingFor === type;
}
