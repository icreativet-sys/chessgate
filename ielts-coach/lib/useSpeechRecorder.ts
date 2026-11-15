"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in TypeScript's DOM lib). */
interface SRAlternative { transcript: string; confidence: number }
interface SRResult { isFinal: boolean; length: number; [i: number]: SRAlternative }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

export interface Segment {
  text: string;
  confidence: number;
  alternatives: string[];
  at: number; // ms since start
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null;
}

export function useSpeechRecorder() {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interim, setInterim] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(false);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setSupported(!!getRecognitionCtor()), []);

  const start = useCallback(async () => {
    setError(null);
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })));
      mr.start();
      mediaRef.current = mr;
    } catch {
      setError("Microphone permission was denied. Allow microphone access in your browser and try again.");
      return;
    }

    setSegments([]);
    setInterim("");
    setAudioUrl(null);
    setElapsed(0);
    startRef.current = Date.now();
    activeRef.current = true;

    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const alts: string[] = [];
          for (let j = 1; j < r.length; j++) alts.push(r[j].transcript.trim());
          const seg: Segment = {
            text: r[0].transcript.trim(),
            confidence: r[0].confidence,
            alternatives: alts.filter(Boolean),
            at: Date.now() - startRef.current,
          };
          if (seg.text) setSegments((s) => [...s, seg]);
        } else {
          interimText += r[0].transcript;
        }
      }
      setInterim(interimText);
    };
    // Browsers end recognition after silence; restart while the user is still recording.
    rec.onend = () => {
      if (activeRef.current) {
        try {
          rec.start();
        } catch {}
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setError("Microphone permission was denied.");
      else if (e.error === "network") setError("Speech recognition needs an internet connection (Chrome sends audio to Google's recogniser).");
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
    timerRef.current = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 250);
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    recRef.current?.stop();
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsed((Date.now() - startRef.current) / 1000);
    setRecording(false);
    setInterim("");
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { supported, recording, segments, interim, audioUrl, elapsed, error, start, stop };
}

/** Number of gaps longer than `ms` between recognised segments (rough pause detection). */
export function countLongPauses(segments: Segment[], ms = 3000): number {
  let n = 0;
  for (let i = 1; i < segments.length; i++) {
    const gapGuess = segments[i].at - segments[i - 1].at - segments[i].text.split(" ").length * 400;
    if (gapGuess > ms) n++;
  }
  return n;
}
