-- Returns organizations for the current authenticated user with their role
create or replace function public.orgs_for_current_user()
returns table(id uuid, name text, role text)
language sql
security definer
set search_path = public
as $$
  select o.id, o.name, m.role
  from public.organizations o
  join public.organization_members m
    on m.organization_id = o.id
  where m.user_id = auth.uid();
$$;

grant execute on function public.orgs_for_current_user to authenticated;

