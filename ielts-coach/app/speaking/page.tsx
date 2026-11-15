"use client";

import { useEffect, useState } from "react";
import { CorrectionsCard, CriterionCard, ListCard, VocabCard } from "@/components/Feedback";
import { BandBadge, Button, Card, ErrorBox, Field, PageHeader, Spinner, formatTime, inputClass, speak, useCountdown } from "@/components/ui";
import { postJSON } from "@/lib/api";
import { saveAttempt } from "@/lib/history";
import type { SpeakingFeedback, SpeakingQuestions } from "@/lib/schemas";
import { countLongPauses, useSpeechRecorder } from "@/lib/useSpeechRecorder";

type Part = 1 | 2 | 3;
type Feedback = SpeakingFeedback & { wpm: number; words: number };
const LOW_CONF = 0.75;

export default function SpeakingPage() {
  const [part, setPart] = useState<Part>(1);
  const [topic, setTopic] = useState("");
  const [qs, setQs] = useState<SpeakingQuestions | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getQuestions() {
    setError(null);
    setLoading(true);
    try {
      const out = await postJSON<SpeakingQuestions>("/api/speaking/questions", { part, topic: topic || undefined });
      setQs(out);
      setIdx(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!qs) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Speaking" subtitle="Answer out loud. The AI checks fluency, vocabulary, grammar and pronunciation, and tells you what was missing." />
        <Card className="flex flex-col gap-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {([1, 2, 3] as Part[]).map((p) => (
              <Button key={p} variant={part === p ? "primary" : "secondary"} onClick={() => setPart(p)} className="flex-col py-3">
                <span>Part {p}</span>
                <span className="text-xs opacity-75">{p === 1 ? "Short questions" : p === 2 ? "Cue card, 2 min talk" : "Discussion"}</span>
              </Button>
            ))}
          </div>
          <Field label="Topic (optional)">
            <input className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. travel, technology, your hometown" />
          </Field>
          <BrowserNote />
          <ErrorBox message={error} />
          {loading ? <Spinner label="Preparing questions…" /> : <Button onClick={getQuestions}>Start</Button>}
        </Card>
      </div>
    );
  }

  const question =
    part === 2 ? `${qs.questions[0]}\nYou should say:\n${qs.cueCardPoints.map((p) => `• ${p}`).join("\n")}` : qs.questions[idx];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Speaking Part ${part}`}
        subtitle={`Topic: ${qs.topic}${part !== 2 ? ` · Question ${idx + 1} of ${qs.questions.length}` : ""}`}
        right={<Button variant="secondary" onClick={() => setQs(null)}>New topic</Button>}
      />
      <AnswerRound
        key={`${qs.topic}-${idx}`}
        part={part}
        question={question}
        cue={part === 2 ? qs : null}
        onNext={part !== 2 && idx < qs.questions.length - 1 ? () => setIdx(idx + 1) : undefined}
      />
    </div>
  );
}

function BrowserNote() {
  return (
    <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
      Works best in <b>Google Chrome</b> or <b>Microsoft Edge</b> (desktop or Android) with a headset microphone. Your speech is
      converted to text by the browser; the AI then judges it. Pronunciation feedback is estimated from which words the
      recogniser struggled to understand.
    </p>
  );
}

function AnswerRound({
  part,
  question,
  cue,
  onNext,
}: {
  part: Part;
  question: string;
  cue: SpeakingQuestions | null;
  onNext?: () => void;
}) {
  const rec = useSpeechRecorder();
  const [stage, setStage] = useState<"ready" | "prep" | "talk" | "review" | "grading" | "done">(part === 2 ? "prep" : "ready");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maxTalk = part === 2 ? 120 : part === 3 ? 90 : 60;

  // Examiner reads the question (Part 1/3) when the round opens.
  useEffect(() => {
    if (part !== 2) speak(question);
  }, [part, question]);

  const prepLeft = useCountdown(60, stage === "prep", () => startTalking());

  useEffect(() => {
    if (rec.recording && rec.elapsed >= maxTalk) finishTalking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.elapsed, rec.recording]);

  async function startTalking() {
    window.speechSynthesis?.cancel();
    await rec.start();
    setStage("talk");
  }
  function finishTalking() {
    rec.stop();
    setStage("review");
  }

  const transcript = rec.segments.map((s) => s.text).join(" ");

  async function evaluate() {
    setError(null);
    setStage("grading");
    try {
      const low = rec.segments
        .filter((s) => s.confidence > 0 && s.confidence < LOW_CONF)
        .map((s) => ({ text: s.text, confidence: s.confidence, alternatives: s.alternatives }));
      const out = await postJSON<Feedback>("/api/speaking/evaluate", {
        part,
        question,
        transcript,
        seconds: Math.max(1, rec.elapsed),
        lowConfidence: low,
        longPauses: countLongPauses(rec.segments),
      });
      setFb(out);
      setStage("done");
      saveAttempt({ skill: "speaking", band: out.overall, title: `Part ${part}: ${question.split("\n")[0]}`, detail: `${out.wpm} wpm` });
    } catch (e) {
      setError((e as Error).message);
      setStage("review");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            {cue ? (
              <>
                <p className="text-lg font-semibold">{cue.questions[0]}</p>
                <p className="mt-2 text-sm text-muted">You should say:</p>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {cue.cueCardPoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-lg font-semibold">{question}</p>
            )}
          </div>
          <Button variant="ghost" onClick={() => speak(question)} title="Hear the question">🔊</Button>
        </div>
      </Card>

      {!rec.supported && (
        <ErrorBox message="This browser doesn't support speech recognition. Please open the app in Google Chrome or Microsoft Edge." />
      )}
      <ErrorBox message={rec.error} />

      <Card className="flex flex-col items-center gap-4 py-8">
        {stage === "prep" && (
          <>
            <p className="text-sm text-muted">Preparation time — make notes, then talk for 1–2 minutes.</p>
            <p className="font-mono text-4xl tabular-nums">{formatTime(prepLeft)}</p>
            <Button onClick={startTalking} disabled={!rec.supported}>I'm ready — start speaking</Button>
          </>
        )}
        {stage === "ready" && (
          <Button onClick={startTalking} disabled={!rec.supported} className="h-20 w-20 !rounded-full !text-3xl" aria-label="Start recording">
            🎤
          </Button>
        )}
        {stage === "talk" && (
          <>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-bad" />
              <span className="font-mono text-2xl tabular-nums">{formatTime(rec.elapsed)}</span>
              <span className="text-sm text-muted">/ {formatTime(maxTalk)}</span>
            </div>
            <p className="min-h-12 max-w-2xl text-center text-sm">
              {transcript} <span className="text-muted">{rec.interim}</span>
            </p>
            <Button variant="danger" onClick={finishTalking}>Stop</Button>
          </>
        )}
        {(stage === "review" || stage === "grading" || stage === "done") && (
          <div className="flex w-full flex-col gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                What the recogniser heard ({formatTime(rec.elapsed)})
              </p>
              <p className="text-sm leading-relaxed">
                {rec.segments.length === 0 && <span className="text-muted">Nothing was recognised. Check your microphone and try again.</span>}
                {rec.segments.map((s, i) => (
                  <span
                    key={i}
                    className={s.confidence > 0 && s.confidence < LOW_CONF ? "rounded bg-warn-soft px-0.5 text-warn" : ""}
                    title={s.confidence ? `confidence ${(s.confidence * 100).toFixed(0)}%` : undefined}
                  >
                    {s.text}{" "}
                  </span>
                ))}
              </p>
              {rec.segments.some((s) => s.confidence > 0 && s.confidence < LOW_CONF) && (
                <p className="mt-1 text-xs text-warn">Highlighted parts were hard for the recogniser to understand.</p>
              )}
            </div>
            {rec.audioUrl && <audio controls src={rec.audioUrl} className="w-full" />}
            <div className="flex flex-wrap gap-2">
              {stage === "review" && (
                <>
                  <Button onClick={evaluate} disabled={!transcript}>Get feedback</Button>
                  <Button variant="secondary" onClick={startTalking}>Record again</Button>
                </>
              )}
              {stage === "grading" && <Spinner label="Examiner is listening to your answer…" />}
              {stage === "done" && onNext && <Button onClick={onNext}>Next question →</Button>}
              {stage === "done" && <Button variant="secondary" onClick={startTalking}>Try this question again</Button>}
            </div>
          </div>
        )}
        <ErrorBox message={error} />
      </Card>

      {fb && <SpeakingFeedbackView fb={fb} />}
    </div>
  );
}

function SpeakingFeedbackView({ fb }: { fb: Feedback }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-6">
        <BandBadge band={fb.overall} size="lg" />
        <div>
          <p className="text-lg font-semibold">Estimated band {fb.overall.toFixed(1)}</p>
          <p className="text-sm text-muted">
            {fb.words} words · {fb.wpm} words per minute {fb.wpm < 100 ? "(a bit slow)" : fb.wpm > 180 ? "(very fast)" : "(good pace)"}
          </p>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CriterionCard name="Fluency & Coherence" {...fb.fluency} />
        <CriterionCard name="Lexical Resource" {...fb.lexical} />
        <CriterionCard name="Grammar" {...fb.grammar} />
        <CriterionCard name="Pronunciation" {...fb.pronunciation} />
      </div>

      {fb.pronunciationTips.length > 0 && (
        <Card>
          <h4 className="mb-3 font-semibold">How to pronounce these words</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {fb.pronunciationTips.map((t, i) => (
              <div key={i} className="flex gap-3 rounded-lg bg-surface-2 p-3 text-sm">
                <Button variant="secondary" className="h-9 w-9 shrink-0 p-0" onClick={() => speak(t.word, 0.75)} title="Listen">
                  🔊
                </Button>
                <div>
                  <p>
                    <span className="font-semibold">{t.word}</span> <span className="font-mono text-accent">{t.ipa}</span>
                    {t.heardAs && <span className="text-muted"> · heard as “{t.heardAs}”</span>}
                  </p>
                  <p className="mt-1 text-muted">{t.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ListCard title="What was missing" items={fb.missing} tone="warn" />
      <div className="grid gap-4 lg:grid-cols-2">
        <CorrectionsCard title="Grammar fixes" items={fb.grammarFixes} />
        <VocabCard items={fb.betterVocabulary} />
      </div>
      <Card>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="font-semibold">Model answer (Band 8–9) — listen and repeat</h4>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => speak(fb.modelAnswer, 0.9)}>🔊 Play</Button>
            <Button variant="ghost" onClick={() => window.speechSynthesis?.cancel()}>Stop</Button>
          </div>
        </div>
        <p className="text-sm leading-relaxed">{fb.modelAnswer}</p>
      </Card>
    </div>
  );
}
