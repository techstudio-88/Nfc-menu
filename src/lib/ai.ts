import type { OrderView } from "@/lib/orders";
import { orderFactsForPrompt, requiredFacts, ruleSummary } from "@/lib/orderText";

/* AI provider abstraction. Providers: openai | anthropic | rules (deterministic, no external call).
   Any model output is validated: if it drops a dish or modification, the deterministic summary is used instead. */

const SYSTEM =
  "You write concise spoken-style kitchen preparation summaries for restaurant orders. Start with the table number. Group identical dishes. " +
  "NEVER omit, merge away or alter any customization: every added topping, removed ingredient (say 'without'), size, crust, spice level and special instruction must appear. " +
  "No greetings, no markdown, no prices. Maximum 90 words.";

async function openai(facts: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: facts },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}

async function anthropic(facts: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: facts }],
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const j = (await res.json()) as { content?: { text?: string }[] };
  return j.content?.[0]?.text?.trim() ?? "";
}

export function configuredProvider() {
  const forced = process.env.AI_PROVIDER;
  if (forced === "rules") return "rules";
  if ((forced === "openai" || !forced) && process.env.OPENAI_API_KEY) return "openai";
  if ((forced === "anthropic" || !forced) && process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "rules";
}

export async function summarizeOrder(o: OrderView): Promise<{ summary: string; provider: string; note?: string }> {
  const fallback = ruleSummary(o);
  const provider = configuredProvider();
  if (provider === "rules") return { summary: fallback, provider: "rules", note: "No AI key configured — using the built-in rule-based summarizer." };
  try {
    const text = provider === "openai" ? await openai(orderFactsForPrompt(o)) : await anthropic(orderFactsForPrompt(o));
    const low = text.toLowerCase();
    const missing = requiredFacts(o).filter((f) => !low.includes(f.toLowerCase()));
    if (!text || missing.length) {
      return { summary: fallback, provider: "rules", note: `AI output dropped details (${missing.slice(0, 3).join(", ")}); safe rule-based summary used.` };
    }
    return { summary: text, provider };
  } catch (e) {
    return { summary: fallback, provider: "rules", note: `AI provider unavailable (${e instanceof Error ? e.message : "error"}); rule-based summary used.` };
  }
}
