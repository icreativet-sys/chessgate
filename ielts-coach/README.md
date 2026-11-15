# IELTS Coach

A private IELTS practice app with AI feedback for all four skills. It runs on Next.js and uses Claude (`claude-opus-5-5`) for generating tests and marking.

| Skill | What happens |
|---|---|
| **Reading** | Choose 1–3 passages. The AI writes each passage (about 750–950 words, harder from 1 to 3) with 13–14 questions in real exam types: True/False/Not Given, Yes/No/Not Given, multiple choice, matching headings and gap fill. You get 20 minutes per passage, auto-marking, a band score and an explanation for every answer. |
| **Listening** | Paste a YouTube link. The app pulls the video's captions, or you can paste the transcript yourself. You can limit it to a start and end time. The AI writes 5–40 questions in the order you'll hear them. You listen in the built-in player, answer, get a band, then review with the transcript. Tests are saved so you can retake them. |
| **Writing** | **Task 1:** the AI generates realistic data, drawn as a bar, line, pie or table chart. **Task 2:** an essay question of the type you choose, or paste your own. Includes a timer and word counter. You get a band for each of the 4 official criteria, sentence corrections, vocabulary upgrades and a Band 8–9 rewrite of your essay. |
| **Speaking** | Parts 1, 2 (cue card with 1 minute to prepare and 2 minutes to talk) and 3. The question is read aloud. You answer out loud while the browser turns your speech into text and records your audio. The AI scores Fluency, Vocabulary, Grammar and Pronunciation, lists words to practise with IPA and a 🔊 button, says what your answer was missing, and gives a model answer you can listen to and repeat. |

The dashboard shows your average band per skill (last 5 attempts) and your recent attempts.

## Setup

Requires Node.js 20+ and an Anthropic API key (https://console.anthropic.com).

```bash
cd ielts-coach
npm install
cp .env.example .env.local   # then put your ANTHROPIC_API_KEY in it
npm run dev
```

Open http://localhost:3000.

### Keeping it private

Set `APP_PASSWORD` in `.env.local` (or in your hosting provider's environment variables). Every page and API route then needs that password. Without it, anyone who finds the URL can use your API key. Search engines are told not to index the app.

### Deploying (e.g. Vercel)

1. Import the repository, set **Root Directory** to `ielts-coach`.
2. Add the environment variables `ANTHROPIC_API_KEY` and `APP_PASSWORD`.
3. Deploy. AI routes allow up to 300 seconds (`maxDuration`); on Vercel's Hobby plan the limit is lower, so very long Reading or Listening generations may time out there.

## Things to know

- **Speaking works best in Chrome or Edge.** It uses the browser's built-in speech recognition (Web Speech API). Firefox doesn't support it. Claude can't hear the audio itself: pronunciation feedback is *estimated* from words the recogniser had trouble with (low confidence, or words that don't fit, like "sink" for "think"). Your own recording is kept only in the browser so you can listen back.
- **YouTube captions:** fetching captions depends on YouTube and can break when YouTube changes things. If it fails, use **Paste transcript manually** (under the video on YouTube: ⋯ → *Show transcript*, then copy).
- **Your data stays in your browser.** History, saved listening tests and unfinished essays are stored in localStorage, so they don't sync between devices.
- **Bands are AI estimates** based on the public IELTS band descriptors and the official raw-score conversion tables. Use them to track progress; they are not official scores.
- **Cost:** every generation or marking call uses your Anthropic API credits. A Writing mark or a Reading passage is usually a few cents.

## Project layout

```
app/
  page.tsx                dashboard
  reading|listening|writing|speaking/page.tsx
  api/…                   server routes that call Claude
components/               question renderer, SVG charts, feedback cards, UI kit
lib/
  claude.ts               single helper for structured Claude calls
  schemas.ts              zod schemas for everything the AI returns
  prompts.ts              examiner system prompt and question-writing rules
  band.ts                 raw score → band tables
  youtube.ts              caption fetching
  useSpeechRecorder.ts    speech recognition + audio recording hook
middleware.ts             password protection
```
