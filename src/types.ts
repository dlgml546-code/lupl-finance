export type Rank = "대표" | "본부장" | "책임" | "선임" | "매니저";
export type DepartmentName = "홍보마케팅부" | "경영지원부" | "AI부" | "개발부";
export type ReviewStatus = "검토 전" | "승인" | "보류" | "수정 요청" | "반려";
export type PermissionLevel = "보기만 가능" | "입력 가능" | "승인 가능" | "관리자";
export type BusinessCategory = "교육 용역" | "전시·행사" | "연구용역" | "상품/IP" | "지원금" | "콘텐츠 제작" | "기타";
export type ExpenseCategory = "운영비" | "내부 사업비" | "외부 사업비" | "외주용역비" | "인건비" | "제작비" | "AI 구독료" | "여비교통비" | "기타";

export type Department = {
  id: string;
  name: DepartmentName;
  description: string | null;
};

export type Person = {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  rank: Rank;
  hire_date: string | null;
  weekly_work_hours: number | null;
  monthly_capacity_hours: number | null;
  annual_salary: number | null;
  previous_annual_salary: number | null;
  is_active: boolean;
  memo: string | null;
};

export type PagePermission = {
  id: string;
  person_id: string;
  page_key: string;
  permission: PermissionLevel;
};

export type BusinessProject = {
  id: string;
  name: string;
  category: BusinessCategory;
  client_name: string | null;
  status: string;
  revenue: number;
  cost: number;
  profit: number;
  margin_rate: number;
  receivable_amount: number | null;
  man_months: number | null;
  owner_id: string | null;
  pm_id: string | null;
  start_date: string | null;
  end_date: string | null;
  memo: string | null;
};

export type ExpenseRequest = {
  id: string;
  used_at: string;
  purpose: string;
  category: ExpenseCategory;
  payment_method: string | null;
  amount: number;
  evidence_status: string | null;
  transfer_status: string | null;
  project_id: string | null;
  requested_by: string | null;
  review_status: ReviewStatus;
  review_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  receipt_file_url: string | null;
  receipt_storage_path: string | null;
  ocr_vendor_name: string | null;
  ocr_total_amount: number | null;
  ocr_transaction_date: string | null;
  memo: string | null;
};

export type ReviewItem = {
  id: string;
  area: string;
  title: string;
  reason: string | null;
  amount_or_impact: string | null;
  owner_label: string | null;
  status: ReviewStatus;
  target_table: string | null;
  target_id: string | null;
};

export type CompensationReview = {
  id: string;
  person_id: string;
  review_year: number;
  previous_annual_salary: number | null;
  raise_rate: number | null;
  confirmed_annual_salary: number | null;
  grant_program_name: string | null;
  grant_end_date: string | null;
  company_monthly_impact: number | null;
  review_status: ReviewStatus;
  memo: string | null;
};

export type BonusPayment = {
  id: string;
  person_id: string | null;
  project_id: string | null;
  period_label: string | null;
  profit_amount: number | null;
  bonus_rate: number | null;
  bonus_amount: number | null;
  payment_status: ReviewStatus;
  planned_payment_date: string | null;
  paid_at: string | null;
  memo: string | null;
};

export type ProjectLaborAllocation = {
  id: string;
  project_id: string;
  person_id: string | null;
  rank: Rank;
  allocation_rate: number;
  man_months: number | null;
  hours: number | null;
};

export type CashSnapshot = {
  id: string;
  snapshot_month: string;
  current_cash: number | null;
  revenue: number | null;
  expense: number | null;
  net_burn: number | null;
  runway_months: number | null;
  payroll_included_expense: number | null;
  receivable_amount: number | null;
  payable_amount: number | null;
};
