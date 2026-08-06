create schema if not exists private;

create type public.app_role as enum ('admin', 'buyer', 'cook');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  role public.app_role,
  full_name text not null default '' check (char_length(full_name) <= 160),
  email text not null default '' check (char_length(email) <= 320),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_organization_role_pair check (
    (organization_id is null and role is null)
    or (organization_id is not null and role is not null)
  )
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.location_memberships (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (location_id, profile_id)
);

create index profiles_organization_id_idx on public.profiles (organization_id);
create index locations_organization_id_idx on public.locations (organization_id);
create index location_memberships_profile_id_idx on public.location_memberships (profile_id);
create index location_memberships_location_id_idx on public.location_memberships (location_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger locations_set_updated_at
before update on public.locations
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when public.profiles.full_name = '' then excluded.full_name
        else public.profiles.full_name
      end;

  return new;
end;
$$;

create trigger auth_user_created_profile
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select organization_id
  from public.profiles
  where id = (select auth.uid());
$$;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and organization_id = target_organization_id
  );
$$;

create or replace function private.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and organization_id = target_organization_id
      and role = 'admin'
  );
$$;

create or replace function private.has_location_access(target_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.location_memberships
    where location_id = target_location_id
      and profile_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.locations
    where id = target_location_id
      and private.is_org_admin(organization_id)
  );
$$;

create or replace function private.validate_location_membership_scope()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  membership_organization_id uuid;
  profile_organization_id uuid;
begin
  select organization_id into membership_organization_id
  from public.locations
  where id = new.location_id;

  select organization_id into profile_organization_id
  from public.profiles
  where id = new.profile_id;

  if membership_organization_id is null or profile_organization_id is null
     or membership_organization_id <> profile_organization_id then
    raise exception 'A location membership must stay within one organization';
  end if;

  return new;
end;
$$;

create trigger location_memberships_validate_scope
before insert or update on public.location_memberships
for each row execute function private.validate_location_membership_scope();

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.has_location_access(uuid) to authenticated;

grant usage on schema public to authenticated;
grant select on public.organizations, public.profiles, public.locations, public.location_memberships to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant insert, update, delete on public.organizations, public.locations, public.location_memberships to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.location_memberships enable row level security;

create policy "organization members can read their organization"
on public.organizations
for select
to authenticated
using (private.is_org_member(id));

create policy "organization admins can update their organization"
on public.organizations
for update
to authenticated
using (private.is_org_admin(id))
with check (private.is_org_admin(id));

create policy "users can read their own profile or administered organization profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.is_org_admin(organization_id)
);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "organization members can read locations"
on public.locations
for select
to authenticated
using (private.is_org_member(organization_id));

create policy "organization admins can create locations"
on public.locations
for insert
to authenticated
with check (private.is_org_admin(organization_id));

create policy "organization admins can update locations"
on public.locations
for update
to authenticated
using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));

create policy "organization admins can delete locations"
on public.locations
for delete
to authenticated
using (private.is_org_admin(organization_id));

create policy "users can read their location memberships or administered memberships"
on public.location_memberships
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or private.is_org_admin((select organization_id from public.locations where id = location_id))
);

create policy "organization admins can create location memberships"
on public.location_memberships
for insert
to authenticated
with check (
  private.is_org_admin((select organization_id from public.locations where id = location_id))
);

create policy "organization admins can update location memberships"
on public.location_memberships
for update
to authenticated
using (private.is_org_admin((select organization_id from public.locations where id = location_id)))
with check (private.is_org_admin((select organization_id from public.locations where id = location_id)));

create policy "organization admins can delete location memberships"
on public.location_memberships
for delete
to authenticated
using (private.is_org_admin((select organization_id from public.locations where id = location_id)));
