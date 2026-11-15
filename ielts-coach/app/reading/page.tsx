"use client";

import { useCallback, useState } from "react";
import { QuestionSet, score, type Answers } from "@/components/QuestionSet";
import { BandBadge, Button, Card, ErrorBox, Field, PageHeader, Spinner, TimerPill, inputClass, useCountdown } from "@/components/ui";
import { postJSON } from "@/lib/api";
import { rawToBand } from "@/lib/band";
import { saveAttempt } from "@/lib/history";
import type { ReadingPassage } from "@/lib/schemas";

type Phase = "setup" | "loading" | "test" | "done";
const START = [1, 14, 27];

export default function ReadingPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(1);
  const [topic, setTopic] = useState("");
  const [target, setTarget] = useState(7);
  const [timed, setTimed] = useState(true);
  const [passages, setPassages] = useState<(ReadingPassage | null)[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setPhase("loading");
    setLoaded(0);
    setAnswers({});
    setActive(0);
    try {
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          postJSON<ReadingPassage>("/api/reading", {
            passageNumber: count === 1 ? 1 : i + 1,
            startQuestion: START[i],
            topic: topic || undefined,
            targetBand: target,
          }).then((p) => {
            setLoaded((n) => n + 1);
            return p;
          }),
        ),
      );
      setPassages(results);
      setPhase("test");
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  }

  const submit = useCallback(() => {
    const groups = passages.flatMap((p) => p?.groups ?? []);
    const { correct, total } = score(groups, answers);
    const band = rawToBand(correct, total, "reading");
    saveAttempt({
      skill: "reading",
      band,
      title: passages.map((p) => p?.title).join(" · "),
      detail: `${correct}/${total} correct`,
    });
    setPhase("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [passages, answers]);

  const left = useCountdown(count * 20 * 60, phase === "test" && timed, submit);

  if (phase === "setup" || phase === "loading") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Reading" subtitle="Academic Reading with AI-written passages. 20 minutes per passage, like the real exam." />
        <Card className="flex flex-col gap-5">
          <Field label="Number of passages">
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <Button key={n} variant={count === n ? "primary" : "secondary"} onClick={() => setCount(n)} disabled={phase === "loading"}>
                  {n} {n === 1 ? "passage" : "passages"}
                  <span className="text-xs opacity-75">({n * 20} min)</span>
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Topic (optional)">
            <input className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. ocean plastics, ancient Egypt, sleep science" />
          </Field>
          <Field label={`Target band: ${target}`}>
            <input type="range" min={5} max={9} step={0.5} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            Timed (auto-submit when time runs out)
          </label>
          <ErrorBox message={error} />
          {phase === "loading" ? (
            <Spinner label={`Writing your passages… ${loaded}/${count} ready (about 30–60 seconds)`} />
          ) : (
            <Button onClick={start}>Generate test</Button>
          )}
        </Card>
      </div>
    );
  }

  const groups = passages.flatMap((p) => p?.groups ?? []);
  const { correct, total } = score(groups, answers);
  const answered = Object.values(answers).filter((v) => v.trim()).length;
  const p = passages[active]!;

  return (
    <div>
      <PageHeader
        title="Reading test"
        subtitle={phase === "test" ? `${answered}/${total} answered` : undefined}
        right={
          <div className="flex items-center gap-3">
            {phase === "test" && timed && <TimerPill left={left} />}
            {phase === "test" ? (
              <Button onClick={() => confirm("Submit your answers?") && submit()}>Submit</Button>
            ) : (
              <Button variant="secondary" onClick={() => setPhase("setup")}>New test</Button>
            )}
          </div>
        }
      />

      {phase === "done" && (
        <Card className="mb-6 flex flex-wrap items-center gap-6">
          <BandBadge band={rawToBand(correct, total, "reading")} size="lg" />
          <div>
            <p className="text-lg font-semibold">
              {correct} / {total} correct
            </p>
            <p className="text-sm text-muted">Review each answer below — explanations quote the passage.</p>
          </div>
        </Card>
      )}

      {passages.length > 1 && (
        <div className="mb-4 flex gap-2">
          {passages.map((_, i) => (
            <Button key={i} variant={active === i ? "primary" : "secondary"} onClick={() => setActive(i)}>
              Passage {i + 1}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <h2 className="mb-4 text-xl font-bold">{p.title}</h2>
          <div className="reading-text flex flex-col gap-4">
            {p.paragraphs.map((para, i) => (
              <p key={i}>
                <span className="mr-2 font-sans text-sm font-bold text-accent">{String.fromCharCode(65 + i)}</span>
                {para}
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <QuestionSet
            groups={p.groups}
            answers={answers}
            onChange={(n, v) => setAnswers((a) => ({ ...a, [n]: v }))}
            submitted={phase === "done"}
          />
        </Card>
      </div>
    </div>
  );
}
