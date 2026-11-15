import { z } from "zod";
import { generate, errorResponse } from "@/lib/claude";
import { EXAMINER_SYSTEM } from "@/lib/prompts";
import { Task1Prompt, Task2Prompt } from "@/lib/schemas";

export const maxDuration = 120;

const Body = z.object({
  task: z.union([z.literal(1), z.literal(2)]),
  chartType: z.enum(["any", "bar", "line", "pie", "table"]).default("any"),
  essayType: z.string().max(80).optional(),
  topic: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const topic = body.topic?.trim() ? `Topic area: ${body.topic.trim()}.` : "Choose a varied, realistic topic.";
    if (body.task === 1) {
      const out = await generate({
        system: EXAMINER_SYSTEM,
        schema: Task1Prompt,
        effort: "low",
        prompt: `Create an IELTS Academic Writing Task 1 question with realistic data.
Chart type: ${body.chartType === "any" ? "pick one of bar, line, pie or table" : body.chartType}.
${topic}
Requirements:
- Data must show clear trends/contrasts worth comparing (not random noise) and be plausible.
- bar/line: 4-8 categories (e.g. years or countries), 2-4 series.
- pie: 4-6 slices, 1 or 2 series (e.g. two years), each series sums to 100, unit "%".
- table: 3-6 rows, 2-4 columns (each series is a column).
- The prompt text follows the real format: "The [chart] below shows ... Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."`,
      });
      return Response.json(out);
    }
    const out = await generate({
      system: EXAMINER_SYSTEM,
      schema: Task2Prompt,
      effort: "low",
      prompt: `Create an IELTS Academic Writing Task 2 question.
Essay type: ${body.essayType?.trim() || "any common type"}.
${topic}
Use the real format: a statement or context, then the task (e.g. "To what extent do you agree or disagree?"), then "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."`,
    });
    return Response.json(out);
  } catch (err) {
    return errorResponse(err);
  }
}
