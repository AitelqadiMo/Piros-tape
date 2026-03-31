"use client";

import { Job } from "@/lib/types";
import Link from "next/link";

interface TrackCardProps {
  job: Job;
  showActions?: boolean;
}

export default function TrackCard({ job, showActions = true }: TrackCardProps) {
  const isComplete = job.status === "complete" || job.status === "legacy";

  return (
    <div className="track-card border-[0.5px] border-[rgba(212,168,83,0.15)] bg-noir-2 overflow-hidden transition-all duration-200"
      style={{ borderRadius: "2px" }}
    >
      {/* Thumbnail placeholder */}
      <div className="relative aspect-video bg-noir-3 flex items-center justify-center">
        {job.outputDir && isComplete ? (
          <div className="w-full h-full bg-noir-3 flex items-center justify-center">
            <span className="font-mono text-xs text-dust">THUMBNAIL</span>
          </div>
        ) : (
          <div className="w-full h-full bg-noir-3 flex items-center justify-center">
            <span className="font-display italic text-2xl text-noir-3 select-none opacity-30">
              PT
            </span>
          </div>
        )}
        {/* Style badge overlay */}
        <div className="absolute top-2 left-2">
          <span className="font-mono text-[10px] uppercase tracking-wider bg-crimson text-paper px-2 py-1"
            style={{ borderRadius: "2px" }}
          >
            {job.style}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-mono text-sm uppercase tracking-wider text-paper">
          {job.title}
        </h3>
        <p className="font-body text-sm text-ash mt-1">{job.artists}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-[10px] text-dust uppercase">
            Budapest {job.budapestYear}
          </span>
          <span className="text-dust">·</span>
          <span className="font-mono text-[10px] text-dust uppercase">
            {job.decade}s {job.style}
          </span>
        </div>

        {job.createdAt && (
          <p className="font-mono text-[10px] text-dust mt-2">
            {new Date(job.createdAt).toLocaleDateString("hu-HU")}
          </p>
        )}

        {showActions && (
          <div className="flex gap-2 mt-3">
            {isComplete && job.id && !job.id.startsWith("legacy") && (
              <>
                <Link
                  href={`/studio/${job.id}`}
                  className="btn-secondary text-[10px] py-1 px-3"
                >
                  Preview
                </Link>
                <a
                  href={`/api/jobs/${job.id}/download?file=video`}
                  className="btn-secondary text-[10px] py-1 px-3"
                >
                  Download
                </a>
              </>
            )}
            <Link
              href={`/studio?prefill=${encodeURIComponent(job.title)}`}
              className="btn-secondary text-[10px] py-1 px-3"
            >
              Regenerate
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
