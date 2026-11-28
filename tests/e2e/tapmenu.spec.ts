import { test, expect, type APIRequestContext } from "@playwright/test";

async function demo(ctx: APIRequestContext) {
  const started = await ctx.post("/api/auth/demo");
  expect(started.ok(), "demo workspace should start").toBeTruthy();
  const me = await ctx.get("/api/auth/me");
  expect(me.ok()).toBeTruthy();
  const profile = await me.json();
  expect(profile.restaurant?.slug).toMatch(/^demo-/);
  return { slug: profile.restaurant.slug, profile };
}

async function menuAndLine(ctx: APIRequestContext, slug: string) {
  const response = await ctx.get(`/api/public/menu/${slug}?table=T01`);
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  const item = data.menu.items.find((x: any) => x.availableNow && (!x.variants.length || x.variants.some((v: any) => v.available)));
  expect(item, "demo menu should have an available dish").toBeTruthy();
  const variant = item.variants.find((v: any) => v.available && v.isDefault) ?? item.variants.find((v: any) => v.available);
  const selections = item.groups.flatMap((g: any) => {
    if (!g.minSelect) return [];
    const available = g.options.filter((o: any) => o.available);
    return available.slice(0, g.minSelect).map((o: any) => ({ optionId: o.id, qty: 1 }));
  });
  return { data, line: { itemId: item.id, qty: 1, variantId: variant?.id ?? null, selections } };
}

async function placeCashOrder(ctx: APIRequestContext, slug: string) {
  const { line } = await menuAndLine(ctx, slug);
  const quote = await ctx.post("/api/public/quote", { data: { slug, items: [line] } });
  expect(quote.ok()).toBeTruthy();
  const q = await quote.json();
  expect(q.errors).toHaveLength(0);
  const response = await ctx.post("/api/public/orders", { data: {
    slug, items: [line], tableCode: "T01", clientKey: `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    paymentMethod: "cash", language: "en",
  }});
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("fresh demo sessions create isolated restaurant workspaces", async ({ playwright, baseURL }) => {
  const a = await playwright.request.newContext({ baseURL });
  const b = await playwright.request.newContext({ baseURL });
  try {
    const one = await demo(a);
    const two = await demo(b);
    expect(one.slug).not.toBe(two.slug);
  } finally { await a.dispose(); await b.dispose(); }
});

test("guest ordering and customization quote works", async ({ request }) => {
  const { slug } = await demo(request);
  const { line } = await menuAndLine(request, slug);
  const response = await request.post("/api/public/quote", { data: { slug, items: [line] } });
  expect(response.ok()).toBeTruthy();
  const quote = await response.json();
  expect(quote.errors).toHaveLength(0);
  expect(quote.lines[0].itemId).toBe(line.itemId);
});

test("checkout endpoint is reachable after a valid order", async ({ request }) => {
  const { slug } = await demo(request);
  const order = await placeCashOrder(request, slug);
  const response = await request.post(`/api/public/orders/${order.token}`, { data: { action: "checkout" } });
  // A configured gateway returns a checkout URL; an unconfigured gateway returns a deliberate 4xx.
  expect([200, 400, 422]).toContain(response.status());
});

test("kitchen can receive and advance a fresh order", async ({ request }) => {
  const { slug } = await demo(request);
  const order = await placeCashOrder(request, slug);
  const active = await request.get("/api/orders?view=active");
  expect(active.ok()).toBeTruthy();
  const payload = await active.json();
  const row = payload.orders.find((x: any) => x.publicToken === order.token);
  expect(row).toBeTruthy();
  const update = await request.post(`/api/orders/${row.id}`, { data: { action: "status", to: "accepted", note: "Playwright E2E" } });
  expect(update.ok()).toBeTruthy();
});

test("guest waiter and water requests are persisted for staff", async ({ request }) => {
  const { slug } = await demo(request);
  const response = await request.post("/api/public/assist", { data: { slug, tableCode: "T01", kind: "water", message: "Playwright water request" } });
  expect(response.ok()).toBeTruthy();
  const staff = await request.get("/api/assist");
  expect(staff.ok()).toBeTruthy();
  const data = await staff.json();
  expect(data.rows.some((x: any) => x.kind === "water" || x.message?.includes("Playwright water request"))).toBeTruthy();
});

test("owner analytics is protected from unauthenticated users", async ({ playwright, baseURL }) => {
  const guest = await playwright.request.newContext({ baseURL });
  try {
    const response = await guest.get("/api/owner/analytics");
    expect([401, 403]).toContain(response.status());
  } finally { await guest.dispose(); }
});
