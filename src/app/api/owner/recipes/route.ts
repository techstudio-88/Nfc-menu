import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, menuItemRecipes, menuItems } from "@/db/schema";
import { body, handle, HttpError, isUuid } from "@/lib/api";
import { OWNER_ROLES, requireTenant } from "@/lib/auth";

export const GET = handle(async () => {
  const t = await requireTenant(OWNER_ROLES);
  const [items, inventory, recipes] = await Promise.all([
    db.select({ id: menuItems.id, name: menuItems.name }).from(menuItems).where(eq(menuItems.restaurantId, t.restaurantId)).orderBy(asc(menuItems.name)),
    db.select({ id: inventoryItems.id, name: inventoryItems.name, unit: inventoryItems.unit, costPerUnit: inventoryItems.costPerUnit, active: inventoryItems.active }).from(inventoryItems).where(eq(inventoryItems.restaurantId, t.restaurantId)).orderBy(asc(inventoryItems.name)),
    db.select({ id: menuItemRecipes.id, menuItemId: menuItemRecipes.menuItemId, itemName: menuItems.name, inventoryItemId: menuItemRecipes.inventoryItemId, ingredientName: inventoryItems.name, unit: inventoryItems.unit, quantityPerItem: menuItemRecipes.quantityPerItem, costPerUnit: inventoryItems.costPerUnit })
      .from(menuItemRecipes).innerJoin(menuItems, eq(menuItemRecipes.menuItemId, menuItems.id)).innerJoin(inventoryItems, eq(menuItemRecipes.inventoryItemId, inventoryItems.id))
      .where(eq(menuItemRecipes.restaurantId, t.restaurantId)).orderBy(asc(menuItems.name), asc(inventoryItems.name)),
  ]);
  return { items, inventory, recipes };
});

export const POST = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const b = await body<{ menuItemId: string; inventoryItemId: string; quantityPerItem: number }>(req);
  const quantity = Math.floor(Number(b.quantityPerItem));
  if (!isUuid(b.menuItemId) || !isUuid(b.inventoryItemId)) throw new HttpError(400, "Choose a valid dish and ingredient.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) throw new HttpError(422, "Quantity must be between 1 and 1,000,000.");
  const [item] = await db.select({ id: menuItems.id }).from(menuItems).where(and(eq(menuItems.id, b.menuItemId), eq(menuItems.restaurantId, t.restaurantId))).limit(1);
  const [ingredient] = await db.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.id, b.inventoryItemId), eq(inventoryItems.restaurantId, t.restaurantId))).limit(1);
  if (!item || !ingredient) throw new HttpError(404, "Dish or ingredient not found in this restaurant.");
  await db.insert(menuItemRecipes).values({ restaurantId: t.restaurantId, menuItemId: item.id, inventoryItemId: ingredient.id, quantityPerItem: quantity })
    .onConflictDoUpdate({ target: [menuItemRecipes.menuItemId, menuItemRecipes.inventoryItemId], set: { quantityPerItem: quantity } });
  return { ok: true };
});

export const DELETE = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!isUuid(id)) throw new HttpError(400, "Invalid recipe.");
  await db.delete(menuItemRecipes).where(and(eq(menuItemRecipes.id, id), eq(menuItemRecipes.restaurantId, t.restaurantId)));
  return { ok: true };
});
