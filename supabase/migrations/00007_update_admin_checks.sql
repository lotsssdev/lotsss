-- Update admin checks to rely on JWT user_metadata.org_id as well
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
    select auth.uid() as uid,
           coalesce((auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid) as jwt_org
  ), is_platform_admin as (
    select (
      (select jwt_org from me) = 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'::uuid
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

create or replace function public.admin_delete_organizations(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_org uuid := (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid;
  v_is_admin boolean := false;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_jwt_org = 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'::uuid then
    v_is_admin := true;
  end if;

  if not v_is_admin then
    raise exception 'Forbidden';
  end if;

  delete from public.organizations o
  where o.id = any(p_ids);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_list_organizations to authenticated;
grant execute on function public.admin_delete_organizations(uuid[]) to authenticated;

