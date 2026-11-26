import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { HttpError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { checkLimit } from "@/lib/crud";

export async function ensurePlans() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(S.subscriptionPlans);
  if (n > 0) return;
  await db.insert(S.subscriptionPlans).values([
    { code: "starter", name: "Starter", priceCents: 0, maxBranches: 1, maxTables: 12, maxMenuItems: 40, maxEmployees: 5, features: ["NFC menu", "Kitchen display", "Basic analytics"] },
    { code: "growth", name: "Growth", priceCents: 4900, maxBranches: 3, maxTables: 60, maxMenuItems: 200, maxEmployees: 25, features: ["Everything in Starter", "3D & AR viewer", "AI summaries", "Coupons"] },
    { code: "scale", name: "Scale", priceCents: 14900, maxBranches: 25, maxTables: 500, maxMenuItems: 2000, maxEmployees: 200, features: ["Everything in Growth", "Priority support", "Multi-branch analytics"] },
  ]);
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const RESERVED = new Set(["admin", "api", "login", "signup", "dashboard", "kitchen", "staff", "r", "_next"]);

export async function provisionRestaurant(opts: { ownerId: string; name: string; slug: string; planCode?: string }) {
  await ensurePlans();
  const slug = slugify(opts.slug);
  if (slug.length < 3 || RESERVED.has(slug)) throw new HttpError(400, "Choose a restaurant URL of at least 3 letters.");
  const [exists] = await db.select({ id: S.restaurants.id }).from(S.restaurants).where(eq(S.restaurants.slug, slug)).limit(1);
  if (exists) throw new HttpError(409, "That restaurant URL is already taken.");
  const [plan] = await db.select().from(S.subscriptionPlans).where(eq(S.subscriptionPlans.code, opts.planCode ?? "starter")).limit(1);
  return db.transaction(async (tx) => {
    const [r] = await tx.insert(S.restaurants).values({ name: opts.name, slug }).returning();
    await tx.insert(S.restaurantMembers).values({ restaurantId: r.id, userId: opts.ownerId, role: "owner" });
    await tx.insert(S.restaurantSettings).values({ restaurantId: r.id });
    await tx.insert(S.subscriptions).values({ restaurantId: r.id, planId: plan.id, status: "trialing", currentPeriodEnd: new Date(Date.now() + 14 * 864e5) });
    await tx.insert(S.branches).values({ restaurantId: r.id, name: "Main branch" });
    await tx.insert(S.kitchenStations).values({ restaurantId: r.id, name: "Kitchen" });
    return r;
  });
}

export async function addStaff(restaurantId: string, o: { name: string; email: string; password: string; role: string }) {
  if (!["manager", "kitchen", "waiter"].includes(o.role)) throw new HttpError(400, "Invalid role.");
  const email = o.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Enter a valid email.");
  if (o.password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
  await checkLimit(restaurantId, "maxEmployees");
  const [ex] = await db.select({ id: S.users.id }).from(S.users).where(eq(S.users.email, email)).limit(1);
  if (ex) throw new HttpError(409, "An account with that email already exists.");
  return db.transaction(async (tx) => {
    const [u] = await tx.insert(S.users).values({ email, name: o.name.trim() || email, passwordHash: hashPassword(o.password) }).returning();
    await tx.insert(S.restaurantMembers).values({ restaurantId, userId: u.id, role: o.role });
    const [e] = await tx.insert(S.employees).values({ restaurantId, userId: u.id, name: u.name, title: o.role }).returning();
    return { user: u, employee: e };
  });
}

/* ─────────── starter menu (pizza builder first) ─────────── */

type Opt = { name: string; price?: number; by?: Record<string, number>; layer?: string; def?: boolean; es?: string };

export async function loadStarterMenu(restaurantId: string) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(S.menuCategories).where(eq(S.menuCategories.restaurantId, restaurantId));
  if (n > 0) throw new HttpError(409, "Your menu already has categories.");

  const stationNames = ["Pizza", "Burger", "Main Course", "Beverages", "Desserts"];
  const stations: Record<string, string> = {};
  const existing = await db.select().from(S.kitchenStations).where(eq(S.kitchenStations.restaurantId, restaurantId));
  for (const [i, nm] of stationNames.entries()) {
    const f = existing.find((e) => e.name === nm);
    if (f) stations[nm] = f.id;
    else {
      const [s] = await db.insert(S.kitchenStations).values({ restaurantId, name: nm, sort: i + 1 }).returning();
      stations[nm] = s.id;
    }
  }

  const cat = async (name: string, station: string, sort: number, es: string) =>
    (await db.insert(S.menuCategories).values({ restaurantId, name, stationId: stations[station], sort, translations: { es: { name: es } } }).returning())[0].id;
  const cats = {
    pizza: await cat("Pizzas", "Pizza", 1, "Pizzas"),
    burger: await cat("Burgers", "Burger", 2, "Hamburguesas"),
    pasta: await cat("Pasta", "Main Course", 3, "Pastas"),
    drinks: await cat("Drinks", "Beverages", 4, "Bebidas"),
    dessert: await cat("Desserts", "Desserts", 5, "Postres"),
  };

  const group = async (g: { name: string; kind: "choice" | "add" | "remove"; min?: number; max?: number; qty?: number; rule?: { variantNames?: string[]; whenOptionIds?: string[] }; opts: Opt[]; sort?: number }) => {
    const [row] = await db
      .insert(S.customizationGroups)
      .values({ restaurantId, name: g.name, kind: g.kind, minSelect: g.min ?? 0, maxSelect: g.max ?? 1, allowQuantity: !!g.qty, maxQty: g.qty ?? 1, rule: g.rule ?? null, sort: g.sort ?? 0 })
      .returning();
    const opts = await db
      .insert(S.customizationOptions)
      .values(g.opts.map((o, i) => ({ restaurantId, groupId: row.id, name: o.name, price: o.price ?? 0, priceBySize: o.by ?? {}, layer: o.layer ?? null, isDefault: !!o.def, sort: i, translations: (o.es ? { es: { name: o.es } } : {}) as Record<string, { name?: string }> })))
      .returning();
    return { id: row.id, opt: (name: string) => opts.find((o) => o.name === name)!.id };
  };

  /* pizza groups */
  const crust = await group({
    name: "Crust",
    kind: "choice",
    min: 1,
    max: 1,
    sort: 1,
    opts: [
      { name: "Classic hand-tossed", def: true, es: "Clásica a mano" },
      { name: "Thin & crispy", es: "Fina y crujiente" },
      { name: "Cheese burst", price: 200, by: { small: 150, medium: 200, large: 250 }, es: "Borde de queso" },
      { name: "Stuffed garlic", price: 180, by: { small: 120, medium: 180, large: 220 } },
    ],
  });
  const sauce = await group({
    name: "Sauce",
    kind: "choice",
    min: 1,
    max: 1,
    sort: 2,
    opts: [{ name: "San Marzano tomato", def: true, layer: "sauce_red" }, { name: "Garlic cream", price: 50, layer: "sauce_white" }, { name: "Spicy arrabbiata", layer: "sauce_red" }],
  });
  const dip = await group({
    name: "Choose your cheese-burst dip",
    kind: "choice",
    min: 1,
    max: 1,
    sort: 3,
    rule: { whenOptionIds: [crust.opt("Cheese burst")] },
    opts: [{ name: "Garlic dip", def: true }, { name: "Chili dip", price: 50 }, { name: "No dip" }],
  });
  const toppings = await group({
    name: "Toppings",
    kind: "add",
    min: 0,
    max: 8,
    qty: 2,
    sort: 4,
    opts: [
      { name: "Pepperoni", price: 150, by: { small: 100, medium: 150, large: 200 }, layer: "pepperoni" },
      { name: "Mushrooms", price: 100, by: { small: 80, medium: 100, large: 140 }, layer: "mushroom" },
      { name: "Black olives", price: 100, by: { small: 80, medium: 100, large: 140 }, layer: "olive" },
      { name: "Red onion", price: 80, by: { small: 60, medium: 80, large: 110 }, layer: "onion" },
      { name: "Bell peppers", price: 90, by: { small: 70, medium: 90, large: 120 }, layer: "pepper" },
      { name: "Jalapeños", price: 90, by: { small: 70, medium: 90, large: 120 }, layer: "jalapeno" },
      { name: "Sweet corn", price: 80, by: { small: 60, medium: 80, large: 110 }, layer: "corn" },
      { name: "Fresh basil", price: 60, layer: "basil" },
      { name: "Extra mozzarella", price: 150, by: { small: 100, medium: 150, large: 200 }, layer: "cheese" },
    ],
  });
  const removeP = await group({ name: "Remove ingredients", kind: "remove", min: 0, max: 6, sort: 5, opts: [{ name: "Mozzarella" }, { name: "Basil" }, { name: "Onion" }, { name: "Olives" }, { name: "Garlic" }] });
  const spice = await group({ name: "Spice level", kind: "choice", min: 0, max: 1, sort: 6, opts: [{ name: "Mild" }, { name: "Medium" }, { name: "Hot" }, { name: "Extra hot" }] });
  const bake = await group({ name: "Bake", kind: "choice", min: 0, max: 1, sort: 7, opts: [{ name: "Regular bake", def: true }, { name: "Well done" }, { name: "Light bake" }] });

  /* burger groups */
  const doneness = await group({ name: "Patty doneness", kind: "choice", min: 1, max: 1, sort: 1, opts: [{ name: "Medium", def: true }, { name: "Medium well" }, { name: "Well done" }] });
  const burgerAdd = await group({
    name: "Add-ons",
    kind: "add",
    max: 6,
    qty: 2,
    sort: 2,
    opts: [{ name: "Crispy bacon", price: 200 }, { name: "Extra cheese", price: 100 }, { name: "Fried egg", price: 150 }, { name: "Avocado", price: 200 }, { name: "Extra patty", price: 400 }],
  });
  const burgerRemove = await group({ name: "Remove ingredients", kind: "remove", max: 6, sort: 3, opts: [{ name: "Onion" }, { name: "Mayonnaise" }, { name: "Pickles" }, { name: "Lettuce" }, { name: "Tomato" }] });

  /* pasta */
  const pastaType = await group({ name: "Pasta type", kind: "choice", min: 1, max: 1, sort: 1, opts: [{ name: "Tagliatelle", def: true }, { name: "Penne" }, { name: "Gluten-free fusilli", price: 200 }] });
  const pastaAdd = await group({ name: "Add-ons", kind: "add", max: 4, sort: 2, opts: [{ name: "Grilled chicken", price: 300 }, { name: "Extra parmesan", price: 100 }, { name: "Shaved truffle", price: 400 }] });
  const pastaRemove = await group({ name: "Remove ingredients", kind: "remove", max: 4, sort: 3, opts: [{ name: "Garlic" }, { name: "Mushrooms" }, { name: "Parmesan" }] });

  /* drinks */
  const sweet = await group({ name: "Sweetness", kind: "choice", min: 1, max: 1, sort: 1, opts: [{ name: "Regular", def: true }, { name: "Less sweet" }, { name: "Unsweetened" }] });
  const ice = await group({ name: "Ice", kind: "choice", min: 0, max: 1, sort: 2, opts: [{ name: "Regular ice", def: true }, { name: "Less ice" }, { name: "No ice" }] });
  const drinkAdd = await group({ name: "Add-ons", kind: "add", max: 3, sort: 3, opts: [{ name: "Extra espresso shot", price: 100 }, { name: "Vanilla syrup", price: 50 }, { name: "Whipped cream", price: 75 }] });

  /* dessert */
  const dessertAdd = await group({ name: "Add-ons", kind: "add", max: 3, qty: 2, sort: 1, opts: [{ name: "Vanilla ice cream", price: 200 }, { name: "Hot fudge", price: 100 }, { name: "Fresh berries", price: 150 }] });

  const item = async (o: {
    cat: string;
    name: string;
    desc: string;
    price: number;
    img: string;
    visual: string;
    station: string;
    variants?: [string, number, boolean?][];
    groups: { id: string }[];
    ingredients: string[];
    featured?: boolean;
    prep?: number;
    sort: number;
    es?: { name: string; description: string };
  }) => {
    const [it] = await db
      .insert(S.menuItems)
      .values({
        restaurantId,
        categoryId: o.cat,
        name: o.name,
        description: o.desc,
        basePrice: o.price,
        imageUrl: `/food/${o.img}.jpg`,
        visual: o.visual,
        stationId: stations[o.station],
        ingredients: o.ingredients,
        featured: !!o.featured,
        prepMinutes: o.prep ?? 12,
        sort: o.sort,
        translations: o.es ? { es: o.es } : {},
      })
      .returning();
    if (o.variants?.length) {
      await db.insert(S.menuItemVariants).values(o.variants.map((v, i) => ({ restaurantId, itemId: it.id, name: v[0], priceDelta: v[1], isDefault: !!v[2], sort: i })));
    }
    if (o.groups.length) await db.insert(S.menuItemCustomizationGroups).values(o.groups.map((g, i) => ({ restaurantId, itemId: it.id, groupId: g.id, sort: i })));
    return it;
  };
  const sizes: [string, number, boolean?][] = [["Small", 0], ["Medium", 300, true], ["Large", 600]];

  await item({
    cat: cats.pizza,
    name: "Build Your Own Pizza",
    desc: "Your canvas. Choose a crust, a sauce and pile on the toppings — watch it take shape in 3D as you build.",
    price: 899,
    img: "pizza",
    visual: "pizza",
    station: "Pizza",
    variants: sizes,
    groups: [crust, sauce, dip, toppings, removeP, spice, bake],
    ingredients: ["Mozzarella", "San Marzano tomato", "Fresh basil", "Olive oil"],
    featured: true,
    prep: 18,
    sort: 1,
    es: { name: "Crea tu propia pizza", description: "Elige la masa, la salsa y los ingredientes. Míralo en 3D mientras lo construyes." },
  });
  await item({
    cat: cats.pizza,
    name: "Margherita Classica",
    desc: "Wood-fired, fior di latte, torn basil and a drizzle of Tuscan olive oil.",
    price: 1100,
    img: "pizza",
    visual: "pizza",
    station: "Pizza",
    variants: sizes,
    groups: [crust, toppings, removeP, spice],
    ingredients: ["Fior di latte", "Tomato", "Basil", "Olive oil"],
    prep: 15,
    sort: 2,
  });
  await item({
    cat: cats.burger,
    name: "Double Cheese Burger",
    desc: "Two smashed beef patties, aged cheddar, house sauce on a toasted brioche bun.",
    price: 1250,
    img: "burger",
    visual: "burger",
    station: "Burger",
    groups: [doneness, burgerAdd, burgerRemove],
    ingredients: ["Beef patty", "Aged cheddar", "Brioche", "House sauce", "Pickles", "Onion"],
    featured: true,
    prep: 14,
    sort: 1,
    es: { name: "Hamburguesa doble con queso", description: "Dos carnes smash, cheddar curado y salsa de la casa en pan brioche." },
  });
  await item({
    cat: cats.pasta,
    name: "Truffle Tagliatelle",
    desc: "Fresh egg pasta in a velvet parmesan cream, finished with black truffle.",
    price: 1650,
    img: "pasta",
    visual: "pasta",
    station: "Main Course",
    groups: [pastaType, pastaAdd, pastaRemove, spice],
    ingredients: ["Egg pasta", "Parmesan", "Cream", "Black truffle", "Garlic"],
    prep: 16,
    sort: 1,
  });
  await item({
    cat: cats.drinks,
    name: "Cold Coffee",
    desc: "Slow-brewed espresso shaken over ice with silky cream.",
    price: 450,
    img: "coffee",
    visual: "drink",
    station: "Beverages",
    variants: [["Regular", 0, true], ["Large", 150]],
    groups: [sweet, ice, drinkAdd],
    ingredients: ["Espresso", "Milk", "Cream", "Ice"],
    prep: 4,
    sort: 1,
    es: { name: "Café frío", description: "Espresso de cocción lenta con hielo y crema." },
  });
  await item({
    cat: cats.dessert,
    name: "Molten Lava Cake",
    desc: "Warm dark-chocolate cake with a liquid centre and gold leaf.",
    price: 900,
    img: "dessert",
    visual: "dessert",
    station: "Desserts",
    groups: [dessertAdd],
    ingredients: ["Dark chocolate", "Butter", "Eggs", "Gold leaf"],
    featured: true,
    prep: 12,
    sort: 1,
  });
}

/* ─────────── demo workspace (idempotent; disable with TAPMENU_SEED_DEMO=false) ─────────── */

let demoPromise: Promise<void> | null = null;
export function ensureDemo() {
  if (process.env.TAPMENU_SEED_DEMO === "false") return Promise.resolve();
  if (!demoPromise) {
    demoPromise = seedDemo().catch((e) => {
      console.error("[seed] demo failed", e);
      demoPromise = null;
    });
  }
  return demoPromise;
}

async function seedDemo() {
  await ensurePlans();
  const [admin] = await db.select().from(S.users).where(eq(S.users.email, "admin@tapmenu.app")).limit(1);
  if (!admin) {
    await db.insert(S.users).values({ email: "admin@tapmenu.app", name: "Platform Admin", passwordHash: hashPassword("admin12345"), platformRole: "platform_admin" }).onConflictDoNothing();
  }
  const [ex] = await db.select().from(S.restaurants).where(eq(S.restaurants.slug, "ember-crust")).limit(1);
  if (ex) return;
  const [owner] = await db
    .insert(S.users)
    .values({ email: "owner@ember.demo", name: "Giulia Rossi", passwordHash: hashPassword("demo12345") })
    .onConflictDoNothing()
    .returning();
  if (!owner) return;
  const r = await provisionRestaurant({ ownerId: owner.id, name: "Ember & Crust", slug: "ember-crust", planCode: "growth" });
  await db.update(S.restaurants).set({ tagline: "Wood-fired. Hand-built. Yours.", languages: ["en", "es"] }).where(eq(S.restaurants.id, r.id));
  await db.update(S.restaurantSettings).set({ taxRateBps: 800, taxLabel: "VAT", serviceChargeBps: 500, paymentMethods: { cash: true, card_at_table: true, online: false } }).where(eq(S.restaurantSettings.restaurantId, r.id));
  await db.insert(S.coupons).values({ restaurantId: r.id, code: "WELCOME10", kind: "percent", value: 1000 });
  await loadStarterMenu(r.id);
  const [branch] = await db.select().from(S.branches).where(eq(S.branches.restaurantId, r.id)).limit(1);
  const tbls = await db
    .insert(S.tables)
    .values(Array.from({ length: 8 }, (_, i) => ({ restaurantId: r.id, branchId: branch.id, code: `T${String(i + 1).padStart(2, "0")}`, seats: i % 3 === 0 ? 2 : 4 })))
    .returning();
  await db.insert(S.nfcCards).values(tbls.map((t) => ({ restaurantId: r.id, tableId: t.id, token: randomBytes(6).toString("base64url"), label: `Card ${t.code}` })));
  const kst = await db.select().from(S.kitchenStations).where(and(eq(S.kitchenStations.restaurantId, r.id)));
  void kst;
  await addStaff(r.id, { name: "Marco (Kitchen)", email: "kitchen@ember.demo", password: "demo12345", role: "kitchen" });
  await addStaff(r.id, { name: "Sofia (Waiter)", email: "waiter@ember.demo", password: "demo12345", role: "waiter" });
}
