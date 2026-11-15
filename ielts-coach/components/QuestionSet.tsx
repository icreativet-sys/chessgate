"use client";

import type { Question, QuestionGroup } from "@/lib/schemas";
import { inputClass } from "./ui";

export type Answers = Record<number, string>;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"'.,;:!?()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Leading letter/numeral of an option like "B. something" or "iv. something". */
const optionKey = (s: string) => (s.match(/^\s*([A-Za-z]{1,4})[.)]/)?.[1] ?? s).toLowerCase();

export function isCorrect(q: Question, type: QuestionGroup["type"], given: string | undefined): boolean {
  if (!given?.trim()) return false;
  if (type === "mcq" || type === "matching") return optionKey(given) === optionKey(q.answer);
  if (type === "tfng" || type === "ynng") return norm(given) === norm(q.answer);
  const g = norm(given);
  return [q.answer, ...q.alternatives].some((a) => norm(a) === g || norm(a).replace(/^(a|an|the) /, "") === g);
}

export function score(groups: QuestionGroup[], answers: Answers) {
  let correct = 0;
  let total = 0;
  for (const g of groups)
    for (const q of g.questions) {
      total++;
      if (isCorrect(q, g.type, answers[q.number])) correct++;
    }
  return { correct, total };
}

export function QuestionSet({
  groups,
  answers,
  onChange,
  submitted,
}: {
  groups: QuestionGroup[];
  answers: Answers;
  onChange: (n: number, v: string) => void;
  submitted: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g, gi) => {
        const nums = g.questions.map((q) => q.number);
        return (
          <section key={gi} className="flex flex-col gap-3">
            <div>
              <h3 className="font-semibold">
                Questions {Math.min(...nums)}
                {nums.length > 1 ? `–${Math.max(...nums)}` : ""}
              </h3>
              <p className="text-sm italic text-muted">{g.instructions}</p>
            </div>
            {g.type === "matching" && g.options.length > 0 && (
              <ul className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                {g.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
            {g.questions.map((q) => (
              <QuestionRow
                key={q.number}
                q={q}
                group={g}
                value={answers[q.number] ?? ""}
                onChange={(v) => onChange(q.number, v)}
                submitted={submitted}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function QuestionRow({
  q,
  group,
  value,
  onChange,
  submitted,
}: {
  q: Question;
  group: QuestionGroup;
  value: string;
  onChange: (v: string) => void;
  submitted: boolean;
}) {
  const ok = submitted && isCorrect(q, group.type, value);
  const border = !submitted ? "border-border" : ok ? "border-good/60 bg-good-soft/40" : "border-bad/60 bg-bad-soft/40";

  let input: React.ReactNode;
  if (group.type === "tfng" || group.type === "ynng") {
    const opts = group.type === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];
    input = (
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <Choice key={o} label={o} active={value === o} disabled={submitted} onClick={() => onChange(o)} />
        ))}
      </div>
    );
  } else if (group.type === "mcq") {
    input = (
      <div className="flex flex-col gap-1.5">
        {q.choices.map((c) => (
          <Choice
            key={c}
            label={c}
            active={optionKey(value) === optionKey(c) && !!value}
            disabled={submitted}
            onClick={() => onChange(optionKey(c).toUpperCase())}
            block
          />
        ))}
      </div>
    );
  } else if (group.type === "matching") {
    input = (
      <select
        className={`${inputClass} w-full sm:w-72`}
        value={value}
        disabled={submitted}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose…</option>
        {group.options.map((o) => (
          <option key={o} value={optionKey(o)}>
            {o.length > 70 ? o.slice(0, 70) + "…" : o}
          </option>
        ))}
      </select>
    );
  } else {
    input = (
      <input
        className={`${inputClass} w-full sm:w-72`}
        value={value}
        disabled={submitted}
        placeholder="Your answer"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${border}`}>
      <p className="mb-2 text-sm">
        <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded bg-accent-soft px-1.5 text-xs font-bold text-accent">
          {q.number}
        </span>
        {q.prompt}
      </p>
      {input}
      {submitted && (
        <div className="mt-2 text-sm">
          <p className={ok ? "text-good" : "text-bad"}>
            {ok ? "✓ Correct" : `✗ Answer: ${q.answer}`}
            {!ok && q.alternatives.length > 0 && ` (also: ${q.alternatives.join(", ")})`}
          </p>
          <p className="mt-1 text-muted">{q.explanation}</p>
        </div>
      )}
    </div>
  );
}

function Choice({
  label,
  active,
  disabled,
  onClick,
  block,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  block?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-left text-sm transition ${block ? "w-full" : ""} ${
        active ? "border-accent bg-accent-soft font-medium text-accent" : "border-border hover:bg-surface-2"
      } disabled:cursor-default`}
    >
      {label}
    </button>
  );
}
