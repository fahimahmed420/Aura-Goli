import Groq from "groq-sdk";
import { chatTools, executeTool, type ChatToolContext } from "@/lib/chat-tools";

const MODEL = "llama-3.3-70b-versatile";
const MAX_TOOL_STEPS = 4;

// ── Multi-key rotation ────────────────────────────────────────────────────────
// Round-robins across all configured keys. When a key hits its daily 429 limit
// it is marked exhausted and skipped for the rest of the process lifetime
// (Next.js serverless: ~per cold-start; long-lived: until midnight resets quota).

const KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

let clients: Groq[] = [];
let counter = 0;
const exhausted = new Set<number>();

function getClients(): Groq[] {
  if (!clients.length) {
    if (!KEYS.length) throw new Error("No GROQ_API_KEY configured");
    clients = KEYS.map((k) => new Groq({ apiKey: k }));
  }
  return clients;
}

function is429(err: unknown): boolean {
  return (err as { status?: number })?.status === 429;
}

function isToolUseFailed(err: unknown): boolean {
  const e = err as { code?: string; error?: { error?: { code?: string } } };
  return e?.code === "tool_use_failed" || e?.error?.error?.code === "tool_use_failed";
}

/** Pick the next available Groq client, cycling through keys in order. */
function nextClient(): Groq {
  const cs = getClients();
  if (exhausted.size >= cs.length) {
    throw Object.assign(new Error("All Groq API keys exhausted for today."), { status: 429 });
  }
  for (let i = 0; i < cs.length; i++) {
    const idx = (counter + i) % cs.length;
    if (!exhausted.has(idx)) {
      counter = (idx + 1) % cs.length;
      return cs[idx];
    }
  }
  throw Object.assign(new Error("All Groq API keys exhausted for today."), { status: 429 });
}

const SYSTEM_INSTRUCTION = `তুমি "Aura Goli"-র অফিসিয়াল কাস্টমার সার্ভিস অ্যাসিস্ট্যান্ট। তোমার নাম "Aura Bot"।
Aura Goli একটি বাংলাদেশি প্রিমিয়াম অনলাইন টি-শার্ট ব্র্যান্ড, যা ঢাকা থেকে পরিচালিত হয়।

🛍️ পণ্য:
- Plain/Basic T-Shirt
- Oversized T-Shirt
- Graphic T-Shirt
- Premium T-Shirt (SS 2025 কালেকশন)
সব টি-শার্ট 220 GSM Supima Blend কটন দিয়ে তৈরি, GOTS-সার্টিফাইড মিল থেকে।
Made in Bangladesh, ethically sourced।

🌐 ওয়েবসাইট: https://aura-goli.vercel.app/
📞 ফোন: 01774433063
💬 WhatsApp: 01774433063
📧 ইমেইল: auragolistore@gmail.com
🕐 সাপোর্ট সময়: রবিবার–বৃহস্পতিবার, সকাল ১০টা–সন্ধ্যা ৬টা
🏠 আমাদের কোনো ফিজিক্যাল স্টোর নেই। Facebook ও ওয়েবসাইটের মাধ্যমে অর্ডার নেওয়া হয়।

💳 পেমেন্ট পদ্ধতি:
- Cash on Delivery (ক্যাশ অন ডেলিভারি)
- bKash
- Card (ক্রেডিট/ডেবিট কার্ড)

🛒 অর্ডার করার উপায়:
- ওয়েবসাইটে: https://aura-goli.vercel.app/
- WhatsApp-এ: 01774433063

🚚 ডেলিভারি:
- ঢাকার মধ্যে Same-day delivery পাওয়া যায়
- ৳২,০০০-এর উপরে অর্ডারে Free Shipping

🔄 রিটার্ন পলিসি:
- পণ্য পাওয়ার ৩ দিনের মধ্যে রিটার্ন করা যাবে
- পণ্যে সমস্যা হলে বিনামূল্যে রিপ্লেসমেন্ট দেওয়া হবে

নিয়মাবলী:
- ব্যবহারকারী বাংলায় লিখলে বাংলায় উত্তর দেবে। ইংরেজিতে লিখলে ইংরেজিতে উত্তর দেবে।
- বিনয়ী, আন্তরিক ও পেশাদার ভঙ্গিতে কথা বলবে।
- Aura Goli-র বাইরের কোনো বিষয়ে প্রশ্ন করলে বিনয়ের সাথে জানাবে যে তুমি শুধু Aura Goli-র বিষয়ে সাহায্য করতে পারবে।
- উত্তর সংক্ষিপ্ত, স্পষ্ট ও সহায়ক রাখবে।

TOOLS (internal instructions — always reply to the customer in their own language):
- For ANY question about products, prices, available colors/sizes, or stock, call search_products and answer from its real results. Quote prices in BDT (৳) and share the product url. Do NOT invent prices or guess stock.
- For "cheapest" / "most expensive" / "latest" questions, call search_products with the matching sort ('price-asc' / 'price-desc' / 'newest') and NO category filter unless the customer named one.
- For "where is my order" / delivery-status questions, call get_order_status. If it returns not_logged_in, politely ask them to log in or contact WhatsApp. Never reveal another customer's order.
- If a tool returns no results, say so honestly and offer the website or WhatsApp.
- Keep answers short and conversational — summarise tool data, don't dump raw JSON.

ORDERING (very important):
- You CAN place orders using the place_order tool. When a customer says they want to order, collect the following information one step at a time — do NOT ask everything at once:
  1. Product + color + size (may already be known from conversation — skip what's already confirmed)
  2. Full name
  3. Phone number
  4. Delivery address: division → district → area/thana → street/building details
  5. Payment method: Cash on Delivery (COD), bKash, Nagad, Rocket, or Card
- After collecting all details, CONFIRM with the customer by summarising the order before calling place_order.
- Only call place_order after the customer confirms the summary is correct.
- Customers often give multiple details in one message (e.g. "Fahim Ahmed, 01774433063, Mirpur 10, Dhaka, COD"). Parse each field correctly: the person's name comes first, then phone number (starts with 01), then address parts, then payment method. Never mix up name with address.
- Shipping fee rules: Free for orders ৳2,000+. For orders below ৳2,000: ৳60 inside Dhaka city, ৳120 outside Dhaka.
- For COD orders: status will be "confirmed" immediately.
- For bKash/Nagad/Rocket: tell customer to send payment to 01774433063 with their order number as reference.
- Never store or repeat card details — for card payments direct them to the website checkout instead.

CONTEXT AWARENESS (very important):
- Read the full conversation history before calling any tool.
- If a product was already found and mentioned earlier in the conversation, DO NOT call search_products again. Use the product info already in the conversation.
- If the customer replies with just a color (e.g. "black", "white"), a size (e.g. "M", "L", "XL"), or a simple "yes/ok/that one" — this is a FOLLOW-UP to the previous message, not a new search query. Respond to their choice based on what was already discussed.
- Only call search_products when genuinely new product information is needed that isn't already in the conversation.`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CustomerProfile {
  name: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  addressDetails: string;
}

