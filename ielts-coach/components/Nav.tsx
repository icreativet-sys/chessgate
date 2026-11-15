"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/reading", label: "Reading" },
  { href: "/listening", label: "Listening" },
  { href: "/writing", label: "Writing" },
  { href: "/speaking", label: "Speaking" },
];

export function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs text-white">IE</span>
          IELTS Coach
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
