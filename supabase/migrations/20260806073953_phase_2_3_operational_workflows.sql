create type public.supply_request_status as enum (
  'pending',
  'assigned',
  'in_purchase',
  'purchased',
  'delivered',
  'completed'
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  phone text,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  category text not null check (char_length(trim(category)) between 1 and 80),
  unit text not null check (char_length(trim(unit)) between 1 and 80),
  min_threshold numeric(12, 3) not null default 0 check (min_threshold >= 0),
  suggested_quantity numeric(12, 3) not null default 1 check (suggested_quantity > 0),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, location_id, name)
);

create table public.product_suppliers (
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  supplier_sku text,
  unit_price numeric(12, 2) check (unit_price >= 0),
  currency char(3) not null default 'USD',
  is_preferred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, supplier_id)
);

create table public.supply_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  request_number bigint generated always as identity,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_buyer_id uuid references public.profiles(id) on delete restrict,
  status public.supply_request_status not null default 'pending',
  urgent boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_at timestamptz,
  shopping_started_at timestamptz,
  purchased_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  unique (organization_id, request_number)
);

create table public.supply_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.supply_requests(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  category_snapshot text not null,
  unit_snapshot text not null,
  current_stock_at_request numeric(12, 3),
  min_threshold_snapshot numeric(12, 3) not null default 0,
  requested_quantity numeric(12, 3) not null check (requested_quantity > 0),
  purchased_quantity numeric(12, 3) not null default 0 check (purchased_quantity >= 0 and purchased_quantity <= requested_quantity),
  purchased_by uuid references public.profiles(id) on delete set null,
  purchased_at timestamptz,
  item_note text,
  created_at timestamptz not null default now()
);

create table public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  recorded_quantity numeric(12, 3) not null check (recorded_quantity >= 0),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  notes text,
  recorded_at timestamptz not null default now()
);

create table public.request_status_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.supply_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  previous_status public.supply_request_status,
  new_status public.supply_request_status not null,
  note text,
  created_at timestamptz not null default now()
);

create index suppliers_organization_idx on public.suppliers (organization_id, active);
create index products_organization_location_idx on public.products (organization_id, location_id, active);
create index product_suppliers_supplier_idx on public.product_suppliers (supplier_id);
create index supply_requests_work_queue_idx on public.supply_requests (organization_id, location_id, status, created_at desc);
create index supply_requests_buyer_queue_idx on public.supply_requests (assigned_buyer_id, status, created_at desc);
create index supply_request_items_request_idx on public.supply_request_items (request_id);
create index inventory_counts_latest_idx on public.inventory_counts (location_id, product_id, recorded_at desc);
create index request_status_events_request_idx on public.request_status_events (request_id, created_at);

create trigger suppliers_set_updated_at before update on public.suppliers
for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function private.set_updated_at();
create trigger product_suppliers_set_updated_at before update on public.product_suppliers
for each row execute function private.set_updated_at();
create trigger supply_requests_set_updated_at before update on public.supply_requests
for each row execute function private.set_updated_at();

create function private.validate_product_scope()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.location_id is not null and not exists (
    select 1 from public.locations where id = new.location_id and organization_id = new.organization_id
  ) then
    raise exception 'Product location must belong to its organization';
  end if;
  return new;
end;
$$;

create trigger products_validate_scope before insert or update on public.products
for each row execute function private.validate_product_scope();

create function private.validate_request_scope()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from public.locations where id = new.location_id and organization_id = new.organization_id) then
    raise exception 'Request location must belong to its organization';
  end if;
  if not exists (select 1 from public.profiles where id = new.created_by and organization_id = new.organization_id) then
    raise exception 'Request creator must belong to its organization';
  end if;
  if new.assigned_buyer_id is not null and not exists (
    select 1 from public.profiles where id = new.assigned_buyer_id and organization_id = new.organization_id and role = 'buyer'
  ) then
    raise exception 'Assigned buyer must be a buyer in the organization';
  end if;
  return new;
end;
$$;

create trigger supply_requests_validate_scope before insert or update on public.supply_requests
for each row execute function private.validate_request_scope();

create function private.can_view_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1
    from public.supply_requests request
    where request.id = p_request_id
      and private.is_org_member(request.organization_id)
      and (
        private.is_org_admin(request.organization_id)
        or request.created_by = (select auth.uid())
        or request.assigned_buyer_id = (select auth.uid())
        or private.has_location_access(request.location_id)
      )
  );
