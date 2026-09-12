create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

alter table public.offer_leads
  add column status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id),
  add column internal_note text;

create index offer_leads_status_created_at_idx
  on public.offer_leads(status, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

create policy "Admins can read admin users"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());

create policy "Admins can read offer leads"
  on public.offer_leads for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update offer lead status"
  on public.offer_leads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can read offer lead items"
  on public.offer_lead_items for select
  to authenticated
  using (public.is_admin());
