-- ============================================================
-- LUPL 경영관리 대시보드 Supabase Schema
-- 지휘체계: 대표 → 본부장 → 책임 → 선임 → 매니저
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lupl_rank') then
    create type public.lupl_rank as enum ('대표','본부장','책임','선임','매니저');
  end if;

  if not exists (select 1 from pg_type where typname = 'department_name') then
    create type public.department_name as enum ('홍보마케팅부','경영지원부','AI부','개발부');
  end if;

  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('검토 전','승인','보류','수정 요청','반려');
  end if;

  if not exists (select 1 from pg_type where typname = 'permission_level') then
    create type public.permission_level as enum ('보기만 가능','입력 가능','승인 가능','관리자');
  end if;

  if not exists (select 1 from pg_type where typname = 'business_category') then
    create type public.business_category as enum ('교육 용역','전시·행사','연구용역','상품/IP','지원금','콘텐츠 제작','기타');
  end if;

  if not exists (select 1 from pg_type where typname = 'expense_category') then
    create type public.expense_category as enum ('운영비','내부 사업비','외부 사업비','외주용역비','인건비','제작비','AI 구독료','여비교통비','기타');
  end if;
end $$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name public.department_name not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  department_id uuid references public.departments(id) on delete set null,
  rank public.lupl_rank not null default '매니저',
  hire_date date,
  weekly_work_hours numeric(5,2) default 40,
  monthly_capacity_hours numeric(6,2) default 160,
  annual_salary numeric(14,0) default 0,
  previous_annual_salary numeric(14,0) default 0,
  is_active boolean not null default true,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_permissions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  page_key text not null,
  permission public.permission_level not null default '보기만 가능',
  granted_by uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(person_id, page_key)
);

create table if not exists public.business_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.business_category not null,
  client_name text,
  status text not null default '진행 중',
  revenue numeric(14,0) not null default 0,
  cost numeric(14,0) not null default 0,
  profit numeric(14,0) generated always as (coalesce(revenue,0) - coalesce(cost,0)) stored,
  margin_rate numeric(8,4) generated always as (
    case when coalesce(revenue,0)=0 then 0
    else (coalesce(revenue,0) - coalesce(cost,0)) / coalesce(revenue,0)
    end
  ) stored,
  receivable_amount numeric(14,0) default 0,
  man_months numeric(8,3) default 0,
  owner_id uuid references public.people(id) on delete set null,
  pm_id uuid references public.people(id) on delete set null,
  start_date date,
  end_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_requests (
  id uuid primary key default gen_random_uuid(),
  used_at date not null,
  purpose text not null,
  category public.expense_category not null default '기타',
  payment_method text,
  amount numeric(14,0) not null default 0,
  evidence_status text,
  transfer_status text,
  project_id uuid references public.business_projects(id) on delete set null,
  requested_by uuid references public.people(id) on delete set null,
  review_status public.review_status not null default '검토 전',
  review_reason text,
  approved_by uuid references public.people(id) on delete set null,
  approved_at timestamptz,
  receipt_file_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  title text not null,
  reason text,
  amount_or_impact text,
  owner_label text,
  status public.review_status not null default '검토 전',
  target_table text,
  target_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compensation_reviews (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  review_year integer not null,
  previous_annual_salary numeric(14,0) default 0,
  raise_rate numeric(6,3) default 0,
  confirmed_annual_salary numeric(14,0) default 0,
  grant_program_name text,
  grant_end_date date,
  company_monthly_impact numeric(14,0) default 0,
  review_status public.review_status not null default '검토 전',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bonus_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.business_projects(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  profit_basis text default '순수익',
  bonus_rate numeric(6,3) not null default 0,
  pay_cycle text default '분기별',
  payment_condition text default '수금 완료 및 대표 승인 후 지급',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bonus_payments (
  id uuid primary key default gen_random_uuid(),
  bonus_rule_id uuid references public.bonus_rules(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  project_id uuid references public.business_projects(id) on delete set null,
  period_label text,
  profit_amount numeric(14,0) default 0,
  bonus_rate numeric(6,3) default 0,
  bonus_amount numeric(14,0) generated always as (round(coalesce(profit_amount,0) * coalesce(bonus_rate,0))) stored,
  payment_status public.review_status not null default '검토 전',
  planned_payment_date date,
  paid_at timestamptz,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_labor_allocations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.business_projects(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  rank public.lupl_rank not null,
  allocation_rate numeric(6,3) not null default 0,
  man_months numeric(8,3) default 0,
  hours numeric(8,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_month date not null unique,
  current_cash numeric(14,0) default 0,
  revenue numeric(14,0) default 0,
  expense numeric(14,0) default 0,
  net_burn numeric(14,0) default 0,
  runway_months numeric(8,2) default 0,
  payroll_included_expense numeric(14,0) default 0,
  receivable_amount numeric(14,0) default 0,
  payable_amount numeric(14,0) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'departments','people','page_permissions','business_projects','expense_requests',
    'review_items','compensation_reviews','bonus_rules','bonus_payments',
    'project_labor_allocations','cash_snapshots'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', tbl, tbl);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
  end loop;
end $$;

insert into public.departments (name, description) values
('홍보마케팅부','브랜드, 홍보, 콘텐츠, 캠페인'),
('경영지원부','재무, 계약, 증빙, 정산, 행정'),
('AI부','AI 교육, 커리큘럼, 창작 지원'),
('개발부','플랫폼, 데이터, 자동화, 배포')
on conflict (name) do nothing;

alter table public.departments enable row level security;
alter table public.people enable row level security;
alter table public.page_permissions enable row level security;
alter table public.business_projects enable row level security;
alter table public.expense_requests enable row level security;
alter table public.review_items enable row level security;
alter table public.compensation_reviews enable row level security;
alter table public.bonus_rules enable row level security;
alter table public.bonus_payments enable row level security;
alter table public.project_labor_allocations enable row level security;
alter table public.cash_snapshots enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'departments','people','page_permissions','business_projects','expense_requests',
    'review_items','compensation_reviews','bonus_rules','bonus_payments',
    'project_labor_allocations','cash_snapshots'
  ]
  loop
    execute format('drop policy if exists "authenticated full access" on public.%I', tbl);
    execute format('create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)', tbl);
  end loop;
end $$;
