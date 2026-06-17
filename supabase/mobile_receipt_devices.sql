create table if not exists public.mobile_receipt_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  owner_name text not null,
  person_id uuid references public.people(id) on delete set null,
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mobile_receipt_devices enable row level security;

drop policy if exists "mobile_receipt_devices_authenticated_all" on public.mobile_receipt_devices;
create policy "mobile_receipt_devices_authenticated_all"
on public.mobile_receipt_devices
for all
to authenticated
using (true)
with check (true);
