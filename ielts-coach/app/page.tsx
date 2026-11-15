"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BandBadge, Button, Card } from "@/components/ui";
import { clearHistory, loadHistory, type Attempt, type Skill } from "@/lib/history";
import { roundBand } from "@/lib/band";

const SKILLS: { skill: Skill; title: string; desc: string; icon: string }[] = [
  { skill: "reading", title: "Reading", desc: "AI-written passages (1–3) with real IELTS question types, timer and band score.", icon: "📖" },
  { skill: "listening", title: "Listening", desc: "Paste a YouTube link — listen and answer AI-made questions from its captions.", icon: "🎧" },
  { skill: "writing", title: "Writing", desc: "Task 1 charts and Task 2 essays, marked on all four criteria with corrections.", icon: "✍️" },
  { skill: "speaking", title: "Speaking", desc: "Speak your answer — get pronunciation tips, what was missing and a model answer.", icon: "🎤" },
];

export default function Dashboard() {
  const [history, setHistory] = useState<Attempt[]>([]);
  useEffect(() => setHistory(loadHistory()), []);

  const avg = (s: Skill) => {
    const xs = history.filter((h) => h.skill === s).slice(0, 5).map((h) => h.band);
    return xs.length ? roundBand(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  };
  const avgs = SKILLS.map((s) => avg(s.skill));
  const known = avgs.filter((x): x is number => x !== null);
  const overall = known.length === 4 ? roundBand(known.reduce((a, b) => a + b, 0) / 4) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your IELTS practice</h1>
          <p className="mt-1 text-muted">Pick a skill. Bands below are the average of your last 5 attempts.</p>
        </div>
        {overall !== null && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">Estimated overall</span>
            <BandBadge band={overall} size="lg" />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SKILLS.map((s, i) => (
          <Link key={s.skill} href={`/${s.skill}`} className="group">
            <Card className="flex h-full flex-col gap-3 transition group-hover:border-accent">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{s.icon}</span>
                {avgs[i] !== null ? (
                  <BandBadge band={avgs[i]!} />
                ) : (
                  <span className="text-xs text-muted">no attempts yet</span>
                )}
              </div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="text-sm text-muted">{s.desc}</p>
              <span className="mt-auto text-sm font-medium text-accent">Start practice →</span>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent attempts</h2>
          {history.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Delete all practice history on this device?")) {
                  clearHistory();
                  setHistory([]);
                }
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Finish a practice and your scores will appear here (stored only in this browser).</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.slice(0, 15).map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-20 shrink-0 capitalize text-muted">{h.skill}</span>
                <span className="min-w-0 flex-1 truncate">
                  {h.title}
                  {h.detail && <span className="text-muted"> · {h.detail}</span>}
                </span>
                <span className="hidden shrink-0 text-xs text-muted sm:inline">
                  {new Date(h.date).toLocaleDateString()}
                </span>
                <BandBadge band={h.band} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