$$;

create function public.create_supply_request(
  p_location_id uuid,
  p_urgent boolean,
  p_notes text,
  p_items jsonb
)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_org_id uuid;
  v_request_id uuid;
  v_product public.products%rowtype;
  v_item record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A request needs at least one item';
  end if;
  select organization_id into v_org_id from public.profiles where id = auth.uid();
  if v_org_id is null or not private.has_location_access(p_location_id) then
    raise exception 'You do not have access to this location';
  end if;
  insert into public.supply_requests (organization_id, location_id, created_by, urgent, notes)
  values (v_org_id, p_location_id, auth.uid(), coalesce(p_urgent, false), nullif(trim(p_notes), ''))
  returning id into v_request_id;
  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, requested_quantity numeric, current_stock numeric, item_note text)
  loop
    if v_item.product_id is null or v_item.requested_quantity is null or v_item.requested_quantity <= 0 then
      raise exception 'Each item needs a product and positive quantity';
    end if;
    select * into v_product from public.products
    where id = v_item.product_id and organization_id = v_org_id and active
      and (location_id is null or location_id = p_location_id);
    if not found then raise exception 'Product is unavailable for this location'; end if;
    insert into public.supply_request_items (
      request_id, product_id, product_name_snapshot, category_snapshot, unit_snapshot,
      current_stock_at_request, min_threshold_snapshot, requested_quantity, item_note
    ) values (
      v_request_id, v_product.id, v_product.name, v_product.category, v_product.unit,
      v_item.current_stock, v_product.min_threshold, v_item.requested_quantity, nullif(trim(v_item.item_note), '')
    );
  end loop;
  insert into public.request_status_events (request_id, organization_id, changed_by, previous_status, new_status, note)
  values (v_request_id, v_org_id, auth.uid(), null, 'pending', 'Solicitud creada');
  return v_request_id;
end;
$$;

