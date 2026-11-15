import { z } from "zod";

/* ---------- Reading & Listening questions (shared) ---------- */

export const QuestionType = z.enum([
  "tfng", // True / False / Not Given
  "ynng", // Yes / No / Not Given
  "mcq", // multiple choice, single answer
  "matching", // pick one option from the group's option list (headings, features, people...)
  "completion", // fill the gap / short answer (typed)
]);
export type QuestionType = z.infer<typeof QuestionType>;

export const Question = z.object({
  number: z.number().int(),
  prompt: z.string().describe("The question text. For completion use ____ to mark the gap."),
  choices: z
    .array(z.string())
    .describe("For mcq: 3-4 options like 'A. ...'. Empty array for every other type."),
  answer: z
    .string()
    .describe(
      "Correct answer. tfng: TRUE/FALSE/NOT GIVEN. ynng: YES/NO/NOT GIVEN. mcq: the letter. matching: the option letter or roman numeral. completion: the exact word(s).",
    ),
  alternatives: z
    .array(z.string())
    .describe("Other accepted spellings/forms for completion answers. Empty otherwise."),
  explanation: z.string().describe("Why this is the answer, quoting the relevant text."),
});
export type Question = z.infer<typeof Question>;

export const QuestionGroup = z.object({
  type: QuestionType,
  instructions: z.string().describe("Exam-style instructions, e.g. 'Write NO MORE THAN TWO WORDS'."),
  options: z
    .array(z.string())
    .describe("For matching only: the shared option list like 'i. ...' or 'A. ...'. Empty otherwise."),
  questions: z.array(Question),
});
export type QuestionGroup = z.infer<typeof QuestionGroup>;

/* ---------- Reading ---------- */

export const ReadingPassage = z.object({
  title: z.string(),
  paragraphs: z.array(z.string()).describe("Paragraphs in order. Label is added by the app (A, B, C...)."),
  groups: z.array(QuestionGroup),
});
export type ReadingPassage = z.infer<typeof ReadingPassage>;

/* ---------- Listening ---------- */

export const ListeningTest = z.object({
  title: z.string(),
  summary: z.string().describe("One sentence describing the recording, without giving answers away."),
  groups: z.array(QuestionGroup),
});
export type ListeningTest = z.infer<typeof ListeningTest>;

/* ---------- Writing ---------- */

export const ChartSpec = z.object({
  chartType: z.enum(["bar", "line", "pie", "table"]),
  title: z.string(),
  unit: z.string().describe("Unit for values, e.g. '%', 'million tonnes', 'USD'."),
  categories: z
    .array(z.string())
    .describe("x-axis labels (bar/line), slice labels (pie) or row labels (table)."),
  series: z
    .array(z.object({ name: z.string(), values: z.array(z.number()) }))
    .describe("Each series has one value per category. Pie charts: exactly one series per pie (max 2 pies), values sum to 100."),
});
export type ChartSpec = z.infer<typeof ChartSpec>;

export const Task1Prompt = z.object({
  prompt: z.string().describe("The full Task 1 instruction text as it would appear on the exam."),
  chart: ChartSpec,
});
export type Task1Prompt = z.infer<typeof Task1Prompt>;

export const Task2Prompt = z.object({
  essayType: z.string().describe("e.g. Opinion, Discussion, Problem-Solution, Advantages-Disadvantages, Two-part question"),
  prompt: z.string().describe("The full Task 2 question text as it would appear on the exam."),
});
export type Task2Prompt = z.infer<typeof Task2Prompt>;

const Criterion = z.object({
  band: z.number().describe("0-9 in steps of 0.5"),
  comment: z.string(),
});

export const WritingFeedback = z.object({
  overall: z.number().describe("Overall band, 0-9 in steps of 0.5"),
  taskResponse: Criterion.describe("Task Achievement (Task 1) or Task Response (Task 2)"),
  coherence: Criterion.describe("Coherence and Cohesion"),
  lexical: Criterion.describe("Lexical Resource"),
  grammar: Criterion.describe("Grammatical Range and Accuracy"),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()).describe("The most important things to fix to reach the next band, most important first."),
  corrections: z
    .array(z.object({ original: z.string(), corrected: z.string(), why: z.string() }))
    .describe("Up to 10 specific sentences from the essay with a corrected version."),
  vocabulary: z
    .array(z.object({ used: z.string(), better: z.string() }))
    .describe("Words/phrases that could be upgraded to more precise or higher-band vocabulary."),
  improvedVersion: z.string().describe("A Band 8-9 rewrite of the candidate's essay that keeps their ideas."),
});
export type WritingFeedback = z.infer<typeof WritingFeedback>;

/* ---------- Speaking ---------- */

export const SpeakingQuestions = z.object({
  topic: z.string(),
  questions: z.array(z.string()).describe("Part 1 / Part 3: 4-5 questions. Part 2: one cue card."),
  cueCardPoints: z.array(z.string()).describe("Part 2 only: the 'You should say' bullet points. Empty for Part 1/3."),
});
export type SpeakingQuestions = z.infer<typeof SpeakingQuestions>;

export const SpeakingFeedback = z.object({
  overall: z.number(),
  fluency: Criterion.describe("Fluency and Coherence"),
  lexical: Criterion.describe("Lexical Resource"),
  grammar: Criterion.describe("Grammatical Range and Accuracy"),
  pronunciation: Criterion.describe("Pronunciation (estimated from speech-recognition evidence)"),
  pronunciationTips: z
    .array(
      z.object({
        word: z.string(),
        heardAs: z.string().describe("What the recogniser heard instead, or empty if unclear."),
        ipa: z.string().describe("British English IPA, e.g. /ˈθɪŋk/"),
        tip: z.string().describe("Concrete mouth/stress/sound advice."),
      }),
    )
    .describe("Words the candidate likely mispronounced or should practise."),
  missing: z.array(z.string()).describe("What was lacking in the answer: ideas, extension, examples, linking, tense range..."),
  grammarFixes: z.array(z.object({ original: z.string(), corrected: z.string(), why: z.string() })),
  betterVocabulary: z.array(z.object({ used: z.string(), better: z.string() })),
  modelAnswer: z.string().describe("A natural Band 8-9 spoken answer to the same question, for shadowing."),
});
export type SpeakingFeedback = z.infer<typeof SpeakingFeedback>;
