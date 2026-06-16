-- ============================================================
-- LUPL 경영관리 대시보드 Supabase Schema (v3, 더미데이터 없음)
-- 노션 지출결의/외주용역 기준 반영
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

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
  employee_number text unique,
  email text unique,
  phone text,
  password_changed_at timestamptz,
  department_id uuid references public.departments(id) on delete set null,
  rank public.lupl_rank not null default '매니저',
  hire_date date,
  weekly_work_hours numeric(5,2) default 40,
  weekly_work_days numeric(4,1) default 5,
  daily_work_hours numeric(4,1) default 8,
  monthly_capacity_hours numeric(6,2) default 174,
  annual_salary numeric(14,0) default 0,
  previous_annual_salary numeric(14,0) default 0,
  is_active boolean not null default true,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_people_auth_user_id on public.people(auth_user_id);
create index if not exists idx_people_email on public.people(lower(email));
create index if not exists idx_people_employee_number on public.people(employee_number);

create table if not exists public.page_permissions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  page_key text not null,
  permission public.permission_level not null default '보기만 가능',
  created_at timestamptz not null default now(),
  unique(person_id, page_key)
);


-- 직원 사번 로그인/비밀번호 변경 상태 컬럼 보정
alter table if exists public.people add column if not exists employee_number text;
alter table if exists public.people add column if not exists password_changed_at timestamptz;
alter table if exists public.people add column if not exists weekly_work_days numeric(4,1) default 5;
alter table if exists public.people add column if not exists daily_work_hours numeric(4,1) default 8;
alter table if exists public.business_projects add column if not exists project_major_category text;
alter table if exists public.business_projects add column if not exists project_middle_category text;
alter table if exists public.business_projects add column if not exists project_small_category text;
alter table if exists public.business_projects add column if not exists operator_label text;

-- 구버전 배포 DB에 business_category enum/category 컬럼이 남아 있을 때 신규 분류 저장 오류 방지
do $$
begin
  if exists (select 1 from pg_type where typname = 'business_category') then
    alter type public.business_category add value if not exists '러플 마진 계산기';
    alter type public.business_category add value if not exists '연구';
    alter type public.business_category add value if not exists '개발';
    alter type public.business_category add value if not exists '기타';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'people_employee_number_unique'
  ) then
    alter table public.people add constraint people_employee_number_unique unique (employee_number);
  end if;
end $$;
create index if not exists idx_people_employee_number on public.people(employee_number);

