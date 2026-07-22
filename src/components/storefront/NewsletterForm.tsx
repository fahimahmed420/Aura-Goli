"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <p className="dd-display text-2xl text-accent" style={{ fontStyle: "italic" }}>
          You&apos;re in the circle.
        </p>
        <p className="text-sm mt-2 text-fg-muted">Watch your inbox for the next drop.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          required
          disabled={loading}
          aria-label="Email address"
          className="flex-1 h-12 px-6 text-sm outline-none transition-colors disabled:opacity-60 bg-[var(--field-bg)] border border-[var(--field-border)] text-fg placeholder:text-fg-subtle focus:border-[var(--field-border-focus)]"
          style={{ borderRadius: "var(--radius-pill)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-10 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors disabled:opacity-60 bg-accent text-accent-fg hover:bg-accent-hover"
          style={{ borderRadius: "var(--radius-pill)" }}
        >
          {loading ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-[12px]" role="alert" style={{ color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
