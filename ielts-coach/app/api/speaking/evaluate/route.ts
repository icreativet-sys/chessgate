import { z } from "zod";
import { generate, errorResponse } from "@/lib/claude";
import { EXAMINER_SYSTEM } from "@/lib/prompts";
import { SpeakingFeedback } from "@/lib/schemas";

export const maxDuration = 300;

const Body = z.object({
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  question: z.string().min(3).max(2000),
  transcript: z.string().min(1, "Nothing was recorded. Try again and speak clearly.").max(20000),
  seconds: z.number().min(1),
  lowConfidence: z
    .array(z.object({ text: z.string(), confidence: z.number(), alternatives: z.array(z.string()) }))
    .max(200),
  longPauses: z.number().int().min(0),
});

export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const words = b.transcript.trim().split(/\s+/).filter(Boolean).length;
    const wpm = Math.round((words / b.seconds) * 60);
    const feedback = await generate({
      system: EXAMINER_SYSTEM,
      schema: SpeakingFeedback,
      effort: "high",
      prompt: `Assess this IELTS Speaking Part ${b.part} answer against the official public band descriptors.

You cannot hear the audio. You receive the output of a browser speech recogniser plus timing data. Use it as evidence:
- Words/phrases the recogniser was unsure about, or that make no sense in context (e.g. "sink" where "think" fits), very likely signal pronunciation problems. Infer the intended word and the likely sound error (th/s, v/w, l/r, final consonants, vowel length, word stress...).
- Speaking rate and long pauses inform Fluency. Native-like conversational rate is roughly 120-160 wpm.
- Recognisers drop fillers and punctuation, so do not mark punctuation or capitalisation.
- Mark Pronunciation conservatively and say in its comment that it is estimated from recognition accuracy.

<question>
${b.question}
</question>

<recognised_speech words="${words}" seconds="${Math.round(b.seconds)}" words_per_minute="${wpm}" long_pauses_over_3s="${b.longPauses}">
${b.transcript}
</recognised_speech>

<low_confidence_segments>
${b.lowConfidence.length ? b.lowConfidence.map((s) => `- "${s.text}" (confidence ${s.confidence.toFixed(2)}${s.alternatives.length ? `; alternatives heard: ${s.alternatives.map((a) => `"${a}"`).join(", ")}` : ""})`).join("\n") : "(none reported)"}
</low_confidence_segments>

Expected length: ${b.part === 2 ? "Part 2 should last 1.5-2 minutes." : b.part === 1 ? "Part 1 answers are typically 2-4 sentences each." : "Part 3 answers should be developed with reasons and examples, ~45-60 seconds each."}

Give 3-8 pronunciationTips for words that were likely mispronounced or are commonly hard in this answer. In "missing", explain what the answer lacked to reach a higher band. The modelAnswer should sound natural when spoken aloud (no headings or bullet points).`,
    });
    return Response.json({ ...feedback, wpm, words });
  } catch (err) {
    return errorResponse(err);
  }
}
