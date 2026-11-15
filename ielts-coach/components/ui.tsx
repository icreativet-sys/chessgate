"use client";

import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-accent text-white hover:opacity-90",
    secondary: "bg-surface border border-border hover:bg-surface-2",
    ghost: "hover:bg-surface-2",
    danger: "bg-bad text-white hover:opacity-90",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-lg border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad">{message}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function BandBadge({ band, size = "md" }: { band: number; size?: "md" | "lg" }) {
  const color = band >= 7 ? "bg-good-soft text-good" : band >= 5.5 ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad";
  const s = size === "lg" ? "text-3xl px-5 py-3" : "text-sm px-2.5 py-1";
  return <span className={`inline-block rounded-lg font-bold tabular-nums ${color} ${s}`}>{band.toFixed(1)}</span>;
}

/** Countdown timer. Calls onExpire once when it reaches 0. */
export function useCountdown(seconds: number, running: boolean, onExpire?: () => void) {
  const [left, setLeft] = useState(seconds);
  const expired = useRef(false);
  useEffect(() => {
    setLeft(seconds);
    expired.current = false;
  }, [seconds]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (running && left === 0 && !expired.current) {
      expired.current = true;
      onExpire?.();
    }
  }, [left, running, onExpire]);
  return left;
}

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function TimerPill({ left }: { left: number }) {
  const low = left <= 120;
  return (
    <span
      className={`rounded-full px-3 py-1 font-mono text-sm tabular-nums ${low ? "bg-bad-soft text-bad" : "bg-surface-2 text-muted"}`}
    >
      ⏱ {formatTime(left)}
    </span>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** Speak text with the browser's built-in voice (British English if available). */
export function speak(text: string, rate = 0.95) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  u.voice = voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  u.lang = u.voice?.lang ?? "en-GB";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}
