import { NextRequest } from "next/server";
import { streamReply, type ChatTurn, type CustomerProfile } from "@/lib/groq-chat";
import { rateLimit } from "@/lib/rate-limit";
import { resolveTokenPayload } from "@/lib/require-auth";

const MAX_TURNS = 12;
const MAX_LEN = 1000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed } = await rateLimit(`chat:${ip}`, { limit: 20, windowSecs: 60 });
  if (!allowed) {
    return new Response("data: [ERROR] Too many requests\n\n", {
      status: 429,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  let history: ChatTurn[];
  let incomingProfile: CustomerProfile | null = null;
  try {
    const body = await req.json();
    const raw: unknown = body.messages;
    // Saved customer profile from localStorage (optional)
    if (body.customerProfile && typeof body.customerProfile === "object") {
      incomingProfile = body.customerProfile as CustomerProfile;
    }
    if (!Array.isArray(raw) || raw.length === 0) {
      return new Response("data: [ERROR] messages required\n\n", { status: 400 });
    }
    history = raw
      .filter(
        (m): m is ChatTurn =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-MAX_TURNS)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_LEN) }));
  } catch {
    return new Response("data: [ERROR] Invalid JSON\n\n", { status: 400 });
  }

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return new Response("data: [ERROR] Invalid conversation\n\n", { status: 400 });
  }

  const payload = resolveTokenPayload(req);
  const ctx = { userId: payload?.sub ?? null };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let capturedProfile: CustomerProfile | null = null;
      try {
        for await (const token of streamReply(history, ctx, incomingProfile, (p) => { capturedProfile = p; })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`));
        }
        if (capturedProfile) {
          controller.enqueue(encoder.encode(`data: [PROFILE]${JSON.stringify(capturedProfile)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("[chat] stream error:", err);
        const e = err as { status?: number };
        const msg =
          e?.status === 429
            ? "I'm currently unavailable — please try again shortly or reach us on WhatsApp: 01774433063 📲"
            : "Sorry, something went wrong. Please try again or contact us on WhatsApp: 01774433063 📲";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
