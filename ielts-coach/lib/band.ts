// Official-style raw score → band conversions (out of 40).
const READING_ACADEMIC: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [1, 1],
];
const LISTENING: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [1, 1],
];

/** Scales a score on any number of questions to /40 then looks up the band. */
export function rawToBand(correct: number, total: number, skill: "reading" | "listening"): number {
  if (total <= 0) return 0;
  const scaled = Math.round((correct / total) * 40);
  const table = skill === "reading" ? READING_ACADEMIC : LISTENING;
  for (const [min, band] of table) if (scaled >= min) return band;
  return 0;
}

/** IELTS rounds the average of criteria to the nearest half band (.25 → up, .75 → up). */
export function roundBand(x: number): number {
  return Math.round(x * 2) / 2;
}
