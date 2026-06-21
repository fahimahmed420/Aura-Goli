"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
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
    <form className="flex flex-col sm:flex-row gap-0 max-w-lg mx-auto" onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        required
        className="flex-1 px-6 py-4 text-sm focus:outline-none transition-colors"
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
        className="px-10 py-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:brightness-90"
        style={{ background: "#c9a84c", color: "#0b0b14" }}
      >
        Subscribe
      </button>
    </form>
  );
}
