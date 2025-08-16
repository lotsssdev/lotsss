-- Extend organizations with richer company fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS address_country TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT,
  ADD COLUMN IF NOT EXISTS address_zip TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Ensure stripe_customer_id is unique when present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'organizations' AND indexname = 'organizations_stripe_customer_id_key'
  ) THEN
    -- Use a unique index with WHERE to allow multiple NULLs
    CREATE UNIQUE INDEX organizations_stripe_customer_id_key ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
  END IF;
END $$;

-- Update create_organization to receive and store new fields
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_logo_url text default null,
  p_description text default null,
  p_legal_name text default null,
  p_is_active boolean default true,
  p_tax_id text default null,
  p_address_country text default null,
  p_address_street text default null,
  p_address_city text default null,
  p_address_state text default null,
  p_address_zip text default null,
  p_contact_phone text default null,
  p_stripe_customer_id text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_org public.organizations;
begin
  if v_owner is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations(
    name, slug, logo_url, description, owner_id,
    legal_name, is_active, tax_id,
    address_country, address_street, address_city, address_state, address_zip,
    contact_phone, stripe_customer_id
  )
  values (
    p_name, p_slug, p_logo_url, p_description, v_owner,
    p_legal_name, coalesce(p_is_active, true), p_tax_id,
    p_address_country, p_address_street, p_address_city, p_address_state, p_address_zip,
    p_contact_phone, p_stripe_customer_id
  )
  returning * into v_org;

  -- ensure owner is a member
  insert into public.organization_members(organization_id, user_id, role)
  values (v_org.id, v_owner, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return v_org;
end;
$$;

grant execute on function public.create_organization(text,text,text,text,text,boolean,text,text,text,text,text,text,text,text) to authenticated;

-- Return extra fields from admin_list_organizations
-- Need to drop first to change the return type
drop function if exists public.admin_list_organizations();

create or replace function public.admin_list_organizations()
returns table (
  id uuid,
  name text,
  slug text,
  owner_email text,
  created_at timestamptz,
  is_active boolean,
  tax_id text
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid,
           coalesce((auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid) as jwt_org
  ), is_platform_admin as (
    select (
      (select jwt_org from me) = 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'::uuid
    ) as ok
  )
  select o.id, o.name, o.slug, p.email as owner_email, o.created_at, o.is_active, o.tax_id
  from public.organizations o
  join public.profiles p on p.id = o.owner_id
  where (select ok from is_platform_admin)
     or exists (
        select 1 from public.organization_members m
        where m.organization_id = o.id and m.user_id = (select uid from me)
     )
  order by o.created_at desc;
$$;

grant execute on function public.admin_list_organizations to authenticated;
