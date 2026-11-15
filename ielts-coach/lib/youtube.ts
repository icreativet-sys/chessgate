export interface Cue {
  start: number; // seconds
  dur: number;
  text: string;
}

export function parseVideoId(input: string): string | null {
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

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Track {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

/**
 * Fetches English captions for a YouTube video.
 * YouTube changes this regularly, so callers must fall back to a pasted transcript.
 */
export async function fetchTranscript(videoId: string): Promise<{ title: string; cues: Cue[] }> {
  const page = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!page.ok) throw new Error(`YouTube returned ${page.status}`);
  const html = await page.text();
  const title = decodeEntities(html.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/ - YouTube$/, "") ?? "");
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];

  let tracks: Track[] = [];

  // 1) Innertube player API with the Android client (most reliable caption URLs).
  if (apiKey) {
    const r = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", hl: "en" } },
        videoId,
      }),
    });
    if (r.ok) {
      const data = await r.json();
      tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    }
  }

  // 2) Fall back to the tracks embedded in the watch page.
  if (!tracks.length) {
    const m = html.match(/"captionTracks":(\[.*?\])/);
    if (m) {
      try {
        tracks = JSON.parse(m[1]);
      } catch {}
    }
  }

  if (!tracks.length) throw new Error("This video has no captions available.");

  const en = tracks.filter((t) => t.languageCode?.startsWith("en"));
  const pick = en.find((t) => t.kind !== "asr") ?? en[0] ?? tracks[0];
  const url = pick.baseUrl.replace(/&fmt=[^&]*/, "");
  const xmlRes = await fetch(url, { headers: { "User-Agent": UA } });
  const xml = await xmlRes.text();
  if (!xml.trim()) throw new Error("YouTube returned an empty transcript.");

  const cues: Cue[] = [];
  // Classic format: <text start="1.2" dur="3.4">...</text>
  for (const m of xml.matchAll(/<text start="([\d.]+)"(?: dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)) {
    cues.push({ start: Number(m[1]), dur: Number(m[2] ?? 0), text: decodeEntities(m[3]) });
  }
  // srv3 format: <p t="1200" d="3400">...</p>
  if (!cues.length) {
    for (const m of xml.matchAll(/<p t="(\d+)"(?: d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g)) {
      cues.push({ start: Number(m[1]) / 1000, dur: Number(m[2] ?? 0) / 1000, text: decodeEntities(m[3]) });
    }
  }
  const clean = cues.filter((c) => c.text);
  if (!clean.length) throw new Error("Could not read the transcript format.");
  return { title, cues: clean };
}
