"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/profile");
    router.refresh();
  }

  return (
    <main className="container">
      <h1>Sign in</h1>
      <p className="lead">We will email you a one-time code. No password needed.</p>

      <div className="card">
        {step === "email" ? (
          <form onSubmit={sendCode}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <p className="muted">
              We sent a code to <strong>{email}</strong>.
            </p>
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Verifying..." : "Verify and continue"}
            </button>
            <button
              type="button"
              className="link-button"
              style={{ marginLeft: 16 }}
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
