-- Admin function to update any organization (security definer), checking platform admin
drop function if exists public.admin_update_organization(
  uuid, text, text, text, boolean, text, text, text, text, text, text, text, text
);

create or replace function public.admin_update_organization(
  p_id uuid,
  p_name text,
  p_description text default null,
  p_legal_name text default null,
  p_is_active boolean default null,
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
  v_uid uuid := auth.uid();
  v_jwt_org uuid := (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid;
  v_org public.organizations;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_jwt_org <> 'a44bd713-601b-4ec1-800d-c0fa2cf618c8'::uuid then
    raise exception 'Forbidden';
  end if;

  update public.organizations o
  set name = coalesce(p_name, o.name),
      description = coalesce(p_description, o.description),
      legal_name = coalesce(p_legal_name, o.legal_name),
      is_active = coalesce(p_is_active, o.is_active),
      tax_id = coalesce(p_tax_id, o.tax_id),
      address_country = coalesce(p_address_country, o.address_country),
      address_street = coalesce(p_address_street, o.address_street),
      address_city = coalesce(p_address_city, o.address_city),
      address_state = coalesce(p_address_state, o.address_state),
      address_zip = coalesce(p_address_zip, o.address_zip),
      contact_phone = coalesce(p_contact_phone, o.contact_phone),
      stripe_customer_id = coalesce(p_stripe_customer_id, o.stripe_customer_id),
      updated_at = now()
  where o.id = p_id
  returning * into v_org;

  if not found then
    raise exception 'Organization not found';
  end if;

  return v_org;
end;
$$;

grant execute on function public.admin_update_organization(
  uuid, text, text, text, boolean, text, text, text, text, text, text, text, text
) to authenticated;

