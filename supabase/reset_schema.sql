-- ============================================================
-- LUPL 경영관리 대시보드 초기화 후 재설치
-- 이미 테스트용 테이블을 만들었다가 꼬였을 때만 실행하세요.
-- 기존 LUPL 대시보드 데이터가 삭제됩니다.
-- ============================================================

drop table if exists public.project_labor_allocations cascade;
drop table if exists public.bonus_payments cascade;
drop table if exists public.compensation_reviews cascade;
drop table if exists public.review_items cascade;
drop table if exists public.expense_requests cascade;
drop table if exists public.business_projects cascade;
drop table if exists public.page_permissions cascade;
drop table if exists public.people cascade;
drop table if exists public.departments cascade;
drop table if exists public.cash_snapshots cascade;

delete from storage.objects where bucket_id = 'receipts';
delete from storage.buckets where id = 'receipts';

drop type if exists public.expense_category cascade;
drop type if exists public.business_category cascade;
drop type if exists public.permission_level cascade;
drop type if exists public.review_status cascade;
drop type if exists public.department_name cascade;
drop type if exists public.lupl_rank cascade;

-- ============================================================
-- LUPL 경영관리 대시보드 실제 작동용 Supabase Schema
-- 노션 연동 제외, Supabase Auth/DB/Storage/Edge Function 연동 기준
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
  email text unique,
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

create index if not exists idx_people_auth_user_id on public.people(auth_user_id);
create index if not exists idx_people_email on public.people(lower(email));

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
  used_at date not null default current_date,
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
  receipt_storage_path text,
  ocr_vendor_name text,
  ocr_total_amount numeric(14,0),
  ocr_transaction_date date,
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
  review_year integer not null default extract(year from now())::integer,
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

