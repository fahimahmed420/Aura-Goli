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
        <p className="font-['Playfair_Display'] text-2xl font-semibold italic" style={{ color: "#c9a84c" }}>
          You&apos;re in the circle.
        </p>
        <p className="text-sm mt-2" style={{ color: "rgba(250,247,240,0.5)" }}>Watch your inbox for the next drop.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <form className="flex flex-col sm:flex-row gap-0" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          required
          disabled={loading}
          aria-label="Email address"
          className="flex-1 px-6 py-4 text-sm focus:outline-none transition-colors disabled:opacity-60"
          style={{
            background: "rgba(250,247,240,0.06)",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRight: "none",
            color: "#faf7f0",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.8)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-10 py-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:brightness-90 disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: "#c9a84c", color: "#0b0b14" }}
        >
          {loading ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-[12px]" role="alert" style={{ color: "#ff9b9b" }}>{error}</p>
      )}
    </div>
  );
}
