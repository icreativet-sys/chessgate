"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, ErrorBox, inputClass } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) router.replace(next.startsWith("/") ? next : "/");
    else setError("Wrong password.");
  }

  return (
    <Card className="mx-auto mt-20 max-w-sm">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold">IELTS Coach</h1>
          <p className="text-sm text-muted">This is a private app. Enter the password.</p>
        </div>
        <input
          type="password"
          autoFocus
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <ErrorBox message={error} />
        <Button disabled={busy || !password}>{busy ? "Checking…" : "Enter"}</Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
