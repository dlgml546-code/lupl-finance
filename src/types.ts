export type Rank = "대표" | "본부장" | "책임" | "선임" | "매니저";
export type DepartmentName = "홍보마케팅부" | "경영지원부" | "AI부" | "개발부" | "디자인부";
export type ReviewStatus = "검토 전" | "승인" | "보류" | "수정 요청" | "반려";
export type PermissionLevel = "보기만 가능" | "입력 가능" | "승인 가능" | "관리자";
export type ImprovementType = "bug" | "ux" | "data" | "automation" | "permission" | "workflow" | "idea";
export type ImprovementStatus = "open" | "reviewing" | "planned" | "done" | "dismissed";

// 실제 노션 지출결의 기준 사용 용도(=지출 카테고리)
export type ExpenseUsage =
  | "여비·출장비"
  | "업무 추진비"
  | "내부 사업비"
  | "외부 사업비(외주용역)"
  | "복리후생비"
  | "운영비"
  | "차량비"
  | "홍보비(광고비)"
  | "자산취득비(비품 구입 등)";

// 결제방식 (노션 기준)
export type PaymentMethod =
  | "법인 계좌이체"
  | "계좌이체"
  | "현금"
  | "카드"
  | "네이버페이-현금"
  | "기타결제 - 비즈머니 충전"
  | "기타결제 - 와우프레스 충전";

// 이체 여부 (노션 기준)
export type TransferStatus =
  | "결제 필요"
  | "결제 완료"
  | "이체 완료"
  | "해당 없음";

// 외주용역 프로젝트 거래처 구분
export type ClientType = "일반학교" | "특수학교" | "공공기관" | "기업" | "비영리재단";
// 외주용역 프로젝트 대분류
export type ProjectGroup =
  | "교육" | "문서작업" | "홈페이지" | "메타버스" | "마케팅"
  | "행사" | "전시" | "영상" | "제품 제작" | "디자인" | "광고/홍보"
  | "연구" | "개발" | "러플 마진 계산기" | "기타";
// 외주용역 프로젝트 상태
export type ProjectStatus =
  | "접수" | "제안/견적" | "컨펌 대기" | "진행 중" | "납품 완료" | "정산 대기" | "정산 완료" | "보류/드롭";
// 대금 수령 유무
export type ReceiptStatus = "미청구" | "청구 완료" | "일부 수령" | "수령 완료" | "보류";

export type Department = {
  id: string;
  name: DepartmentName;
  description: string | null;
};

export type Person = {
  id: string;
  auth_user_id: string | null;
  name: string;
  employee_number: string | null;
  email: string | null;
  phone: string | null;
  password_changed_at: string | null;
  department_id: string | null;
  rank: Rank;
  hire_date: string | null;
  weekly_work_hours: number | null;
  weekly_work_days: number | null;
  daily_work_hours: number | null;
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

export type ImprovementRequest = {
  id: string;
  created_by: string | null;
  request_type: ImprovementType | string;
  request_type_label: string;
  menu_id: string | null;
  menu_label: string | null;
  submenu_label: string | null;
  page_title: string | null;
  page_path: string | null;
  note: string;
  status: ImprovementStatus;
  ai_summary: string | null;
  ai_payload: Record<string, unknown> | null;
  user_agent: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  created_at?: string;
  updated_at?: string;
};

// 결제수단 마스터 (법인/개인카드 등을 미리 등록)
export type PaymentCard = {
  id: string;
  label: string;            // 표시명 예: "법인", "개인-이희은"
  card_type: "법인" | "개인";
  owner_name: string | null; // 개인카드 소유자
  is_active: boolean;
  sort_order: number | null;
};

// 지출 카테고리 마스터 (카테고리 관리에서 추가/수정)
export type ExpenseCategoryItem = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
};

export type MobileReceiptDevice = {
  id: string;
  device_id: string;
  owner_name: string | null;
  person_id: string | null;
  memo: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BusinessProject = {
  id: string;
  name: string;
  client_type: ClientType | null;
  project_group: string[] | null;
  project_major_category: string | null;
  project_middle_category: string | null;
  project_small_category: string | null;
  client_name: string | null;
  status: ProjectStatus;
  confirmed_amount: number;     // 확정 금액(견적/계약 총액)
  received_amount: number;      // 실제 수령 금액
  cost: number;                 // 집행 비용(지출결의 자동 집계 + 수기)
  receipt_status: ReceiptStatus | null;
  owner_label: string | null;   // 책임자(이름 텍스트)
  operator_label: string | null; // 실무 담당자 이름
  contact: string | null;       // 실무 담당자 연락처
  inflow_route: string | null;  // 유입 경로
  man_months: number | null;
  request_date: string | null;
  due_date: string | null;
  payment_due_date: string | null;  // 입금 예정일
  tax_invoice_date: string | null;
  revenue_recognition_date?: string | null; // 손익계산서에 매출로 잡는 날
  received_date?: string | null; // 실제 통장 입금일
  revenue_tax_mode?: string | null; // 부가세 포함 / 면세·부가세 없음
  repeat_client: boolean;
  owner_id: string | null;
  pm_id: string | null;
  memo: string | null;
};

export type ExpenseRequest = {
  id: string;
  used_at: string;
  purpose: string;
  category?: ExpenseUsage | string | null;
  usage: ExpenseUsage;          // 사용 용도
  usage_subcategory?: string | null; // 지출 소분류
  payment_method: PaymentMethod | null;
  card_id: string | null;       // 카드 결제 시 어떤 카드인지
  amount: number;
  cost_behavior?: "고정비" | "변동비" | null;
  tax_mode?: string | null;
  supply_amount?: number | null;
  vat_amount?: number | null;
  paid_at?: string | null;
  evidence_status: string | null;
  transfer_status: TransferStatus | null;
  transfer_summary: string | null;  // 이체 내용 요약
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
  is_recurring: boolean;        // 반복 지출 여부
  recurring_cycle: string | null;  // 반복 주기
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
  checklist: string | null;     // 무엇을 검토해야 하는지(JSON 또는 줄바꿈 텍스트)
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
  account_details?: Array<{ bank: string; label: string; balance: number }> | string | null;
  transfer_details?: Array<{ purpose: string; amount: number; date: string; memo: string }> | string | null;
};

export type FinancialMonthlyPlan = {
  id: string;
  period_month: string;
  planned_revenue: number | null;
  planned_variable_cost: number | null;
  planned_fixed_cost: number | null;
  planned_capex: number | null;
  planned_receivable: number | null;
  planned_payable: number | null;
  opening_cash: number | null;
  sales_quantity: number | null;
  average_unit_price: number | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};
