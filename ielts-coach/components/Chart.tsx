import type { ChartSpec } from "@/lib/schemas";

const COLORS = ["#4263eb", "#f08c00", "#2f9e44", "#d6336c", "#7048e8", "#1098ad"];

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

const fmt = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString() : String(Math.round(v * 100) / 100));

export function Chart({ spec }: { spec: ChartSpec }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-3 text-center text-sm font-semibold">{spec.title}</figcaption>
      {spec.chartType === "table" ? (
        <TableChart spec={spec} />
      ) : spec.chartType === "pie" ? (
        <PieChart spec={spec} />
      ) : (
        <AxisChart spec={spec} />
      )}
      {spec.chartType !== "table" && spec.chartType !== "pie" && spec.series.length > 1 && <Legend spec={spec} />}
    </figure>
  );
}

function Legend({ spec }: { spec: ChartSpec }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
      {spec.series.map((s, i) => (
        <span key={s.name} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function AxisChart({ spec }: { spec: ChartSpec }) {
  const W = 640, H = 340, L = 56, R = 16, T = 12, B = 56;
  const cw = W - L - R, ch = H - T - B;
  const all = spec.series.flatMap((s) => s.values);
  const max = niceMax(Math.max(...all, 0));
  const ticks = 5;
  const y = (v: number) => T + ch - (v / max) * ch;
  const n = spec.categories.length;
  const band = cw / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={spec.title}>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i;
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.7}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
      <text
        transform={`translate(14 ${T + ch / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={11}
        fill="currentColor"
        opacity={0.7}
      >
        {spec.unit}
      </text>
      {spec.categories.map((c, i) => (
        <text
          key={c + i}
          x={L + band * i + band / 2}
          y={H - B + 18}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          opacity={0.8}
        >
          {c.length > 14 ? c.slice(0, 13) + "…" : c}
        </text>
      ))}

      {spec.chartType === "bar" &&
        spec.series.map((s, si) => {
          const gw = band * 0.75;
          const bw = gw / spec.series.length;
          return s.values.map((v, i) => (
            <rect
              key={`${si}-${i}`}
              x={L + band * i + (band - gw) / 2 + bw * si + 1}
              y={y(v)}
              width={Math.max(1, bw - 2)}
              height={Math.max(0, T + ch - y(v))}
              rx={2}
              fill={COLORS[si % COLORS.length]}
            >
              <title>{`${s.name} – ${spec.categories[i]}: ${fmt(v)} ${spec.unit}`}</title>
            </rect>
          ));
        })}

      {spec.chartType === "line" &&
        spec.series.map((s, si) => {
          const pts = s.values.map((v, i) => [L + band * i + band / 2, y(v)] as const);
          return (
            <g key={si}>
              <polyline
                points={pts.map((p) => p.join(",")).join(" ")}
                fill="none"
                stroke={COLORS[si % COLORS.length]}
                strokeWidth={2.5}
              />
              {pts.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r={4} fill={COLORS[si % COLORS.length]}>
                  <title>{`${s.name} – ${spec.categories[i]}: ${fmt(s.values[i])} ${spec.unit}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      <line x1={L} x2={W - R} y1={T + ch} y2={T + ch} stroke="currentColor" strokeOpacity={0.4} />
    </svg>
  );
}

function PieChart({ spec }: { spec: ChartSpec }) {
  const pies = spec.series.slice(0, 2);
  return (
    <div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${pies.length}, minmax(0, 1fr))` }}>
        {pies.map((s) => {
          const total = s.values.reduce((a, b) => a + b, 0) || 1;
          let angle = -Math.PI / 2;
          return (
            <div key={s.name} className="flex flex-col items-center">
              <svg viewBox="-110 -110 220 220" className="w-full max-w-64" role="img" aria-label={s.name}>
                {s.values.map((v, i) => {
                  const a0 = angle;
                  const a1 = angle + (v / total) * Math.PI * 2;
                  angle = a1;
                  const large = a1 - a0 > Math.PI ? 1 : 0;
                  const r = 100;
                  const mid = (a0 + a1) / 2;
                  return (
                    <g key={i}>
                      <path
                        d={`M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`}
                        fill={COLORS[i % COLORS.length]}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      >
                        <title>{`${spec.categories[i]}: ${fmt(v)}${spec.unit}`}</title>
                      </path>
                      {v / total > 0.05 && (
                        <text
                          x={62 * Math.cos(mid)}
                          y={62 * Math.sin(mid) + 4}
                          textAnchor="middle"
                          fontSize={12}
                          fontWeight={700}
                          fill="#fff"
                        >
                          {fmt(v)}
                          {spec.unit === "%" ? "%" : ""}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              <span className="mt-1 text-sm font-medium">{s.name}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
        {spec.categories.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function TableChart({ spec }: { spec: ChartSpec }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-border bg-surface-2 p-2 text-left" />
            {spec.series.map((s) => (
              <th key={s.name} className="border border-border bg-surface-2 p-2 text-right">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.categories.map((c, i) => (
            <tr key={c}>
              <td className="border border-border p-2 font-medium">{c}</td>
              {spec.series.map((s) => (
                <td key={s.name} className="border border-border p-2 text-right tabular-nums">
                  {fmt(s.values[i] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-right text-xs text-muted">Unit: {spec.unit}</p>
    </div>
  );
}
