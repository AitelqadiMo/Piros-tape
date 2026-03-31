"use client";

import { useEffect, useRef } from "react";
import { PipelineLogEvent } from "@/lib/types";

interface LogStreamProps {
  logs: PipelineLogEvent[];
}

export default function LogStream({ logs }: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-tape";
      case "error":
        return "text-crimson";
      default:
        return "text-dust";
    }
  };

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      ref={containerRef}
      className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-4 h-64 overflow-y-auto font-mono text-xs"
      style={{ borderRadius: "2px" }}
    >
      {logs.length === 0 ? (
        <p className="text-dust italic">Waiting for pipeline to start...</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={`log-entry ${levelColor(log.level)}`}>
            <span className="text-dust">[{formatTime(log.timestamp)}]</span>{" "}
            {log.message}
          </div>
        ))
      )}
    </div>
  );
}
