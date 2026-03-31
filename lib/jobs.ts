import { promises as fs } from "fs";
import path from "path";
import { Job } from "./types";

const JOBS_FILE = path.join(process.cwd(), "jobs.json");

let jobsCache: Job[] | null = null;

export async function readJobs(): Promise<Job[]> {
  if (jobsCache) return jobsCache;
  try {
    const data = await fs.readFile(JOBS_FILE, "utf-8");
    jobsCache = JSON.parse(data) as Job[];
    return jobsCache;
  } catch {
    jobsCache = [];
    return jobsCache;
  }
}

async function writeJobs(jobs: Job[]): Promise<void> {
  jobsCache = jobs;
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf-8");
}

export async function getJob(id: string): Promise<Job | undefined> {
  const jobs = await readJobs();
  return jobs.find((j) => j.id === id);
}

export async function createJob(
  data: Omit<Job, "id" | "status" | "currentStep" | "stepStatuses" | "createdAt">
): Promise<Job> {
  const jobs = await readJobs();
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: Job = {
    ...data,
    id,
    status: "pending",
    currentStep: 0,
    stepStatuses: ["pending", "pending", "pending", "pending", "pending"],
    createdAt: new Date().toISOString(),
  };
  jobs.push(job);
  await writeJobs(jobs);
  return job;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
  const jobs = await readJobs();
  const index = jobs.findIndex((j) => j.id === id);
  if (index === -1) return null;
  jobs[index] = { ...jobs[index], ...updates };
  await writeJobs(jobs);
  return jobs[index];
}
