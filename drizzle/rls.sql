-- OPTIONAL: Postgres Row Level Security for deployments that expose the database through Supabase
-- (PostgREST / supabase-js with the anon key). The bundled Next.js app connects with a server-side
-- role and enforces tenant isolation in code: every query is scoped by the session's restaurant_id.
-- Apply this file on Supabase to add database-level defence in depth.

create schema if not exists app;
create or replace function app.is_member(rid uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from restaurant_members m
                 where m.restaurant_id = rid and m.user_id = auth.uid() and m.active);
$$;

do $$
declare t text;
begin
  foreach t in array array['branches','tables','nfc_cards','menu_categories','menu_items','menu_item_variants',
    'customization_groups','customization_options','menu_item_customization_groups','food_assets','orders','order_items',
    'order_item_customizations','order_status_history','kitchen_stations','kitchen_order_items','employees',
    'employee_assignments','notifications','payment_records','coupons','customer_feedback','assistance_requests','support_requests']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on %I', t);
    execute format('create policy tenant_isolation on %I using (app.is_member(restaurant_id)) with check (app.is_member(restaurant_id))', t);
  end loop;
end $$;

alter table restaurant_settings enable row level security;
create policy tenant_isolation on restaurant_settings using (app.is_member(restaurant_id)) with check (app.is_member(restaurant_id));
alter table restaurant_members enable row level security;
create policy self_or_tenant on restaurant_members using (user_id = auth.uid() or app.is_member(restaurant_id));
alter table restaurants enable row level security;
create policy tenant_isolation on restaurants using (app.is_member(id));
-- users, subscriptions, subscription_plans, platform_config: service-role only (no policies = no client access).
alter table users enable row level security;
alter table subscriptions enable row level security;
alter table subscription_plans enable row level security;
alter table platform_config enable row level security;
