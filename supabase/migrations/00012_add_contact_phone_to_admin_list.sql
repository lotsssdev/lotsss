-- Add contact_phone field to admin list functions
drop function if exists public.admin_list_organizations_page(text, int, int);

create or replace function public.admin_list_organizations_page(
  p_search text default null,
  p_limit int default 10,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  slug text,
  owner_email text,
  created_at timestamptz,
  is_active boolean,
  tax_id text,
  address_country text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  contact_phone text
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
  ), base as (
    select o.id, o.name, o.slug, p.email as owner_email, o.created_at, o.is_active, o.tax_id,
           o.address_country, o.address_street, o.address_city, o.address_state, o.address_zip, o.contact_phone
    from public.organizations o
    join public.profiles p on p.id = o.owner_id
    where (
      (select ok from is_platform_admin)
      or exists (
        select 1 from public.organization_members m
        where m.organization_id = o.id and m.user_id = (select uid from me)
      )
    )
      and (
        p_search is null
        or o.name ilike '%' || p_search || '%'
        or o.legal_name ilike '%' || p_search || '%'
        or o.slug ilike '%' || p_search || '%'
        or o.tax_id ilike '%' || p_search || '%'
      )
  )
  select * from base
  order by created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.admin_list_organizations_page(text,int,int) to authenticated;

-- Also update the fallback function to include contact_phone
drop function if exists public.admin_list_organizations();

create or replace function public.admin_list_organizations()
returns table (
  id uuid,
  name text,
  slug text,
  owner_email text,
  created_at timestamptz,
  is_active boolean,
  tax_id text,
  address_country text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  contact_phone text
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
  select o.id, o.name, o.slug, p.email as owner_email, o.created_at, o.is_active, o.tax_id,
         o.address_country, o.address_street, o.address_city, o.address_state, o.address_zip, o.contact_phone
  from public.organizations o
  join public.profiles p on p.id = o.owner_id
  where (
    (select ok from is_platform_admin)
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = o.id and m.user_id = (select uid from me)
    )
  )
  order by o.created_at desc;
$$;

grant execute on function public.admin_list_organizations() to authenticated;