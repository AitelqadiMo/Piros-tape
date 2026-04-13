import { getJob } from "./jobs";
import { runPipeline } from "./pipeline";

type Listener = (event: string, data: unknown) => void;

type RunnerState = {
  listeners: Map<string, Set<Listener>>;
  running: Map<string, Promise<void>>;
  starting: Set<string>;
};

function getRunnerState(): RunnerState {
  const globalState = globalThis as typeof globalThis & {
    __pirosTapeRunnerState?: Partial<RunnerState>;
  };

  if (!globalState.__pirosTapeRunnerState) {
    globalState.__pirosTapeRunnerState = {
      listeners: new Map(),
      running: new Map(),
      starting: new Set(),
    };
  }

  if (!globalState.__pirosTapeRunnerState.listeners) {
    globalState.__pirosTapeRunnerState.listeners = new Map();
  }

  if (!globalState.__pirosTapeRunnerState.running) {
    globalState.__pirosTapeRunnerState.running = new Map();
  }

  if (!globalState.__pirosTapeRunnerState.starting) {
    globalState.__pirosTapeRunnerState.starting = new Set();
  }

  return globalState.__pirosTapeRunnerState as RunnerState;
}

function emitToListeners(jobId: string, event: string, data: unknown) {
  const state = getRunnerState();
  const listeners = state.listeners.get(jobId);
  if (!listeners) return;

  for (const listener of listeners) {
    try {
      listener(event, data);
    } catch (error) {
      console.error(`[JobRunner] Listener failed for ${jobId}:`, error);
    }
  }
}

export function subscribeToJob(jobId: string, listener: Listener): () => void {
  const state = getRunnerState();
  const listeners = state.listeners.get(jobId) ?? new Set<Listener>();
  listeners.add(listener);
  state.listeners.set(jobId, listeners);

  return () => {
    const current = state.listeners.get(jobId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      state.listeners.delete(jobId);
    }
  };
}

export function isJobRunning(jobId: string): boolean {
  const state = getRunnerState();
  return state.running.has(jobId) || state.starting.has(jobId);
}

export async function ensureJobRunning(jobId: string): Promise<void> {
  const state = getRunnerState();
  if (state.running.has(jobId) || state.starting.has(jobId)) {
    return;
  }

  state.starting.add(jobId);

  try {
    const job = await getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    if (job.status === "complete" || job.status === "legacy" || job.status === "error") {
      return;
    }

    if (job.waitingFor) {
      return;
    }

    const runner = (async () => {
      try {
        await runPipeline(job, (event, data) => {
          emitToListeners(jobId, event === "error" ? "pipeline_error" : event, data);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emitToListeners(jobId, "pipeline_error", { step: 0, message });
      } finally {
        state.running.delete(jobId);
      }
    })();

    state.running.set(jobId, runner);
    await Promise.resolve();
  } finally {
    state.starting.delete(jobId);
  }
}
