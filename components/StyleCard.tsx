"use client";

import { StyleOption } from "@/lib/types";

interface StyleCardProps {
  style: StyleOption;
  selected: boolean;
  onClick: () => void;
}

export default function StyleCard({ style, selected, onClick }: StyleCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border transition-all duration-200 style-card-texture ${
        selected
          ? "border-l-[3px] border-l-crimson bg-velvet border-t-[0.5px] border-r-[0.5px] border-b-[0.5px] border-t-[rgba(212,168,83,0.25)] border-r-[rgba(212,168,83,0.25)] border-b-[rgba(212,168,83,0.25)]"
          : "border-[0.5px] border-[rgba(212,168,83,0.15)] bg-noir-2 hover:bg-noir-3"
      }`}
      style={{ borderRadius: "2px" }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-dust">
        {style.decade}
      </span>
      <h3 className="font-display text-base text-paper mt-1">
        {style.name}
      </h3>
      <p className="font-mono text-[11px] text-dust mt-1">
        {style.energy}
      </p>
    </button>
  );
}
