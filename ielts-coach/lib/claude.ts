import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * One structured call to Claude. The response is validated against `schema`
 * and returned as a typed object.
 *
 * `fallbacks: "default"` lets the API retry on another model if a safety
 * classifier declines the request (rare for IELTS material).
 */
export async function generate<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: {
      effort: opts.effort ?? "medium",
      format: betaZodOutputFormat(opts.schema),
    },
  });

  if (res.stop_reason === "refusal") {
    throw new Error("The AI declined this request. Try a different topic or wording.");
  }
  if (res.stop_reason === "max_tokens") {
    throw new Error("The AI response was cut off. Please try again.");
  }
  if (res.parsed_output == null) {
    throw new Error("The AI returned an unexpected format. Please try again.");
  }
  return res.parsed_output as z.infer<S>;
}

/** Converts any thrown error into a JSON response for route handlers. */
export function errorResponse(err: unknown) {
  console.error(err);
  let message = "Something went wrong.";
  let status = 500;
  if (err instanceof Anthropic.AuthenticationError) {
    message = "ANTHROPIC_API_KEY is missing or invalid. Add it to .env.local and restart.";
    status = 401;
  } else if (err instanceof Anthropic.RateLimitError) {
    message = "Rate limited by the AI provider. Wait a moment and try again.";
    status = 429;
  } else if (err instanceof Anthropic.APIConnectionError) {
    message = "Could not reach the AI service. Check your internet connection.";
    status = 502;
  } else if (err instanceof Anthropic.APIError) {
    message = `AI service error: ${err.message}`;
    status = err.status ?? 500;
  } else if (err instanceof Error && /authentication method/i.test(err.message)) {
    message = "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the app.";
    status = 401;
  } else if (err instanceof z.ZodError) {
    message = err.issues[0]?.message ?? "Invalid request.";
    status = 400;
  } else if (err instanceof Error) {
    message = err.message;
  }
  return Response.json({ error: message }, { status });
}