create table if not exists public.bonus_payments (
  id uuid primary key default gen_random_uuid(),
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
  person_id uuid references public.people(id) on delete set null,
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


-- 기존 개발용 스키마가 일부 생성된 경우를 위한 컬럼 보정
alter table if exists public.people add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table if exists public.people add column if not exists email text;
alter table if exists public.people add column if not exists phone text;
alter table if exists public.people add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table if exists public.people add column if not exists rank public.lupl_rank default '매니저';
alter table if exists public.people add column if not exists hire_date date;
alter table if exists public.people add column if not exists weekly_work_hours numeric(5,2) default 40;
alter table if exists public.people add column if not exists monthly_capacity_hours numeric(6,2) default 160;
alter table if exists public.people add column if not exists annual_salary numeric(14,0) default 0;
alter table if exists public.people add column if not exists previous_annual_salary numeric(14,0) default 0;
alter table if exists public.people add column if not exists is_active boolean default true;
alter table if exists public.people add column if not exists memo text;
alter table if exists public.people add column if not exists created_at timestamptz default now();
alter table if exists public.people add column if not exists updated_at timestamptz default now();

alter table if exists public.expense_requests add column if not exists receipt_storage_path text;
alter table if exists public.expense_requests add column if not exists ocr_vendor_name text;
alter table if exists public.expense_requests add column if not exists ocr_total_amount numeric(14,0);
alter table if exists public.expense_requests add column if not exists ocr_transaction_date date;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'departments','people','page_permissions','business_projects','expense_requests',
    'review_items','compensation_reviews','bonus_payments',
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

insert into public.business_projects
(name, category, client_name, status, revenue, cost, receivable_amount, man_months, memo)
values
('AI 교육 운영','교육 용역','특수학교·기관','진행 중',12300000,8200000,0,0.48,'AI 교육 수익성 관리'),
('성보학교 전시','전시·행사','대구성보학교','진행 중',20000000,13000000,8000000,0.75,'전시 수금 확인 필요'),
('장애유형별 연구','연구용역','공공기관','계약 진행',50000000,29000000,0,1.20,'확장 후보'),
('굿즈·작품 판매','상품/IP','온라인·전시 판매','진행 중',5000000,3600000,0,0.20,'작품/IP 매출 관리')
on conflict do nothing;

insert into public.cash_snapshots
(snapshot_month, current_cash, revenue, expense, net_burn, runway_months, payroll_included_expense, receivable_amount, payable_amount)
values
('2026-01-01', 18500000, 8100000, 10500000, 2400000, 7.7, 10500000, 1000000, 2200000),
('2026-03-01', 22200000, 13000000, 11000000, -2000000, 8.9, 11000000, 2000000, 1800000),
('2026-06-01', 24000000, 12300000, 15800000, 3500000, 6.8, 15800000, 5000000, 6200000)
on conflict (snapshot_month) do update set
current_cash=excluded.current_cash,
revenue=excluded.revenue,
expense=excluded.expense,
net_burn=excluded.net_burn,
runway_months=excluded.runway_months,
payroll_included_expense=excluded.payroll_included_expense,
receivable_amount=excluded.receivable_amount,
payable_amount=excluded.payable_amount;

insert into public.review_items
(area, title, reason, amount_or_impact, owner_label, status, target_table)
values
('지출결의','광명학교 전시 출력물 제작','프로젝트 태그 확인','240,000원','경영지원부','검토 전','expense_requests'),
('지출결의','AI 교육 외부강사비','원천징수 확인','300,000원','AI부','검토 전','expense_requests'),
('사업·매출','성보학교 전시 수금','입금 예정일 확인','8,000,000원','PM','검토 전','business_projects'),
('인건비','창업도약패키지 인건비','2개월 후 종료','+1,300,000원','대표','검토 전','compensation_reviews')
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

alter table public.departments enable row level security;
alter table public.people enable row level security;
alter table public.page_permissions enable row level security;
alter table public.business_projects enable row level security;
alter table public.expense_requests enable row level security;
alter table public.review_items enable row level security;
alter table public.compensation_reviews enable row level security;
alter table public.bonus_payments enable row level security;
alter table public.project_labor_allocations enable row level security;
alter table public.cash_snapshots enable row level security;


-- 기존 개발용 스키마가 일부 생성된 경우를 위한 컬럼 보정
alter table if exists public.people add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table if exists public.people add column if not exists email text;
alter table if exists public.people add column if not exists phone text;
alter table if exists public.people add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table if exists public.people add column if not exists rank public.lupl_rank default '매니저';
alter table if exists public.people add column if not exists hire_date date;
alter table if exists public.people add column if not exists weekly_work_hours numeric(5,2) default 40;
alter table if exists public.people add column if not exists monthly_capacity_hours numeric(6,2) default 160;
alter table if exists public.people add column if not exists annual_salary numeric(14,0) default 0;
alter table if exists public.people add column if not exists previous_annual_salary numeric(14,0) default 0;
alter table if exists public.people add column if not exists is_active boolean default true;
alter table if exists public.people add column if not exists memo text;
alter table if exists public.people add column if not exists created_at timestamptz default now();
alter table if exists public.people add column if not exists updated_at timestamptz default now();

alter table if exists public.expense_requests add column if not exists receipt_storage_path text;
alter table if exists public.expense_requests add column if not exists ocr_vendor_name text;
alter table if exists public.expense_requests add column if not exists ocr_total_amount numeric(14,0);
alter table if exists public.expense_requests add column if not exists ocr_transaction_date date;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'departments','people','page_permissions','business_projects','expense_requests',
    'review_items','compensation_reviews','bonus_payments',
    'project_labor_allocations','cash_snapshots'
  ]
  loop
    execute format('drop policy if exists "authenticated full access" on public.%I', tbl);
    execute format('create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)', tbl);
  end loop;
end $$;

drop policy if exists "authenticated read receipts" on storage.objects;
drop policy if exists "authenticated upload receipts" on storage.objects;
drop policy if exists "authenticated update receipts" on storage.objects;
drop policy if exists "authenticated delete receipts" on storage.objects;

create policy "authenticated read receipts"
on storage.objects for select
to authenticated
using (bucket_id = 'receipts');

create policy "authenticated upload receipts"
on storage.objects for insert
to authenticated
with check (bucket_id = 'receipts');

create policy "authenticated update receipts"
on storage.objects for update
to authenticated
using (bucket_id = 'receipts')
with check (bucket_id = 'receipts');

create policy "authenticated delete receipts"
on storage.objects for delete
to authenticated
using (bucket_id = 'receipts');
