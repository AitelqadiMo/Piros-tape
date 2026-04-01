"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/studio", label: "Pipeline" },
  { href: "/music", label: "Music" },
  { href: "/thumbnails", label: "Thumbnails" },
  { href: "/video", label: "Video" },
  { href: "/assets", label: "Assets" },
  { href: "/jobs", label: "Jobs" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-full">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="group relative">
          <span className="font-display italic text-2xl text-crimson">
            PIROS TAPE
          </span>
          <span className="font-mono text-xs text-tape tracking-[0.2em] uppercase ml-2">
            STUDIO
          </span>
          <span
            className="absolute bottom-0 left-0 h-[1px] bg-crimson w-0 group-hover:w-full transition-all duration-300 ease-out"
          />
        </Link>

        <div className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                  isActive ? "text-paper" : "text-dust hover:text-ash"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="h-[1px] bg-crimson" />
    </nav>
  );
}
