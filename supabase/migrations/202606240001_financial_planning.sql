alter table if exists public.business_projects
  add column if not exists revenue_recognition_date date,
  add column if not exists received_date date,
  add column if not exists revenue_tax_mode text;

alter table if exists public.expense_requests
  add column if not exists usage_subcategory text,
  add column if not exists cost_behavior text,
  add column if not exists tax_mode text,
  add column if not exists supply_amount numeric(14,0) default 0,
  add column if not exists vat_amount numeric(14,0) default 0,
  add column if not exists paid_at date;

create table if not exists public.financial_monthly_plans (
  id uuid primary key default gen_random_uuid(),
  period_month date not null unique,
  planned_revenue numeric(14,0) default 0,
  planned_variable_cost numeric(14,0) default 0,
  planned_fixed_cost numeric(14,0) default 0,
  planned_capex numeric(14,0) default 0,
  planned_receivable numeric(14,0) default 0,
  planned_payable numeric(14,0) default 0,
  opening_cash numeric(14,0) default 0,
  sales_quantity numeric(14,2) default 0,
  average_unit_price numeric(14,0) default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_financial_monthly_plans_updated_at on public.financial_monthly_plans;
create trigger trg_financial_monthly_plans_updated_at
before update on public.financial_monthly_plans
for each row execute function public.set_updated_at();

alter table public.financial_monthly_plans enable row level security;

drop policy if exists "authenticated full access" on public.financial_monthly_plans;
create policy "authenticated full access"
on public.financial_monthly_plans
for all
to authenticated
using (true)
with check (true);