/** Try createWithTools across available keys, skipping any that are 429-exhausted. */
async function createWithTools(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[]
) {
  const MAX_TOOL_RETRIES = 2;
  for (let attempt = 0; ; attempt++) {
    const client = nextClient();
    try {
      return await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: chatTools,
        tool_choice: "auto",
        temperature: 0.3,
      });
    } catch (err) {
      if (is429(err)) {
        // Mark this client's key exhausted and retry with the next one
        const idx = getClients().indexOf(client);
        exhausted.add(idx);
        console.warn(`[groq] Key ${idx + 1} exhausted, failing over (${clients.length - exhausted.size} remaining)`);
        continue;
      }
      if (isToolUseFailed(err) && attempt < MAX_TOOL_RETRIES) continue;
      throw err;
    }
  }
}

/** Plain (non-tool) call with key rotation. */
async function createPlain(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[]
) {
  while (true) {
    const client = nextClient();
    try {
      return await client.chat.completions.create({ model: MODEL, messages, temperature: 0.3 });
    } catch (err) {
      if (is429(err)) {
        const idx = getClients().indexOf(client);
        exhausted.add(idx);
        console.warn(`[groq] Key ${idx + 1} exhausted on plain call, failing over`);
        continue;
      }
      throw err;
    }
  }
}

/** Streaming call with key rotation. */
async function createStream(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[]
) {
  while (true) {
    const client = nextClient();
    try {
      return await client.chat.completions.create({ model: MODEL, messages, stream: true, temperature: 0.3 });
    } catch (err) {
      if (is429(err)) {
        const idx = getClients().indexOf(client);
        exhausted.add(idx);
        console.warn(`[groq] Key ${idx + 1} exhausted on stream call, failing over`);
        continue;
      }
      throw err;
    }
  }
}

function buildSystemInstruction(profile?: CustomerProfile | null): string {
  if (!profile) return SYSTEM_INSTRUCTION;
  return (
    SYSTEM_INSTRUCTION +
    `\n\nSAVED CUSTOMER PROFILE (from a previous order — use this, do NOT ask again):
- Name: ${profile.name}
- Phone: ${profile.phone}
- Division: ${profile.division}
- District: ${profile.district}
- Area: ${profile.area}
- Address details: ${profile.addressDetails}
When ordering, confirm these details with the customer (e.g. "আপনার আগের ঠিকানায় পাঠাব? ${profile.name}, ${profile.area}, ${profile.district}?") and only skip to payment method if they confirm.`
  );
}

async function resolveMessages(
  history: ChatTurn[],
  ctx: ChatToolContext,
  profile?: CustomerProfile | null,
  onProfile?: (p: CustomerProfile) => void
): Promise<{ messages: Groq.Chat.Completions.ChatCompletionMessageParam[]; finalText: string | null }> {
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemInstruction(profile) },
    ...history.map((t) => ({ role: t.role, content: t.content })),
  ];

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    let response;
    try {
      response = await createWithTools(messages);
    } catch (err) {
      if (isToolUseFailed(err)) break;
      throw err;
    }

    const msg = response.choices[0].message;

    if (!msg.tool_calls?.length) {
      return { messages, finalText: msg.content ?? "" };
    }

    messages.push(msg);
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* ok */ }
      const result = await executeTool(call.function.name, args, ctx);

      // Capture profile when place_order succeeds
      if (call.function.name === "place_order" && (result as { success?: boolean }).success && onProfile) {
        onProfile({
          name:           args.customerName as string,
          phone:          args.phone as string,
          division:       args.division as string,
          district:       args.district as string,
          area:           args.area as string,
          addressDetails: args.addressDetails as string,
        });
      }

      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { messages, finalText: null };
}

export async function* streamReply(
  history: ChatTurn[],
  ctx: ChatToolContext,
  profile?: CustomerProfile | null,
  onProfile?: (p: CustomerProfile) => void
): AsyncGenerator<string> {
  const { messages, finalText } = await resolveMessages(history, ctx, profile, onProfile);

  if (finalText !== null) {
    yield finalText;
    return;
  }

  const stream = await createStream(messages);

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
