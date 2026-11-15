import { z } from "zod";
import { generate, errorResponse } from "@/lib/claude";
import { EXAMINER_SYSTEM } from "@/lib/prompts";
import { SpeakingQuestions } from "@/lib/schemas";

export const maxDuration = 120;

const Body = z.object({
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  topic: z.string().max(200).optional(),
});

const PART: Record<number, string> = {
  1: "Part 1: 4-5 short questions about a familiar everyday topic (home, work/study, hobbies, food, weather...). cueCardPoints must be empty.",
  2: "Part 2: one cue card. Put the 'Describe ...' line as the only item in questions, and 3-4 'You should say' points in cueCardPoints (the last usually starts with 'and explain ...').",
  3: "Part 3: 4-5 abstract discussion questions that ask for opinions, comparisons, predictions and reasons. cueCardPoints must be empty.",
};

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const out = await generate({
      system: EXAMINER_SYSTEM,
      schema: SpeakingQuestions,
      effort: "low",
      prompt: `Create IELTS Speaking ${PART[body.part]}
Topic: ${body.topic?.trim() || "pick a common, realistic IELTS topic"}.`,
    });
    return Response.json(out);
  } catch (err) {
    return errorResponse(err);
  }
}
