-- 2026-07-13 경영대시보드 개선 요청함
-- Supabase SQL Editor에서 운영 DB에 1회 실행하세요.

create table if not exists public.improvement_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.people(id) on delete set null,
  request_type text not null default 'bug',
  request_type_label text not null default '오류',
  menu_id text,
  menu_label text,
  submenu_label text,
  page_title text,
  page_path text,
  note text not null,
  status text not null default 'open' check (status in ('open','reviewing','planned','done','dismissed')),
  ai_summary text,
  ai_payload jsonb not null default '{}'::jsonb,
  user_agent text,
  viewport_width int,
  viewport_height int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_improvement_requests_status
on public.improvement_requests(status, created_at desc);

create index if not exists idx_improvement_requests_menu
on public.improvement_requests(menu_id, submenu_label, created_at desc);

create index if not exists idx_improvement_requests_created_by
on public.improvement_requests(created_by, created_at desc);

drop trigger if exists trg_improvement_requests_updated_at on public.improvement_requests;
create trigger trg_improvement_requests_updated_at
before update on public.improvement_requests
for each row execute function public.set_updated_at();

alter table public.improvement_requests enable row level security;

drop policy if exists "authenticated full access" on public.improvement_requests;
create policy "authenticated full access"
on public.improvement_requests
for all to authenticated
using (true)
with check (true);