-- 8번: 결제수단(카드) 마스터
create table if not exists public.payment_cards (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  card_type text not null default '법인',     -- 법인 / 개인
  owner_name text,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

-- 19번: 지출 카테고리 마스터
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

-- 16,17번: 외주용역 항목 기준 프로젝트
create table if not exists public.business_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_type text,                 -- 일반학교/특수학교/공공기관/기업/비영리재단
  project_group text[],             -- 기존 호환용 분류 배열
  project_major_category text,       -- 대분류
  project_middle_category text,      -- 중분류
  project_small_category text,       -- 소분류
  client_name text,
  status text not null default '접수',
  confirmed_amount numeric(14,0) not null default 0,   -- 확정 금액(매출)
  received_amount numeric(14,0) not null default 0,    -- 수령 금액
  cost numeric(14,0) not null default 0,               -- 수기 비용(자동집계와 별도)
  receipt_status text,              -- 미청구/청구완료/일부수령/수령완료/보류
  owner_label text,                 -- 책임자(이름)
  operator_label text,              -- 실무 담당자 이름
  contact text,                     -- 실무 담당자 연락처
  inflow_route text,                -- 유입 경로
  man_months numeric(8,3) default 0,
  request_date date,
  due_date date,
  payment_due_date date,            -- 입금 예정일
  tax_invoice_date date,            -- 세금계산서 발행일
  repeat_client boolean default false,
  owner_id uuid references public.people(id) on delete set null,
  pm_id uuid references public.people(id) on delete set null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7,8,9번: 노션 지출결의 기준 컬럼
create table if not exists public.expense_requests (
  id uuid primary key default gen_random_uuid(),
  used_at date not null default current_date,
  purpose text not null,
  usage text not null default '운영비',           -- 사용 용도(노션 기준)
  payment_method text,                            -- 결제방식(노션 기준)
  card_id uuid references public.payment_cards(id) on delete set null,
  amount numeric(14,0) not null default 0,
  evidence_status text,
  transfer_status text,                           -- 이체 여부(노션 기준)
  transfer_summary text,                          -- 이체 내용 요약
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
  is_recurring boolean default false,             -- 12번: 반복 지출
  recurring_cycle text,
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
  checklist text,                                 -- 13번: 무엇을 검토할지
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
  bonus_amount numeric(14,0) default 0,           -- 21번: 클라이언트에서 계산해 저장
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

-- 3번: 현금 스냅샷(대시보드에서 직접 입력)
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

-- updated_at 트리거
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'departments','people','business_projects','expense_requests',
    'review_items','compensation_reviews','bonus_payments',
    'project_labor_allocations','cash_snapshots'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', tbl, tbl);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
  end loop;
end $$;

-- 기본 부서만 시드 (그 외 더미 데이터 없음)
insert into public.departments (name, description) values
('홍보마케팅부','브랜드, 홍보, 콘텐츠, 캠페인'),
('경영지원부','재무, 계약, 증빙, 정산, 행정'),
('AI부','AI 교육, 커리큘럼, 창작 지원'),
('개발부','플랫폼, 데이터, 자동화, 배포')
on conflict (name) do nothing;

-- 노션 기준 결제수단 시드 (법인 + 개인 소유자)
insert into public.payment_cards (label, card_type, owner_name, sort_order) values
('법인','법인',null,1),
('개인-이희은','개인','이희은',2),
('개인-홍준기','개인','홍준기',3),
('개인-배병윤','개인','배병윤',4),
('개인-정혜리','개인','정혜리',5),
('개인-현금','개인','현금',6)
on conflict do nothing;

-- 노션 기준 카테고리 시드

insert into public.payment_cards (label, card_type, owner_name, sort_order)
values
('법인카드', '법인', null, 1),
('개인카드-이희은', '개인', '이희은', 2)
on conflict do nothing;

insert into public.expense_categories (name, description, sort_order) values
('여비·출장비','여행·출장 중 식대·다과·유류비·주차·택시·숙박',1),
('업무 추진비','외부 미팅 식대·다과',2),
('내부 사업비','내부 프로젝트 집행비 일체',3),
('외부 사업비(외주용역)','외주 프로젝트 집행비 일체',4),
('복리후생비','내부 인원 식대·간식·회식·워크샵·소모품',5),
('운영비','소모품·서류 발급·행정·정기결제',6),
('차량비','차량유지·소모품·유류비',7),
('홍보비(광고비)','광고·홍보 집행비',8),
('자산취득비(비품 구입 등)','비품·자산 구입비',9)
on conflict do nothing;

-- Storage 버킷
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- RLS
alter table public.departments enable row level security;
alter table public.people enable row level security;
alter table public.page_permissions enable row level security;
alter table public.payment_cards enable row level security;
alter table public.expense_categories enable row level security;
alter table public.business_projects enable row level security;
alter table public.expense_requests enable row level security;
alter table public.review_items enable row level security;
alter table public.compensation_reviews enable row level security;
alter table public.bonus_payments enable row level security;
alter table public.project_labor_allocations enable row level security;
alter table public.cash_snapshots enable row level security;

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'departments','people','page_permissions','payment_cards','expense_categories',
    'business_projects','expense_requests','review_items','compensation_reviews',
    'bonus_payments','project_labor_allocations','cash_snapshots'
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

create policy "authenticated read receipts" on storage.objects for select to authenticated using (bucket_id = 'receipts');
create policy "authenticated upload receipts" on storage.objects for insert to authenticated with check (bucket_id = 'receipts');
create policy "authenticated update receipts" on storage.objects for update to authenticated using (bucket_id = 'receipts') with check (bucket_id = 'receipts');
create policy "authenticated delete receipts" on storage.objects for delete to authenticated using (bucket_id = 'receipts');
