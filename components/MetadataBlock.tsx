"use client";

import { useState } from "react";

interface MetadataBlockProps {
  title: string;
  content: string;
}

export default function MetadataBlock({ title, content }: MetadataBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="border-[0.5px] border-[rgba(212,168,83,0.15)] bg-noir-2"
      style={{ borderRadius: "2px" }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b-[0.5px] border-[rgba(212,168,83,0.15)]">
        <span className="font-mono text-[11px] uppercase tracking-wider text-dust">
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="font-mono text-[11px] uppercase tracking-wider text-tape hover:text-paper transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="p-4">
        <pre className="font-body text-sm text-ash whitespace-pre-wrap leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}