create function public.transition_supply_request(
  p_request_id uuid,
  p_new_status public.supply_request_status,
  p_assigned_buyer_id uuid default null,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_request public.supply_requests%rowtype;
  v_is_admin boolean;
  v_is_assigned_buyer boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.supply_requests where id = p_request_id for update;
  if not found or not private.is_org_member(v_request.organization_id) then raise exception 'Request not found'; end if;
  v_is_admin := private.is_org_admin(v_request.organization_id);
  v_is_assigned_buyer := v_request.assigned_buyer_id = auth.uid();
  if (v_request.status, p_new_status) not in (
    ('pending'::public.supply_request_status, 'assigned'::public.supply_request_status),
    ('assigned'::public.supply_request_status, 'in_purchase'::public.supply_request_status),
    ('in_purchase'::public.supply_request_status, 'purchased'::public.supply_request_status),
    ('purchased'::public.supply_request_status, 'delivered'::public.supply_request_status),
    ('delivered'::public.supply_request_status, 'completed'::public.supply_request_status)
  ) then raise exception 'Invalid status transition'; end if;
  if v_request.status = 'pending' then
    if not v_is_admin or p_assigned_buyer_id is null then raise exception 'Only administrators can assign a buyer'; end if;
  elsif v_request.status in ('assigned', 'in_purchase', 'purchased') then
    if not (v_is_admin or v_is_assigned_buyer) then raise exception 'Only the assigned buyer can progress this request'; end if;
  elsif v_request.status = 'delivered' then
    if not (v_is_admin or private.has_location_access(v_request.location_id)) then raise exception 'No permission to complete this request'; end if;
  end if;
  if p_new_status = 'purchased' and exists (
    select 1 from public.supply_request_items where request_id = p_request_id and purchased_quantity < requested_quantity
  ) then raise exception 'All request items must be recorded before purchase is complete'; end if;
  update public.supply_requests set
    status = p_new_status,
    assigned_buyer_id = case when p_new_status = 'assigned' then p_assigned_buyer_id else assigned_buyer_id end,
    assigned_at = case when p_new_status = 'assigned' then now() else assigned_at end,
    shopping_started_at = case when p_new_status = 'in_purchase' then now() else shopping_started_at end,
    purchased_at = case when p_new_status = 'purchased' then now() else purchased_at end,
    delivered_at = case when p_new_status = 'delivered' then now() else delivered_at end,
    completed_at = case when p_new_status = 'completed' then now() else completed_at end
  where id = p_request_id;
  insert into public.request_status_events (request_id, organization_id, changed_by, previous_status, new_status, note)
  values (p_request_id, v_request.organization_id, auth.uid(), v_request.status, p_new_status, nullif(trim(p_note), ''));
end;
$$;

create function public.record_request_item_purchase(
  p_item_id uuid,
  p_purchased_quantity numeric,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_request public.supply_requests%rowtype;
  v_item public.supply_request_items%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select item.* into v_item from public.supply_request_items item where item.id = p_item_id for update;
  if not found then raise exception 'Request item not found'; end if;
  select * into v_request from public.supply_requests where id = v_item.request_id for update;
  if not private.is_org_member(v_request.organization_id) or not (private.is_org_admin(v_request.organization_id) or v_request.assigned_buyer_id = auth.uid()) then
    raise exception 'No permission to record this purchase';
  end if;
  if v_request.status not in ('assigned', 'in_purchase') then raise exception 'Request is not being purchased'; end if;
  if p_purchased_quantity < 0 or p_purchased_quantity > v_item.requested_quantity then raise exception 'Purchased quantity is invalid'; end if;
  update public.supply_request_items set purchased_quantity = p_purchased_quantity, purchased_by = auth.uid(), purchased_at = now(), item_note = coalesce(nullif(trim(p_note), ''), item_note)
  where id = p_item_id;
end;
$$;

revoke all on function private.validate_product_scope() from public, anon, authenticated;
revoke all on function private.validate_request_scope() from public, anon, authenticated;
revoke all on function private.can_view_request(uuid) from public, anon, authenticated;
grant execute on function private.can_view_request(uuid) to authenticated;
revoke all on function public.create_supply_request(uuid, boolean, text, jsonb) from public, anon;
revoke all on function public.transition_supply_request(uuid, public.supply_request_status, uuid, text) from public, anon;
revoke all on function public.record_request_item_purchase(uuid, numeric, text) from public, anon;
grant execute on function public.create_supply_request(uuid, boolean, text, jsonb) to authenticated;
grant execute on function public.transition_supply_request(uuid, public.supply_request_status, uuid, text) to authenticated;
grant execute on function public.record_request_item_purchase(uuid, numeric, text) to authenticated;

grant select on public.suppliers, public.products, public.product_suppliers, public.supply_requests, public.supply_request_items, public.inventory_counts, public.request_status_events to authenticated;
grant insert, update, delete on public.suppliers, public.products, public.product_suppliers to authenticated;
grant insert on public.inventory_counts to authenticated;

alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_suppliers enable row level security;
alter table public.supply_requests enable row level security;
alter table public.supply_request_items enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.request_status_events enable row level security;

create policy "organization members can read suppliers" on public.suppliers for select to authenticated using (private.is_org_member(organization_id));
create policy "organization admins manage suppliers" on public.suppliers for all to authenticated using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));
create policy "location members can read products" on public.products for select to authenticated using (private.is_org_member(organization_id) and (location_id is null or private.has_location_access(location_id)));
create policy "organization admins manage products" on public.products for all to authenticated using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));
create policy "product viewers can read product suppliers" on public.product_suppliers for select to authenticated using (exists (select 1 from public.products product where product.id = product_id));
create policy "organization admins manage product suppliers" on public.product_suppliers for all to authenticated using (exists (select 1 from public.products product where product.id = product_id and private.is_org_admin(product.organization_id))) with check (exists (select 1 from public.products product where product.id = product_id and private.is_org_admin(product.organization_id)));
create policy "authorized members can read requests" on public.supply_requests for select to authenticated using (private.can_view_request(id));
create policy "authorized members can read request items" on public.supply_request_items for select to authenticated using (private.can_view_request(request_id));
create policy "location members can read inventory" on public.inventory_counts for select to authenticated using (private.is_org_member(organization_id) and private.has_location_access(location_id));
create policy "location members record inventory" on public.inventory_counts for insert to authenticated with check (recorded_by = (select auth.uid()) and private.is_org_member(organization_id) and private.has_location_access(location_id));
create policy "authorized members can read request history" on public.request_status_events for select to authenticated using (private.can_view_request(request_id));

do $$ begin
  alter publication supabase_realtime add table public.supply_requests, public.supply_request_items, public.inventory_counts, public.request_status_events;
exception when duplicate_object then null;
end $$;
