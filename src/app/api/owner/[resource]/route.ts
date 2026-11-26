import { body, handle, HttpError } from "@/lib/api";
import { OWNER_ROLES, requireTenant } from "@/lib/auth";
import { createRow, deleteRow, listRows, resourceOr404, updateRow } from "@/lib/crud";

export const GET = handle(async (req, ctx) => {
  const { resource } = await ctx.params;
  resourceOr404(resource);
  const t = await requireTenant(resource === "support" ? OWNER_ROLES : OWNER_ROLES);
  return { rows: await listRows(t.restaurantId, resource, req.nextUrl.searchParams) };
});

export const POST = handle(async (req, ctx) => {
  const { resource } = await ctx.params;
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const row = await createRow(t.restaurantId, resource, await body(req));
  return { row };
});

export const PATCH = handle(async (req, ctx) => {
  const { resource } = await ctx.params;
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw new HttpError(400, "Missing id.");
  const row = await updateRow(t.restaurantId, resource, id, await body(req));
  return { row };
});

export const DELETE = handle(async (req, ctx) => {
  const { resource } = await ctx.params;
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw new HttpError(400, "Missing id.");
  return deleteRow(t.restaurantId, resource, id);
});
