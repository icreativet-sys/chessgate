import { z } from "zod";
import { generate, errorResponse } from "@/lib/claude";
import { EXAMINER_SYSTEM, QUESTION_RULES } from "@/lib/prompts";
import { ListeningTest } from "@/lib/schemas";

export const maxDuration = 300;

const Body = z.object({
  transcript: z.string().min(200, "Transcript is too short to make questions from.").max(120000),
  count: z.number().int().min(5).max(40).default(10),
  videoTitle: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const test = await generate({
      system: EXAMINER_SYSTEM,
      schema: ListeningTest,
      effort: "medium",
      prompt: `Below is the transcript of a recording${body.videoTitle ? ` titled "${body.videoTitle}"` : ""}. The candidate will LISTEN to it (they will not see the transcript) and answer IELTS Listening-style questions.

Write exactly ${body.count} questions numbered 1 to ${body.count}, in 2-4 groups.
Listening rules:
- Questions MUST follow the order of the recording.
- Prefer completion (note/form/sentence/summary completion, "NO MORE THAN TWO WORDS AND/OR A NUMBER"), mcq and matching. Do NOT use tfng or ynng.
- Answers must be words actually spoken, focusing on specific details: names, numbers, dates, places, reasons, opinions.
- Paraphrase the question wording so it is not identical to the recording.
- Spread questions across the whole recording.

${QUESTION_RULES}

<transcript>
${body.transcript}
</transcript>`,
    });
    return Response.json(test);
  } catch (err) {
    return errorResponse(err);
  }
}
