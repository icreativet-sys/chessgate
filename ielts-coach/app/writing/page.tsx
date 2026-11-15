"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from "@/components/Chart";
import { CorrectionsCard, CriterionCard, ListCard, VocabCard } from "@/components/Feedback";
import { BandBadge, Button, Card, ErrorBox, Field, PageHeader, Spinner, TimerPill, inputClass, useCountdown } from "@/components/ui";
import { postJSON } from "@/lib/api";
import { loadJSON, saveAttempt, saveJSON } from "@/lib/history";
import type { Task1Prompt, Task2Prompt, WritingFeedback } from "@/lib/schemas";

type Task = 1 | 2;
type Phase = "setup" | "loading" | "writing" | "grading" | "done";
type Prompt = { task: 1; data: Task1Prompt } | { task: 2; data: Task2Prompt };

const ESSAY_TYPES = ["Any", "Opinion (agree/disagree)", "Discussion (both views)", "Advantages & disadvantages", "Problem & solution", "Two-part question"];
const DRAFT_KEY = "ielts-coach:writing-draft";

export default function WritingPage() {
  const [task, setTask] = useState<Task>(2);
  const [phase, setPhase] = useState<Phase>("setup");
  const [chartType, setChartType] = useState("any");
  const [essayType, setEssayType] = useState("Any");
  const [topic, setTopic] = useState("");
  const [ownPrompt, setOwnPrompt] = useState("");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [essay, setEssay] = useState("");
  const [feedback, setFeedback] = useState<(WritingFeedback & { words: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  // Restore an unfinished essay after a refresh.
  useEffect(() => {
    const d = loadJSON<{ prompt: Prompt; essay: string } | null>(DRAFT_KEY, null);
    if (d?.prompt) {
      setPrompt(d.prompt);
      setTask(d.prompt.task);
      setEssay(d.essay);
      setPhase("writing");
      startedAt.current = Date.now();
    }
  }, []);
  useEffect(() => {
    if (phase === "writing" && prompt) saveJSON(DRAFT_KEY, { prompt, essay });
  }, [essay, prompt, phase]);

  const minutes = task === 1 ? 20 : 40;
  const left = useCountdown(minutes * 60, phase === "writing");
  const words = essay.trim().split(/\s+/).filter(Boolean).length;
  const minWords = task === 1 ? 150 : 250;

  async function newPrompt() {
    setError(null);
    if (task === 2 && ownPrompt.trim()) {
      return beginWriting({ task: 2, data: { essayType: "Custom", prompt: ownPrompt.trim() } });
    }
    setPhase("loading");
    try {
      if (task === 1) {
        const data = await postJSON<Task1Prompt>("/api/writing/prompt", { task: 1, chartType, topic: topic || undefined });
        beginWriting({ task: 1, data });
      } else {
        const data = await postJSON<Task2Prompt>("/api/writing/prompt", {
          task: 2,
          essayType: essayType === "Any" ? undefined : essayType,
          topic: topic || undefined,
        });
        beginWriting({ task: 2, data });
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  }

  function beginWriting(p: Prompt) {
    setPrompt(p);
    setEssay("");
    setFeedback(null);
    startedAt.current = Date.now();
    setPhase("writing");
  }

  async function grade() {
    if (!prompt) return;
    setError(null);
    setPhase("grading");
    try {
      const fb = await postJSON<WritingFeedback & { words: number }>("/api/writing/grade", {
        task: prompt.task,
        prompt: prompt.data.prompt,
        chart: prompt.task === 1 ? prompt.data.chart : undefined,
        essay,
        minutesUsed: (Date.now() - startedAt.current) / 60000,
      });
      setFeedback(fb);
      setPhase("done");
      saveJSON(DRAFT_KEY, null);
      saveAttempt({
        skill: "writing",
        band: fb.overall,
        title: `Task ${prompt.task}: ${prompt.data.prompt.slice(0, 80)}`,
        detail: `${fb.words} words`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
      setPhase("writing");
    }
  }

  function reset() {
    saveJSON(DRAFT_KEY, null);
    setPrompt(null);
    setFeedback(null);
    setEssay("");
    setPhase("setup");
  }

  if (phase === "setup" || phase === "loading") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Writing" subtitle="Task 1 (describe a chart, 150+ words, 20 min) or Task 2 (essay, 250+ words, 40 min)." />
        <Card className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-2">
            {([1, 2] as Task[]).map((t) => (
              <Button key={t} variant={task === t ? "primary" : "secondary"} onClick={() => setTask(t)} className="py-3">
                Task {t} — {t === 1 ? "Diagram / chart" : "Main essay"}
              </Button>
            ))}
          </div>
          {task === 1 ? (
            <Field label="Chart type">
              <select className={inputClass} value={chartType} onChange={(e) => setChartType(e.target.value)}>
                <option value="any">Surprise me</option>
                <option value="bar">Bar chart</option>
                <option value="line">Line graph</option>
                <option value="pie">Pie chart</option>
                <option value="table">Table</option>
              </select>
            </Field>
          ) : (
            <Field label="Essay type">
              <select className={inputClass} value={essayType} onChange={(e) => setEssayType(e.target.value)}>
                {ESSAY_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Topic (optional)">
            <input className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. education, transport, energy, health" />
          </Field>
          {task === 2 && (
            <Field label="…or paste your own Task 2 question (optional)">
              <textarea className={`${inputClass} h-24`} value={ownPrompt} onChange={(e) => setOwnPrompt(e.target.value)} />
            </Field>
          )}
          <ErrorBox message={error} />
          {phase === "loading" ? <Spinner label="Creating your question…" /> : <Button onClick={newPrompt}>Start writing</Button>}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Writing Task ${prompt!.task}`}
        right={
          <div className="flex items-center gap-3">
            {phase === "writing" && <TimerPill left={left} />}
            <Button variant="secondary" onClick={() => (phase === "done" || confirm("Discard this essay?")) && reset()}>
              New question
            </Button>
          </div>
        }
      />

      {phase === "done" && feedback && <FeedbackView fb={feedback} task={prompt!.task} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            {prompt!.task === 2 && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{prompt!.data.essayType}</p>}
            <p className="whitespace-pre-line text-sm leading-relaxed">{prompt!.data.prompt}</p>
          </Card>
          {prompt!.task === 1 && <Chart spec={prompt!.data.chart} />}
        </div>
        <Card className="flex flex-col gap-3">
          <textarea
            className={`${inputClass} reading-text min-h-[28rem] flex-1 resize-y text-base`}
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            readOnly={phase !== "writing"}
            placeholder="Write your answer here…"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`text-sm tabular-nums ${words >= minWords ? "text-good" : "text-muted"}`}>
              {words} / {minWords} words
            </span>
            {phase === "writing" && (
              <Button onClick={grade} disabled={words < 20}>
                Submit for marking
              </Button>
            )}
            {phase === "grading" && <Spinner label="Examiner is marking your essay… (up to a minute)" />}
          </div>
          <ErrorBox message={error} />
          <p className="text-xs text-muted">Spell-check is off, like the real computer-delivered test. Your draft is saved in this browser.</p>
        </Card>
      </div>
    </div>
  );
}

function FeedbackView({ fb, task }: { fb: WritingFeedback & { words: number }; task: Task }) {
  const [showImproved, setShowImproved] = useState(false);
  return (
    <div className="mb-8 flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-6">
        <BandBadge band={fb.overall} size="lg" />
        <div>
          <p className="text-lg font-semibold">Estimated band {fb.overall.toFixed(1)}</p>
          <p className="text-sm text-muted">{fb.words} words · AI estimate based on the public IELTS band descriptors</p>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CriterionCard name={task === 1 ? "Task Achievement" : "Task Response"} {...fb.taskResponse} />
        <CriterionCard name="Coherence & Cohesion" {...fb.coherence} />
        <CriterionCard name="Lexical Resource" {...fb.lexical} />
        <CriterionCard name="Grammar" {...fb.grammar} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="What you did well" items={fb.strengths} tone="good" />
        <ListCard title="Fix these to reach the next band" items={fb.improvements} tone="warn" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CorrectionsCard title="Sentence corrections" items={fb.corrections} />
        <VocabCard items={fb.vocabulary} />
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Band 8–9 version of your essay</h4>
          <Button variant="secondary" onClick={() => setShowImproved((s) => !s)}>
            {showImproved ? "Hide" : "Show"}
          </Button>
        </div>
        {showImproved && <p className="reading-text mt-3 whitespace-pre-line text-sm">{fb.improvedVersion}</p>}
      </Card>
    </div>
  );
}
