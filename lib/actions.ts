/**
 * In-memory mechanism for pausing the pipeline and awaiting a user action.
 * Works for a single-user local app where all requests share the same Node.js process.
 */

const pendingResolvers = new Map<string, (value: unknown) => void>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Pause the pipeline and wait for the user to call resolvePendingAction().
 * Times out after `timeoutMs` (default 10 minutes).
 */
export function waitForAction(
  jobId: string,
  timeoutMs = 600_000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // Clear any previous pending action for this job
    cancelPendingAction(jobId);

    pendingResolvers.set(jobId, resolve);

    const timer = setTimeout(() => {
      pendingResolvers.delete(jobId);
      pendingTimers.delete(jobId);
      reject(new Error(`Action timed out for job ${jobId}`));
    }, timeoutMs);

    pendingTimers.set(jobId, timer);
  });
}

/**
 * Resolve a pending action from an API route handler.
 * Returns true if there was a pending action, false if not.
 */
export function resolvePendingAction(jobId: string, value: unknown): boolean {
  const resolve = pendingResolvers.get(jobId);
  if (!resolve) return false;

  const timer = pendingTimers.get(jobId);
  if (timer) clearTimeout(timer);

  pendingResolvers.delete(jobId);
  pendingTimers.delete(jobId);
  resolve(value);
  return true;
}

/**
 * Cancel (reject) a pending action without resolving it.
 */
export function cancelPendingAction(jobId: string): void {
  const timer = pendingTimers.get(jobId);
  if (timer) clearTimeout(timer);
  pendingResolvers.delete(jobId);
  pendingTimers.delete(jobId);
}

export function hasPendingAction(jobId: string): boolean {
  return pendingResolvers.has(jobId);
}
