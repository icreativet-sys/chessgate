import { z } from "zod";
import { fetchTranscript, parseVideoId } from "@/lib/youtube";

export const maxDuration = 60;

const Body = z.object({ url: z.string().min(5).max(500) });

export async function POST(req: Request) {
  try {
    const { url } = Body.parse(await req.json());
    const id = parseVideoId(url);
    if (!id) return Response.json({ error: "That doesn't look like a YouTube link." }, { status: 400 });
    const { title, cues } = await fetchTranscript(id);
    return Response.json({ videoId: id, title, cues });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not fetch captions.";
    return Response.json(
      { error: `${message} You can paste the transcript manually instead (YouTube → ⋯ → Show transcript).` },
      { status: 422 },
    );
  }
}
