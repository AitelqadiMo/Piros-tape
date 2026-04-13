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
    <nav className="sticky top-0 z-40 w-full border-b border-crimson/20 bg-[rgba(10,6,4,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-end">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                  isActive ? "bg-[rgba(212,168,83,0.1)] text-paper" : "text-dust hover:text-ash"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
