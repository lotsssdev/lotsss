-- Helper: create organization as current user (owner) and add membership
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_logo_url text default null,
  p_description text default null
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

  insert into public.organizations(name, slug, logo_url, description, owner_id)
  values (p_name, p_slug, p_logo_url, p_description, v_owner)
  returning * into v_org;

  -- ensure owner is a member
  insert into public.organization_members(organization_id, user_id, role)
  values (v_org.id, v_owner, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return v_org;
end;
$$;

grant execute on function public.create_organization(text,text,text,text) to authenticated;

-- Admin list organizations: if caller is member of the platform-admin org, list all; else list own
-- NOTE: This embeds the platform admin organization UUID.
create or replace function public.admin_list_organizations()
returns table (
  id uuid,
  name text,
  slug text,
  owner_email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  ), is_platform_admin as (
    select exists (
      select 1
      from public.organization_members m
      where m.organization_id = 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'::uuid
        and m.user_id = (select uid from me)
    ) as ok
  )
  select o.id, o.name, o.slug, p.email as owner_email, o.created_at
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

-- Admin delete organizations by ids
create or replace function public.admin_delete_organizations(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from public.organization_members m
    where m.organization_id = 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'::uuid
      and m.user_id = v_uid
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Forbidden';
  end if;

  delete from public.organizations o
  where o.id = any(p_ids);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_delete_organizations(uuid[]) to authenticated;

