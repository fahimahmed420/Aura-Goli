"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "bot";
  text: string;
}

/** Starter chips shown before the first user message.
 *  href = navigate to page instead of sending a chat message. */
const STARTER_CHIPS: { label: string; href?: string }[] = [
  { label: "Browse t-shirts 👕", href: "/shop" },
  { label: "Shipping & returns 🚚" },
  { label: "How to order? 🛒" },
  { label: "Track my order 📦" },
];

/** Render plain text with bare URLs turned into clickable links. */
function linkify(text: string, role: "user" | "bot") {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
        style={{ color: role === "user" ? "#c9a96e" : "#7c6f5b" }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

const PROFILE_KEY = "ag_customer_profile";

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null"); } catch { return null; }
}

export default function ChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "হ্যালো! 👋 আমি Aura Bot। কিভাবে সাহায্য করতে পারি?\n(Hello! How can I help you?)" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasUserMessage = messages.some((m) => m.role === "user");

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string = input) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");

    const next: Message[] = [...messages, { role: "user", text: msg }];
    setMessages(next);
    setLoading(true);

    // Add an empty bot message we'll stream into
    setMessages((m) => [...m, { role: "bot", text: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({
            role: m.role === "bot" ? "assistant" : "user",
            content: m.text,
          })),
          customerProfile: loadProfile(),
        }),
      });

      if (!res.body) throw new Error("No body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          if (payload.startsWith("[PROFILE]")) {
            try { localStorage.setItem(PROFILE_KEY, payload.slice(9)); } catch { /* ok */ }
            continue;
          }
          if (payload.startsWith("[ERROR]")) {
            reply = "Sorry, something went wrong. Please try again.";
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "bot", text: reply };
              return copy;
            });
            return;
          }
          try {
            const token: string = JSON.parse(payload);
            reply += token;
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "bot", text: reply };
              return copy;
            });
          } catch {
            /* skip malformed chunk */
          }
        }
      }

      if (!reply) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "bot", text: "Sorry, I didn't get a response. Please try again." };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "bot", text: "Connection error. Please try again." };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    // Shift+Enter → natural newline (default textarea behaviour)
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-grow up to 5 lines
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    /* Sits above the WhatsApp FAB:
       mobile  — WA is bottom:90px + 40px tall + 8px gap = bottom:138px, right:20px
       desktop — WA is bottom:28px + 44px tall + 8px gap = bottom:80px,  right:28px */
    <div
      className="chat-widget-root fixed z-50 flex flex-col items-end gap-2"
      style={{ bottom: "138px", right: "20px" }}
    >
      <style>{`
        @media (min-width: 768px) {
          .chat-widget-root { bottom: 80px !important; right: 28px !important; }
        }
      `}</style>

      {/* Chat panel */}
      {open && (
        <div
          className="w-72 sm:w-80 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-[#e8e0d0]"
          style={{ height: "440px", background: "#faf7f0" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#1a1c1c" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#c9a96e] flex items-center justify-center text-white text-sm font-bold shrink-0">
                A
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-none">Aura Bot</p>
                <p className="text-[#9ca3af] text-xs mt-0.5">Aura Goli Support</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[#9ca3af] hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                  style={
                    m.role === "user"
                      ? { background: "#1a1c1c", color: "#faf7f0", borderBottomRightRadius: "4px" }
                      : { background: "#f0ebe0", color: "#1a1c1c", borderBottomLeftRadius: "4px" }
                  }
                >
                  {m.role === "bot" && m.text === "" && loading ? (
                    <span className="inline-flex gap-1 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : (
                    linkify(m.text, m.role)
                  )}
                </div>
              </div>
            ))}

            {/* Quick-reply chips — shown only before first user message */}
            {!hasUserMessage && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {STARTER_CHIPS.map((chip) =>
                  chip.href ? (
                    <button
                      key={chip.label}
                      onClick={() => { setOpen(false); router.push(chip.href!); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#c9a96e] text-[#7c6f5b] hover:bg-[#c9a96e] hover:text-white transition-colors"
                    >
                      {chip.label}
                    </button>
                  ) : (
                    <button
                      key={chip.label}
                      onClick={() => send(chip.label)}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#c9a96e] text-[#7c6f5b] hover:bg-[#c9a96e] hover:text-white transition-colors"
                    >
                      {chip.label}
                    </button>
                  )
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-[#e8e0d0] flex gap-2 shrink-0">
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 rounded-xl border border-[#e8e0d0] bg-white px-3 py-2 text-sm outline-none focus:border-[#c9a96e] transition-colors placeholder:text-[#b0a898] resize-none overflow-hidden leading-5"
              placeholder="Type a message… (Shift+Enter for new line)"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              disabled={loading}
              maxLength={1000}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40 shrink-0"
              style={{ background: "#1a1c1c" }}
              aria-label="Send"
            >
              <svg width="16" height="16" fill="none" stroke="#faf7f0" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 2 11 13M22 2 15 22 11 13 2 9l20-7z" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-[#b0a898] pb-2 shrink-0">Powered by Aura Goli AI</p>
        </div>
      )}

      {/* Bubble toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ background: "#1a1c1c" }}
        aria-label="Open chat"
      >
        {open ? (
          <svg width="18" height="18" fill="none" stroke="#faf7f0" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="18" height="18" fill="none" stroke="#faf7f0" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
