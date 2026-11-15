import { z } from "zod";
import { generate, errorResponse } from "@/lib/claude";
import { EXAMINER_SYSTEM } from "@/lib/prompts";
import { ChartSpec, WritingFeedback } from "@/lib/schemas";

export const maxDuration = 300;

const Body = z.object({
  task: z.union([z.literal(1), z.literal(2)]),
  prompt: z.string().min(10).max(4000),
  chart: ChartSpec.optional(),
  essay: z.string().min(20, "Write a bit more before submitting.").max(20000),
  minutesUsed: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const words = body.essay.trim().split(/\s+/).filter(Boolean).length;
    const minWords = body.task === 1 ? 150 : 250;
    const feedback = await generate({
      system: EXAMINER_SYSTEM,
      schema: WritingFeedback,
      effort: "high",
      prompt: `Mark this IELTS Academic Writing Task ${body.task} response using the official public band descriptors.

<question>
${body.prompt}
</question>
${body.chart ? `\n<chart_data>\n${JSON.stringify(body.chart)}\n</chart_data>\nCheck the candidate's figures and trends against this data; inaccurate data or a missing overview limits Task Achievement.\n` : ""}
<candidate_response words="${words}" minimum="${minWords}"${body.minutesUsed ? ` minutes_used="${Math.round(body.minutesUsed)}"` : ""}>
${body.essay}
</candidate_response>

Marking rules:
- Give each of the four criteria a band (whole or half) with a specific comment that cites the essay.
- Overall = mean of the four criteria rounded to the nearest 0.5${body.task === 2 ? "" : " (Task 1 alone)"}.
- ${words < minWords ? `The response is under ${minWords} words: penalise Task ${body.task === 1 ? "Achievement" : "Response"} accordingly and say so.` : "Word count is sufficient."}
- Be honest; do not inflate. Write feedback the candidate can act on.
- "improvedVersion" keeps the candidate's ideas and structure where possible but at Band 8-9 language.`,
    });
    return Response.json({ ...feedback, words });
  } catch (err) {
    return errorResponse(err);
  }
}
