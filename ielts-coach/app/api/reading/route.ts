import { z } from "zod";
import { generate, errorResponse } from "@/lib/claude";
import { EXAMINER_SYSTEM, QUESTION_RULES } from "@/lib/prompts";
import { ReadingPassage } from "@/lib/schemas";

export const maxDuration = 300;

const Body = z.object({
  passageNumber: z.number().int().min(1).max(3),
  startQuestion: z.number().int().min(1).max(40),
  topic: z.string().max(200).optional(),
  targetBand: z.number().min(4).max(9).default(7),
});

const LEVEL: Record<number, string> = {
  1: "Passage 1 (easiest): factual, descriptive text such as popular science or history; ~750 words.",
  2: "Passage 2 (medium): workplace/social/scientific text with some argument; ~850 words.",
  3: "Passage 3 (hardest): academic, argumentative text with complex ideas and opinions; ~950 words.",
};

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const count = body.passageNumber === 3 ? 14 : 13;
    const passage = await generate({
      system: EXAMINER_SYSTEM,
      schema: ReadingPassage,
      effort: "medium",
      prompt: `Write one original IELTS Academic Reading passage with questions.

${LEVEL[body.passageNumber]}
Topic: ${body.topic?.trim() || "choose an interesting academic topic (science, environment, history, psychology, technology, culture...)"}.
The candidate is targeting band ${body.targetBand}; keep authentic exam difficulty.
Use 5-8 paragraphs.

Write exactly ${count} questions numbered ${body.startQuestion} to ${body.startQuestion + count - 1}, in 2-3 question groups using different types.
${body.passageNumber === 3 ? "Prefer ynng (writer's views), mcq and matching for this passage." : ""}
For matching-headings groups, the paragraph labels are A, B, C... in order.

${QUESTION_RULES}`,
    });
    return Response.json(passage);
  } catch (err) {
    return errorResponse(err);
  }
}
