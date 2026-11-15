import { BandBadge, Card } from "./ui";

export function CriterionCard({ name, band, comment }: { name: string; band: number; comment: string }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{name}</h4>
        <BandBadge band={band} />
      </div>
      <p className="text-sm text-muted">{comment}</p>
    </Card>
  );
}

export function ListCard({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" }) {
  if (!items.length) return null;
  return (
    <Card>
      <h4 className={`mb-2 font-semibold ${tone === "good" ? "text-good" : "text-warn"}`}>{title}</h4>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </Card>
  );
}

export function CorrectionsCard({
  title,
  items,
}: {
  title: string;
  items: { original: string; corrected: string; why: string }[];
}) {
  if (!items.length) return null;
  return (
    <Card>
      <h4 className="mb-3 font-semibold">{title}</h4>
      <div className="flex flex-col gap-3">
        {items.map((c, i) => (
          <div key={i} className="rounded-lg bg-surface-2 p-3 text-sm">
            <p className="text-bad line-through decoration-bad/50">{c.original}</p>
            <p className="mt-1 font-medium text-good">{c.corrected}</p>
            <p className="mt-1 text-muted">{c.why}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function VocabCard({ items }: { items: { used: string; better: string }[] }) {
  if (!items.length) return null;
  return (
    <Card>
      <h4 className="mb-3 font-semibold">Vocabulary upgrades</h4>
      <div className="flex flex-col gap-2 text-sm">
        {items.map((v, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-surface-2 px-2 py-0.5">{v.used}</span>
            <span className="text-muted">→</span>
            <span className="rounded bg-good-soft px-2 py-0.5 font-medium text-good">{v.better}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
