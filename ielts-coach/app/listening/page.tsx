"use client";

import { useEffect, useState } from "react";
import { QuestionSet, score, type Answers } from "@/components/QuestionSet";
import { BandBadge, Button, Card, ErrorBox, Field, PageHeader, Spinner, inputClass, formatTime } from "@/components/ui";
import { postJSON } from "@/lib/api";
import { rawToBand } from "@/lib/band";
import { loadJSON, saveAttempt, saveJSON } from "@/lib/history";
import type { ListeningTest } from "@/lib/schemas";
import type { Cue } from "@/lib/youtube";

interface SavedTest {
  id: string;
  videoId: string;
  title: string;
  start: number;
  end: number | null;
  transcript: string;
  test: ListeningTest;
  created: string;
}

const LIB_KEY = "ielts-coach:listening-library";

function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v")!.slice(0, 11);
    const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    if (m) return m[1];
  } catch {}
  return null;
}

/** "1:23" / "01:02:03" / "83" → seconds. Empty → null. */
function parseTime(s: string): number | null {
  if (!s.trim()) return null;
  const parts = s.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Removes the timestamp lines YouTube's "Show transcript" panel includes when copied. */
function cleanPasted(text: string) {
  return text
    .split("\n")
    .filter((l) => !/^\s*\d{1,2}:\d{2}(:\d{2})?\s*$/.test(l))
    .map((l) => l.replace(/^\s*\d{1,2}:\d{2}(:\d{2})?\s+/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

type Phase = "setup" | "loading" | "test" | "done";

export default function ListeningPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [cues, setCues] = useState<Cue[] | null>(null);
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [startStr, setStartStr] = useState("");
  const [endStr, setEndStr] = useState("");
  const [count, setCount] = useState(10);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<SavedTest | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [library, setLibrary] = useState<SavedTest[]>([]);

  useEffect(() => setLibrary(loadJSON<SavedTest[]>(LIB_KEY, [])), []);

  async function loadVideo() {
    setError(null);
    const id = parseVideoId(url);
    if (!id) return setError("That doesn't look like a YouTube link.");
    setVideoId(id);
    setCues(null);
    setFetching(true);
    try {
      const r = await postJSON<{ title: string; cues: Cue[] }>("/api/listening/transcript", { url });
      setCues(r.cues);
      setTitle(r.title);
      setShowPaste(false);
    } catch (e) {
      setError((e as Error).message);
      setShowPaste(true);
    } finally {
      setFetching(false);
    }
  }

  function transcriptForRange(): string {
    const start = parseTime(startStr) ?? 0;
    const end = parseTime(endStr);
    if (cues) {
      return cues
        .filter((c) => c.start + c.dur >= start && (end === null || c.start <= end))
        .map((c) => c.text)
        .join(" ");
    }
    return cleanPasted(pasted);
  }

  async function generate() {
    if (!videoId) return;
    setError(null);
    const transcript = transcriptForRange();
    if (transcript.length < 200) return setError("Not enough transcript text for this section. Choose a longer range or paste the transcript.");
    setPhase("loading");
    try {
      const test = await postJSON<ListeningTest>("/api/listening/generate", {
        transcript,
        count,
        videoTitle: title || undefined,
      });
      const saved: SavedTest = {
        id: crypto.randomUUID(),
        videoId,
        title: title || test.title,
        start: parseTime(startStr) ?? 0,
        end: parseTime(endStr),
        transcript,
        test,
        created: new Date().toISOString(),
      };
      const lib = [saved, ...library].slice(0, 50);
      setLibrary(lib);
      saveJSON(LIB_KEY, lib);
      begin(saved);
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  }

  function begin(t: SavedTest) {
    setCurrent(t);
    setAnswers({});
    setPhase("test");
    window.scrollTo({ top: 0 });
  }

  function submit() {
    if (!current) return;
    const { correct, total } = score(current.test.groups, answers);
    saveAttempt({ skill: "listening", band: rawToBand(correct, total, "listening"), title: current.title, detail: `${correct}/${total} correct` });
    setPhase("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeSaved(id: string) {
    const lib = library.filter((l) => l.id !== id);
    setLibrary(lib);
    saveJSON(LIB_KEY, lib);
  }

  if ((phase === "test" || phase === "done") && current) {
    const { correct, total } = score(current.test.groups, answers);
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", cc_load_policy: "0", start: String(current.start) });
    if (current.end) params.set("end", String(current.end));
    return (
      <div>
        <PageHeader
          title={current.test.title}
          subtitle={current.test.summary}
          right={
            phase === "test" ? (
              <Button onClick={() => confirm("Submit your answers?") && submit()}>Submit</Button>
            ) : (
              <Button variant="secondary" onClick={() => setPhase("setup")}>Back</Button>
            )
          }
        />
        {phase === "done" && (
          <Card className="mb-6 flex flex-wrap items-center gap-6">
            <BandBadge band={rawToBand(correct, total, "listening")} size="lg" />
            <div>
              <p className="text-lg font-semibold">{correct} / {total} correct</p>
              <p className="text-sm text-muted">Replay the video with the transcript below to hear what you missed.</p>
            </div>
          </Card>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${current.videoId}?${params}`}
                title="Listening video"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            {phase === "test" ? (
              <p className="text-sm text-muted">
                Tip: turn YouTube captions off and try to listen only once, like the real exam
                {current.end ? ` (section ${formatTime(current.start)}–${formatTime(current.end)})` : ""}. Read the questions first!
              </p>
            ) : (
              <Card className="max-h-96 overflow-y-auto">
                <h3 className="mb-2 font-semibold">Transcript</h3>
                <p className="text-sm leading-relaxed text-muted">{current.transcript}</p>
              </Card>
            )}
          </div>
          <Card>
            <QuestionSet
              groups={current.test.groups}
              answers={answers}
              onChange={(n, v) => setAnswers((a) => ({ ...a, [n]: v }))}
              submitted={phase === "done"}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Listening" subtitle="Use any English YouTube video (lectures, interviews, IELTS practice audio). The AI writes questions from its captions." />
      <Card className="flex flex-col gap-5">
        <Field label="YouTube link">
          <div className="flex gap-2">
            <input className={`${inputClass} flex-1`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            <Button variant="secondary" onClick={loadVideo} disabled={!url || fetching}>
              {fetching ? "Loading…" : "Load"}
            </Button>
          </div>
        </Field>

        {videoId && (
          <>
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
              <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`} title="Preview" allowFullScreen />
            </div>
            {cues && (
              <p className="text-sm text-good">
                ✓ Captions loaded{title ? ` for “${title}”` : ""} — {formatTime(cues.at(-1)!.start + cues.at(-1)!.dur)} of audio.
              </p>
            )}
            {!cues && !fetching && (
              <button className="self-start text-sm text-accent underline" onClick={() => setShowPaste((s) => !s)}>
                {showPaste ? "Hide" : "Paste transcript manually"}
              </button>
            )}
            {showPaste && !cues && (
              <Field label="Transcript (on YouTube: ⋯ under the video → Show transcript → copy all)">
                <textarea className={`${inputClass} h-40`} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste the transcript text here…" />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Start at (optional)">
                <input className={inputClass} value={startStr} onChange={(e) => setStartStr(e.target.value)} placeholder="0:00" />
              </Field>
              <Field label="End at (optional)">
                <input className={inputClass} value={endStr} onChange={(e) => setEndStr(e.target.value)} placeholder="e.g. 6:30" />
              </Field>
              <Field label="Questions">
                <select className={inputClass} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {[5, 10, 15, 20, 30, 40].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
            </div>
            {!cues && showPaste && (startStr || endStr) && (
              <p className="text-xs text-warn">With a pasted transcript, paste only the part between your start and end times.</p>
            )}
          </>
        )}

        <ErrorBox message={error} />
        {phase === "loading" ? (
          <Spinner label="Writing questions from the recording… (about 30 seconds)" />
        ) : (
          videoId && (
            <Button onClick={generate} disabled={!cues && !pasted.trim()}>
              Create listening test
            </Button>
          )
        )}
      </Card>

      {library.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 font-semibold">Saved listening tests</h2>
          <ul className="divide-y divide-border">
            {library.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="h-10 w-14 rounded object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.title}</span>
                  <span className="text-xs text-muted">
                    {t.test.groups.reduce((n, g) => n + g.questions.length, 0)} questions · {new Date(t.created).toLocaleDateString()}
                  </span>
                </span>
                <Button variant="secondary" onClick={() => begin(t)}>Take</Button>
                <Button variant="ghost" onClick={() => removeSaved(t.id)} aria-label="Delete">✕</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
