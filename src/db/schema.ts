import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  customType,
  bigserial,
  primaryKey,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const id = () => uuid("id").primaryKey().defaultRandom();
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const rid = () =>
  uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" });

/* ───────────── platform ───────────── */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  platformRole: text("platform_role").notNull().default("user"), // user | platform_admin
  disabled: boolean("disabled").notNull().default(false),
  createdAt: created(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  interval: text("interval").notNull().default("month"),
  maxBranches: integer("max_branches").notNull().default(1),
  maxTables: integer("max_tables").notNull().default(10),
  maxMenuItems: integer("max_menu_items").notNull().default(50),
  maxEmployees: integer("max_employees").notNull().default(5),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

export const platformConfig = pgTable("platform_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────── tenants ───────────── */

export const restaurants = pgTable("restaurants", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  status: text("status").notNull().default("active"), // active | suspended
  logoAssetId: uuid("logo_asset_id"),
  coverAssetId: uuid("cover_asset_id"),
  primaryColor: text("primary_color").notNull().default("#f59e0b"),
  accentColor: text("accent_color").notNull().default("#ea580c"),
  theme: text("theme").notNull().default("noir"), // noir | ember | ivory
  defaultLanguage: text("default_language").notNull().default("en"),
  languages: jsonb("languages").$type<string[]>().notNull().default(["en"]),
  createdAt: created(),
});

export const restaurantMembers = pgTable(
  "restaurant_members",
  {
    id: id(),
    restaurantId: rid(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"), // owner | manager | kitchen | waiter
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [uniqueIndex("members_unique").on(t.restaurantId, t.userId), index("members_user_idx").on(t.userId)],
);

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  restaurantId: rid().unique(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  status: text("status").notNull().default("trialing"), // trialing | active | past_due | canceled
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: created(),
});

export const restaurantSettings = pgTable("restaurant_settings", {
  restaurantId: uuid("restaurant_id")
    .primaryKey()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("UTC"),
  taxRateBps: integer("tax_rate_bps").notNull().default(0),
  taxLabel: text("tax_label").notNull().default("Tax"),
  serviceChargeBps: integer("service_charge_bps").notNull().default(0),
  feeCents: integer("fee_cents").notNull().default(0),
  feeLabel: text("fee_label").notNull().default("Fee"),
  autoDiscountBps: integer("auto_discount_bps").notNull().default(0),
  paymentMethods: jsonb("payment_methods")
    .$type<{ cash: boolean; card_at_table: boolean; online: boolean }>()
    .notNull()
    .default({ cash: true, card_at_table: false, online: false }),
  onlineProvider: text("online_provider").notNull().default("stripe"),
  orderingEnabled: boolean("ordering_enabled").notNull().default(true),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  newOrderSound: text("new_order_sound").notNull().default("chime"),
  autoAccept: boolean("auto_accept").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable(
  "branches",
  {
    id: id(),
    restaurantId: rid(),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [index("branches_rest_idx").on(t.restaurantId)],
);

export const tables = pgTable(
  "tables",
  {
    id: id(),
    restaurantId: rid(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    label: text("label").notNull().default(""),
    seats: integer("seats").notNull().default(4),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [uniqueIndex("tables_code_unique").on(t.restaurantId, t.code), index("tables_branch_idx").on(t.branchId)],
);

export const nfcCards = pgTable(
  "nfc_cards",
  {
    id: id(),
    restaurantId: rid(),
    tableId: uuid("table_id").references(() => tables.id, { onDelete: "set null" }),
    token: text("token").notNull().unique(),
    label: text("label").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [index("cards_rest_idx").on(t.restaurantId), index("cards_table_idx").on(t.tableId)],
);

/* ───────────── menu ───────────── */

export const foodAssets = pgTable(
  "food_assets",
  {
    id: id(),
    restaurantId: rid(),
    kind: text("kind").notNull(), // image | model | logo
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    createdAt: created(),
  },
  (t) => [index("assets_rest_idx").on(t.restaurantId)],
);

export const kitchenStations = pgTable(
  "kitchen_stations",
  {
    id: id(),
    restaurantId: rid(),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [index("stations_rest_idx").on(t.restaurantId)],
);

export const menuCategories = pgTable(
  "menu_categories",
  {
    id: id(),
    restaurantId: rid(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    translations: jsonb("translations").$type<Record<string, { name?: string; description?: string }>>().notNull().default({}),
    stationId: uuid("station_id").references(() => kitchenStations.id, { onDelete: "set null" }),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    availableFrom: text("available_from"),
    availableTo: text("available_to"),
    createdAt: created(),
  },
  (t) => [index("cat_rest_idx").on(t.restaurantId)],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: id(),
    restaurantId: rid(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    translations: jsonb("translations").$type<Record<string, { name?: string; description?: string }>>().notNull().default({}),
    ingredients: jsonb("ingredients").$type<string[]>().notNull().default([]),
    basePrice: integer("base_price").notNull().default(0),
    imageAssetId: uuid("image_asset_id"),
    imageUrl: text("image_url"),
    modelAssetId: uuid("model_asset_id"),
    visual: text("visual").notNull().default("generic"), // pizza | burger | pasta | drink | dessert | generic (procedural 3D fallback)
    stationId: uuid("station_id").references(() => kitchenStations.id, { onDelete: "set null" }),
    available: boolean("available").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    prepMinutes: integer("prep_minutes").notNull().default(10),
    availableFrom: text("available_from"),
    availableTo: text("available_to"),
    sort: integer("sort").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("items_rest_idx").on(t.restaurantId), index("items_cat_idx").on(t.categoryId)],
);

export const menuItemVariants = pgTable(
  "menu_item_variants",
  {
    id: id(),
    restaurantId: rid(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDelta: integer("price_delta").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    available: boolean("available").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("variants_item_idx").on(t.itemId)],
);

export const customizationGroups = pgTable(
  "customization_groups",
  {
    id: id(),
    restaurantId: rid(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("choice"), // choice | add | remove
    minSelect: integer("min_select").notNull().default(0),
    maxSelect: integer("max_select").notNull().default(1),
    allowQuantity: boolean("allow_quantity").notNull().default(false),
    maxQty: integer("max_qty").notNull().default(1),
    rule: jsonb("rule").$type<{ variantNames?: string[]; whenOptionIds?: string[] } | null>(),
    translations: jsonb("translations").$type<Record<string, { name?: string }>>().notNull().default({}),
    sort: integer("sort").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("groups_rest_idx").on(t.restaurantId)],
);

export const customizationOptions = pgTable(
  "customization_options",
  {
    id: id(),
    restaurantId: rid(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => customizationGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    translations: jsonb("translations").$type<Record<string, { name?: string }>>().notNull().default({}),
    price: integer("price").notNull().default(0),
    priceBySize: jsonb("price_by_size").$type<Record<string, number>>().notNull().default({}),
    available: boolean("available").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    layer: text("layer"), // 3D layer key, e.g. pepperoni
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("options_group_idx").on(t.groupId)],
);

export const menuItemCustomizationGroups = pgTable(
  "menu_item_customization_groups",
  {
    id: id(),
    restaurantId: rid(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => customizationGroups.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("item_group_unique").on(t.itemId, t.groupId)],
);

/* ───────────── orders ───────────── */

export const orders = pgTable(
  "orders",
  {
    id: id(),
    restaurantId: rid(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    tableId: uuid("table_id").references(() => tables.id, { onDelete: "set null" }),
    tableCode: text("table_code").notNull().default(""),
    orderNo: integer("order_no").notNull(),
    publicToken: text("public_token").notNull().unique(),
    clientKey: text("client_key").notNull(),
    status: text("status").notNull().default("placed"), // placed | accepted | preparing | ready | served | completed | cancelled
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    serviceCharge: integer("service_charge").notNull().default(0),
    fees: integer("fees").notNull().default(0),
    total: integer("total").notNull(),
    currency: text("currency").notNull().default("USD"),
    paymentMethod: text("payment_method").notNull().default("cash"),
    paymentStatus: text("payment_status").notNull().default("pending"), // pending | paid | failed | refunded
    couponCode: text("coupon_code"),
    notes: text("notes").notNull().default(""),
    language: text("language").notNull().default("en"),
    aiSummary: text("ai_summary"),
    priority: boolean("priority").notNull().default(false),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_no_unique").on(t.restaurantId, t.orderNo),
    uniqueIndex("orders_client_key_unique").on(t.restaurantId, t.clientKey),
    index("orders_rest_status_idx").on(t.restaurantId, t.status),
    index("orders_rest_created_idx").on(t.restaurantId, t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    restaurantId: rid(),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    nameSnapshot: text("name_snapshot").notNull(),
    variantNameSnapshot: text("variant_name_snapshot"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
    instructions: text("instructions").notNull().default(""),
    stationId: uuid("station_id").references(() => kitchenStations.id, { onDelete: "set null" }),
    stationName: text("station_name").notNull().default(""),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_rest_idx").on(t.restaurantId)],
);

export const orderItemCustomizations = pgTable(
  "order_item_customizations",
  {
    id: id(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    restaurantId: rid(),
    optionId: uuid("option_id"),
    groupName: text("group_name").notNull(),
    optionName: text("option_name").notNull(),
    action: text("action").notNull(), // choice | add | remove
    quantity: integer("quantity").notNull().default(1),
    priceDelta: integer("price_delta").notNull().default(0),
  },
  (t) => [index("oic_item_idx").on(t.orderItemId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    restaurantId: rid(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorName: text("actor_name").notNull().default("system"),
    note: text("note").notNull().default(""),
    createdAt: created(),
  },
  (t) => [index("osh_order_idx").on(t.orderId)],
);

export const kitchenOrderItems = pgTable(
  "kitchen_order_items",
  {
    id: id(),
    restaurantId: rid(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    stationId: uuid("station_id")
      .notNull()
      .references(() => kitchenStations.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("placed"), // placed | accepted | preparing | ready | completed | cancelled
    startedAt: timestamp("started_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [index("koi_order_idx").on(t.orderId), index("koi_station_idx").on(t.stationId, t.status)],
);

/* ───────────── people & realtime ───────────── */

export const employees = pgTable(
  "employees",
  {
    id: id(),
    restaurantId: rid(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title").notNull().default("waiter"),
    stationId: uuid("station_id").references(() => kitchenStations.id, { onDelete: "set null" }),
    onDuty: boolean("on_duty").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [uniqueIndex("employees_user_unique").on(t.restaurantId, t.userId)],
);

export const employeeAssignments = pgTable(
  "employee_assignments",
  {
    id: id(),
    restaurantId: rid(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [uniqueIndex("assign_order_unique").on(t.orderId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    restaurantId: rid(),
    targetType: text("target_type").notNull(), // owner | station | employee
    targetId: uuid("target_id"),
    type: text("type").notNull(), // order_new | order_status | assist | ...
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    orderId: uuid("order_id"),
    attempts: integer("attempts").notNull().default(0),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [index("notif_rest_idx").on(t.restaurantId, t.id), index("notif_target_idx").on(t.restaurantId, t.targetType, t.targetId)],
);

export const assistanceRequests = pgTable(
  "assistance_requests",
  {
    id: id(),
    restaurantId: rid(),
    tableId: uuid("table_id").references(() => tables.id, { onDelete: "set null" }),
    tableCode: text("table_code").notNull().default(""),
    kind: text("kind").notNull().default("waiter"), // waiter | bill | water | help
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("open"), // open | resolved
    createdAt: created(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("assist_rest_idx").on(t.restaurantId, t.status)],
);

/* ───────────── money ───────────── */

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: id(),
    restaurantId: rid(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("manual"), // manual | stripe
    method: text("method").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("pending"), // pending | paid | failed | refunded
    externalRef: text("external_ref"),
    createdAt: created(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("pay_rest_idx").on(t.restaurantId, t.createdAt), index("pay_order_idx").on(t.orderId)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: id(),
    restaurantId: rid(),
    code: text("code").notNull(),
    kind: text("kind").notNull().default("percent"), // percent | fixed
    value: integer("value").notNull(), // percent: basis points; fixed: cents
    minSubtotal: integer("min_subtotal").notNull().default(0),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [uniqueIndex("coupons_code_unique").on(t.restaurantId, t.code)],
);

export const customerFeedback = pgTable(
  "customer_feedback",
  {
    id: id(),
    restaurantId: rid(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: created(),
  },
  (t) => [index("feedback_rest_idx").on(t.restaurantId)],
);

export const supportRequests = pgTable(
  "support_requests",
  {
    id: id(),
    restaurantId: rid(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"), // open | answered | closed
    reply: text("reply").notNull().default(""),
    createdAt: created(),
  },
  (t) => [index("support_rest_idx").on(t.restaurantId)],
);

export const inventoryItems = pgTable("inventory_items", { id: id(), restaurantId: rid(), name: text("name").notNull(), unit: text("unit").notNull().default("pcs"), stock: integer("stock").notNull().default(0), lowStockAt: integer("low_stock_at").notNull().default(5), costPerUnit: integer("cost_per_unit").notNull().default(0), active: boolean("active").notNull().default(true), createdAt: created(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (t) => [index("inventory_items_restaurant_idx").on(t.restaurantId, t.active, t.name)]);

export const _pk = primaryKey; // keep import used for future composite keys
