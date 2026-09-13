create table public.notification_settings (
  id integer primary key default 1 check (id = 1),
  recipient_emails text[] not null check (
    cardinality(recipient_emails) between 1 and 10
  ),
  updated_at timestamptz not null default now()
);

insert into public.notification_settings (id, recipient_emails)
values (1, array['contact@topdogtcg.com']::text[]);

alter table public.notification_settings enable row level security;

create policy "Admins can read notification settings"
  on public.notification_settings for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update notification settings"
  on public.notification_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
