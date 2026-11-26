import type { OrderView } from "@/lib/orders";

type Item = OrderView["items"][number];

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const num = (n: number) => WORDS[n] ?? String(n);

function describeCustomizations(it: Item) {
  const choices = it.customizations.filter((c) => c.action === "choice").map((c) => c.optionName);
  const adds = it.customizations.filter((c) => c.action === "add").map((c) => (c.quantity > 1 ? `${c.optionName} ×${c.quantity}` : c.optionName));
  const removes = it.customizations.filter((c) => c.action === "remove").map((c) => c.optionName);
  return { choices, adds, removes };
}

/** Full, lossless read-aloud text. Includes every modification, instruction and the total. */
export function orderToSpeech(o: OrderView): string {
  const parts: string[] = [`Table ${o.tableCode}.`, `Order number ${o.orderNo}.`];
  o.items.forEach((it, i) => {
    const { choices, adds, removes } = describeCustomizations(it);
    let s = `Item ${i + 1}: ${it.quantity} ${it.quantity > 1 ? "times" : "of"} ${it.name}${it.variantName ? `, ${it.variantName} size` : ""}.`;
    if (choices.length) s += ` Selected: ${choices.join(", ")}.`;
    if (adds.length) s += ` With extra: ${adds.join(", ").replace(/×(\d+)/g, "times $1")}.`;
    if (removes.length) s += ` Without: ${removes.join(", ")}.`;
    if (it.instructions) s += ` Special instructions: ${it.instructions}.`;
    parts.push(s);
  });
  if (o.notes) parts.push(`Order notes: ${o.notes}.`);
  parts.push(`Total amount: ${(o.total / 100).toFixed(2)} ${o.currency}. Payment: ${o.paymentMethod.replace(/_/g, " ")}, ${o.paymentStatus}.`);
  return parts.join(" ");
}

/** Deterministic kitchen summary. Never drops a modification by construction. */
export function ruleSummary(o: OrderView): string {
  const out: string[] = [`Table ${o.tableCode}.`];
  for (const it of o.items) {
    const { choices, adds, removes } = describeCustomizations(it);
    const head = `${num(it.quantity)[0].toUpperCase()}${num(it.quantity).slice(1)} ${it.variantName ? it.variantName.toLowerCase() + " " : ""}${it.name}`;
    const bits: string[] = [];
    if (choices.length) bits.push(choices.join(", "));
    if (adds.length) bits.push(`extra ${adds.join(", ")}`);
    if (removes.length) bits.push(`without ${removes.join(", ")}`);
    if (it.instructions) bits.push(`note: ${it.instructions}`);
    out.push(`${head}${bits.length ? " — " + bits.join("; ") : ""}.`);
  }
  if (o.notes) out.push(`Order note: ${o.notes}.`);
  return out.join(" ");
}

/** Every modification phrase that an AI summary must preserve. */
export function requiredFacts(o: OrderView): string[] {
  const facts = new Set<string>();
  for (const it of o.items) {
    facts.add(it.name);
    for (const c of it.customizations) facts.add(c.optionName);
  }
  return [...facts];
}

export function orderFactsForPrompt(o: OrderView): string {
  const lines = [`Table ${o.tableCode}, order #${o.orderNo}`];
  for (const it of o.items) {
    const { choices, adds, removes } = describeCustomizations(it);
    lines.push(
      `- ${it.quantity} x ${it.name}${it.variantName ? ` (${it.variantName})` : ""}` +
        (choices.length ? ` | selected: ${choices.join(", ")}` : "") +
        (adds.length ? ` | extra: ${adds.join(", ")}` : "") +
        (removes.length ? ` | REMOVE: ${removes.join(", ")}` : "") +
        (it.instructions ? ` | instructions: ${it.instructions}` : ""),
    );
  }
  if (o.notes) lines.push(`Order notes: ${o.notes}`);
  return lines.join("\n");
}
