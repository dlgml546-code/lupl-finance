import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Clock,
  FilePlus2,
  FolderPlus,
  LogOut,
  Plus,
  RefreshCcw,
  Repeat,
  Tags,
  Upload
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import FinancePlanning from "./FinancePlanning";
import type {
  BonusPayment,
  BusinessProject,
  CashSnapshot,
  ClientType,
  CompensationReview,
  Department,
  ExpenseCategoryItem,
  ExpenseRequest,
  ExpenseUsage,
  FinancialMonthlyPlan,
  MobileReceiptDevice,
  PagePermission,
  PaymentCard,
  PaymentMethod,
  Person,
  ProjectGroup,
  ProjectLaborAllocation,
  ProjectStatus,
  Rank,
  ReceiptStatus,
  ReviewItem,
  ReviewStatus,
  TransferStatus
} from "./types";
import "./styles.css";

type SectionKey =
  | "overview"
  | "finance"
  | "ai"
  | "review"
  | "expense"
  | "revenue"
  | "compensation"
  | "margin"
  | "resource"
  | "org";

type ModalKey =
  | "expenseReview"
  | "taxReview"
  | "projectDetail"
  | "projectEdit"
  | "employeeDetail"
  | "projectForm"
  | "projectWizard"
  | "expenseForm"
  | "recurringForm"
  | "expenseEdit"
  | "personForm"
  | "bonusForm"
  | "laborForm"
  | "permissionForm"
  | "cashForm"
  | "cashHistory"
  | "categoryManage"
  | "cardManage"
  | "mobileDeviceManage"
  | "reviewDetail"
  | null;

type Toast = { type: "ok" | "warn" | "err"; message: string } | null;
type MarginDraft = {
  mode: "lecture" | "project";
  paymentFlow: "company" | "instructor";
  vatMode: string;
  unitPrice: string;
  quantity: string;
  teacherFee: string;
  instructorReceived: string;
  fixedCost: string;
  variableCost: string;
  targetMargin: string;
  proofInstitution: boolean;
  proofCollection: boolean;
  proofReceipt: boolean;
  savedAt?: string;
};
type OperationsInsight = {
  title: string;
  value: string;
  copy: string;
  tone: "blue" | "green" | "orange" | "red" | "purple";
  action?: SectionKey;
};
type CareEvent = {
  person: string;
  label: string;
  dateLabel: string;
  daysLeft: number;
  tone: "green" | "orange" | "purple";
};
type AiChatMessage = { role: "user" | "assistant"; content: string };
type AiInstructorDraft = {
  name?: string;
  hours?: number;
  mainSessions?: number;
  assistantSessions?: number;
  institutionPaid?: number;
  plannedPay?: number;
  companyCollection?: number;
};
type AiEmploymentDraft = {
  name?: string;
  role?: string;
  employeeNumber?: string;
  phone?: string;
  monthlySalary?: number;
  annualSalary?: number;
  weeklyWorkDays?: number;
  dailyWorkHours?: number;
};
type AiFinanceDraft = {
  projectName?: string;
  clientName?: string;
  clientType?: string;
  paymentFlow?: "company" | "instructor";
  instructorCount?: number;
  instructors?: AiInstructorDraft[];
  grossInstitutionPaid?: number;
  instructorPlannedPayTotal?: number;
  companyCollectionTotal?: number;
  companyCollectionReceivedTotal?: number;
  companyRevenue?: number;
  memo?: string;
  employmentCandidates?: AiEmploymentDraft[];
};

const sectionMeta: Record<SectionKey, { title: string; desc: string }> = {
  overview: {
    title: "경영현황",
    desc: "현재 현금, 이번 달 매출, 직원 월급 포함 지출, 현금소진액을 한눈에 봅니다. 데이터를 입력하면 지표가 채워집니다."
  },
  finance: {
    title: "재무계획·회계",
    desc: "월별 손익, 현금흐름, 계획 대비 실적과 손익분기점을 쉬운 설명과 함께 확인합니다."
  },
  ai: {
    title: "AI 입력 도우미",
    desc: "말로 설명하면 프로젝트, 강사 정산, 회사 회수액, 고용 시 월 인건비를 질문으로 정리해 초안으로 만듭니다."
  },
  review: {
    title: "대표 검토함",
    desc: "지출결의, 사업·매출, 인건비, 인력투입, 권한 요청까지 대표가 검토할 항목을 한곳에 모읍니다."
  },
  expense: {
    title: "지출결의",
    desc: "영수증을 등록하고 노션 지출결의 기준(결제방식·사용용도·증빙)에 맞춰 검토 요약과 상세 목록을 함께 봅니다."
  },
  revenue: {
    title: "사업·매출관리",
    desc: "외주용역 항목 기준으로 거래처, 확정금액, 수령금액, 입금예정, 책임자를 관리합니다."
  },
  compensation: {
    title: "인건비·보상",
    desc: "직원별 연봉, 인상률, 지원사업 인건비, 상여금·성과보상을 한 화면에서 관리합니다."
  },
  margin: {
    title: "러플 마진 계산기",
    desc: "강의·프로젝트 견적의 매출, 강사비, 고정비, 변동비를 계산해 목표 마진을 확인합니다."
  },
  resource: {
    title: "인력투입·매출분석",
    desc: "프로젝트별 맨먼스, 가동률, 수익성 지도, 직위별 투입비율을 함께 봅니다."
  },
  org: {
    title: "조직·권한관리",
    desc: "조직도와 페이지별 접근 권한을 관리합니다. 직급 아래 실제 직원이 배치됩니다."
  }
};

const menu: Array<{ key: SectionKey; label: string }> = [
  { key: "overview", label: "경영현황" },
  { key: "finance", label: "재무계획·회계" },
  { key: "ai", label: "AI 입력 도우미" },
  { key: "review", label: "대표 검토함" },
  { key: "expense", label: "지출결의" },
  { key: "revenue", label: "사업·매출관리" },
  { key: "compensation", label: "인건비·보상" },
  { key: "margin", label: "마진계산기" },
  { key: "resource", label: "인력투입·매출분석" },
  { key: "org", label: "조직·권한관리" }
];

const pageKeyMap: Record<SectionKey, string> = {
  overview: "overview",
  finance: "finance",
  ai: "ai",
  review: "review",
  expense: "expense",
  revenue: "revenue",
  compensation: "compensation",
  margin: "margin",
  resource: "resource",
  org: "org"
};

// 외주용역 기준 선택지
const clientTypes: ClientType[] = ["일반학교", "특수학교", "공공기관", "기업", "비영리재단"];
const projectGroups: ProjectGroup[] = ["교육", "문서작업", "홈페이지", "메타버스", "마케팅", "행사", "전시", "영상", "제품 제작", "디자인", "광고/홍보", "연구", "개발", "러플 마진 계산기", "기타"];

const projectCategoryTree: Record<string, Record<string, string[]>> = {
  "교육": {
    "AI 교육": ["특수학교 정규수업", "기관 워크숍", "교사 연수", "캠프"],
    "예술교육": ["미술", "음악", "영상", "융합"],
    "접근성 교육": ["시각장애", "청각장애", "지체장애", "발달장애"]
  },
  "전시": {
    "기획전": ["특수학교 전시", "작가전", "기관 협력전"],
    "미디어아트": ["AI 영상", "인터랙티브", "프로젝션"],
    "판매전": ["굿즈", "작품 판매", "팝업"]
  },
  "행사": {
    "대회": ["사생대회", "공모전", "캠페인"],
    "운영": ["부스", "체험행사", "시상식"],
    "홍보": ["보도자료", "SNS 캠페인", "촬영"]
  },
  "연구": {
    "연구용역": ["FGI", "접근성 연구", "매뉴얼"],
    "컨설팅": ["사업기획", "평가", "자문"]
  },
  "개발": {
    "웹서비스": ["대시보드", "플랫폼", "자동화"],
    "AI 도구": ["OCR", "프롬프트", "API 연동"]
  },
  "러플 마진 계산기": {
    "견적·마진": ["강의 마진 계산", "프로젝트 마진 계산", "원가 시뮬레이션"],
    "운영 도구": ["견적 저장", "PDF 출력", "대시보드 연동"]
  },
  "디자인": {
    "콘텐츠": ["카드뉴스", "교재", "홍보물"],
    "상품": ["굿즈", "패키지", "시제품"]
  },
  "기타": {
    "기타": ["기타"]
  }
};

const projectStatuses: ProjectStatus[] = ["접수", "제안/견적", "컨펌 대기", "진행 중", "납품 완료", "정산 대기", "정산 완료", "보류/드롭"];
const receiptStatuses: ReceiptStatus[] = ["미청구", "청구 완료", "일부 수령", "수령 완료", "보류"];
const inflowRoutes = ["학교장터", "나라장터", "소개", "기존 고객", "직접 문의", "기타"];

// 지출결의 기준 선택지
const expenseUsages: ExpenseUsage[] = ["여비·출장비", "업무 추진비", "내부 사업비", "외부 사업비(외주용역)", "복리후생비", "운영비", "차량비", "홍보비(광고비)", "자산취득비(비품 구입 등)"];
const paymentMethods: PaymentMethod[] = ["법인 계좌이체", "계좌이체", "현금", "카드", "네이버페이-현금", "기타결제 - 비즈머니 충전", "기타결제 - 와우프레스 충전"];
const transferStatuses: TransferStatus[] = ["결제 필요", "결제 완료", "이체 완료", "해당 없음"];
const recurringUsageGroups: ExpenseUsage[] = ["운영비", "홍보비(광고비)", "복리후생비", "업무 추진비", "차량비", "내부 사업비", "외부 사업비(외주용역)", "자산취득비(비품 구입 등)", "여비·출장비"];

// 노션 기준 사용 용도별 설명 (지출결의 팝업 하단 안내)
const usageGuide: Record<ExpenseUsage, string> = {
  "여비·출장비": "여행·출장 중 발생한 식대·다과·유류비·주차비·택시비·숙박비",
  "업무 추진비": "외부 미팅 식대·다과",
  "내부 사업비": "작가에이전시·프로젝트 집행비·교육·점자메뉴판·의류 제작·전시·박람회·팝업·행사·운반·주차·인쇄 등 내부 프로젝트 운영비 일체",
  "외부 사업비(외주용역)": "단체주문·프로젝트 집행비·교육·점자메뉴판·의류 제작·전시·박람회·팝업·행사·운반·주차·인쇄 등 외주 프로젝트 운영비 일체",
  "복리후생비": "내부 인원 식대·간식·회식·워크샵·소모품비",
  "운영비": "소모품비·서류 발급·행정·정기결제비",
  "차량비": "차량유지비·차량소모품·유류비",
  "홍보비(광고비)": "광고·홍보 집행비",
  "자산취득비(비품 구입 등)": "비품·자산 구입비"
};

const expenseSubcategoryTree: Record<ExpenseUsage, string[]> = {
  "여비·출장비": ["교통비", "출장 유류비", "주차비", "택시비", "숙박비", "출장 식대", "출장 다과", "통행료", "기타 출장비"],
  "업무 추진비": ["외부 미팅 식대", "외부 미팅 다과", "거래처 선물", "회의비", "접대비", "기타 업무추진비"],
  "내부 사업비": ["교육 재료비", "행사 다과", "행사 식대", "인쇄·출력", "운반비", "주차비", "촬영·편집", "작가·강사료", "기타 내부사업비"],
  "외부 사업비(외주용역)": ["외주 강사료", "외주 재료비", "외주 인쇄·출력", "외주 행사 다과", "외주 운반비", "외주 촬영·편집", "기타 외주용역비"],
  "복리후생비": ["직원 식대", "직원 간식", "회식비", "워크샵", "복지 소모품", "경조사", "기타 복리후생비"],
  "운영비": ["정기구독", "소모품", "사무용품", "서류 발급", "우편·택배", "통신비", "소프트웨어", "서버·도메인", "기타 운영비"],
  "차량비": ["차량 유류비", "차량 소모품", "정비비", "차량 주차비", "차량 통행료", "보험료", "기타 차량비"],
  "홍보비(광고비)": ["온라인 광고", "SNS 광고", "인쇄 홍보물", "촬영·콘텐츠", "홍보 대행", "기타 홍보비"],
  "자산취득비(비품 구입 등)": ["비품 구입", "장비 구입", "가구", "전자기기", "소프트웨어 라이선스", "기타 자산취득"]
};

const expenseSubcategoryToUsage = {
  ...Object.fromEntries(
    Object.entries(expenseSubcategoryTree).flatMap(([usage, items]) => items.map((item) => [item, usage as ExpenseUsage]))
  ),
  "유류비": "차량비",
  "차량 주유": "차량비",
  "출장 주유": "여비·출장비"
} as Record<string, ExpenseUsage>;

const ranks: Rank[] = ["대표", "본부장", "책임", "선임", "매니저"];
const bonusRateOptions = ["5%", "10%", "15%", "20%", "30%"];
const raiseRateOptions = ["동결", "3%", "4%", "5%", "협의"];
void raiseRateOptions;
const marginMemoStart = "__LUPL_MARGIN_CALC_START__";
const marginMemoEnd = "__LUPL_MARGIN_CALC_END__";

function formatWon(value: number | null | undefined) {
  return `${Math.round(Number(value || 0)).toLocaleString("ko-KR")}원`;
}

function formatWonShort(value: number | null | undefined) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (Math.abs(n) >= 10000) return `${Math.round(n / 10000).toLocaleString("ko-KR")}만`;
  return `${Math.round(n).toLocaleString("ko-KR")}`;
}

function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function normalizeDateToken(value: string) {
  const token = value.trim().match(/\d{4}-\d{2}-\d{2}|\d{2}-\d{2}/)?.[0] || "";
  return token;
}

function daysUntilAnnualDate(value: string, now = new Date()) {
  const token = normalizeDateToken(value);
  if (!token) return null;
  const parts = token.split("-").map(Number);
  const month = token.length === 10 ? parts[1] : parts[0];
  const day = token.length === 10 ? parts[2] : parts[1];
  if (!month || !day) return null;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(now.getFullYear(), month - 1, day);
  if (target < todayStart) target = new Date(now.getFullYear() + 1, month - 1, day);
  return Math.ceil((target.getTime() - todayStart.getTime()) / 86400000);
}

function shortAnnualDateLabel(value: string) {
  const token = normalizeDateToken(value);
  if (!token) return value;
  const parts = token.split("-");
  return token.length === 10 ? `${Number(parts[1])}/${Number(parts[2])}` : `${Number(parts[0])}/${Number(parts[1])}`;
}

function parseNumber(value: FormDataEntryValue | null) {
  if (value === null) return 0;
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function formatMoneyInputValue(value: string) {
  const raw = value.replace(/[^0-9]/g, "");
  return raw ? Number(raw).toLocaleString("ko-KR") : "";
}

function handleMoneyInput(event: React.FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  input.value = formatMoneyInputValue(input.value);
}

type DbError = { message?: string; code?: string } | null;

function getMissingColumn(error: DbError) {
  const raw = String(error?.message || "");
  const lower = raw.toLowerCase();
  const code = String(error?.code || "");
  const isMissingColumn =
    code === "PGRST204" ||
    lower.includes("schema cache") ||
    (lower.includes("column") && (lower.includes("could not find") || lower.includes("does not exist")));
  if (!isMissingColumn) return null;
  const match = raw.match(/'([^']+)' column/i) || raw.match(/column "?([a-zA-Z0-9_]+)"?/i);
  return match?.[1] || null;
}

// 배포된 테이블에 일부 컬럼이 빠져 있어도(스키마 드리프트) 등록이 막히지 않도록,
// PostgREST가 "없는 컬럼"을 알려주면 그 컬럼만 제거하고 다시 시도하는 공통 저장 함수.
// preserveToMemo에 지정된 컬럼이 제거되면 그 값을 memo로 보존한다.
async function saveWithHealing<T = Record<string, unknown>>(
  table: string,
  payload: Record<string, unknown>,
  options?: { upsert?: { onConflict: string }; preserveToMemo?: Record<string, string> }
): Promise<{ data: T | null; error: DbError }> {
  const attempt: Record<string, unknown> = { ...payload };
  const preserve = options?.preserveToMemo || {};
  let data: T | null = null;
  let error: DbError = null;
  for (let i = 0; i < 24; i++) {
    const builder = options?.upsert
      ? supabase.from(table).upsert(attempt, options.upsert)
      : supabase.from(table).insert(attempt);
    const res = await builder.select().single();
    data = (res.data as T) ?? null;
    error = res.error as DbError;
    if (!error) break;

    const badColumn = getMissingColumn(error);
    if (!badColumn || !(badColumn in attempt)) break;

    if (preserve[badColumn] && "memo" in attempt) {
      attempt.memo = [preserve[badColumn], String(attempt.memo || "")].filter(Boolean).join("\n");
    }
    delete attempt[badColumn];
  }
  return { data, error };
}

async function updateWithHealing<T = Record<string, unknown>>(
  table: string,
  payload: Record<string, unknown>,
  eqColumn: string,
  eqValue: string
): Promise<{ data: T | null; error: DbError }> {
  const attempt: Record<string, unknown> = { ...payload };
  let data: T | null = null;
  let error: DbError = null;
  for (let i = 0; i < 24; i++) {
    const res = await supabase.from(table).update(attempt).eq(eqColumn, eqValue).select().single();
    data = (res.data as T) ?? null;
    error = res.error as DbError;
    if (!error) break;
    const badColumn = getMissingColumn(error);
    if (!badColumn || !(badColumn in attempt)) break;
    delete attempt[badColumn];
  }
  return { data, error };
}

const legacyBusinessCategories = [
  "외주용역", "지원사업", "자체사업", "기타",
  "교육 프로그램", "교육프로그램", "프로젝트", "강의", "행사", "전시", "연구", "개발",
  "교육", "문서작업", "홈페이지", "메타버스", "마케팅", "영상", "제품 제작", "디자인", "광고/홍보",
  "러플 마진 계산기", "일반학교", "특수학교", "공공기관", "기업", "비영리재단"
];

function toLegacyBusinessCategory(major: string) {
  return legacyBusinessCategories.includes(major) ? major : legacyBusinessCategories[0];
}

function isInvalidBusinessCategoryError(error: DbError) {
  const raw = String(error?.message || "").toLowerCase();
  return raw.includes("invalid input value for enum business_category");
}

function isProjectCategoryRequiredError(error: DbError) {
  const raw = String(error?.message || "").toLowerCase();
  return raw.includes("column \"category\"") && raw.includes("not-null");
}

function isRecurringExpense(expense: Pick<ExpenseRequest, "is_recurring" | "recurring_cycle" | "evidence_status" | "review_reason" | "memo" | "purpose">) {
  const haystack = [expense.evidence_status, expense.review_reason, expense.recurring_cycle, expense.memo, expense.purpose].filter(Boolean).join(" ");
  return Boolean(expense.is_recurring || expense.recurring_cycle || haystack.includes("정기결제") || haystack.includes("정기 구독") || haystack.includes("정기지출") || haystack.includes("반복 결제") || haystack.includes("구독"));
}

function isMonthlyRecurringExpense(expense: ExpenseRequest) {
  if (!isRecurringExpense(expense)) return false;
  return !expense.recurring_cycle || expense.recurring_cycle === "매월" || expense.memo?.includes("매월") || expense.review_reason?.includes("매월");
}

function looksLikeRecurringText(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ");
  return ["정기", "구독", "매월", "월마다", "월별", "반복", "자동결제", "자동 결제"].some((keyword) => text.includes(keyword));
}

function readMemoField(memo: string | null | undefined, label: string) {
  const line = String(memo || "").split("\n").find((item) => item.trim().startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : "";
}

function readAnyMemoField(memo: string | null | undefined, labels: string[]) {
  for (const label of labels) {
    const value = readMemoField(memo, label);
    if (value) return value;
  }
  return "";
}

const mobileReceiptMemoLabels = [
  "업로드 기기 소유자",
  "기기 ID",
  "OCR 가맹점",
  "OCR 사용일",
  "OCR 총액",
  "영수증 저장 경로",
  "영수증 보기",
  "OCR 원문",
  "등록 경로",
  "묶음",
  "지출 대분류",
  "지출 소분류",
  "사용용도",
  "정기지출 대분류",
  "반복주기",
  "결제 방식",
  "카드 뒷자리",
  "비용 성격",
  "부가세 처리",
  "공급가액",
  "부가세",
  "실제 지급일"
];

function cleanExpenseMemo(memo: string | null | undefined) {
  return String(memo || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !mobileReceiptMemoLabels.some((label) => trimmed.startsWith(`${label}:`));
    })
    .join("\n");
}

function getExpenseDeviceId(expense: Pick<ExpenseRequest, "memo">) {
  return readMemoField(expense.memo, "기기 ID");
}

function stripExpenseSystemMemo(memo: string | null | undefined) {
  return String(memo || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return ![
        "지출 대분류:", "지출 소분류:", "사용용도:", "정기지출 대분류:", "반복주기:",
        "비용 성격:", "부가세 처리:", "공급가액:", "부가세:", "실제 지급일:"
      ].some((prefix) => trimmed.startsWith(prefix));
    })
    .join("\n")
    .trim();
}

function getUsageFromExpenseSubcategory(subcategory: string | null | undefined, fallback: ExpenseUsage = "운영비") {
  const clean = String(subcategory || "").trim();
  return expenseSubcategoryToUsage[clean] || fallback;
}

function getExpenseSubcategoryLabel(expense: Pick<ExpenseRequest, "memo" | "usage" | "purpose" | "usage_subcategory">) {
  return expense.usage_subcategory || readMemoField(expense.memo, "지출 소분류") || readMemoField(expense.memo, "사용용도") || "";
}

function getExpenseUsageLabel(expense: Pick<ExpenseRequest, "usage" | "category" | "memo" | "is_recurring" | "recurring_cycle" | "evidence_status" | "review_reason" | "purpose">) {
  const memoUsage = readMemoField(expense.memo, "정기지출 대분류") || readMemoField(expense.memo, "사용용도");
  const memoSubcategory = readMemoField(expense.memo, "지출 소분류");
  const raw = String(expense.usage || "").trim();
  const legacyCategory = String(expense.category || "").trim();
  if (raw && raw !== "미분류") return raw;
  if (memoSubcategory) return getUsageFromExpenseSubcategory(memoSubcategory);
  if (legacyCategory && legacyCategory !== "미분류") return legacyCategory;
  if (memoUsage) return memoUsage;
  return isRecurringExpense(expense) ? "운영비" : "미분류";
}

function getExpenseUsageDisplay(expense: ExpenseRequest) {
  const usage = getExpenseUsageLabel(expense);
  const subcategory = getExpenseSubcategoryLabel(expense);
  return subcategory ? `${usage} · ${subcategory}` : usage;
}

function getExpensePaymentLabel(expense: ExpenseRequest, cards: PaymentCard[]) {
  const cardLabel = cards.find((card) => card.id === expense.card_id)?.label
    || readMemoField(expense.memo, "결제카드")
    || (isRecurringExpense(expense) ? cards.find((card) => card.card_type === "개인")?.label : "");
  const method = expense.payment_method || readMemoField(expense.memo, "결제방식") || (cardLabel ? "카드" : "-");
  return `${method}${cardLabel ? ` (${cardLabel})` : ""}`;
}

function getExpenseCycleLabel(expense: ExpenseRequest) {
  return expense.recurring_cycle || readMemoField(expense.memo, "반복주기") || (isRecurringExpense(expense) ? "매월" : "-");
}

function getExpenseReceiptUrl(expense: ExpenseRequest) {
  return expense.receipt_file_url || readMemoField(expense.memo, "영수증 보기");
}

function toLegacyExpenseCategory(usage: string | null | undefined) {
  const value = String(usage || "").trim();
  const map: Record<string, string> = {
    "여비·출장비": "여비교통비",
    "업무 추진비": "운영비",
    "내부 사업비": "내부 사업비",
    "외부 사업비(외주용역)": "외부 사업비",
    "복리후생비": "운영비",
    "운영비": "운영비",
    "차량비": "운영비",
    "홍보비(광고비)": "운영비",
    "자산취득비(비품 구입 등)": "운영비"
  };
  return map[value] || "운영비";
}

function getDeviceOwnerName(deviceId: string | null | undefined, devices: MobileReceiptDevice[]) {
  if (!deviceId) return "";
  const device = devices.find((item) => item.device_id === deviceId && item.is_active !== false);
  return device?.owner_name || "";
}

function buildProjectMemoLines(payload: {
  categoryMemo: string;
  clientName: string;
  clientType: string;
  status: string;
  confirmedAmount: number;
  receivedAmount: number;
  manualCost: number;
  ownerLabel: string;
  operatorLabel: string;
  contact: string;
  inflowRoute: string;
  receiptStatus: string;
  paymentDueDate: string;
  dueDate: string;
  taxInvoiceDate: string;
  revenueRecognitionDate: string;
  receivedDate: string;
  revenueTaxMode: string;
  repeatClient: boolean;
  monthlyPaymentMemo: string;
  plainMemo: string;
}) {
  return [
    payload.categoryMemo,
    payload.clientName ? `거래처/기관명: ${payload.clientName}` : "",
    payload.clientType ? `거래처 구분: ${payload.clientType}` : "",
    payload.status ? `상태: ${payload.status}` : "",
    `확정 금액: ${formatWon(payload.confirmedAmount)}`,
    `수령 금액: ${formatWon(payload.receivedAmount)}`,
    payload.manualCost ? `수기 비용: ${formatWon(payload.manualCost)}` : "",
    payload.ownerLabel ? `책임자: ${payload.ownerLabel}` : "",
    payload.operatorLabel ? `실무 담당자: ${payload.operatorLabel}` : "",
    payload.contact ? `실무 담당자 연락처: ${payload.contact}` : "",
    payload.inflowRoute ? `유입 경로: ${payload.inflowRoute}` : "",
    payload.receiptStatus ? `대금 수령 상태: ${payload.receiptStatus}` : "",
    payload.paymentDueDate ? `입금 예정일: ${payload.paymentDueDate}` : "",
    payload.dueDate ? `마감 날짜: ${payload.dueDate}` : "",
    payload.taxInvoiceDate ? `세금계산서 발행일: ${payload.taxInvoiceDate}` : "",
    payload.revenueRecognitionDate ? `매출 인식일: ${payload.revenueRecognitionDate}` : "",
    payload.receivedDate ? `실제 입금일: ${payload.receivedDate}` : "",
    payload.revenueTaxMode ? `매출 부가세 처리: ${payload.revenueTaxMode}` : "",
    `반복 가능 고객: ${payload.repeatClient ? "예" : "아니오"}`,
    payload.monthlyPaymentMemo,
    payload.plainMemo
  ].filter(Boolean).join("\n");
}

function projectMemoValue(project: BusinessProject, label: string) {
  return readMemoField(project.memo, label);
}

function stripProjectMarginDraft(memo: string | null | undefined) {
  const text = String(memo || "");
  const start = text.indexOf(marginMemoStart);
  const end = text.indexOf(marginMemoEnd);
  if (start === -1 || end === -1 || end < start) return text;
  return `${text.slice(0, start)}${text.slice(end + marginMemoEnd.length)}`.trim();
}

function getProjectMarginDraft(project: BusinessProject | null | undefined): MarginDraft | null {
  const memo = String(project?.memo || "");
  const start = memo.indexOf(marginMemoStart);
  const end = memo.indexOf(marginMemoEnd);
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(memo.slice(start + marginMemoStart.length, end).trim()) as MarginDraft;
  } catch {
    return null;
  }
}

function setProjectMarginDraft(memo: string | null | undefined, draft: MarginDraft) {
  const clean = stripProjectMarginDraft(memo);
  return [clean, marginMemoStart, JSON.stringify(draft), marginMemoEnd].filter(Boolean).join("\n").trim();
}

function getProjectPlainMemo(project: BusinessProject) {
  return stripProjectMarginDraft(project.memo)
    .split("\n")
    .filter((line) => ![
      "프로젝트 분류:", "거래처/기관명:", "거래처 구분:", "상태:", "확정 금액:", "수령 금액:", "수기 비용:",
      "책임자:", "실무 담당자:", "실무 담당자 연락처:", "유입 경로:", "대금 수령 상태:", "입금 예정일:",
      "마감 날짜:", "세금계산서 발행일:", "매출 인식일:", "실제 입금일:", "매출 부가세 처리:",
      "반복 가능 고객:", "입금 예정:"
    ].some((prefix) => line.startsWith(prefix)))
    .join("\n")
    .trim();
}

function getProjectCategoryLabel(project: BusinessProject) {
  if (project.project_major_category || project.project_middle_category || project.project_small_category) {
    return [project.project_major_category, project.project_middle_category, project.project_small_category].filter(Boolean).join(" > ");
  }
  if (project.project_group?.length) return project.project_group.join(" > ");
  return projectMemoValue(project, "프로젝트 분류") || "-";
}

function getProjectNumber(project: BusinessProject, fieldValue: number | null | undefined, memoLabel: string) {
  const direct = Number(fieldValue || 0);
  if (direct) return direct;
  return Number(projectMemoValue(project, memoLabel).replace(/[^0-9.-]/g, "")) || 0;
}

function isMonthlyProject(project: BusinessProject) {
  return String(project.memo || "").includes("입금 예정: 매월 반복") || String(project.memo || "").includes("월 반복 입금");
}

function isVisibleCashSnapshot(snapshot: CashSnapshot) {
  const month = String(snapshot.snapshot_month || "");
  const looksLikeSeed = Number(snapshot.current_cash || 0) === 50000000 && Number(snapshot.revenue || 0) === 5000000 && Number(snapshot.expense || 0) === 4200000;
  return month >= "2026-06-01" && !looksLikeSeed;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

type CashAccountDetail = { bank: string; label: string; balance: number };
type CashTransferDetail = { purpose: string; amount: number; date: string; memo: string };

function cashAccountBackupKey(month: string) {
  return `lupl.cashAccounts.${month.slice(0, 7)}`;
}

function readCashAccountBackup(month: string) {
  try {
    const raw = window.localStorage.getItem(cashAccountBackupKey(month));
    return raw ? parseJsonArray<CashAccountDetail>(raw) : [];
  } catch {
    return [];
  }
}

function writeCashAccountBackup(month: string, accounts: CashAccountDetail[]) {
  try {
    window.localStorage.setItem(cashAccountBackupKey(month), JSON.stringify(accounts));
  } catch {
    /* local backup is best-effort */
  }
}

function getCashAccounts(snapshot: CashSnapshot) {
  const fromDb = parseJsonArray<CashAccountDetail>((snapshot as CashSnapshot & { account_details?: unknown }).account_details);
  return fromDb.length > 0 ? fromDb : readCashAccountBackup(String(snapshot.snapshot_month || ""));
}

// RLS/권한 오류는 사용자가 알아볼 수 있게 한국어로 바꾼다.
function toFriendlyDbError(error: DbError, fallback: string) {
  const lower = String(error?.message || "").toLowerCase();
  if (lower.includes("row-level security") || lower.includes("policy")) {
    return new Error("권한(RLS) 정책에 막혀 저장하지 못했습니다. 로그인 상태와 Supabase RLS 정책을 확인하세요.");
  }
  return new Error(error?.message || fallback);
}

// 임시저장(드래프트) 공통 유틸 — 저장 실패 시 입력 내용을 보존하고 다음에 복구한다.
const draftStore = {
  read(key: string): Record<string, unknown> | null {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  },
  write(key: string, value: Record<string, unknown>) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 용량 초과 등은 무시 */
    }
  },
  clear(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* 무시 */
    }
  }
};

const financePlanBackupKey = "lupl.financialMonthlyPlans.v1";

function readFinancePlanBackup(): FinancialMonthlyPlan[] {
  try {
    const raw = window.localStorage.getItem(financePlanBackupKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as FinancialMonthlyPlan[] : [];
  } catch {
    return [];
  }
}

function inferExpenseCostBehavior(usage: string, projectId = ""): "고정비" | "변동비" {
  if (projectId || ["내부 사업비", "외부 사업비(외주용역)", "여비·출장비"].includes(usage)) return "변동비";
  return "고정비";
}

function calculateExpenseTax(amount: number, taxMode: string) {
  if (taxMode !== "부가세 포함") return { supplyAmount: amount, vatAmount: 0 };
  const supplyAmount = Math.round(amount / 1.1);
  return { supplyAmount, vatAmount: amount - supplyAmount };
}

function writeFinancePlanBackup(plans: FinancialMonthlyPlan[]) {
  try {
    window.localStorage.setItem(financePlanBackupKey, JSON.stringify(plans));
  } catch {
    /* local backup is best-effort */
  }
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function handlePhoneInput(event: React.FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  input.value = formatPhoneNumber(input.value);
}

function calcMonthlyCapacity(weeklyDays: number, dailyHours: number) {
  const weeklyWorkHours = Math.min(40, (weeklyDays || 0) * (dailyHours || 0));
  const paidWeeklyHolidayHours = weeklyWorkHours >= 15 ? Math.min(8, weeklyWorkHours / 5) : 0;
  return Math.round((weeklyWorkHours + paidWeeklyHolidayHours) * 365 / 7 / 12);
}

function calcHourlyWage(annualSalary: number, monthlyHours: number) {
  if (!annualSalary || !monthlyHours) return 0;
  return Math.round(annualSalary / 12 / monthlyHours);
}

function calcAnnualSalary(hourlyWage: number, monthlyHours: number) {
  if (!hourlyWage || !monthlyHours) return 0;
  return Math.round(hourlyWage * monthlyHours * 12);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getPhoneLast4(phone: string | null | undefined) {
  return String(phone || "").replace(/[^0-9]/g, "").slice(-4);
}

function normalizeEmployeeNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function makeInternalEmail(employeeNumber: string) {
  return `${normalizeEmployeeNumber(employeeNumber).toLowerCase()}@employee.lupl.kr`;
}

function makeInitialPassword(phone: string | null | undefined) {
  const last4 = getPhoneLast4(phone);
  return last4.length === 4 ? `lupl${last4}` : "";
}

function formatDateTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}.${dd} ${hh}:${mi}`;
}

function canManage(person: Person | null) {
  return Boolean(person && (person.rank === "대표" || person.rank === "본부장"));
}

function canOpenPage(person: Person | null, permissions: PagePermission[], key: SectionKey) {
  if (!person) return false;
  if (person.rank === "대표" || person.rank === "본부장") return true;
  if (key === "overview") return true;
  return permissions.some((permission) => permission.person_id === person.id && permission.page_key === pageKeyMap[key]);
}

type ProjectComputed = BusinessProject & {
  _cost: number; _autoCost: number; _revenue: number; _profit: number; _marginRate: number; _receivable: number; _monthlyRevenue: number; _isMonthlyRecurring: boolean;
};

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [loginAt, setLoginAt] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [compReviews, setCompReviews] = useState<CompensationReview[]>([]);
  const [bonuses, setBonuses] = useState<BonusPayment[]>([]);
  const [labor, setLabor] = useState<ProjectLaborAllocation[]>([]);
  const [cash, setCash] = useState<CashSnapshot[]>([]);
  const [financePlans, setFinancePlans] = useState<FinancialMonthlyPlan[]>([]);
  const [financePlanTableReady, setFinancePlanTableReady] = useState(true);
  const [mobileDevices, setMobileDevices] = useState<MobileReceiptDevice[]>([]);
  const [mobileDeviceTableReady, setMobileDeviceTableReady] = useState(true);

  const [section, setSection] = useState<SectionKey>("overview");
  const [modal, setModal] = useState<ModalKey>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectComputed | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const pendingReviews = reviews.filter((review) => review.status === "검토 전");
  const visibleCash = useMemo(() => cash.filter(isVisibleCashSnapshot), [cash]);
  const latestCash = visibleCash[0];

  const activeMeta = sectionMeta[section];
  const availableMenu = menu.filter((item) => canOpenPage(currentPerson, permissions, item.key));

  // 지출결의 기반 프로젝트별 집행비용 자동 집계 (17번: 비용 자동계산)
  const projectCostMap = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      if (e.project_id) {
        map.set(e.project_id, (map.get(e.project_id) || 0) + Number(e.amount || 0));
      }
    });
    return map;
  }, [expenses]);

  // 프로젝트에 자동 집계 비용 합산
  const projectsComputed = useMemo(() => {
    return projects.map((p) => {
      const autoCost = projectCostMap.get(p.id) || 0;
      const manualCost = getProjectNumber(p, p.cost, "수기 비용");
      const cost = manualCost + autoCost;
      const revenue = getProjectNumber(p, p.confirmed_amount, "확정 금액");
      const received = getProjectNumber(p, p.received_amount, "수령 금액");
      const profit = revenue - cost;
      const marginRate = revenue > 0 ? profit / revenue : 0;
      const receivable = Math.max(0, revenue - received);
      const monthlyRevenue = isMonthlyProject(p) ? revenue : 0;
      return { ...p, received_amount: received, _cost: cost, _autoCost: autoCost, _revenue: revenue, _profit: profit, _marginRate: marginRate, _receivable: receivable, _monthlyRevenue: monthlyRevenue, _isMonthlyRecurring: monthlyRevenue > 0 };
    });
  }, [projects, projectCostMap]);

  useEffect(() => {
    if (currentPerson && !canOpenPage(currentPerson, permissions, section)) {
      setSection("overview");
    }
  }, [currentPerson, permissions, section]);

  function showToast(message: string, type: "ok" | "warn" | "err" = "ok") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2400);
  }

  async function ensureProfile(email: string, authUserId: string) {
    const { data: existingByAuth, error: authError } = await supabase
      .from("people")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (authError) throw authError;
    if (existingByAuth) return existingByAuth as Person;

    const { data: existingByEmail, error: emailError } = await supabase
      .from("people")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (emailError) throw emailError;

    if (existingByEmail) {
      const { data, error } = await supabase
        .from("people")
        .update({ auth_user_id: authUserId })
        .eq("id", existingByEmail.id)
        .select()
        .single();
      if (error) throw error;
      return data as Person;
    }

    const { count, error: countError } = await supabase
      .from("people")
      .select("id", { count: "exact", head: true });

    if (countError) throw countError;

    const isFirstUser = (count || 0) === 0;
    const { data, error } = await supabase
      .from("people")
      .insert({
        auth_user_id: authUserId,
        email,
        name: email.split("@")[0],
        rank: isFirstUser ? "대표" : "매니저",
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data as Person;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [departmentsRes, peopleRes, permissionsRes, cardsRes, categoriesRes, projectsRes, expensesRes, reviewsRes, compRes, bonusesRes, laborRes, cashRes] =
        await Promise.all([
          supabase.from("departments").select("*").order("name"),
          supabase.from("people").select("*").order("rank").order("name"),
          supabase.from("page_permissions").select("*"),
          supabase.from("payment_cards").select("*").order("sort_order"),
          supabase.from("expense_categories").select("*").order("sort_order"),
          supabase.from("business_projects").select("*").order("created_at", { ascending: false }),
          supabase.from("expense_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("review_items").select("*").order("created_at", { ascending: false }),
          supabase.from("compensation_reviews").select("*").order("created_at", { ascending: false }),
          supabase.from("bonus_payments").select("*").order("created_at", { ascending: false }),
          supabase.from("project_labor_allocations").select("*").order("created_at", { ascending: false }),
          supabase.from("cash_snapshots").select("*").order("snapshot_month", { ascending: false })
        ]);

      const responses = [departmentsRes, peopleRes, permissionsRes, cardsRes, categoriesRes, projectsRes, expensesRes, reviewsRes, compRes, bonusesRes, laborRes, cashRes];
      const firstError = responses.find((res) => res.error)?.error;
      if (firstError) throw firstError;

      setDepartments((departmentsRes.data || []) as Department[]);
      setPeople((peopleRes.data || []) as Person[]);
      setPermissions((permissionsRes.data || []) as PagePermission[]);
      setCards((cardsRes.data || []) as PaymentCard[]);
      setCategories((categoriesRes.data || []) as ExpenseCategoryItem[]);
      setProjects((projectsRes.data || []) as BusinessProject[]);
      setExpenses((expensesRes.data || []) as ExpenseRequest[]);
      setReviews((reviewsRes.data || []) as ReviewItem[]);
      setCompReviews((compRes.data || []) as CompensationReview[]);
      setBonuses((bonusesRes.data || []) as BonusPayment[]);
      setLabor((laborRes.data || []) as ProjectLaborAllocation[]);
      setCash((cashRes.data || []) as CashSnapshot[]);

      const mobileDevicesRes = await supabase.from("mobile_receipt_devices").select("*").order("updated_at", { ascending: false });
      if (mobileDevicesRes.error) {
        console.warn("mobile_receipt_devices not ready", mobileDevicesRes.error);
        setMobileDeviceTableReady(false);
        setMobileDevices([]);
      } else {
        setMobileDeviceTableReady(true);
        setMobileDevices((mobileDevicesRes.data || []) as MobileReceiptDevice[]);
      }

      const financePlansRes = await supabase.from("financial_monthly_plans").select("*").order("period_month");
      if (financePlansRes.error) {
        console.warn("financial_monthly_plans not ready", financePlansRes.error);
        setFinancePlanTableReady(false);
        setFinancePlans(readFinancePlanBackup());
      } else {
        setFinancePlanTableReady(true);
        const loadedPlans = (financePlansRes.data || []) as FinancialMonthlyPlan[];
        setFinancePlans(loadedPlans);
        writeFinancePlanBackup(loadedPlans);
      }
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.", "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const email = data.session?.user.email || null;
      setUserEmail(email);
      if (data.session?.user.id && email) {
        setLoginAt(data.session.user.last_sign_in_at || new Date().toISOString());
        try {
          const profile = await ensureProfile(email, data.session.user.id);
          setCurrentPerson(profile);
          await loadAll();
        } catch (error) {
          console.error(error);
          showToast(error instanceof Error ? error.message : "프로필 생성에 실패했습니다.", "err");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const email = session?.user.email || null;
      setUserEmail(email);
      if (session?.user.id && email) {
        setLoginAt(session.user.last_sign_in_at || new Date().toISOString());
        const profile = await ensureProfile(email, session.user.id);
        setCurrentPerson(profile);
        await loadAll();
      } else {
        setCurrentPerson(null);
      }
      setSessionReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setCurrentPerson(null);
    setUserEmail(null);
  }

  async function saveFinancePlan(formData: FormData) {
    const periodMonth = String(formData.get("period_month") || "");
    if (!periodMonth) throw new Error("계획을 저장할 월을 선택해 주세요.");
    const payload = {
      period_month: periodMonth,
      planned_revenue: parseNumber(formData.get("planned_revenue")),
      planned_variable_cost: parseNumber(formData.get("planned_variable_cost")),
      planned_fixed_cost: parseNumber(formData.get("planned_fixed_cost")),
      planned_capex: parseNumber(formData.get("planned_capex")),
      planned_receivable: parseNumber(formData.get("planned_receivable")),
      planned_payable: parseNumber(formData.get("planned_payable")),
      opening_cash: parseNumber(formData.get("opening_cash")),
      sales_quantity: parseNumber(formData.get("sales_quantity")),
      average_unit_price: parseNumber(formData.get("average_unit_price")),
      note: String(formData.get("note") || "") || null
    };

    if (!financePlanTableReady) {
      const existing = financePlans.find((item) => String(item.period_month).slice(0, 7) === periodMonth.slice(0, 7));
      const nextPlan = {
        ...payload,
        id: existing?.id || crypto.randomUUID(),
        updated_at: new Date().toISOString()
      } as FinancialMonthlyPlan;
      const nextPlans = [...financePlans.filter((item) => item.id !== nextPlan.id), nextPlan]
        .sort((a, b) => a.period_month.localeCompare(b.period_month));
      setFinancePlans(nextPlans);
      writeFinancePlanBackup(nextPlans);
      showToast("재무계획을 이 브라우저에 임시저장했습니다.", "warn");
      return;
    }

    const { data, error } = await saveWithHealing<FinancialMonthlyPlan>("financial_monthly_plans", payload, {
      upsert: { onConflict: "period_month" }
    });
    if (error) throw toFriendlyDbError(error, "월별 재무계획 저장에 실패했습니다.");
    if (!data) throw new Error("월별 재무계획 저장 결과를 받지 못했습니다.");
    showToast("월별 재무계획을 저장했습니다.");
    await loadAll();
  }

  async function createReviewItem(payload: Omit<ReviewItem, "id">) {
    const { error } = await saveWithHealing("review_items", payload as unknown as Record<string, unknown>);
    if (error) throw toFriendlyDbError(error, "검토 항목 생성에 실패했습니다.");
  }

  async function updateReviewStatus(review: ReviewItem, status: ReviewStatus) {
    const { error } = await supabase.from("review_items").update({ status }).eq("id", review.id);
    if (error) throw error;

    if (review.target_table && review.target_id) {
      if (review.target_table === "expense_requests") {
        await supabase.from("expense_requests").update({
          review_status: status,
          approved_by: status === "승인" ? currentPerson?.id : null,
          approved_at: status === "승인" ? new Date().toISOString() : null
        }).eq("id", review.target_id);
      }
      if (review.target_table === "compensation_reviews") {
        await supabase.from("compensation_reviews").update({ review_status: status }).eq("id", review.target_id);
      }
      if (review.target_table === "bonus_payments") {
        await supabase.from("bonus_payments").update({ payment_status: status }).eq("id", review.target_id);
      }
    }

    showToast(`${status} 처리했습니다.`);
    setModal(null);
    await loadAll();
  }

  // 16,17번: 프로젝트 생성 - 상태 선택, 매출=확정금액, 비용은 지출결의 자동집계 + 책임자/연락처 등 외주용역 필드
  async function deleteReviewItem(review: ReviewItem) {
    if (!window.confirm("이 검토 항목을 삭제할까요? 연결된 원본 데이터는 그대로 두고 검토함에서만 삭제됩니다.")) return;
    try {
      const { error } = await supabase.from("review_items").delete().eq("id", review.id);
      if (error) throw error;
      showToast("검토 항목을 삭제했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "검토 항목 삭제 실패", "err");
    }
  }

  async function createProject(formData: FormData) {
    try {
      const major = String(formData.get("project_major_category") || "");
      const middle = String(formData.get("project_middle_category") || "");
      const small = String(formData.get("project_small_category") || "");
      const groups = [major, middle, small].filter(Boolean);
      const legacyCategory = toLegacyBusinessCategory(major);
      const monthlyPaymentMemo = String(formData.get("payment_due_cycle") || "") === "monthly" ? "입금 예정: 매월 반복" : "";
      const plainMemo = String(formData.get("memo") || "");
      const categoryMemo = groups.length ? `프로젝트 분류: ${groups.join(" > ")}` : "";
      const confirmedAmount = parseNumber(formData.get("confirmed_amount"));
      const receivedAmount = parseNumber(formData.get("received_amount"));
      const clientName = String(formData.get("client_name") || "") || "";
      const clientType = String(formData.get("client_type") || "") || "";
      const status = String(formData.get("status") || "접수") as ProjectStatus;
      const receiptStatus = String(formData.get("receipt_status") || "미청구") || "";
      const ownerLabel = String(formData.get("owner_label") || "") || "";
      const operatorLabel = String(formData.get("operator_label") || "") || "";
      const contact = [
        String(formData.get("client_contact_name") || ""),
        String(formData.get("client_contact_phone") || "")
      ].filter(Boolean).join(" / ") || String(formData.get("contact") || "");
      const inflowRoute = String(formData.get("inflow_route") || "") || "";
      const paymentDueDate = String(formData.get("payment_due_date") || "") || "";
      const dueDate = String(formData.get("due_date") || "") || "";
      const taxInvoiceDate = String(formData.get("tax_invoice_date") || "") || "";
      const revenueRecognitionDate = String(formData.get("revenue_recognition_date") || "") || "";
      const receivedDate = String(formData.get("received_date") || "") || "";
      const revenueTaxMode = String(formData.get("revenue_tax_mode") || "부가세 포함");
      const repeatClient = formData.get("repeat_client") === "on";
      const projectMemo = buildProjectMemoLines({
        categoryMemo,
        clientName,
        clientType,
        status,
        confirmedAmount,
        receivedAmount,
        manualCost: 0,
        ownerLabel,
        operatorLabel,
        contact,
        inflowRoute,
        receiptStatus,
        paymentDueDate,
        dueDate,
        taxInvoiceDate,
        revenueRecognitionDate,
        receivedDate,
        revenueTaxMode,
        repeatClient,
        monthlyPaymentMemo,
        plainMemo
      });
      const payload = {
        name: String(formData.get("name") || ""),
        category: legacyCategory,
        client_type: (clientType || null) as ClientType | null,
        project_major_category: major || null,
        project_middle_category: middle || null,
        project_small_category: small || null,
        project_group: groups.length ? groups : null,
        client_name: clientName || null,
        status,
        confirmed_amount: confirmedAmount,
        received_amount: receivedAmount,
        cost: 0,
        receipt_status: (receiptStatus || null) as ReceiptStatus | null,
        owner_label: ownerLabel || null,
        operator_label: operatorLabel || null,
        contact: contact || null,
        inflow_route: inflowRoute || null,
        payment_due_date: paymentDueDate || null,
        due_date: dueDate || null,
        tax_invoice_date: taxInvoiceDate || null,
        revenue_recognition_date: revenueRecognitionDate || null,
        received_date: receivedDate || null,
        revenue_tax_mode: revenueTaxMode || null,
        repeat_client: repeatClient,
        owner_id: currentPerson?.id || null,
        memo: projectMemo
      };

      // 스키마 드리프트(배포 테이블에 일부 컬럼이 없음)에도 등록이 막히지 않도록 공통 저장 함수 사용.
      let data: { id: string; name: string; owner_label: string | null; confirmed_amount: number } | null = null;
      let error: DbError = null;
      const existingLegacyCategories = (projects as Array<BusinessProject & { category?: string | null }>)
        .map((project) => String(project.category || "").trim())
        .filter(Boolean);
      const categoryCandidates = Array.from(new Set([legacyCategory, ...existingLegacyCategories, ...legacyBusinessCategories]));
      for (const candidate of categoryCandidates) {
        const result = await saveWithHealing<{ id: string; name: string; owner_label: string | null; confirmed_amount: number }>(
          "business_projects",
          { ...payload, category: candidate },
          {
            preserveToMemo: {
              project_major_category: categoryMemo,
              project_middle_category: categoryMemo,
              project_small_category: categoryMemo,
              project_group: categoryMemo,
              client_name: `거래처/기관명: ${clientName}`,
              client_type: `거래처 구분: ${clientType}`,
              confirmed_amount: `확정 금액: ${formatWon(confirmedAmount)}`,
              received_amount: `수령 금액: ${formatWon(receivedAmount)}`,
              owner_label: `책임자: ${ownerLabel}`,
              operator_label: `실무 담당자: ${operatorLabel}`,
              contact: `실무 담당자 연락처: ${contact}`,
              inflow_route: `유입 경로: ${inflowRoute}`,
              receipt_status: `대금 수령 상태: ${receiptStatus}`,
              payment_due_date: `입금 예정일: ${paymentDueDate}`,
              due_date: `마감 날짜: ${dueDate}`,
              tax_invoice_date: `세금계산서 발행일: ${taxInvoiceDate}`,
              revenue_recognition_date: `매출 인식일: ${revenueRecognitionDate}`,
              received_date: `실제 입금일: ${receivedDate}`,
              revenue_tax_mode: `매출 부가세 처리: ${revenueTaxMode}`
            }
          }
        );
        data = result.data;
        error = result.error;
        if (!error) break;
        if (!isInvalidBusinessCategoryError(error)) break;
      }
      if (error && isInvalidBusinessCategoryError(error)) {
        const result = await saveWithHealing<{ id: string; name: string; owner_label: string | null; confirmed_amount: number }>(
          "business_projects",
          { ...payload, category: undefined },
          {
            preserveToMemo: {
              project_major_category: categoryMemo,
              project_middle_category: categoryMemo,
              project_small_category: categoryMemo,
              project_group: categoryMemo,
              confirmed_amount: `확정 금액: ${formatWon(confirmedAmount)}`,
              received_amount: `수령 금액: ${formatWon(receivedAmount)}`,
              operator_label: `실무 담당자: ${operatorLabel}`
            }
          }
        );
        data = result.data;
        error = result.error;
      }
      if (error && isProjectCategoryRequiredError(error)) {
        throw new Error("배포 DB의 business_projects.category enum 값이 현재 앱과 맞지 않습니다. Supabase schema.sql을 한 번 적용해야 합니다.");
      }
      if (error) throw toFriendlyDbError(error, "프로젝트 등록에 실패했습니다.");
      if (!data) throw new Error("프로젝트 저장 결과를 받지 못했습니다.");

      try {
        await createReviewItem({
          area: "사업·매출",
          title: `${data.name} 프로젝트 등록`,
          reason: "신규 프로젝트 검토",
          amount_or_impact: formatWon(confirmedAmount),
          owner_label: ownerLabel || currentPerson?.name || "담당자",
          status: "검토 전",
          target_table: "business_projects",
          target_id: data.id,
          checklist: "확정금액·거래처 구분·책임자·입금예정일이 맞는지 확인하세요."
        });
      } catch (reviewError) {
        console.warn("project review item creation skipped", reviewError);
      }

      showToast("프로젝트를 등록했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      console.error("project create failed", error);
      showToast(error instanceof Error ? error.message : "프로젝트 등록 실패", "err");
      throw error;
    }
  }

  async function updateProject(formData: FormData) {
    const projectId = String(formData.get("project_id") || "");
    if (!projectId) throw new Error("수정할 프로젝트를 찾지 못했습니다.");
    try {
      const major = String(formData.get("project_major_category") || "");
      const middle = String(formData.get("project_middle_category") || "");
      const small = String(formData.get("project_small_category") || "");
      const groups = [major, middle, small].filter(Boolean);
      const legacyCategory = toLegacyBusinessCategory(major);
      const monthlyPaymentMemo = String(formData.get("payment_due_cycle") || "") === "monthly" ? "입금 예정: 매월 반복" : "";
      const plainMemo = String(formData.get("memo") || "");
      const categoryMemo = groups.length ? `프로젝트 분류: ${groups.join(" > ")}` : "";
      const confirmedAmount = parseNumber(formData.get("confirmed_amount"));
      const receivedAmount = parseNumber(formData.get("received_amount"));
      const clientName = String(formData.get("client_name") || "") || "";
      const clientType = String(formData.get("client_type") || "") || "";
      const status = String(formData.get("status") || "접수") as ProjectStatus;
      const receiptStatus = String(formData.get("receipt_status") || "미청구") || "";
      const ownerLabel = String(formData.get("owner_label") || "") || "";
      const operatorLabel = String(formData.get("operator_label") || "") || "";
      const contact = String(formData.get("contact") || "") || "";
      const inflowRoute = String(formData.get("inflow_route") || "") || "";
      const paymentDueDate = String(formData.get("payment_due_date") || "") || "";
      const dueDate = String(formData.get("due_date") || "") || "";
      const taxInvoiceDate = String(formData.get("tax_invoice_date") || "") || "";
      const revenueRecognitionDate = String(formData.get("revenue_recognition_date") || "") || "";
      const receivedDate = String(formData.get("received_date") || "") || "";
      const revenueTaxMode = String(formData.get("revenue_tax_mode") || "부가세 포함");
      const repeatClient = formData.get("repeat_client") === "on";
      const projectMemo = buildProjectMemoLines({
        categoryMemo,
        clientName,
        clientType,
        status,
        confirmedAmount,
        receivedAmount,
        manualCost: 0,
        ownerLabel,
        operatorLabel,
        contact,
        inflowRoute,
        receiptStatus,
        paymentDueDate,
        dueDate,
        taxInvoiceDate,
        revenueRecognitionDate,
        receivedDate,
        revenueTaxMode,
        repeatClient,
        monthlyPaymentMemo,
        plainMemo
      });
      const payload = {
        name: String(formData.get("name") || ""),
        category: legacyCategory,
        client_type: (clientType || null) as ClientType | null,
        project_major_category: major || null,
        project_middle_category: middle || null,
        project_small_category: small || null,
        project_group: groups.length ? groups : null,
        client_name: clientName || null,
        status,
        confirmed_amount: confirmedAmount,
        received_amount: receivedAmount,
        receipt_status: (receiptStatus || null) as ReceiptStatus | null,
        owner_label: ownerLabel || null,
        operator_label: operatorLabel || null,
        contact: contact || null,
        inflow_route: inflowRoute || null,
        payment_due_date: paymentDueDate || null,
        due_date: dueDate || null,
        tax_invoice_date: taxInvoiceDate || null,
        revenue_recognition_date: revenueRecognitionDate || null,
        received_date: receivedDate || null,
        revenue_tax_mode: revenueTaxMode || null,
        repeat_client: repeatClient,
        memo: projectMemo
      };

      let error: DbError = null;
      const existingLegacyCategories = (projects as Array<BusinessProject & { category?: string | null }>)
        .map((project) => String(project.category || "").trim())
        .filter(Boolean);
      const categoryCandidates = Array.from(new Set([legacyCategory, ...existingLegacyCategories, ...legacyBusinessCategories]));
      for (const candidate of categoryCandidates) {
        const result = await updateWithHealing(
          "business_projects",
          { ...payload, category: candidate },
          "id",
          projectId
        );
        error = result.error;
        if (!error) break;
        if (!isInvalidBusinessCategoryError(error)) break;
      }
      if (error && isInvalidBusinessCategoryError(error)) {
        const result = await updateWithHealing("business_projects", { ...payload, category: undefined }, "id", projectId);
        error = result.error;
      }
      if (error && isProjectCategoryRequiredError(error)) {
        throw new Error("배포 DB의 business_projects.category enum 값이 현재 앱과 맞지 않습니다. Supabase schema.sql을 한 번 적용해야 합니다.");
      }
      if (error) throw toFriendlyDbError(error, "프로젝트 수정에 실패했습니다.");
      showToast("프로젝트를 수정했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      console.error("project update failed", error);
      showToast(error instanceof Error ? error.message : "프로젝트 수정 실패", "err");
      throw error;
    }
  }

  async function saveProjectMarginDraft(projectId: string, draft: MarginDraft) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error("마진 계산을 저장할 프로젝트를 찾지 못했습니다.");
    const nextMemo = setProjectMarginDraft(project.memo, draft);
    setProjects((prev) => prev.map((item) => item.id === projectId ? { ...item, memo: nextMemo } : item));
    const { error } = await updateWithHealing("business_projects", { memo: nextMemo }, "id", projectId);
    if (error) throw toFriendlyDbError(error, "프로젝트별 마진 계산을 저장하지 못했습니다.");
  }

  async function completeProject(project: BusinessProject) {
    try {
      const { error } = await updateWithHealing("business_projects", { status: "납품 완료" }, "id", project.id);
      if (error) throw toFriendlyDbError(error, "프로젝트 완료 처리에 실패했습니다.");
      showToast("프로젝트를 납품 완료 처리했습니다.");
      setSelectedProject(null);
      setModal(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "프로젝트 완료 처리 실패", "err");
    }
  }

  async function createExpense(formData: FormData) {
    try {
      const file = formData.get("receipt") as File | null;
      let fileUrl: string | null = null;
      let storagePath: string | null = null;
      let ocrResult: Record<string, unknown> | null = null;

      if (file && file.size > 0) {
        storagePath = `${currentPerson?.id || "unknown"}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(storagePath, file, { upsert: true });
        if (uploadError) {
          console.warn("receipt upload skipped", uploadError);
          showToast("영수증 파일 저장은 실패했지만 지출결의는 저장합니다. Storage 설정을 확인하세요.", "warn");
          storagePath = null;
        } else {
          const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
          fileUrl = signed?.signedUrl || null;
        }

        if (storagePath) try {
          const { data: ocrData, error: ocrError } = await supabase.functions.invoke("receipt-ocr", {
            body: { storagePath }
          });
          if (ocrError) {
            showToast(`OCR 실행 실패: ${ocrError.message}`, "warn");
          }
          if (!ocrError && ocrData) {
            ocrResult = ocrData as Record<string, unknown>;
            if (ocrResult.error || ocrResult.raw_text === "OPENAI_API_KEY is not configured.") {
              showToast("영수증은 첨부됐지만 자동 인식(OCR)은 설정이 필요합니다.", "warn");
              ocrResult = null;
            }
          }
        } catch (ocrErr) {
          console.warn("OCR skip", ocrErr);
        }
      }

      const purpose = String(formData.get("purpose") || ocrResult?.purpose || "영수증 지출");
      const memo = stripExpenseSystemMemo(String(formData.get("memo") || ""));
      const requestedUsage = String(formData.get("usage") || "운영비") as ExpenseUsage;
      const subcategory = String(formData.get("usage_subcategory") || "");
      const usage = getUsageFromExpenseSubcategory(subcategory, requestedUsage);
      const projectId = String(formData.get("project_id") || "");
      const amount = parseNumber(formData.get("amount")) || Number(ocrResult?.total_amount || 0);
      const costBehavior = String(formData.get("cost_behavior") || inferExpenseCostBehavior(usage, projectId)) as "고정비" | "변동비";
      const taxMode = String(formData.get("tax_mode") || "부가세 포함");
      const paidAt = String(formData.get("paid_at") || formData.get("used_at") || today());
      const { supplyAmount, vatAmount } = calculateExpenseTax(amount, taxMode);
      const quickRecurring = looksLikeRecurringText(purpose, memo, String(formData.get("transfer_summary") || ""));
      const memoLines = [
        `지출 대분류: ${usage}`,
        subcategory ? `지출 소분류: ${subcategory}` : "",
        quickRecurring ? `정기지출 대분류: ${usage}` : "",
        quickRecurring ? "반복주기: 매월" : "",
        `비용 성격: ${costBehavior}`,
        `부가세 처리: ${taxMode}`,
        `공급가액: ${formatWon(supplyAmount)}`,
        `부가세: ${formatWon(vatAmount)}`,
        `실제 지급일: ${paidAt}`,
        memo
      ].filter(Boolean).join("\n");
      const payload = {
        used_at: String(formData.get("used_at") || today()),
        purpose,
        usage,
        usage_subcategory: subcategory || null,
        category: toLegacyExpenseCategory(usage),
        payment_method: String(formData.get("payment_method") || "카드") as PaymentMethod,
        card_id: String(formData.get("card_id") || "") || null,
        amount,
        cost_behavior: costBehavior,
        tax_mode: taxMode,
        supply_amount: supplyAmount,
        vat_amount: vatAmount,
        paid_at: paidAt || null,
        evidence_status: quickRecurring ? "정기결제" : fileUrl ? "영수증 첨부" : "증빙 필요",
        transfer_status: String(formData.get("transfer_status") || "해당 없음") as TransferStatus,
        transfer_summary: String(formData.get("transfer_summary") || "") || null,
        project_id: projectId || null,
        requested_by: currentPerson?.id || null,
        review_status: "검토 전" as ReviewStatus,
        review_reason: quickRecurring ? "정기 구독/반복 지출 확인" : "대표 검토 필요",
        receipt_file_url: fileUrl,
        receipt_storage_path: storagePath,
        ocr_vendor_name: String(ocrResult?.vendor_name || "") || null,
        ocr_total_amount: Number(ocrResult?.total_amount || 0) || null,
        ocr_transaction_date: String(ocrResult?.transaction_date || "") || null,
        is_recurring: quickRecurring,
        recurring_cycle: quickRecurring ? "매월" : null,
        memo: memoLines
      };

      const { data, error } = await saveWithHealing<{ id: string; purpose: string; amount: number; review_reason: string | null }>("expense_requests", payload, {
        preserveToMemo: {
          cost_behavior: `비용 성격: ${costBehavior}`,
          tax_mode: `부가세 처리: ${taxMode}`,
          supply_amount: `공급가액: ${formatWon(supplyAmount)}`,
          vat_amount: `부가세: ${formatWon(vatAmount)}`,
          paid_at: `실제 지급일: ${paidAt}`
        }
      });
      if (error) throw toFriendlyDbError(error, "지출결의 등록에 실패했습니다.");
      if (!data) throw new Error("지출결의 저장 결과를 받지 못했습니다.");

      await createReviewItem({
        area: "지출결의",
        title: data.purpose,
        reason: data.review_reason || "지출결의 확인",
        amount_or_impact: formatWon(data.amount),
        owner_label: currentPerson?.name || "담당자",
        status: "검토 전",
        target_table: "expense_requests",
        target_id: data.id,
        checklist: "증빙 첨부 여부, 사용 용도 분류, 결제수단(법인/개인), 이체 여부를 확인하세요."
      });

      showToast(fileUrl && ocrResult ? "지출결의 등록 + 영수증 자동 인식 완료" : "지출결의를 등록했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "지출결의 등록 실패", "err");
      throw error;
    }
  }

  // 12번: 반복 지출 - 구독료/정기결제 전용
  async function createRecurring(formData: FormData) {
    try {
      const usage = String(formData.get("usage") || "운영비") as ExpenseUsage;
      const subcategory = expenseSubcategoryTree[usage]?.[0] || "";
      const memo = String(formData.get("memo") || "");
      const paymentMethod = String(formData.get("payment_method") || "카드") as PaymentMethod;
      const cardId = String(formData.get("card_id") || "") || null;
      const cardLabel = cards.find((card) => card.id === cardId)?.label || "";
      const recurringCycle = String(formData.get("recurring_cycle") || "매월");
      const currency = String(formData.get("currency") || "KRW");
      const foreignAmount = Number(String(formData.get("foreign_amount") || "").replace(/[^0-9.]/g, "")) || 0;
      const exchangeRate = parseNumber(formData.get("exchange_rate"));
      const amount = currency === "KRW" ? parseNumber(formData.get("amount")) : Math.round(foreignAmount * exchangeRate);
      const fxMemo = currency === "KRW" ? "" : `외화 계산: ${currency} ${foreignAmount.toLocaleString("ko-KR")} × ${exchangeRate.toLocaleString("ko-KR")} = ${formatWon(amount)}`;
      const taxMode = String(formData.get("tax_mode") || "부가세 포함");
      const { supplyAmount, vatAmount } = calculateExpenseTax(amount, taxMode);
      const payload = {
        used_at: String(formData.get("used_at") || today()),
        purpose: String(formData.get("purpose") || "정기 구독"),
        usage,
        usage_subcategory: subcategory || null,
        category: toLegacyExpenseCategory(usage),
        payment_method: paymentMethod,
        card_id: cardId,
        amount,
        cost_behavior: "고정비" as const,
        tax_mode: taxMode,
        supply_amount: supplyAmount,
        vat_amount: vatAmount,
        paid_at: String(formData.get("used_at") || today()),
        evidence_status: "정기결제",
        transfer_status: "결제 완료" as TransferStatus,
        transfer_summary: null,
        project_id: null,
        requested_by: currentPerson?.id || null,
        review_status: "검토 전" as ReviewStatus,
        review_reason: "정기 구독/반복 지출 확인",
        is_recurring: true,
        recurring_cycle: recurringCycle,
        memo: [
          `지출 대분류: ${usage}`,
          subcategory ? `지출 소분류: ${subcategory}` : "",
          `정기지출 대분류: ${usage}`,
          `결제방식: ${paymentMethod}`,
          cardLabel ? `결제카드: ${cardLabel}` : "",
          `반복주기: ${recurringCycle}`,
          "비용 성격: 고정비",
          `부가세 처리: ${taxMode}`,
          `공급가액: ${formatWon(supplyAmount)}`,
          `부가세: ${formatWon(vatAmount)}`,
          `실제 지급일: ${String(formData.get("used_at") || today())}`,
          fxMemo,
          memo
        ].filter(Boolean).join("\n")
      };

      const { data, error } = await saveWithHealing<{ id: string; purpose: string; amount: number }>("expense_requests", payload, {
        preserveToMemo: {
          card_id: cardLabel ? `결제카드: ${cardLabel}` : "",
          payment_method: `결제방식: ${paymentMethod}`,
          usage: `정기지출 대분류: ${usage}`,
          recurring_cycle: `반복주기: ${recurringCycle}`,
          cost_behavior: "비용 성격: 고정비",
          tax_mode: `부가세 처리: ${taxMode}`,
          supply_amount: `공급가액: ${formatWon(supplyAmount)}`,
          vat_amount: `부가세: ${formatWon(vatAmount)}`,
          paid_at: `실제 지급일: ${String(formData.get("used_at") || today())}`
        }
      });
      if (error) throw toFriendlyDbError(error, "반복 지출 등록에 실패했습니다.");
      if (!data) throw new Error("반복 지출 저장 결과를 받지 못했습니다.");

      await createReviewItem({
        area: "지출결의",
        title: `[정기] ${data.purpose}`,
        reason: `${payload.recurring_cycle} 반복 결제`,
        amount_or_impact: formatWon(data.amount),
        owner_label: currentPerson?.name || "담당자",
        status: "검토 전",
        target_table: "expense_requests",
        target_id: data.id,
        checklist: `${payload.recurring_cycle} 반복 결제 항목입니다. 결제수단·금액·해지 필요 여부를 확인하세요.`
      });

      showToast("반복 지출(구독)을 등록했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "반복 지출 등록 실패", "err");
      throw error;
    }
  }

  async function createPerson(formData: FormData) {
    try {
      const personId = String(formData.get("person_id") || "") || null;
      const rawEmployeeNumber = String(formData.get("employee_number") || "");
      const employeeNumber = rawEmployeeNumber ? normalizeEmployeeNumber(rawEmployeeNumber) : null;
      if (rawEmployeeNumber && employeeNumber !== rawEmployeeNumber.replace(/\s/g, "")) throw new Error("사번은 숫자만 입력하세요.");
      const phone = String(formData.get("phone") || "") || null;
      const emailInput = String(formData.get("email") || "").trim() || null;
      const email = emailInput || (employeeNumber ? makeInternalEmail(employeeNumber) : null);
      const newPassword = String(formData.get("new_password") || "");
      const isEditingSelf = Boolean(personId && currentPerson?.id === personId);

      if (!personId && !employeeNumber) throw new Error("직원 등록 시 사번은 필수입니다.");
      if (!personId && !phone) throw new Error("초기 비밀번호 생성을 위해 휴대전화 번호가 필요합니다.");
      if (!email) throw new Error("이메일 또는 사번이 필요합니다.");

      const payload = {
        name: String(formData.get("name") || ""),
        employee_number: employeeNumber,
        email,
        phone,
        rank: String(formData.get("rank") || "매니저") as Rank,
        department_id: String(formData.get("department_id") || "") || null,
        hire_date: String(formData.get("hire_date") || "") || null,
        annual_salary: parseNumber(formData.get("annual_salary")),
        previous_annual_salary: parseNumber(formData.get("previous_annual_salary")),
        weekly_work_days: parseNumber(formData.get("weekly_work_days")) || 5,
        daily_work_hours: parseNumber(formData.get("daily_work_hours")) || 8,
        monthly_capacity_hours: parseNumber(formData.get("monthly_capacity_hours")) || calcMonthlyCapacity(parseNumber(formData.get("weekly_work_days")) || 5, parseNumber(formData.get("daily_work_hours")) || 8),
        memo: String(formData.get("memo") || ""),
        is_active: true
      };

      const result = personId
        ? await supabase.from("people").update(payload).eq("id", personId).select().single()
        : await saveWithHealing<Person>("people", payload);

      if (result.error) throw toFriendlyDbError(result.error, "직원 정보를 저장하지 못했습니다.");
      if (!result.data) throw new Error("직원 저장 결과를 받지 못했습니다.");

      const saved = result.data as Person;

      if (!personId) {
        const initialPassword = makeInitialPassword(phone);
        if (!initialPassword) throw new Error("휴대전화 뒷번호 4자리를 확인할 수 없습니다.");
        const { error: inviteError } = await supabase.functions.invoke("admin-create-user", {
          body: {
            personId: saved.id,
            email,
            password: initialPassword,
            name: payload.name,
            employeeNumber
          }
        });
        if (inviteError) {
          showToast("직원 정보는 저장됐지만 Auth 계정 생성은 Edge Function 배포 후 다시 진행해야 합니다.", "warn");
        } else {
          showToast(`직원 등록 완료. 초기 비밀번호는 lupl+휴대전화 뒷번호 4자리입니다.`, "ok");
        }
      } else {
        showToast("직원 정보를 저장했습니다.");
      }

      if (isEditingSelf && newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
        await supabase.from("people").update({ password_changed_at: new Date().toISOString() }).eq("id", personId);
        showToast("내 정보와 비밀번호를 변경했습니다.");
      }

      setModal(null);
      await loadAll();

      if (isEditingSelf) {
        const { data: refreshed } = await supabase.from("people").select("*").eq("id", personId).maybeSingle();
        if (refreshed) setCurrentPerson(refreshed as Person);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "직원 저장 실패", "err");
      throw error;
    }
  }

  async function saveAiProjectDraft(draft: AiFinanceDraft) {
    const projectName = draft.projectName?.trim() || `${draft.clientName || "기관"} AI 입력 프로젝트`;
    const institutionPaid = Number(draft.grossInstitutionPaid || 0);
    const plannedPay = Number(draft.instructorPlannedPayTotal || 0);
    const collectionTotal = Number(draft.companyCollectionTotal || Math.max(0, institutionPaid - plannedPay));
    const companyRevenue = Number(draft.companyRevenue || collectionTotal || 0);
    const receivedAmount = Number(draft.companyCollectionReceivedTotal || 0);
    const validClientType = clientTypes.includes(draft.clientType as ClientType) ? draft.clientType as ClientType : "공공기관";
    const instructorLines = (draft.instructors || []).map((item, index) => {
      const label = item.name || `강사 ${index + 1}`;
      return [
        label,
        item.hours != null ? `${item.hours}시간` : "",
        item.mainSessions != null ? `메인 ${item.mainSessions}회` : "",
        item.assistantSessions != null ? `보조 ${item.assistantSessions}회` : "",
        item.institutionPaid != null ? `기관입금 ${formatWon(item.institutionPaid)}` : "",
        item.plannedPay != null ? `실지급 ${formatWon(item.plannedPay)}` : "",
        item.companyCollection != null ? `회사회수 ${formatWon(item.companyCollection)}` : ""
      ].filter(Boolean).join(" · ");
    });

    const formData = new FormData();
    formData.set("name", projectName);
    formData.set("client_name", draft.clientName || "");
    formData.set("client_type", validClientType);
    formData.set("status", "정산 대기");
    formData.set("project_major_category", "교육");
    formData.set("project_middle_category", "접근성 교육");
    formData.set("project_small_category", "발달장애");
    formData.set("confirmed_amount", formatMoneyInputValue(String(companyRevenue)));
    formData.set("received_amount", formatMoneyInputValue(String(receivedAmount)));
    formData.set("receipt_status", receivedAmount > 0 && receivedAmount >= companyRevenue ? "수령 완료" : receivedAmount > 0 ? "일부 수령" : "미청구");
    formData.set("owner_label", currentPerson?.name || "");
    formData.set("operator_label", currentPerson?.name || "");
    formData.set("revenue_tax_mode", "부가세 포함");
    formData.set("memo", [
      "AI 입력 도우미로 생성한 프로젝트 초안",
      draft.paymentFlow === "instructor" ? "기관 지급 흐름: 기관이 강사에게 직접 입금" : "기관 지급 흐름: 회사로 직접 입금",
      `기관이 강사에게 입금한 총액: ${formatWon(institutionPaid)}`,
      `강사 실제 지급 예정 합계: ${formatWon(plannedPay)}`,
      `회사 회수 예정액: ${formatWon(collectionTotal)}`,
      `회사 매출 반영액: ${formatWon(companyRevenue)}`,
      receivedAmount ? `이미 회수한 금액: ${formatWon(receivedAmount)}` : "",
      instructorLines.length ? "강사별 정산:" : "",
      ...instructorLines,
      draft.memo || ""
    ].filter(Boolean).join("\n"));

    await createProject(formData);
    setSection("revenue");
  }

  async function saveAiEmployeeDraft(candidate: AiEmploymentDraft) {
    if (!candidate.name) throw new Error("직원 이름이 필요합니다.");
    if (!candidate.employeeNumber || !candidate.phone) throw new Error("직원 등록에는 사번과 휴대전화 번호가 필요합니다.");
    const monthlySalary = Number(candidate.monthlySalary || 0);
    const annualSalary = Number(candidate.annualSalary || monthlySalary * 12 || 0);
    const formData = new FormData();
    formData.set("name", candidate.name);
    formData.set("employee_number", candidate.employeeNumber);
    formData.set("phone", candidate.phone);
    formData.set("rank", "매니저");
    formData.set("annual_salary", formatMoneyInputValue(String(annualSalary)));
    formData.set("previous_annual_salary", "0");
    formData.set("weekly_work_days", String(candidate.weeklyWorkDays || 5));
    formData.set("daily_work_hours", String(candidate.dailyWorkHours || 8));
    formData.set("monthly_capacity_hours", String(calcMonthlyCapacity(candidate.weeklyWorkDays || 5, candidate.dailyWorkHours || 8)));
    formData.set("memo", [
      "AI 입력 도우미로 생성한 고용 후보",
      candidate.role ? `역할: ${candidate.role}` : "",
      `월 인건비 예상: ${formatWon(monthlySalary || Math.round(annualSalary / 12))}`,
      `연봉 예상: ${formatWon(annualSalary)}`
    ].filter(Boolean).join("\n"));
    await createPerson(formData);
    setSection("compensation");
  }

  async function updateExpense(formData: FormData) {
    try {
      const expenseId = String(formData.get("expense_id") || "");
      if (!expenseId) throw new Error("수정할 지출결의를 찾지 못했습니다.");
      const nextIsRecurring = formData.get("is_recurring") === "on";
      const nextRecurringCycle = String(formData.get("recurring_cycle") || (nextIsRecurring ? "매월" : ""));
      const requestedUsage = String(formData.get("usage") || "운영비") as ExpenseUsage;
      const subcategory = String(formData.get("usage_subcategory") || "");
      const usage = getUsageFromExpenseSubcategory(subcategory, requestedUsage);
      const plainMemo = stripExpenseSystemMemo(String(formData.get("memo") || ""));
      const projectId = String(formData.get("project_id") || "");
      const amount = parseNumber(formData.get("amount"));
      const costBehavior = String(formData.get("cost_behavior") || inferExpenseCostBehavior(usage, projectId)) as "고정비" | "변동비";
      const taxMode = String(formData.get("tax_mode") || "부가세 포함");
      const paidAt = String(formData.get("paid_at") || formData.get("used_at") || today());
      const { supplyAmount, vatAmount } = calculateExpenseTax(amount, taxMode);
      const payload = {
        used_at: String(formData.get("used_at") || today()),
        purpose: String(formData.get("purpose") || "지출"),
        usage,
        usage_subcategory: subcategory || null,
        category: toLegacyExpenseCategory(usage),
        payment_method: String(formData.get("payment_method") || "카드") as PaymentMethod,
        card_id: String(formData.get("card_id") || "") || null,
        amount,
        cost_behavior: costBehavior,
        tax_mode: taxMode,
        supply_amount: supplyAmount,
        vat_amount: vatAmount,
        paid_at: paidAt || null,
        evidence_status: nextIsRecurring ? "정기결제" : String(formData.get("evidence_status") || "증빙 필요"),
        transfer_status: String(formData.get("transfer_status") || "해당 없음") as TransferStatus,
        transfer_summary: String(formData.get("transfer_summary") || "") || null,
        project_id: projectId || null,
        recurring_cycle: nextRecurringCycle || null,
        is_recurring: nextIsRecurring,
        review_reason: nextIsRecurring ? "정기 구독/반복 지출 확인" : "대표 검토 필요",
        memo: [
          `지출 대분류: ${usage}`,
          subcategory ? `지출 소분류: ${subcategory}` : "",
          nextIsRecurring ? `정기지출 대분류: ${usage}` : "",
          nextIsRecurring ? `반복주기: ${nextRecurringCycle || "매월"}` : "",
          `비용 성격: ${costBehavior}`,
          `부가세 처리: ${taxMode}`,
          `공급가액: ${formatWon(supplyAmount)}`,
          `부가세: ${formatWon(vatAmount)}`,
          `실제 지급일: ${paidAt}`,
          plainMemo
        ].filter(Boolean).join("\n")
      };
      const { error } = await updateWithHealing("expense_requests", payload, "id", expenseId);
      if (error) throw toFriendlyDbError(error, "지출결의를 수정하지 못했습니다.");
      await supabase
        .from("review_items")
        .update({
          title: nextIsRecurring ? `[정기] ${payload.purpose}` : payload.purpose,
          amount_or_impact: formatWon(payload.amount),
          checklist: nextIsRecurring
            ? `${nextRecurringCycle || "반복"} 결제 항목입니다. 결제수단·금액·해지 필요 여부를 확인하세요.`
            : "증빙 첨부 여부, 사용 용도 분류, 결제수단(법인/개인), 이체 여부를 확인하세요."
        })
        .eq("target_table", "expense_requests")
        .eq("target_id", expenseId);
      showToast("지출결의를 수정했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "지출결의 수정 실패", "err");
      throw error;
    }
  }

  // 21번: 상여금 - 순수익 자동계산, 지급률 선택, 상여금 자동계산
  async function createBonus(formData: FormData) {
    try {
      const projectId = String(formData.get("project_id") || "") || null;
      const project = projectsComputed.find((p) => p.id === projectId);
      const profitAmount = project ? Math.round(project._profit) : parseNumber(formData.get("profit_amount"));
      const bonusRate = Number(String(formData.get("bonus_rate") || "0").replace("%", "")) / 100;
      const bonusAmount = Math.round(profitAmount * bonusRate);

      const payload = {
        person_id: String(formData.get("person_id") || "") || null,
        project_id: projectId,
        period_label: String(formData.get("period_label") || ""),
        profit_amount: profitAmount,
        bonus_rate: bonusRate,
        bonus_amount: bonusAmount,
        payment_status: "검토 전" as ReviewStatus,
        planned_payment_date: String(formData.get("planned_payment_date") || "") || null,
        memo: String(formData.get("memo") || "")
      };

      const { data, error } = await saveWithHealing<{ id: string; bonus_amount: number | null }>("bonus_payments", payload);
      if (error) throw toFriendlyDbError(error, "상여금 등록에 실패했습니다.");
      if (!data) throw new Error("상여금 저장 결과를 받지 못했습니다.");

      await createReviewItem({
        area: "인건비",
        title: "상여금 지급 검토",
        reason: "상여금 지급 조건 확인",
        amount_or_impact: formatWon(data.bonus_amount ?? bonusAmount),
        owner_label: currentPerson?.name || "대표",
        status: "검토 전",
        target_table: "bonus_payments",
        target_id: data.id,
        checklist: "프로젝트 순수익, 지급률, 지급 대상자가 맞는지 확인하세요."
      });

      showToast("상여금 항목을 등록했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "상여금 저장 실패", "err");
      throw error;
    }
  }

  async function createLabor(formData: FormData) {
    try {
      const payload = {
        project_id: String(formData.get("project_id") || ""),
        person_id: String(formData.get("person_id") || "") || null,
        rank: String(formData.get("rank") || "매니저") as Rank,
        allocation_rate: Number(String(formData.get("allocation_rate") || "0").replace("%", "")) / 100,
        man_months: Number(String(formData.get("man_months") || "0")) || 0,
        hours: parseNumber(formData.get("hours"))
      };

      const { error } = await saveWithHealing("project_labor_allocations", payload);
      if (error) throw toFriendlyDbError(error, "맨먼스 저장에 실패했습니다.");

      showToast("맨먼스 투입 정보를 저장했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "맨먼스 저장 실패", "err");
      throw error;
    }
  }

  async function createPermission(formData: FormData) {
    try {
      const payload = {
        person_id: String(formData.get("person_id") || ""),
        page_key: String(formData.get("page_key") || "overview"),
        permission: String(formData.get("permission") || "보기만 가능")
      };
      const { error } = await saveWithHealing("page_permissions", payload, { upsert: { onConflict: "person_id,page_key" } });
      if (error) throw toFriendlyDbError(error, "권한 저장에 실패했습니다.");
      showToast("권한을 저장했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "권한 저장 실패", "err");
      throw error;
    }
  }

  async function deletePermission(permission: PagePermission) {
    if (!window.confirm("이 페이지 권한을 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("page_permissions").delete().eq("id", permission.id);
      if (error) throw toFriendlyDbError(error, "권한 삭제에 실패했습니다.");
      setPermissions((prev) => prev.filter((item) => item.id !== permission.id));
      showToast("권한을 삭제했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "권한 삭제 실패", "err");
      throw error;
    }
  }


  // 3번: 현금 스냅샷 직접 입력
  async function createCash(formData: FormData) {
    try {
      const monthInput = String(formData.get("snapshot_month") || today().slice(0, 7));
      const autoRevenue = projectsComputed.reduce((sum, project) => sum + Number(project.received_amount || 0), 0) || projectsComputed.reduce((sum, project) => sum + Number(project.confirmed_amount || 0), 0);
      const autoProjectCost = projectsComputed.reduce((sum, project) => sum + Number(project._cost || 0), 0);
      const autoExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const autoPayroll = people.filter((person) => person.is_active).reduce((sum, person) => sum + Number(person.annual_salary || 0) / 12, 0);
      const expense = autoExpense + autoPayroll || autoProjectCost;
      const revenue = autoRevenue;
      const receivable = projectsComputed.reduce((sum, project) => sum + Number(project._receivable || 0), 0);
      const payable = expenses.filter((expense) => expense.review_status !== "승인").reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const accountBalances = formData.getAll("account_balance").map((value) => parseNumber(value));
      const accountBanks = formData.getAll("account_bank").map(String);
      const accountLabels = formData.getAll("account_label").map(String);
      const accountDetails = accountBalances
        .map((balance, index) => ({
          bank: accountBanks[index]?.trim() || "",
          label: accountLabels[index]?.trim() || "",
          balance
        }))
        .filter((item) => item.bank || item.label || item.balance > 0);
      const accountTotal = accountBalances.reduce((sum, value) => sum + value, 0);
      const currentCash = accountTotal || parseNumber(formData.get("current_cash"));
      const netBurn = Math.max(0, expense - revenue);
      const transferNames = formData.getAll("auto_transfer_purpose").map(String);
      const transferAmounts = formData.getAll("auto_transfer_amount");
      const transferDates = formData.getAll("auto_transfer_date").map(String);
      const transferMemos = formData.getAll("auto_transfer_memo").map(String);
      const transferDetails = transferNames
        .map((purpose, index) => ({
          purpose: purpose.trim(),
          amount: parseNumber(transferAmounts[index]),
          date: transferDates[index] || today(),
          memo: transferMemos[index] || ""
        }))
        .filter((item) => item.purpose || item.amount > 0);
      const payload = {
        snapshot_month: `${monthInput}-01`,
        current_cash: currentCash,
        revenue,
        expense,
        net_burn: netBurn,
        receivable_amount: receivable,
        payable_amount: payable,
        payroll_included_expense: expense,
        runway_months: netBurn > 0 ? Math.round((currentCash / netBurn) * 10) / 10 : 0,
        account_details: accountDetails,
        transfer_details: transferDetails
      };

      const { error } = await saveWithHealing("cash_snapshots", payload, { upsert: { onConflict: "snapshot_month" } });
      if (error) throw toFriendlyDbError(error, "현금 현황 저장에 실패했습니다.");
      writeCashAccountBackup(monthInput, accountDetails);
      const transfers = transferNames
        .map((purpose, index) => ({
          used_at: transferDates[index] || today(),
          purpose: purpose.trim(),
          usage: "운영비" as ExpenseUsage,
          category: toLegacyExpenseCategory("운영비"),
          payment_method: "계좌이체" as PaymentMethod,
          card_id: null,
          amount: parseNumber(transferAmounts[index]),
          evidence_status: "자동이체 처리",
          transfer_status: "결제 완료" as TransferStatus,
          transfer_summary: transferMemos[index] || null,
          project_id: null,
          requested_by: currentPerson?.id || null,
          review_status: "검토 전" as ReviewStatus,
          review_reason: "계좌별 현금 입력에서 등록한 자동이체",
          receipt_file_url: null,
          receipt_storage_path: null,
          ocr_vendor_name: null,
          ocr_total_amount: null,
          ocr_transaction_date: null,
          is_recurring: false,
          memo: "현금 현황 입력에서 자동이체로 등록"
        }))
        .filter((item) => item.purpose && item.amount > 0);

      if (transfers.length > 0) {
        const inserted: ExpenseRequest[] = [];
        let transferError: DbError = null;
        for (const transfer of transfers) {
          const result = await saveWithHealing<ExpenseRequest>("expense_requests", transfer);
          if (result.error) {
            transferError = result.error;
            break;
          }
          if (result.data) inserted.push(result.data);
        }
        if (transferError) {
          console.warn("auto transfer insert failed", transferError);
          showToast("현금 현황은 저장됐지만 자동이체 항목 등록은 실패했습니다. 자동이체는 다시 시도해 주세요.", "warn");
        } else {
          await Promise.all(inserted.map((expense) => createReviewItem({
            area: "지출결의",
            title: expense.purpose,
            reason: "자동이체 처리 확인",
            amount_or_impact: formatWon(expense.amount),
            owner_label: currentPerson?.name || "담당자",
            status: "검토 전",
            target_table: "expense_requests",
            target_id: expense.id,
            checklist: "자동이체 목적, 금액, 처리일을 확인해 주세요."
          })));
        }
      }
      showToast("현금 현황을 자동 계산 기준으로 저장했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "현금 현황 저장 실패", "err");
      throw error;
    }
  }

  // 19번: 카테고리 추가
  async function createCategory(formData: FormData) {
    try {
      const payload = {
        name: String(formData.get("name") || ""),
        description: String(formData.get("description") || "") || null,
        is_active: true,
        sort_order: categories.length + 1
      };
      if (!payload.name) throw new Error("카테고리명을 입력하세요.");
      const { error } = await saveWithHealing("expense_categories", payload);
      if (error) throw toFriendlyDbError(error, "카테고리 추가에 실패했습니다.");
      showToast("카테고리를 추가했습니다.");
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "카테고리 추가 실패", "err");
    }
  }

  async function deleteCategory(id: string) {
    try {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
      showToast("카테고리를 삭제했습니다.");
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "삭제 실패", "err");
    }
  }

  // 8번: 카드/소유자 등록
  async function createCard(formData: FormData) {
    try {
      const cardType = String(formData.get("card_type") || "법인") as "법인" | "개인";
      const owner = String(formData.get("owner_name") || "") || null;
      const labelInput = String(formData.get("label") || "").trim();
      const label = labelInput || (cardType === "법인" ? `법인카드-${cards.filter((c) => c.card_type === "법인").length + 1}` : `개인-${owner || "미지정"}`);
      const payload = {
        label,
        card_type: cardType,
        owner_name: owner,
        is_active: true,
        sort_order: cards.length + 1
      };
      const { error } = await saveWithHealing("payment_cards", payload);
      if (error) throw toFriendlyDbError(error, "결제수단 등록에 실패했습니다.");
      showToast("결제수단을 등록했습니다.");
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "결제수단 등록 실패", "err");
    }
  }

  async function deleteCard(id: string) {
    try {
      const { error } = await supabase.from("payment_cards").delete().eq("id", id);
      if (error) throw error;
      showToast("결제수단을 삭제했습니다.");
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "삭제 실패", "err");
    }
  }

  async function saveMobileDevice(formData: FormData) {
    const deviceId = String(formData.get("device_id") || "").trim();
    const personId = String(formData.get("person_id") || "").trim();
    const selected = people.find((person) => person.id === personId);
    const ownerName = String(formData.get("owner_name") || selected?.name || "").trim();

    if (!deviceId || !ownerName) {
      showToast("기기 ID와 담당자를 입력해 주세요.", "warn");
      return;
    }

    try {
      const payload = {
        device_id: deviceId,
        owner_name: ownerName,
        person_id: personId || null,
        memo: String(formData.get("memo") || "").trim() || null,
        is_active: formData.get("is_active") !== "off",
        updated_at: new Date().toISOString()
      };
      const { error } = await saveWithHealing("mobile_receipt_devices", payload, { upsert: { onConflict: "device_id" } });
      if (error) throw error;
      showToast("모바일 기기 담당자를 저장했습니다.");
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "모바일 기기 저장 실패", "err");
    }
  }

  async function deleteMobileDevice(deviceId: string) {
    if (!window.confirm("이 기기 담당자 연결을 삭제할까요? 기존 지출결의는 삭제되지 않습니다.")) return;
    try {
      const { error } = await supabase.from("mobile_receipt_devices").delete().eq("device_id", deviceId);
      if (error) throw error;
      showToast("모바일 기기 연결을 삭제했습니다.");
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "모바일 기기 삭제 실패", "err");
    }
  }

  async function deleteProject(project: BusinessProject) {
    if (!window.confirm(`"${project.name}" 프로젝트를 삭제할까요? 연결된 검토항목과 투입 정보도 함께 정리됩니다.`)) return;
    try {
      const cleanupResults = await Promise.all([
        supabase.from("review_items").delete().eq("target_table", "business_projects").eq("target_id", project.id),
        supabase.from("project_labor_allocations").delete().eq("project_id", project.id),
        supabase.from("bonus_payments").update({ project_id: null }).eq("project_id", project.id),
        supabase.from("expense_requests").update({ project_id: null }).eq("project_id", project.id)
      ]);
      const cleanupError = cleanupResults.find((result) => result.error)?.error;
      if (cleanupError) throw cleanupError;
      const { error } = await supabase.from("business_projects").delete().eq("id", project.id);
      if (error) throw error;
      showToast("프로젝트를 삭제했습니다.");
      setSelectedProject(null);
      setModal(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "프로젝트 삭제 실패", "err");
    }
  }

  async function deleteExpense(expense: ExpenseRequest) {
    if (!window.confirm(`"${expense.purpose}" 지출결의를 삭제할까요?`)) return;
    try {
      const { error: reviewError } = await supabase.from("review_items").delete().eq("target_table", "expense_requests").eq("target_id", expense.id);
      if (reviewError) throw reviewError;
      const { error } = await supabase.from("expense_requests").delete().eq("id", expense.id);
      if (error) throw error;
      showToast("지출결의를 삭제했습니다.");
      setSelectedExpense(null);
      setModal(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "지출결의 삭제 실패", "err");
    }
  }

  async function seedDemoData() {
    try {
      const stamp = Date.now().toString().slice(-6);
      const deptId = departments[0]?.id || null;

      const { data: demoPerson, error: personError } = await supabase
        .from("people")
        .upsert({
          name: "샘플 매니저",
          employee_number: "900001",
          email: "demo.manager@lupl.kr",
          phone: "010-9000-0001",
          department_id: deptId,
          rank: "매니저" as Rank,
          hire_date: "2026-01-02",
          weekly_work_days: 5,
          daily_work_hours: 8,
          monthly_capacity_hours: calcMonthlyCapacity(5, 8),
          annual_salary: 36000000,
          previous_annual_salary: 33000000,
          is_active: true,
          memo: "더미 데이터 검증용 직원"
        }, { onConflict: "employee_number" })
        .select()
        .single();
      if (personError) throw personError;

      const { data: card, error: cardError } = await supabase
        .from("payment_cards")
        .insert({
          label: `더미 법인카드 ${stamp}`,
          card_type: "법인",
          owner_name: null,
          is_active: true,
          sort_order: cards.length + 1
        })
        .select()
        .single();
      if (cardError) throw cardError;

      const { error: categoryError } = await supabase
        .from("expense_categories")
        .insert({
          name: `더미 검증 카테고리 ${stamp}`,
          description: "전체 데이터 입력 검증용 카테고리",
          is_active: true,
          sort_order: categories.length + 1
        });
      if (categoryError) throw categoryError;

      const { data: project, error: projectError } = await supabase
        .from("business_projects")
        .insert({
          name: `더미 프로젝트 ${stamp}`,
          category: "교육",
          client_type: "기업" as ClientType,
          project_group: ["교육"] as ProjectGroup[],
          project_major_category: "교육",
          project_middle_category: "AI 교육",
          project_small_category: "기관 워크숍",
          client_name: "더미 거래처",
          status: "진행 중" as ProjectStatus,
          confirmed_amount: 12000000,
          received_amount: 5000000,
          cost: 0,
          receipt_status: "일부 수령" as ReceiptStatus,
          owner_label: currentPerson?.name || demoPerson.name,
          operator_label: demoPerson.name,
          contact: "demo@client.kr / 010-1111-2222",
          inflow_route: "직접 문의",
          man_months: 1.5,
          request_date: today(),
          due_date: "2026-07-31",
          payment_due_date: "2026-08-15",
          tax_invoice_date: "2026-07-25",
          repeat_client: true,
          owner_id: currentPerson?.id || null,
          pm_id: demoPerson.id,
          memo: "샘플 프로젝트 생성 및 집계 검증"
        })
        .select()
        .single();
      if (projectError) throw projectError;

      const { data: expense, error: expenseError } = await supabase
        .from("expense_requests")
        .insert({
          used_at: today(),
          purpose: `더미 영수증 지출 ${stamp}`,
          usage: "운영비" as ExpenseUsage,
          payment_method: "카드" as PaymentMethod,
          card_id: card.id,
          amount: 88680,
          evidence_status: "증빙 필요",
          transfer_status: "결제 완료" as TransferStatus,
          transfer_summary: "더미 거래처 / 88680원 / 카드 결제",
          project_id: project.id,
          requested_by: currentPerson?.id || demoPerson.id,
          review_status: "검토 전" as ReviewStatus,
          review_reason: "더미 지출 검토",
          receipt_file_url: null,
          receipt_storage_path: null,
          ocr_vendor_name: "더미 OCR 거래처",
          ocr_total_amount: 88680,
          ocr_transaction_date: today(),
          is_recurring: false,
          recurring_cycle: null,
          memo: "OCR 필드 저장 검증용"
        })
        .select()
        .single();
      if (expenseError) throw expenseError;

      const demoResults = await Promise.all([
        supabase.from("review_items").insert({
          area: "사업·매출",
          title: `${project.name} 더미 검토`,
          reason: "더미 프로젝트 생성 검토",
          amount_or_impact: formatWon(project.confirmed_amount),
          owner_label: currentPerson?.name || demoPerson.name,
          status: "검토 전" as ReviewStatus,
          target_table: "business_projects",
          target_id: project.id,
          checklist: "거래처, 금액, 입금예정일, 책임자 입력값을 확인하세요."
        }),
        supabase.from("review_items").insert({
          area: "지출결의",
          title: expense.purpose,
          reason: "더미 지출 검토",
          amount_or_impact: formatWon(expense.amount),
          owner_label: currentPerson?.name || demoPerson.name,
          status: "검토 전" as ReviewStatus,
          target_table: "expense_requests",
          target_id: expense.id,
          checklist: "증빙, 사용 용도, 결제수단, 이체 여부를 확인하세요."
        }),
        supabase.from("compensation_reviews").insert({
          person_id: demoPerson.id,
          review_year: 2026,
          previous_annual_salary: 33000000,
          raise_rate: 0.09,
          confirmed_annual_salary: 36000000,
          grant_program_name: "더미 지원사업",
          grant_end_date: "2026-12-31",
          company_monthly_impact: 250000,
          review_status: "검토 전" as ReviewStatus,
          memo: "더미 인건비 검토"
        }),
        supabase.from("bonus_payments").insert({
          person_id: demoPerson.id,
          project_id: project.id,
          period_label: "2026 Q2",
          profit_amount: 11911320,
          bonus_rate: 0.1,
          bonus_amount: 1191132,
          payment_status: "검토 전" as ReviewStatus,
          planned_payment_date: "2026-08-31",
          memo: "더미 상여금"
        }),
        supabase.from("project_labor_allocations").insert({
          project_id: project.id,
          person_id: demoPerson.id,
          rank: "매니저" as Rank,
          allocation_rate: 0.35,
          man_months: 0.35,
          hours: 56
        })
      ]);
      const demoError = demoResults.find((result) => result.error)?.error;
      if (demoError) throw demoError;

      showToast("현금 현황을 제외한 검증 데이터를 넣었습니다.");
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "더미 데이터 입력 실패", "err");
    }
  }

  if (!sessionReady || loading) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">경영</div>
        <strong>러플 경영관리 대시보드 로딩 중</strong>
      </div>
    );
  }

  if (!userEmail || !currentPerson) {
    return <AuthScreen />;
  }

  return (
    <div className="app">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">경영</div>
          <div>
            <div className="brand-title">LUPL Finance</div>
            <div className="brand-sub">경영관리 대시보드</div>
          </div>
        </div>

        {/* 이름 + 로그인일시 + 내 정보 수정 */}
        <div className="user-box">
          <div className="user-mainline">
            <strong>{currentPerson.name}</strong>
            {loginAt && <span className="user-login-small">로그인일시 {formatDateTime(loginAt)}</span>}
          </div>
          <span className="user-rank">{currentPerson.rank}{currentPerson.employee_number ? ` · ${currentPerson.employee_number}` : ""}</span>
          <button
            className="user-edit-btn"
            type="button"
            onClick={() => { setSelectedPerson(currentPerson); setModal("personForm"); }}
          >
            내 정보 수정
          </button>
        </div>

        <div className="menu-label">메뉴</div>
        <nav className="nav" aria-label="주요 메뉴">
          {availableMenu.map((item) => (
            <button
              key={item.key}
              className={section === item.key ? "active" : ""}
              onClick={() => setSection(item.key)}
            >
              <span className="nav-dot" />
              <span>{item.label}</span>
              {item.key === "review" && pendingReviews.length > 0 && (
                <span className="nav-count">{pendingReviews.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="side-summary">
          <h3>Runway</h3>
          <div className="risk-line" />
          <p>
            최근 현금소진액 기준 예상 생존기간은{" "}
            <strong>{latestCash?.runway_months ? `${latestCash.runway_months}개월` : "데이터 입력 필요"}</strong>
          </p>
        </div>

        <button className="logout-btn" onClick={signOut}>
          <LogOut size={16} /> 로그아웃
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">LUPL Management · Supabase Connected</div>
            <h1 className="page-title">{activeMeta.title}</h1>
            <p className="page-desc">{activeMeta.desc}</p>
          </div>

          {section === "overview" && (
            <div className="home-actions">
              <button className="btn" onClick={loadAll}><RefreshCcw size={16} /> 새로고침</button>
              <button className="btn dark" onClick={() => setModal("cashForm")}>현금 현황 입력</button>
            </div>
          )}
        </header>

        {section === "overview" && (
          <Overview setSection={setSection} reviewCount={pendingReviews.length} cash={visibleCash} projects={projectsComputed} expenses={expenses} people={people} cards={cards} onAddCash={() => setModal("cashForm")} onOpenCashHistory={() => setModal("cashHistory")} />
        )}
        {section === "finance" && (
          <FinancePlanning
            plans={financePlans}
            cash={visibleCash}
            projects={projectsComputed}
            expenses={expenses}
            people={people}
            tableReady={financePlanTableReady}
            onSave={saveFinancePlan}
          />
        )}
        {section === "ai" && (
          <AiFinanceAssistant
            projects={projectsComputed}
            people={people}
            onSaveProject={saveAiProjectDraft}
            onSaveEmployee={saveAiEmployeeDraft}
          />
        )}
        {section === "review" && (
          <ReviewInbox
            reviews={reviews}
            onOpenReview={(review) => {
              setSelectedReview(review);
              if (review.target_table === "expense_requests") {
                setSelectedExpense(expenses.find((item) => item.id === review.target_id) || null);
                setModal(review.title.includes("강사") ? "taxReview" : "expenseReview");
              } else if (review.target_table === "business_projects") {
                setSelectedProject(projectsComputed.find((item) => item.id === review.target_id) || null);
                setModal("projectDetail");
              } else {
                setModal("reviewDetail");
              }
            }}
            onUpdateReview={updateReviewStatus}
            onDeleteReview={deleteReviewItem}
          />
        )}
        {section === "expense" && (
          <Expense
            projects={projectsComputed}
            expenses={expenses}
            cards={cards}
            mobileDevices={mobileDevices}
            onOpenExpense={(expense) => {
              setSelectedExpense(expense);
              setModal(expense.purpose.includes("강사") ? "taxReview" : "expenseReview");
            }}
            onCreate={() => setModal("expenseForm")}
            onRecurring={() => setModal("recurringForm")}
            onManageCard={() => setModal("cardManage")}
            onManageMobileDevices={() => setModal("mobileDeviceManage")}
          />
        )}
        {section === "revenue" && (
          <Revenue
            projects={projectsComputed}
            people={people}
            onCreate={() => setModal("projectWizard")}
            onManageCategory={() => setModal("categoryManage")}
            onOpenProject={(project) => {
              setSelectedProject(project);
              setModal("projectDetail");
            }}
          />
        )}
        {section === "compensation" && (
          <Compensation
            people={people}
            departments={departments}
            projects={projectsComputed}
            bonuses={bonuses}
            compReviews={compReviews}
            onOpenPerson={(person) => {
              setSelectedPerson(person);
              setModal("employeeDetail");
            }}
            onCreatePerson={() => { setSelectedPerson(null); setModal("personForm"); }}
            onCreateBonus={() => setModal("bonusForm")}
          />
        )}
        {section === "margin" && (
          <MarginCalculator projects={projectsComputed} onSaveProjectMargin={saveProjectMarginDraft} />
        )}
        {section === "resource" && (
          <Resource
            projects={projectsComputed}
            people={people}
            labor={labor}
            onCreateLabor={() => setModal("laborForm")}
            onOpenProject={(project) => {
              setSelectedProject(project);
              setModal("projectDetail");
            }}
          />
        )}
        {section === "org" && (
          <Org
            currentPerson={currentPerson}
            canManage={canManage(currentPerson)}
            people={people}
            departments={departments}
            permissions={permissions}
            onCreatePerson={() => { setSelectedPerson(null); setModal("personForm"); }}
            onCreatePermission={() => setModal("permissionForm")}
            onDeletePermission={deletePermission}
            onOpenPerson={(person) => {
              setSelectedPerson(person);
              setModal("employeeDetail");
            }}
          />
        )}

        <FloatingActions onQuick={() => { setSection("expense"); setModal("expenseForm"); }} />
      </main>

      <Modal
        modal={modal}
        setModal={setModal}
        selectedReview={selectedReview}
        selectedProject={selectedProject}
        selectedExpense={selectedExpense}
        selectedPerson={selectedPerson}
        currentPerson={currentPerson}
        people={people}
        mobileDevices={mobileDevices}
        mobileDeviceTableReady={mobileDeviceTableReady}
        departments={departments}
        cash={visibleCash}
        projects={projectsComputed}
        expenses={expenses}
        cards={cards}
        categories={categories}
        bonuses={bonuses}
        labor={labor}
        compReviews={compReviews}
        onReviewStatus={updateReviewStatus}
        onCreateProject={createProject}
        onUpdateProject={updateProject}
        onCompleteProject={completeProject}
        onCreateExpense={createExpense}
        onCreateRecurring={createRecurring}
        onCreatePerson={createPerson}
        onCreateBonus={createBonus}
        onCreateLabor={createLabor}
        onCreatePermission={createPermission}
        onCreateCash={createCash}
        onUpdateExpense={updateExpense}
        onCreateCategory={createCategory}
        onDeleteCategory={deleteCategory}
        onCreateCard={createCard}
        onDeleteCard={deleteCard}
        onSaveMobileDevice={saveMobileDevice}
        onDeleteMobileDevice={deleteMobileDevice}
        onDeleteProject={deleteProject}
        onDeleteExpense={deleteExpense}
        onDeleteReview={deleteReviewItem}
        onEditPerson={(person) => {
          setSelectedPerson(person);
          setModal("personForm");
        }}
      />
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolveLoginEmail(identifier: string) {
    const value = identifier.trim();
    if (value.includes("@")) return value;

    const employeeNumber = normalizeEmployeeNumber(value);
    const { data, error } = await supabase
      .from("people")
      .select("email, name")
      .eq("employee_number", employeeNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data?.email) throw new Error("등록되지 않은 사번입니다. 관리자에게 직원 등록을 요청하세요.");
    return data.email as string;
  }

  async function handleAuth(formData: FormData) {
    setBusy(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase 연결 설정이 없습니다. .env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣고 서버를 다시 시작하세요.");
      }

      const identifier = String(formData.get("identifier") || "");
      const password = String(formData.get("password") || "");

      if (mode === "login") {
        const email = await resolveLoginEmail(identifier);
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        setMessage("로그인했습니다.");
      } else {
        if (!identifier.includes("@")) throw new Error("초기 관리자 가입은 이메일로 진행하세요. 직원은 관리자가 사번으로 등록합니다.");
        const result = await supabase.auth.signUp({ email: identifier, password });
        if (result.error) throw result.error;
        setMessage("가입했습니다. 메일 확인 설정이 켜져 있으면 이메일 인증 후 로그인하세요.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">경영</div>
        <h1>러플 경영관리 대시보드</h1>
        <p>직원은 사번과 초기 비밀번호로 로그인할 수 있습니다. 초기 비밀번호는 <strong>lupl+휴대전화 뒷번호 4자리</strong>입니다.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleAuth(new FormData(event.currentTarget));
          }}
        >
          <label>{mode === "login" ? "사번 또는 이메일" : "관리자 이메일"}<input name="identifier" required placeholder={mode === "login" ? "LUPL-001 또는 lee@lupl.kr" : "lee@lupl.kr"} /></label>
          <label>비밀번호<input name="password" type="password" required minLength={6} placeholder="초기 비밀번호 또는 변경한 비밀번호" /></label>
          <button className="btn blue" type="submit" disabled={busy}>{mode === "login" ? "로그인" : "관리자 초기 가입"}</button>
        </form>
        <button className="link-btn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "첫 관리자 계정 만들기" : "이미 계정이 있으면 로그인"}
        </button>
        {message && <div className="auth-message">{message}</div>}
      </div>
    </div>
  );
}

function AiFinanceAssistant({
  projects,
  people,
  onSaveProject,
  onSaveEmployee
}: {
  projects: ProjectComputed[];
  people: Person[];
  onSaveProject: (draft: AiFinanceDraft) => Promise<void>;
  onSaveEmployee: (draft: AiEmploymentDraft) => Promise<void>;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: "assistant",
      content: "어떤 프로젝트인지 편하게 말해주세요. 예: 발달장애 훈련센터에서 수업했고, 기관 돈은 강사에게 먼저 들어갔어요."
    }
  ]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AiFinanceDraft | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([
    "기관이 강사에게 직접 입금했어요",
    "강사는 5명이에요",
    "프로젝트 저장 가능하게 정리해줘"
  ]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState("");
  const monthlyPayroll = people.filter((person) => person.is_active).reduce((sum, person) => sum + Number(person.annual_salary || 0) / 12, 0);
  const draftRevenue = Number(draft?.companyRevenue || draft?.companyCollectionTotal || 0);
  const draftCollection = Number(draft?.companyCollectionTotal || 0);
  const draftInstructorPay = Number(draft?.instructorPlannedPayTotal || 0);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const nextMessages: AiChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/finance-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: {
            today: today(),
            projectCount: projects.length,
            peopleCount: people.length,
            monthlyPayroll,
            projects: projects.slice(0, 12).map((project) => ({
              name: project.name,
              clientName: project.client_name,
              confirmedAmount: project._revenue,
              receivedAmount: project.received_amount,
              status: project.status
            })),
            people: people.slice(0, 30).map((person) => ({
              name: person.name,
              rank: person.rank,
              monthlySalary: Math.round(Number(person.annual_salary || 0) / 12)
            }))
          }
        })
      });
      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || "AI 응답을 받지 못했습니다.");
      }
      const data = await response.json();
      const reply = String(data.reply || "좋아요. 필요한 정보를 더 알려주세요.");
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      setDraft(data.draft || null);
      setQuickReplies(Array.isArray(data.quickReplies) ? data.quickReplies.slice(0, 5) : []);
    } catch (error) {
      setMessages([...nextMessages, { role: "assistant", content: error instanceof Error ? error.message : "AI 연결에 실패했습니다." }]);
    } finally {
      setBusy(false);
    }
  }

  async function saveProject() {
    if (!draft) return;
    setSaving("project");
    try {
      await onSaveProject(draft);
    } finally {
      setSaving("");
    }
  }

  async function saveEmployee(candidate: AiEmploymentDraft, index: number) {
    setSaving(`employee-${index}`);
    try {
      await onSaveEmployee(candidate);
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="section active ai-assistant-section">
      <div className="grid two ai-layout">
        <div className="card solid ai-chat-card">
          <div className="ai-card-head">
            <div>
              <h2 className="card-title">AI 경영 입력</h2>
              <p className="card-sub">프로젝트 흐름을 말하면 부족한 금액·강사·회수 정보를 이어서 질문합니다.</p>
            </div>
            <span className="chip blue">GPT 연결</span>
          </div>
          <div className="ai-thread" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`ai-bubble ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {busy && <div className="ai-bubble assistant">정리 중입니다...</div>}
          </div>
          <div className="ai-quick-replies">
            {quickReplies.map((reply) => (
              <button className="chip-choice" type="button" key={reply} onClick={() => sendMessage(reply)} disabled={busy}>{reply}</button>
            ))}
          </div>
          <form className="ai-input-row" onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="예: 기관 돈은 강사 5명에게 들어갔고, 회사가 220만원 회수해야 해" />
            <button className="btn blue" disabled={busy}>{busy ? "질문 중" : "보내기"}</button>
          </form>
        </div>

        <div className="card ai-draft-card">
          <h2 className="card-title">자동 정리 초안</h2>
          <p className="card-sub">금액이 맞으면 프로젝트로 저장하세요. 부족한 값은 AI가 계속 질문합니다.</p>
          {draft ? (
            <>
              <div className="ai-draft-kpis">
                <Metric title="회사 매출 반영액" copy="회수 예정 또는 직접 수금 기준" value={formatWon(draftRevenue)} />
                <Metric title="회사 회수 예정" copy="강사가 먼저 받은 금액 중 회사 몫" value={formatWon(draftCollection)} />
                <Metric title="강사 실지급 예정" copy="강사에게 남기거나 지급할 총액" value={formatWon(draftInstructorPay)} />
              </div>
              <div className="ai-draft-summary">
                <strong>{draft.projectName || "프로젝트명 확인 필요"}</strong>
                <span>{draft.clientName || "기관명 확인 필요"} · {draft.paymentFlow === "instructor" ? "강사 직접수령" : "회사 직접수령"}</span>
              </div>
              {(draft.instructors || []).length > 0 && (
                <div className="ai-instructor-list">
                  {(draft.instructors || []).map((item, index) => (
                    <div className="ai-instructor-row" key={`${item.name || "강사"}-${index}`}>
                      <div>
                        <strong>{item.name || `강사 ${index + 1}`}</strong>
                        <span>{item.hours || 0}시간 · 메인 {item.mainSessions || 0}회 · 보조 {item.assistantSessions || 0}회</span>
                      </div>
                      <b>{formatWon(item.companyCollection || 0)}</b>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn blue wide" type="button" onClick={saveProject} disabled={saving === "project"}>
                {saving === "project" ? "저장 중" : "사업·매출 프로젝트로 저장"}
              </button>
              {(draft.employmentCandidates || []).length > 0 && (
                <div className="ai-employment-box">
                  <h3>고용 시 월 인건비</h3>
                  {(draft.employmentCandidates || []).map((candidate, index) => {
                    const monthly = Number(candidate.monthlySalary || (candidate.annualSalary ? candidate.annualSalary / 12 : 0));
                    const canSave = Boolean(candidate.name && candidate.employeeNumber && candidate.phone);
                    return (
                      <div className="ai-employment-row" key={`${candidate.name || "후보"}-${index}`}>
                        <div>
                          <strong>{candidate.name || "이름 확인 필요"}</strong>
                          <span>{candidate.role || "역할 미정"} · 월 {formatWon(monthly)} · 연 {formatWon(candidate.annualSalary || monthly * 12)}</span>
                        </div>
                        <button className="btn small" type="button" disabled={!canSave || saving === `employee-${index}`} onClick={() => saveEmployee(candidate, index)}>
                          {canSave ? "직원 등록" : "사번·휴대폰 필요"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <EmptyState text="대화를 시작하면 프로젝트 매출, 강사 정산, 고용 시 월 인건비 초안이 여기에 정리됩니다." />
          )}
        </div>
      </div>
    </section>
  );
}

// 2,3,5번: 모든 지표를 실데이터 기반. 데이터 없으면 빈 상태 안내
function Overview({
  setSection,
  reviewCount,
  cash,
  projects,
  expenses,
  people,
  cards,
  onAddCash,
  onOpenCashHistory
}: {
  setSection: (key: SectionKey) => void;
  reviewCount: number;
  cash: CashSnapshot[];
  projects: ProjectComputed[];
  expenses: ExpenseRequest[];
  people: Person[];
  cards: PaymentCard[];
  onAddCash: () => void;
  onOpenCashHistory: () => void;
}) {
  const latest = cash[0];
  const hasCash = Boolean(latest);
  const hasProjects = projects.length > 0;
  const hasExpenses = expenses.length > 0;

  const currentMonth = today().slice(0, 7);
  const monthlyRevenue = projects
    .filter((project) => {
      const recognitionDate = project.revenue_recognition_date
        || projectMemoValue(project, "매출 인식일")
        || project.tax_invoice_date
        || project.due_date
        || project.payment_due_date;
      const recognitionMonth = String(recognitionDate || "").slice(0, 7);
      return project._isMonthlyRecurring ? Boolean(recognitionMonth && recognitionMonth <= currentMonth) : recognitionMonth === currentMonth;
    })
    .reduce((sum, project) => {
      const taxMode = project.revenue_tax_mode || projectMemoValue(project, "매출 부가세 처리");
      return sum + (taxMode === "부가세 포함" ? Math.round(project._revenue / 1.1) : project._revenue);
    }, 0) || Number(latest?.revenue || 0);
  const monthlyOperatingExpense = expenses
    .filter((expense) => {
      const expenseMonth = String(expense.used_at || "").slice(0, 7);
      return isMonthlyRecurringExpense(expense) ? expenseMonth <= currentMonth : expenseMonth === currentMonth;
    })
    .reduce((sum, expense) => {
      const supplyAmount = Number(expense.supply_amount || 0)
        || Number(readMemoField(expense.memo, "공급가액").replace(/[^0-9.-]/g, ""))
        || Number(expense.amount || 0);
      return sum + supplyAmount;
    }, 0);
  const autoPayroll = people.filter((p) => p.is_active).reduce((s, p) => s + Number(p.annual_salary || 0) / 12, 0);
  const monthlyExpense = monthlyOperatingExpense + autoPayroll || Number(latest?.expense || 0);
  const currentCash = latest?.current_cash ?? null;
  const latestAccounts = latest ? getCashAccounts(latest) : [];
  const latestAccountSum = latestAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const netBurn = Math.max(0, Number(monthlyExpense) - Number(monthlyRevenue));
  const runway = currentCash != null && netBurn > 0 ? Math.round((Number(currentCash) / netBurn) * 10) / 10 : latest?.runway_months ?? null;
  const receivable = projects
    .filter((project) => {
      const dueMonth = String(project.payment_due_date || "").slice(0, 7);
      return project._receivable > 0 && (project._isMonthlyRecurring || !dueMonth || dueMonth <= currentMonth);
    })
    .reduce((sum, project) => sum + project._receivable, 0);
  const payable = expenses
    .filter((expense) => {
      const paidMonth = String(expense.paid_at || readMemoField(expense.memo, "실제 지급일") || expense.used_at || "").slice(0, 7);
      return !["결제 완료", "이체 완료", "해당 없음"].includes(String(expense.transfer_status || "")) && (!paidMonth || paidMonth <= currentMonth);
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const expectedMonthEndCash = currentCash != null ? Number(currentCash) + Number(receivable || 0) - Number(payable || 0) : 0;
  const flowMax = Math.max(Math.abs(receivable), Math.abs(payable), Math.abs(monthlyExpense), Math.abs(expectedMonthEndCash), 1);
  const missingReceiptCount = expenses.filter((expense) => !getExpenseReceiptUrl(expense)).length;
  const transferNeeded = expenses.filter((expense) => expense.transfer_status === "결제 필요");
  const personalCardExpenses = expenses.filter((expense) => {
    const card = getExpensePaymentLabel(expense, cards);
    return card.includes("개인 카드") || card.includes("개인-") || String(expense.transfer_summary || "").includes("개인 카드");
  });
  const overdueReceivables = projects.filter((project) => {
    if (project._receivable <= 0 || !project.payment_due_date) return false;
    return project.payment_due_date < today();
  });
  const opsInsights: OperationsInsight[] = [
    {
      title: "AI 경영 알림",
      value: `${reviewCount + overdueReceivables.length + transferNeeded.length}건`,
      copy: `검토 ${reviewCount} · 미수 지연 ${overdueReceivables.length} · 이체요청 ${transferNeeded.length}`,
      tone: reviewCount + overdueReceivables.length + transferNeeded.length > 0 ? "orange" : "green",
      action: reviewCount > 0 ? "review" : overdueReceivables.length > 0 ? "revenue" : "expense"
    },
    {
      title: "경비 자동화 품질",
      value: `${Math.max(0, expenses.length - missingReceiptCount)}/${expenses.length || 0}`,
      copy: `증빙 첨부율 ${expenses.length ? Math.round(((expenses.length - missingReceiptCount) / expenses.length) * 100) : 0}% · 누락 ${missingReceiptCount}건`,
      tone: missingReceiptCount > 0 ? "red" : "green",
      action: "expense"
    },
    {
      title: "개인카드 정산",
      value: formatWon(personalCardExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)),
      copy: `${personalCardExpenses.length}건 · 월말 일괄 정산 확인`,
      tone: personalCardExpenses.length > 0 ? "purple" : "green",
      action: "expense"
    }
  ];
  const careEvents = people.flatMap<CareEvent>((person) => {
    const items: CareEvent[] = [];
    const birthday = readAnyMemoField(person.memo, ["생일", "birthday", "Birthday"]);
    const familyEvent = readAnyMemoField(person.memo, ["경조사", "기념일", "가족행사"]);
    if (birthday) {
      const daysLeft = daysUntilAnnualDate(birthday);
      if (daysLeft !== null && daysLeft <= 30) items.push({ person: person.name, label: "생일", dateLabel: shortAnnualDateLabel(birthday), daysLeft, tone: "purple" });
    }
    if (familyEvent) {
      const daysLeft = daysUntilAnnualDate(familyEvent);
      if (daysLeft !== null && daysLeft <= 45) items.push({ person: person.name, label: familyEvent.replace(normalizeDateToken(familyEvent), "").trim() || "경조사", dateLabel: shortAnnualDateLabel(familyEvent), daysLeft, tone: "orange" });
    }
    if (person.hire_date) {
      const daysLeft = daysUntilAnnualDate(person.hire_date);
      if (daysLeft !== null && daysLeft <= 30) items.push({ person: person.name, label: "입사기념일", dateLabel: shortAnnualDateLabel(person.hire_date), daysLeft, tone: "green" });
    }
    return items;
  }).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  const careMissing = people.filter((person) => person.is_active && !readAnyMemoField(person.memo, ["생일", "birthday", "Birthday", "경조사", "기념일", "가족행사"])).length;

  return (
    <section className="section active">
      <div className="section-toolbar overview-toolbar">
        <button className="btn blue" onClick={onAddCash}>현재 현금 입력</button>
      </div>

      {reviewCount > 0 && (
        <div className="alert-top">
          <div>
            <strong>대표 검토함에 처리할 항목이 {reviewCount}건 있습니다.</strong>
            <span>지출결의, 사업·매출, 인건비, 권한 요청을 한곳에서 검토합니다.</span>
          </div>
          <button className="btn small" onClick={() => setSection("review")}>대표 검토함 열기</button>
        </div>
      )}

      <div className="overview-kpi-layout">
        <div className={`card hero-card ${hasCash ? "clickable-card" : ""}`} role={hasCash ? "button" : undefined} tabIndex={hasCash ? 0 : undefined} onClick={hasCash ? onOpenCashHistory : undefined} onKeyDown={(event) => {
          if (hasCash && (event.key === "Enter" || event.key === " ")) onOpenCashHistory();
        }}>
          <div>
            <div className="hero-label">현재 현금</div>
            {hasCash ? (
              <div className="hero-value">{formatWon(currentCash)}</div>
            ) : (
              <div className="hero-empty">
                <div className="hero-empty-title">아직 입력된 현금 데이터가 없습니다</div>
                <button className="btn blue small" onClick={onAddCash}>현금 현황 입력하기</button>
              </div>
            )}
            {hasCash && <div className="hero-copy">클릭하면 입력했던 월별 현금 데이터를 모두 확인합니다.</div>}
            {latestAccounts.length > 0 && (
              <div className="cash-inline-breakdown">
                {latestAccounts.slice(0, 3).map((account, index) => (
                  <span key={`${account.bank}-${account.label}-${index}`}>{account.label || account.bank || "통장"} {formatWonShort(account.balance)}</span>
                ))}
                <strong>합계 {formatWon(latestAccountSum)}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="overview-auto-kpis">
          <KpiCard compact label="이번 달 매출" value={monthlyRevenue != null ? formatWon(monthlyRevenue) : "미입력"} chip="자동 계산" tone="green" empty={!hasCash} />
          <KpiCard compact label="직원 월급 포함 지출" value={monthlyExpense != null ? formatWon(monthlyExpense) : "미입력"} chip="자동 계산" tone="red" empty={!hasCash} />
          <KpiCard compact label="현금소진액 / Runway" value={formatWon(netBurn)} chip={runway != null ? `${runway}개월` : "현재 현금 필요"} tone="orange" empty={!hasCash} />
        </div>
      </div>

      {hasCash && (
        <div className="overview-flow-strip">
          <CashSignal label="이번 달 입금예정" value={formatWon(receivable)} tone="green" max={flowMax} amount={receivable} onClick={() => setSection("revenue")} />
          <CashSignal label="이번 달 지급예정" value={formatWon(payable)} tone="orange" max={flowMax} amount={payable} onClick={() => setSection("expense")} />
          <CashSignal label="직원 월급 포함 지출" value={formatWon(monthlyExpense)} tone="red" max={flowMax} amount={monthlyExpense} onClick={() => setSection("compensation")} />
          <CashSignal label="예상 월말 현금" value={formatWon(expectedMonthEndCash)} tone="blue" max={flowMax} amount={expectedMonthEndCash} onClick={onOpenCashHistory} />
        </div>
      )}

      <div className="grid two">
        <div className="card">
          <h2 className="card-title">현금흐름 추이</h2>
          <p className="card-sub">월별 매출, 비용, 순현금흐름을 분리해 보여줍니다.</p>
          <div className="legend">
            <span className="legend-item"><i className="legend-dot revenue" />매출</span>
            <span className="legend-item"><i className="legend-dot expense" />비용</span>
            <span className="legend-item"><i className="legend-dot net" />순현금흐름</span>
          </div>
          <CashFlowChart cash={cash} onAddCash={onAddCash} />
        </div>

        <div className="card">
          <h2 className="card-title">이번 달 경영 요약</h2>
          <p className="card-sub">입력한 데이터 기준으로 핵심 지표만 보여줍니다.</p>
          {(hasCash || hasProjects || hasExpenses) ? (
            <div className="metric-list">
              <Metric title="매출 대비 지출률" copy="지출 ÷ 매출" value={monthlyRevenue && monthlyExpense ? `${Math.round((Number(monthlyExpense) / Number(monthlyRevenue)) * 100)}%` : "-"} />
              <Metric title="프로젝트 수" copy="사업·매출관리 등록 기준" value={hasProjects ? `${projects.length}개` : "-"} />
              <Metric title="미수금" copy="확정금액 − 수령금액 합계" value={receivable != null ? formatWon(receivable) : "-"} />
              <Metric title="등록 지출결의" copy="지출결의 등록 건수" value={hasExpenses ? `${expenses.length}건` : "-"} />
            </div>
          ) : (
            <EmptyState text="현금 현황·프로젝트·지출결의를 입력하면 이번 달 요약이 채워집니다." />
          )}
        </div>
      </div>

      <div className="grid three mt">
        <div className="card solid ops-card">
          <h2 className="card-title">AI 운영 알림</h2>
          <p className="card-sub">현금, 미수, 검토, 지출 리스크를 자동으로 묶어 보여줍니다.</p>
          <div className="ops-list">
            {opsInsights.map((item) => (
              <button className={`ops-item ${item.tone}`} key={item.title} type="button" onClick={() => setSection(item.action || "overview")}>
                <span>{item.title}</span>
                <strong>{item.value}</strong>
                <em>{item.copy}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="card solid ops-card">
          <h2 className="card-title">경비관리 자동화</h2>
          <p className="card-sub">법인카드·개인카드·영수증 증빙·이체요청을 마감 전에 확인합니다.</p>
          <div className="automation-grid">
            <Metric title="증빙 누락" copy="영수증 파일 미첨부" value={`${missingReceiptCount}건`} />
            <Metric title="이체 요청" copy="결제 필요 상태" value={`${transferNeeded.length}건`} />
            <Metric title="정기 결제" copy="반복 지출 자동 감지" value={formatWon(expenses.filter(isRecurringExpense).reduce((sum, expense) => sum + Number(expense.amount || 0), 0))} />
          </div>
        </div>

        <div className="card solid ops-card">
          <h2 className="card-title">경조사·챙김</h2>
          <p className="card-sub">직원 메모의 생일·경조사·입사기념일을 기준으로 챙길 일을 띄웁니다.</p>
          {careEvents.length === 0 ? (
            <div className="care-empty">
              <strong>다가오는 일정 없음</strong>
              <span>직원 메모에 `생일: 03-14`, `경조사: 2026-07-01 부모님 칠순`처럼 적으면 자동 표시됩니다.</span>
              {careMissing > 0 && <em>{careMissing}명은 챙김 정보 미입력</em>}
            </div>
          ) : (
            <div className="care-list">
              {careEvents.map((event) => (
                <div className={`care-item ${event.tone}`} key={`${event.person}-${event.label}-${event.dateLabel}`}>
                  <div><strong>{event.person}</strong><span>{event.label} · {event.dateLabel}</span></div>
                  <em>{event.daysLeft === 0 ? "오늘" : `D-${event.daysLeft}`}</em>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// 13,14,15번: 검토함 상세. 항목 누르면 무엇을 검토할지(checklist) 표시. 색 균일하게.
function ReviewInbox({
  reviews,
  onOpenReview,
  onUpdateReview,
  onDeleteReview
}: {
  reviews: ReviewItem[];
  onOpenReview: (review: ReviewItem) => void;
  onUpdateReview: (review: ReviewItem, status: ReviewStatus) => void;
  onDeleteReview: (review: ReviewItem) => void;
}) {
  const pending = reviews.filter((r) => r.status === "검토 전");

  return (
    <section className="section active">
      <div className="alert-top info">
        <div>
          <strong>대표 검토함 · 검토 전 {pending.length}건</strong>
          <span>항목명을 누르면 무엇을 검토해야 하는지 안내와 함께 팝업이 열립니다.</span>
        </div>
      </div>

      <div className="card solid">
        <h2 className="card-title">검토함 상세</h2>
        <p className="card-sub">각 항목을 눌러 검토 포인트를 확인하고 승인·보류·수정요청을 처리합니다.</p>
        {pending.length === 0 ? (
          <EmptyState text="아직 검토할 항목이 없습니다. 지출결의·프로젝트·상여금을 등록하면 여기로 모입니다." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>영역</th>
                  <th style={{ width: 220 }}>항목명</th>
                  <th style={{ width: 200 }}>검토 사유</th>
                  <th style={{ width: 120 }} className="num">금액/영향</th>
                  <th style={{ width: 100 }}>담당</th>
                  <th style={{ width: 90 }}>상태</th>
                  <th style={{ width: 210 }}>처리</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id}>
                    <td><span className="area-tag">{row.area}</span></td>
                    <td><button className="link-strong" onClick={() => onOpenReview(row)}>{row.title}</button></td>
                    <td className="muted-cell">{row.reason}</td>
                    <td className="num strong-num">{row.amount_or_impact}</td>
                    <td>{row.owner_label}</td>
                    <td><span className={`chip ${row.status === "승인" ? "green" : row.status === "검토 전" ? "orange" : "red"}`}>{row.status}</span></td>
                    <td className="action-cell">
                      <button className="btn small blue" onClick={() => onOpenReview(row)}>상세</button>
                      <button className="btn small" onClick={() => onUpdateReview(row, "승인")}>승인</button>
                      <button className="btn small" onClick={() => onUpdateReview(row, "보류")}>보류</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// 6,7,8,9,12,13번 지출결의 화면
function Expense({
  projects,
  expenses,
  cards,
  mobileDevices,
  onOpenExpense,
  onCreate,
  onRecurring,
  onManageCard,
  onManageMobileDevices
}: {
  projects: ProjectComputed[];
  expenses: ExpenseRequest[];
  cards: PaymentCard[];
  mobileDevices: MobileReceiptDevice[];
  onOpenExpense: (expense: ExpenseRequest) => void;
  onCreate: () => void;
  onRecurring: () => void;
  onManageCard: () => void;
  onManageMobileDevices: () => void;
}) {
  type ExpenseMetricKey = "recurring" | "month" | "total" | "pending";
  const [activeMetric, setActiveMetric] = useState<ExpenseMetricKey>("recurring");
  const [activeUsage, setActiveUsage] = useState("전체");
  const pending = expenses.filter((item) => item.review_status === "검토 전");
  const currentMonth = today().slice(0, 7);
  const recurringExpenses = expenses.filter(isRecurringExpense);
  const monthExpenses = expenses.filter((item) => {
    if (isRecurringExpense(item)) return isMonthlyRecurringExpense(item) || String(item.used_at || "").startsWith(currentMonth);
    return String(item.used_at || "").startsWith(currentMonth);
  });
  const recurringTotal = recurringExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthNonRecurringTotal = expenses
    .filter((item) => !isRecurringExpense(item) && String(item.used_at || "").startsWith(currentMonth))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthRecurringTotal = recurringExpenses
    .filter((item) => isMonthlyRecurringExpense(item) || String(item.used_at || "").startsWith(currentMonth))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthTotal = monthNonRecurringTotal + monthRecurringTotal;
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingTotal = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const metricDetails: Record<ExpenseMetricKey, { title: string; desc: string; total: number; items: ExpenseRequest[]; tone: "blue" | "red" | "orange" | "green" }> = {
    recurring: {
      title: "정기 결제 상세",
      desc: "매월 반복되거나 구독/정기결제로 표시된 지출입니다.",
      total: recurringTotal,
      items: recurringExpenses,
      tone: "blue"
    },
    month: {
      title: `${Number(currentMonth.slice(5))}월 지출 상세`,
      desc: "이번 달 사용일 기준 지출과 매월 반복 지출을 함께 반영합니다.",
      total: monthTotal,
      items: monthExpenses,
      tone: "red"
    },
    total: {
      title: "총 지출 상세",
      desc: "등록된 모든 지출결의 금액의 합계입니다.",
      total: totalExpense,
      items: expenses,
      tone: "orange"
    },
    pending: {
      title: "검토 대기 상세",
      desc: "대표 검토가 아직 끝나지 않은 지출결의입니다.",
      total: pendingTotal,
      items: pending,
      tone: "green"
    }
  };
  const activeDetail = metricDetails[activeMetric];
  useEffect(() => {
    setActiveUsage("전체");
  }, [activeMetric]);
  const usageBreakdownAll = Object.entries(activeDetail.items.reduce<Record<string, number>>((acc, item) => {
    const key = getExpenseUsageDisplay(item);
    acc[key] = (acc[key] || 0) + Number(item.amount || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const activeItems = activeUsage === "전체" ? activeDetail.items : activeDetail.items.filter((item) => getExpenseUsageDisplay(item) === activeUsage);
  const activeFilteredTotal = activeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const activeTopItems = [...activeItems].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 7);
  const maxActiveAmount = Math.max(...activeTopItems.map((item) => Number(item.amount || 0)), 1);
  const usageBreakdown = usageBreakdownAll.slice(0, 7);

  return (
    <section className="section active">
      <div className="section-toolbar">
        <button className="btn small" onClick={onManageCard}>결제수단(카드) 관리</button>
        <button className="btn small blue" onClick={onCreate}>빠른 지출 등록</button>
        <button className="btn small" onClick={onRecurring}>반복 지출</button>
        <button className="btn small notification-btn" onClick={() => setActiveMetric("pending")}>
          검토 요약
          {pending.length > 0 && <span className="notify-dot" aria-label="검토 필요" />}
        </button>
        <button className="btn small" onClick={onManageMobileDevices}>모바일 기기 관리</button>
      </div>
      <div className="grid four expense-summary">
        <KpiCard compact label="정기 결제" value={formatWon(recurringTotal)} chip={`${recurringExpenses.length}건`} tone="blue" empty={recurringExpenses.length === 0} active={activeMetric === "recurring"} onClick={() => setActiveMetric("recurring")} />
        <KpiCard compact label={`${Number(currentMonth.slice(5))}월 지출`} value={formatWon(monthTotal)} chip="이번 달" tone="red" empty={expenses.length === 0} active={activeMetric === "month"} onClick={() => setActiveMetric("month")} />
        <KpiCard compact label="총 지출" value={formatWon(totalExpense)} chip={`${expenses.length}건`} tone="orange" empty={expenses.length === 0} active={activeMetric === "total"} onClick={() => setActiveMetric("total")} />
        <KpiCard compact label="검토 대기" value={formatWon(pendingTotal)} chip={`${pending.length}건`} tone="green" empty={pending.length === 0} active={activeMetric === "pending"} onClick={() => setActiveMetric("pending")} />
      </div>
      <div className="card solid expense-detail-panel">
        <div className="expense-detail-head">
          <div>
            <h2 className="card-title">{activeDetail.title}</h2>
            <p className="card-sub">{activeDetail.desc} {activeUsage !== "전체" && `${activeUsage}만 보고 있습니다.`}</p>
          </div>
          <div className={`expense-detail-total ${activeDetail.tone}`}>
            <span>{activeItems.length}건</span>
            <strong>{formatWon(activeUsage === "전체" ? activeDetail.total : activeFilteredTotal)}</strong>
          </div>
        </div>
        {usageBreakdown.length > 0 && (
          <div className="expense-usage-strip" aria-label="용도별 지출 필터">
            <button type="button" className={activeUsage === "전체" ? "active" : ""} onClick={() => setActiveUsage("전체")}>
              <span>전체</span><strong>{formatWon(activeDetail.total)}</strong>
            </button>
            {usageBreakdown.map(([usage, amount], index) => (
              <button type="button" className={`tone-${index % 4} ${activeUsage === usage ? "active" : ""}`} key={usage} onClick={() => setActiveUsage(usage)}>
                <span>{usage}</span><strong>{formatWon(amount)}</strong>
              </button>
            ))}
          </div>
        )}
        {activeDetail.items.length === 0 ? (
          <EmptyState text="표시할 세부 항목이 없습니다." />
        ) : (
          <>
            {activeMetric === "recurring" && activeItems.length > 0 && (
              <div className="recurring-runway compact" aria-label="정기결제 금액 비중">
                {[...activeItems].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).map((item, index) => {
              const share = activeDetail.total ? Math.max(18, Math.round((Number(item.amount || 0) / activeDetail.total) * 100)) : 100;
              return (
                <button
                  type="button"
                  className={`recurring-segment tone-${index % 4}`}
                  key={item.id}
                  onClick={() => onOpenExpense(item)}
                  style={{ flexBasis: `${share}%` }}
                  title={`${item.purpose} · ${formatWon(item.amount)} · ${getExpenseUsageDisplay(item)} · ${getExpensePaymentLabel(item, cards)}`}
                >
                  <span className="recurring-purpose">{item.purpose}</span>
                  <span>{getExpenseUsageDisplay(item)} · {getExpenseCycleLabel(item)}</span>
                  <strong>{formatWon(item.amount)}</strong>
                </button>
              );
                })}
              </div>
            )}
          <div className="expense-detail-grid">
            <div className="expense-detail-bars">
              {activeTopItems.map((item) => {
                const width = Math.max(7, Math.round((Number(item.amount || 0) / maxActiveAmount) * 100));
                return (
                  <button type="button" className="expense-detail-row" key={item.id} onClick={() => onOpenExpense(item)}>
                    <div className="expense-detail-row-main">
                      <strong>{item.purpose}</strong>
                      <span>{item.used_at}{isRecurringExpense(item) ? " · 정기" : ""} · {getExpenseUsageDisplay(item)}</span>
                      <div className="expense-bar-track"><div className={`expense-bar-fill ${activeDetail.tone}`} style={{ width: `${width}%` }} /></div>
                    </div>
                    <b>{formatWon(item.amount)}</b>
                  </button>
                );
              })}
            </div>
            <div className="expense-breakdown">
              <h3>용도별 비중</h3>
              {usageBreakdown.map(([usage, amount]) => {
                const percent = activeDetail.total ? Math.round((amount / activeDetail.total) * 100) : 0;
                return (
                  <div className="expense-breakdown-row" key={usage}>
                    <span>{usage}</span>
                    <strong>{formatWon(amount)}</strong>
                    <em>{percent}%</em>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}
      </div>
      <div className="grid two">
        <div className="card">
          <h2 className="card-title">지출결의 검토 요약</h2>
          <p className="card-sub">검토가 필요한 항목을 누르면 무엇을 검토할지 상세가 열립니다.</p>
          {expenses.length === 0 ? (
            <EmptyState text="등록된 지출결의가 없습니다." />
          ) : (
            <div className="queue">
              {pending.slice(0, 5).map((item) => (
                <div className="queue-item orange clickable" key={item.id} onClick={() => onOpenExpense(item)}>
                  <div>
                    <strong>{item.purpose}</strong>
                    <span>{getExpenseUsageDisplay(item)} · {item.payment_method}{item.card_id ? ` · ${cards.find((c) => c.id === item.card_id)?.label || ""}` : ""}</span>
                  </div>
                  <div className="count">{formatWon(item.amount)}</div>
                </div>
              ))}
              {pending.length === 0 && <EmptyState text="검토 전 지출이 없습니다." />}
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="card-title">이번달 누적 사용비용</h2>
          <p className="card-sub">월 지출에는 이번 달 사용분과 매월 반복 지출이 같이 반영됩니다.</p>
          <div className="expense-month-total">
            <span>{Number(currentMonth.slice(5))}월 사용 합계</span>
            <strong>{formatWon(monthTotal)}</strong>
            <em>정기 {formatWon(monthRecurringTotal)} · 일반 {formatWon(monthNonRecurringTotal)}</em>
          </div>
        </div>
      </div>

      <div className="card solid mt">
        <div className="table-title-row">
          <h2 className="card-title">지출결의 상세 목록</h2>
          <div className="table-total-chip">이번달 누적 {formatWon(monthTotal)}</div>
        </div>
        <p className="card-sub">항목을 누르면 증빙, 결제수단, 이체 내용을 확인하는 팝업이 열립니다.</p>
        {expenses.length === 0 ? (
          <EmptyState text="등록된 지출결의가 없습니다. ‘빠른 지출 등록’으로 첫 항목을 만들어보세요." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>사용일</th>
                  <th style={{ width: 200 }}>목적</th>
                  <th style={{ width: 120 }}>대분류</th>
                  <th style={{ width: 130 }}>소분류</th>
                  <th style={{ width: 130 }}>결제방식</th>
                  <th style={{ width: 110 }} className="num">금액</th>
                  <th style={{ width: 120 }}>증빙</th>
                  <th style={{ width: 110 }}>담당자</th>
                  <th style={{ width: 130 }}>이체 여부</th>
                  <th style={{ width: 90 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="clickable" onClick={() => onOpenExpense(expense)}>
                    <td>{expense.used_at}{isRecurringExpense(expense) ? " 반복" : ""}</td>
                    <td>{expense.purpose}</td>
                    <td>{getExpenseUsageLabel(expense)}</td>
                    <td>{getExpenseSubcategoryLabel(expense) || "-"}</td>
                    <td>{getExpensePaymentLabel(expense, cards)}</td>
                    <td className="num">{formatWon(expense.amount)}</td>
                    <td><span className={`chip ${getExpenseReceiptUrl(expense) ? "green" : "orange"}`}>{expense.evidence_status || "확인 필요"}</span></td>
                    <td>{getDeviceOwnerName(getExpenseDeviceId(expense), mobileDevices) || (getExpenseDeviceId(expense) ? "미등록 기기" : "-")}</td>
                    <td>{expense.transfer_status}</td>
                    <td><span className={`chip ${expense.review_status === "승인" ? "green" : "orange"}`}>{expense.review_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// 16~20번: 사업·매출관리
function Revenue({
  projects,
  people,
  onCreate,
  onManageCategory,
  onOpenProject
}: {
  projects: ProjectComputed[];
  people: Person[];
  onCreate: () => void;
  onManageCategory: () => void;
  onOpenProject: (project: ProjectComputed) => void;
}) {
  const totals = projects.reduce(
    (acc, p) => {
      acc.revenue += p._revenue;
      acc.cost += p._cost;
      acc.profit += p._profit;
      acc.receivable += p._receivable;
      acc.monthly += p._monthlyRevenue;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, receivable: 0, monthly: 0 }
  );

  return (
    <section className="section active">
      {/* 사업관리 액션 영역: 하단 KPI 카드와 겹치지 않도록 별도 패널로 분리 */}
      <div className="card action-panel">
        <div className="action-panel-head">
          <div>
            <h2 className="card-title">사업관리 작업</h2>
            <p className="card-sub">프로젝트 등록과 카테고리 관리를 여기에서 시작합니다.</p>
          </div>
        </div>
        <div className="quick-actions quick-two no-margin">
          <QuickCard icon={<FolderPlus size={18} />} title="새 프로젝트 등록" copy="외주용역 기준 거래처·확정금액·책임자 입력" onClick={onCreate} />
          <QuickCard icon={<Tags size={18} />} title="카테고리 관리" copy="지출/사업 분류 카테고리 추가·삭제" onClick={onManageCategory} />
        </div>
      </div>

      <div className="grid five revenue-kpis section-gap">
        <KpiCard compact label="총 매출(확정금액)" value={formatWon(totals.revenue)} chip="누적" tone="green" empty={projects.length === 0} />
        <KpiCard compact label="월 반복 매출" value={formatWon(totals.monthly)} chip="매월 반영" tone="green" empty={totals.monthly === 0} />
        <KpiCard compact label="총 비용" value={formatWon(totals.cost)} chip="지출결의 자동집계" tone="red" empty={projects.length === 0} />
        <KpiCard compact label="순이익" value={formatWon(totals.profit)} chip={`마진 ${totals.revenue ? Math.round((totals.profit / totals.revenue) * 100) : 0}%`} tone="blue" empty={projects.length === 0} />
        <KpiCard compact label="미수금" value={formatWon(totals.receivable)} chip="확정−수령" tone="orange" empty={projects.length === 0} />
      </div>

      <div className="card solid mt">
        <h2 className="card-title">프로젝트 목록</h2>
        <p className="card-sub">프로젝트를 누르면 매출·비용·순이익·마진율 인포그래픽과 세부 내용이 열립니다. 비용은 연결된 지출결의에서 자동 집계됩니다.</p>
        {projects.length === 0 ? (
          <EmptyState text="등록된 프로젝트가 없습니다. ‘새 프로젝트 등록’으로 외주용역 항목을 추가하세요." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 170 }}>프로젝트</th>
                  <th style={{ width: 100 }}>거래처 구분</th>
                  <th style={{ width: 110 }}>상태</th>
                  <th style={{ width: 90 }}>책임자</th>
                  <th style={{ width: 110 }}>담당자</th>
                  <th style={{ width: 140 }}>분류</th>
                  <th className="num" style={{ width: 120 }}>확정금액</th>
                  <th className="num" style={{ width: 120 }}>월 반복</th>
                  <th className="num" style={{ width: 120 }}>비용</th>
                  <th className="num" style={{ width: 120 }}>순이익</th>
                  <th className="num" style={{ width: 80 }}>마진율</th>
                  <th style={{ width: 110 }}>수금</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((row) => (
                  <tr key={row.id} className="clickable" onClick={() => onOpenProject(row)}>
                    <td><span className="project-name-cell">{row.name}</span></td>
                    <td>{row.client_type || "-"}</td>
                    <td><span className="status-tag">{row.status}</span></td>
                    <td>{row.owner_label || "-"}</td>
                    <td>{projectMemoValue(row, "실무담당자") || projectMemoValue(row, "담당자") || "-"}</td>
                    <td>{getProjectCategoryLabel(row)}</td>
                    <td className="num">{formatWon(row._revenue)}</td>
                    <td className="num">{row._isMonthlyRecurring ? formatWon(row._monthlyRevenue) : "-"}</td>
                    <td className="num">{formatWon(row._cost)}</td>
                    <td className="num">{formatWon(row._profit)}</td>
                    <td className="num">{formatPercent(row._marginRate)}</td>
                    <td><span className={`chip ${row._receivable > 0 ? "orange" : "green"}`}>{row._receivable > 0 ? "미수 있음" : "수금 완료"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// 21,22번: 인건비·보상
function Compensation({
  people,
  departments,
  projects,
  bonuses,
  compReviews,
  onOpenPerson,
  onCreatePerson,
  onCreateBonus
}: {
  people: Person[];
  departments: Department[];
  projects: ProjectComputed[];
  bonuses: BonusPayment[];
  compReviews: CompensationReview[];
  onOpenPerson: (person: Person) => void;
  onCreatePerson: () => void;
  onCreateBonus: () => void;
}) {
  const totalSalary = people.reduce((sum, person) => sum + Number(person.annual_salary || 0), 0);
  const monthlySalaryTotal = Math.round(totalSalary / 12);
  const bonusTotal = bonuses.reduce((sum, bonus) => sum + Number(bonus.bonus_amount || 0), 0);

  function getDeptName(deptId: string | null) {
    if (!deptId) return "-";
    return departments.find((d) => d.id === deptId)?.name || "-";
  }

  return (
    <section className="section active">
      {/* 22번: 각 버튼이 맞는 동작을 하도록 - 직원/상여금만 별도, 나머지는 동일 직원등록 표시 제거 */}
      <div className="quick-actions quick-two compensation-actions">
        <QuickCard title="직원 추가" copy="사번 기준 직원 정보 생성" onClick={onCreatePerson} />
        <QuickCard title="상여금 추가" copy="프로젝트 순수익·지급률 기준 자동 계산" onClick={onCreateBonus} />
      </div>

      <div className="grid two compensation-highlights">
        <div className="point-card green no-margin">
          <div><div className="point-title">이달의 월급 총액</div><div className="point-copy">등록 직원 계약연봉 ÷ 12개월</div></div>
          <div className="point-value">{formatWon(monthlySalaryTotal)}</div>
        </div>
        <div className="point-card blue no-margin">
          <div><div className="point-title">연봉 총액</div><div className="point-copy">등록 직원 계약연봉 합계</div></div>
          <div className="point-value">{formatWon(totalSalary)}</div>
        </div>
      </div>

      <div className="compensation-layout">
        <div className="card solid">
          <h2 className="card-title">직원·연봉 현황</h2>
          <p className="card-sub">직원명을 누르면 연봉·인상률·상여금·투입 프로젝트 상세가 열립니다.</p>
          {people.length === 0 ? (
            <EmptyState text="등록된 직원이 없습니다. ‘직원 추가’로 등록하세요." />
          ) : (
            <div className="table-scroll compact-table">
              <table>
                <thead>
                  <tr><th style={{ width: 96 }}>이름</th><th style={{ width: 76 }}>직위</th><th style={{ width: 118 }}>부서</th><th className="num" style={{ width: 118 }}>계약연봉</th><th className="num" style={{ width: 118 }}>전년도</th><th style={{ width: 72 }}>상세</th></tr>
                </thead>
                <tbody>
                  {people.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.rank}</td>
                      <td>{getDeptName(person.department_id)}</td>
                      <td className="num">{formatWon(person.annual_salary)}</td>
                      <td className="num">{formatWon(person.previous_annual_salary)}</td>
                      <td><button className="btn small ghost" onClick={() => onOpenPerson(person)}>상세</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card mt">
          <h2 className="card-title">상여금·성과보상 현황</h2>
          <p className="card-sub">프로젝트 순수익과 지급률로 자동 계산된 상여금을 봅니다.</p>
          {bonuses.length === 0 ? (
            <EmptyState text="등록된 상여금이 없습니다. ‘상여금 추가’로 등록하세요." />
          ) : (
            <div className="metric-list">
              {bonuses.map((bonus) => (
                <Metric
                  key={bonus.id}
                  title={people.find((person) => person.id === bonus.person_id)?.name || "지급 대상 미정"}
                  copy={`${projects.find((project) => project.id === bonus.project_id)?.name || "프로젝트 미정"} · ${bonus.period_label || ""}`}
                  value={formatWon(bonus.bonus_amount)}
                />
              ))}
            </div>
          )}
          {bonuses.length > 0 && (
            <div className="point-card">
              <div><div className="point-title">상여금 합계</div><div className="point-copy">검토 전·승인 포함</div></div>
              <div className="point-value">{formatWon(bonusTotal)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card solid mt">
        <h2 className="card-title">근태 운영설정 참고</h2>
        <p className="card-sub">근태관리 운영설정의 기준값을 인건비 계산에서도 같은 기준으로 봅니다.</p>
        <div className="settings-reference-grid">
          <Metric title="기본 출근 스케줄" copy="직원별 주 근무일·출퇴근 시간 기준" value="주 5일 · 09:00-18:00" />
          <Metric title="미출근 기간" copy="무급/유급 여부가 급여 계산에 반영" value="급여 차감 확인" />
          <Metric title="주간 스케줄 변경" copy="특정 주만 다른 요일·시간 적용" value="주 단위 예외" />
          <Metric title="급여 계산 기준" copy="월 소정근로시간 기반 시급·월급 산정" value="월 174h 기준" />
        </div>
      </div>
    </section>
  );
}

function MarginCalculator({
  projects,
  onSaveProjectMargin
}: {
  projects: ProjectComputed[];
  onSaveProjectMargin: (projectId: string, draft: MarginDraft) => Promise<void>;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [mode, setMode] = useState<"lecture" | "project">("lecture");
  const [paymentFlow, setPaymentFlow] = useState<"company" | "instructor">("company");
  const [vatMode, setVatMode] = useState("include");
  const [unitPrice, setUnitPrice] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [teacherFee, setTeacherFee] = useState("0");
  const [instructorReceived, setInstructorReceived] = useState("0");
  const [fixedCost, setFixedCost] = useState("0");
  const [variableCost, setVariableCost] = useState("0");
  const [targetMargin, setTargetMargin] = useState("30");
  const [proofInstitution, setProofInstitution] = useState(false);
  const [proofCollection, setProofCollection] = useState(false);
  const [proofReceipt, setProofReceipt] = useState(false);
  const [saveState, setSaveState] = useState("프로젝트 선택 시 자동 저장");
  const loadingDraftRef = useRef(false);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;
  const count = Math.max(1, parseNumber(quantity));
  const grossRevenue = parseNumber(unitPrice) * count;
  const teacherNet = parseNumber(teacherFee);
  const directInstructorGross = paymentFlow === "instructor" ? (parseNumber(instructorReceived) || grossRevenue) : 0;
  const companyCollectionGross = paymentFlow === "instructor" ? Math.max(0, directInstructorGross - teacherNet) : grossRevenue;
  const revenueBaseGross = paymentFlow === "instructor" ? companyCollectionGross : grossRevenue;
  const netRevenue = vatMode === "include" ? Math.round(revenueBaseGross / 1.1) : revenueBaseGross;
  const vat = vatMode === "include" ? revenueBaseGross - netRevenue : Math.round(revenueBaseGross * 0.1);
  const fixed = parseNumber(fixedCost);
  const variable = parseNumber(variableCost);
  const companyCost = fixed + variable + (paymentFlow === "company" ? teacherNet : 0);
  const fullProjectNetRevenue = vatMode === "include" ? Math.round(grossRevenue / 1.1) : grossRevenue;
  const fullProjectCost = teacherNet + fixed + variable;
  const fullProjectProfit = fullProjectNetRevenue - fullProjectCost;
  const profit = netRevenue - companyCost;
  const margin = netRevenue ? Math.round((profit / netRevenue) * 1000) / 10 : 0;
  const targetMarginNumber = Number(targetMargin) || 0;
  const targetCostLimit = Math.round(netRevenue * (1 - targetMarginNumber / 100));
  const targetProfit = Math.round(netRevenue * (targetMarginNumber / 100));
  const gap = profit - targetProfit;
  const targetGapPercent = Math.round((margin - targetMarginNumber) * 10) / 10;
  const instructorTaxableNet = paymentFlow === "instructor" ? Math.max(0, directInstructorGross - companyCollectionGross) : teacherNet;
  const proofCount = [proofInstitution, proofCollection, proofReceipt].filter(Boolean).length;
  const proofLabel = paymentFlow === "instructor" ? `${proofCount}/3 확인` : "일반 수금";
  const compositionRows = [
    { label: "강사비", amount: teacherNet, tone: "teacher" },
    { label: "고정비", amount: fixed, tone: "fixed" },
    { label: "변동비", amount: variable, tone: "variable" },
    { label: "이익", amount: fullProjectProfit, tone: fullProjectProfit >= 0 ? "profit" : "loss" }
  ];
  const compositionTotal = compositionRows.reduce((sum, row) => sum + Math.max(0, row.amount), 0) || 1;
  const marginDraft = useMemo<MarginDraft>(() => ({
    mode,
    paymentFlow,
    vatMode,
    unitPrice,
    quantity,
    teacherFee,
    instructorReceived,
    fixedCost,
    variableCost,
    targetMargin,
    proofInstitution,
    proofCollection,
    proofReceipt
  }), [mode, paymentFlow, vatMode, unitPrice, quantity, teacherFee, instructorReceived, fixedCost, variableCost, targetMargin, proofInstitution, proofCollection, proofReceipt]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const project = projects.find((item) => item.id === selectedProjectId);
    if (!project) return;
    const saved = getProjectMarginDraft(project);
    loadingDraftRef.current = true;
    setMode(saved?.mode || "lecture");
    setPaymentFlow(saved?.paymentFlow || "company");
    setVatMode(saved?.vatMode || "include");
    setUnitPrice(saved?.unitPrice || formatMoneyInputValue(String(project._revenue || project.confirmed_amount || 0)));
    setQuantity(saved?.quantity || "1");
    setTeacherFee(saved?.teacherFee || "0");
    setInstructorReceived(saved?.instructorReceived || "");
    setFixedCost(saved?.fixedCost || formatMoneyInputValue(String(project._autoCost || project._cost || 0)));
    setVariableCost(saved?.variableCost || "0");
    setTargetMargin(saved?.targetMargin || "30");
    setProofInstitution(Boolean(saved?.proofInstitution));
    setProofCollection(Boolean(saved?.proofCollection));
    setProofReceipt(Boolean(saved?.proofReceipt));
    setSaveState(saved?.savedAt ? `저장됨 ${formatDateTime(saved.savedAt)}` : "새 계산 자동 저장 준비");
    window.setTimeout(() => { loadingDraftRef.current = false; }, 0);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSaveState("프로젝트 선택 시 자동 저장");
      return;
    }
    if (loadingDraftRef.current) return;
    setSaveState("저장 중");
    const timer = window.setTimeout(async () => {
      try {
        const draft = { ...marginDraft, savedAt: new Date().toISOString() };
        await onSaveProjectMargin(selectedProjectId, draft);
        setSaveState(`자동 저장됨 ${formatDateTime(draft.savedAt)}`);
      } catch (error) {
        console.warn("margin autosave failed", error);
        setSaveState("저장 실패");
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [selectedProjectId, marginDraft]);

  return (
    <section className="section active">
      <div className="card solid margin-basic">
        <div>
          <h2 className="card-title">기본 정보</h2>
          <p className="card-sub">프로젝트를 선택하면 계산값이 해당 프로젝트에 실시간 저장됩니다.</p>
        </div>
        <div className="margin-basic-grid">
          <label>프로젝트
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
              <option value="">프로젝트 선택</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label>기관 유형<input readOnly value={selectedProject?.client_type || "-"} /></label>
          <label>목표 마진율 (%)<input value={targetMargin} onChange={(e) => setTargetMargin(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" /></label>
          <div className="save-state"><span>{saveState}</span></div>
        </div>
        <div className="segmented">
          <button className={mode === "lecture" ? "active" : ""} type="button" onClick={() => setMode("lecture")}>강의</button>
          <button className={mode === "project" ? "active" : ""} type="button" onClick={() => setMode("project")}>프로젝트</button>
        </div>
      </div>

      <div className="margin-pdf-layout">
        <div className="margin-column">
          <div className="card margin-section">
            <h2 className="card-title">수입 구성</h2>
            <div className="modal-form margin-fields">
              <label>{mode === "lecture" ? "회당 수금단가" : "프로젝트 수금액"}<input value={unitPrice} onChange={(e) => setUnitPrice(formatMoneyInputValue(e.target.value))} inputMode="numeric" /></label>
              <label>{mode === "lecture" ? "회차" : "수량"}<input value={quantity} onChange={(e) => setQuantity(formatMoneyInputValue(e.target.value))} inputMode="numeric" /></label>
              <label>부가세 처리<select value={vatMode} onChange={(e) => setVatMode(e.target.value)}><option value="include">부가세 포함</option><option value="exclude">부가세 별도</option></select></label>
            </div>
            <div className="calc-box mt-sm">
              <div className="calc-row"><span>받은 총액</span><strong>{formatWon(grossRevenue)}</strong></div>
              <div className="calc-row"><span>공급가액(마진 기준)</span><strong>{formatWon(fullProjectNetRevenue)}</strong></div>
              <div className="calc-row"><span>부가세(납부할 금액)</span><strong>{formatWon(vatMode === "include" ? grossRevenue - fullProjectNetRevenue : Math.round(grossRevenue * 0.1))}</strong></div>
            </div>
          </div>

          <div className="card margin-section">
            <h2 className="card-title">강사</h2>
            <p className="card-sub">강사비와 기관 지급 흐름을 정리합니다.</p>
            <div className="modal-form margin-fields">
              <label className="wide">기관 지급 흐름<select value={paymentFlow} onChange={(e) => setPaymentFlow(e.target.value as "company" | "instructor")}><option value="company">회사로 직접 입금</option><option value="instructor">강사가 먼저 받고 회사가 회수</option></select></label>
              {paymentFlow === "instructor" && (
                <label>기관이 강사에게 입금한 금액<input value={instructorReceived} onChange={(e) => setInstructorReceived(formatMoneyInputValue(e.target.value))} inputMode="numeric" placeholder="총 입금액" /></label>
              )}
              <label>{paymentFlow === "instructor" ? "강사 실제 귀속액" : "강사비 합계"}<input value={teacherFee} onChange={(e) => setTeacherFee(formatMoneyInputValue(e.target.value))} inputMode="numeric" /></label>
            </div>
            {paymentFlow === "instructor" && (
              <div className="settlement-card">
                <div>
                  <h3>강사 직접수령 정산</h3>
                  <p>기관 입금액에서 강사 실제 귀속액을 뺀 금액을 회사가 회수하고, 그 회수액만큼 현금영수증 발행을 체크합니다.</p>
                </div>
                <div className="settlement-grid">
                  <Metric title="회사 회수 예정액" copy="강사 -> 회사 이체 요청" value={formatWon(companyCollectionGross)} />
                  <Metric title="현금영수증 발행액" copy="회사 수취분 기준" value={formatWon(companyCollectionGross)} />
                  <Metric title="강사 과세 기준 예상" copy="기관 입금 - 회사 회수" value={formatWon(instructorTaxableNet)} />
                  <Metric title="증빙 상태" copy="입금/이체/영수증" value={proofLabel} />
                </div>
                <div className="proof-checks">
                  <label className="check-label"><input type="checkbox" checked={proofInstitution} onChange={(e) => setProofInstitution(e.target.checked)} /><span>기관이 강사에게 입금한 캡처 확인</span></label>
                  <label className="check-label"><input type="checkbox" checked={proofCollection} onChange={(e) => setProofCollection(e.target.checked)} /><span>강사가 회사로 이체한 캡처 확인</span></label>
                  <label className="check-label"><input type="checkbox" checked={proofReceipt} onChange={(e) => setProofReceipt(e.target.checked)} /><span>현금영수증 발행 확인</span></label>
                </div>
              </div>
            )}
          </div>

          <div className="grid two margin-cost-grid">
            <div className="card margin-section">
              <h2 className="card-title">고정비</h2>
              <p className="card-sub">기획·제작처럼 한 번 드는 비용입니다.</p>
              <label className="single-field">합계<input value={fixedCost} onChange={(e) => setFixedCost(formatMoneyInputValue(e.target.value))} inputMode="numeric" /></label>
            </div>
            <div className="card margin-section">
              <h2 className="card-title">변동비</h2>
              <p className="card-sub">교통비·재료비처럼 횟수에 따라 반복되는 비용입니다.</p>
              <label className="single-field">합계<input value={variableCost} onChange={(e) => setVariableCost(formatMoneyInputValue(e.target.value))} inputMode="numeric" /></label>
            </div>
          </div>
        </div>

        <div className="margin-column">
          <div className="card margin-result">
            <h2 className="card-title">결과</h2>
            <p className="card-sub">PDF 결과 영역처럼 이익, 마진율, 목표 대비를 바로 봅니다.</p>
            <div className="proj-kpis">
              <div className="proj-kpi green"><span>{paymentFlow === "instructor" ? "회사 회수 공급가액" : "순매출"}</span><strong>{formatWon(netRevenue)}</strong></div>
              <div className="proj-kpi blue"><span>이익</span><strong>{formatWon(profit)}</strong></div>
              <div className="proj-kpi red"><span>마진율</span><strong>{margin}%</strong></div>
              <div className="proj-kpi amber"><span>목표 대비</span><strong>{targetGapPercent >= 0 ? `+${targetGapPercent}%p` : `${targetGapPercent}%p`}</strong></div>
            </div>
            <div className="margin-infographic">
              <h3>비용·이익 인포그래픽</h3>
              <div className="margin-stack">
                {compositionRows.map((row) => (
                  <span
                    key={row.label}
                    className={`margin-stack-segment ${row.tone}`}
                    style={{ width: `${Math.max(row.amount > 0 ? 8 : 0, Math.round((Math.max(0, row.amount) / compositionTotal) * 100))}%` }}
                    title={`${row.label}: ${formatWon(row.amount)}`}
                  />
                ))}
              </div>
              <div className="margin-legend">
                {compositionRows.map((row) => {
                  const percent = fullProjectNetRevenue ? Math.round((row.amount / fullProjectNetRevenue) * 100) : 0;
                  return (
                    <div className="margin-legend-row" key={row.label}>
                      <span><i className={row.tone} />{row.label}</span>
                      <strong>{formatWon(row.amount)}</strong>
                      <em>{percent}%</em>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="calc-box">
              <div className="calc-row"><span>강사비 합계</span><strong>{formatWon(teacherNet)}</strong></div>
              <div className="calc-row"><span>고정비 합계</span><strong>{formatWon(fixed)}</strong></div>
              <div className="calc-row"><span>변동비 합계</span><strong>{formatWon(variable)}</strong></div>
              <div className="calc-row"><span>총 비용 합계</span><strong>{formatWon(fullProjectCost)}</strong></div>
              <div className="calc-row"><span>마진율</span><strong>{margin}%</strong></div>
              <div className="calc-row"><span>목표 비용 한도</span><strong>{formatWon(targetCostLimit)}</strong></div>
              <div className="calc-row total"><span>목표 대비</span><strong>{gap >= 0 ? `${formatWon(gap)} 여유` : `${formatWon(Math.abs(gap))} 부족`}</strong></div>
            </div>
            <div className="calc-box mt-sm">
              <div className="calc-row"><span>받은 총액</span><strong>{formatWon(grossRevenue)}</strong></div>
              {paymentFlow === "instructor" && <div className="calc-row"><span>강사 직접 수령액</span><strong>{formatWon(directInstructorGross)}</strong></div>}
              {paymentFlow === "instructor" && <div className="calc-row"><span>회사 회수 총액</span><strong>{formatWon(companyCollectionGross)}</strong></div>}
              <div className="calc-row"><span>공급가액(마진 기준)</span><strong>{formatWon(netRevenue)}</strong></div>
              <div className="calc-row"><span>부가세</span><strong>{formatWon(vat)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// 23,24번: 인력투입·매출분석. 각 버튼이 다른 동작. 수익성 지도 클릭 시 프로젝트 상세.
function Resource({
  projects,
  people,
  labor,
  onCreateLabor,
  onOpenProject
}: {
  projects: ProjectComputed[];
  people: Person[];
  labor: ProjectLaborAllocation[];
  onCreateLabor: () => void;
  onOpenProject: (project: ProjectComputed) => void;
}) {
  const totalCapacity = people.filter((p) => p.is_active).reduce((sum, p) => sum + Number(p.monthly_capacity_hours || calcMonthlyCapacity(5, 8)), 0);
  const totalHours = labor.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const totalMm = labor.reduce((sum, item) => sum + Number(item.man_months || 0), 0);
  const totalRevenue = projects.reduce((s, p) => s + p._revenue, 0);

  return (
    <section className="section active">
      {/* 23번: 버튼별 동작 분리 - 맨먼스 입력 외 나머지는 안내성으로 단순화 */}
      <div className="quick-actions">
        <QuickCard title="맨먼스 입력" copy="프로젝트별 직위·투입률 등록" onClick={onCreateLabor} />
        <InfoCard title="총 가용시간" copy="활성 직원 월 가용시간 합계" value={totalCapacity ? `${totalCapacity}h` : "직원 등록 필요"} />
        <InfoCard title="확정 투입" copy="등록된 맨먼스 투입 시간" value={`${Math.round(totalHours)}h`} />
        <InfoCard title="평균 가동률" copy="투입 ÷ 가용시간" value={totalCapacity ? `${Math.round((totalHours / totalCapacity) * 100)}%` : "-"} />
      </div>

      <div className="grid two">
        <div className="card">
          <h2 className="card-title">수익성 지도</h2>
          <p className="card-sub">버블을 누르면 해당 프로젝트 상세가 열립니다. 가로축은 마진율, 세로축은 매출 규모입니다.</p>
          <ProfitMap projects={projects} onOpenProject={onOpenProject} />
        </div>

        <div className="card">
          <h2 className="card-title">맨먼스·판단 카드</h2>
          {totalMm === 0 && projects.length === 0 ? (
            <EmptyState text="프로젝트와 맨먼스를 입력하면 분석 지표가 채워집니다." />
          ) : (
            <div className="metric-list">
              <Metric title="1인월 매출" copy="총 매출 ÷ 총 맨먼스" value={totalMm ? formatWon(totalRevenue / totalMm) : "맨먼스 입력 필요"} />
              <Metric title="대표 투입 건수" copy="대표 직위 투입 항목" value={`${labor.filter((item) => item.rank === "대표").length}건`} />
              <Metric title="총 맨먼스" copy="전체 프로젝트 합계" value={`${totalMm.toFixed(2)}MM`} />
              <Metric title="등록 프로젝트" copy="사업·매출관리 기준" value={`${projects.length}개`} />
            </div>
          )}
        </div>
      </div>

      <div className="card solid mt">
        <h2 className="card-title">프로젝트별 인력투입 맨먼스</h2>
        <p className="card-sub">프로젝트별 직위 투입 비율을 100% 기준으로 나눠 봅니다.</p>
        <div className="legend">
          <span className="legend-item"><i className="legend-dot a" />대표</span>
          <span className="legend-item"><i className="legend-dot b" />본부장</span>
          <span className="legend-item"><i className="legend-dot c" />책임</span>
          <span className="legend-item"><i className="legend-dot d" />선임</span>
          <span className="legend-item"><i className="legend-dot e" />매니저</span>
        </div>
        {projects.length === 0 ? (
          <EmptyState text="등록된 프로젝트가 없습니다." />
        ) : (
          projects.map((project) => {
            const items = labor.filter((item) => item.project_id === project.id);
            if (items.length === 0) return (
              <div key={project.id} className="stack-row">
                <strong className="stack-project-name">{project.name}</strong>
                <div className="stack-bar empty-bar" />
                <span className="num">0.00MM</span>
              </div>
            );
            const total = items.reduce((sum, item) => sum + Number(item.allocation_rate || 0), 0);
            const segments = items.map((item) => [item.rank, total ? Math.round((Number(item.allocation_rate) / total) * 100) : 0] as [Rank, number]);
            const mm = items.reduce((sum, item) => sum + Number(item.man_months || 0), 0) || Number(project.man_months || 0);
            return <StackRow key={project.id} project={project.name} segments={segments} mm={`${mm.toFixed(2)}MM`} />;
          })
        )}
      </div>
    </section>
  );
}

// 25,26번: 조직·권한관리. 관리자확인/권한상태 버튼 제거. 조직도에 직원 배치.
function Org({
  currentPerson,
  canManage,
  people,
  departments,
  permissions,
  onCreatePerson,
  onCreatePermission,
  onDeletePermission,
  onOpenPerson
}: {
  currentPerson: Person;
  canManage: boolean;
  people: Person[];
  departments: Department[];
  permissions: PagePermission[];
  onCreatePerson: () => void;
  onCreatePermission: () => void;
  onDeletePermission: (permission: PagePermission) => void;
  onOpenPerson: (person: Person) => void;
}) {
  const ranksOrder: Rank[] = ["책임", "선임", "매니저"];

  return (
    <section className="section active">
      <div className="card action-panel org-action-panel">
        <div className="action-panel-head">
          <div>
            <h2 className="card-title">조직 관리 작업</h2>
            <p className="card-sub">직원은 사번 기준으로 등록하고, 페이지별 권한은 별도로 부여합니다.</p>
          </div>
        </div>
        <div className="quick-actions quick-two no-margin">
          <QuickCard title="직원 추가" copy="사번·휴대전화 기준으로 직원 등록" onClick={onCreatePerson} />
          <QuickCard title="페이지 권한 추가" copy="선택한 사람만 페이지 접근 허용" onClick={onCreatePermission} />
        </div>
      </div>

      <div className="card solid section-gap">
        <h2 className="card-title">조직도</h2>
        <p className="card-sub">대표 → 본부장 → 각 부서, 부서별 책임·선임·매니저 아래 실제 직원이 배치됩니다. 이름을 누르면 상세가 열립니다.</p>

        {/* 대표 */}
        <div className="org-tree">
          <div className="org-level">
            {people.filter((p) => p.rank === "대표").map((p) => (
              <button key={p.id} className="org-person rep" onClick={() => onOpenPerson(p)}>
                <span className="op-rank">대표</span><strong>{p.name}</strong>
              </button>
            ))}
            {people.filter((p) => p.rank === "대표").length === 0 && <div className="org-person empty">대표 미등록</div>}
          </div>

          <div className="org-connector" />

          {/* 본부장 */}
          <div className="org-level">
            {people.filter((p) => p.rank === "본부장").map((p) => (
              <button key={p.id} className="org-person hq" onClick={() => onOpenPerson(p)}>
                <span className="op-rank">본부장</span><strong>{p.name}</strong>
              </button>
            ))}
            {people.filter((p) => p.rank === "본부장").length === 0 && <div className="org-person empty">본부장 미등록</div>}
          </div>

          <div className="org-connector" />

          {/* 부서별 컬럼, 각 부서 안에 책임/선임/매니저 */}
          <div className="org-depts">
            {departments.map((dept) => {
              const deptPeople = people.filter((p) => p.department_id === dept.id);
              return (
                <div className="org-dept-col" key={dept.id}>
                  <div className="org-dept-head">{dept.name}</div>
                  {ranksOrder.map((rk) => {
                    const members = deptPeople.filter((p) => p.rank === rk);
                    if (members.length === 0) return null;
                    return (
                      <div className="org-rank-group" key={rk}>
                        <div className="org-rank-label">{rk}</div>
                        {members.map((m) => (
                          <button key={m.id} className="org-person small" onClick={() => onOpenPerson(m)}>
                            <strong>{m.name}</strong>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                  {deptPeople.filter((p) => ranksOrder.includes(p.rank)).length === 0 && (
                    <div className="org-person small empty">배정 인원 없음</div>
                  )}
                </div>
              );
            })}
          </div>
          {/* 부서 미배정 직원 */}
          {people.filter((p) => !p.department_id && !["대표", "본부장"].includes(p.rank)).length > 0 && (
            <div className="org-unassigned">
              <div className="org-rank-label">부서 미배정</div>
              <div className="org-level">
                {people.filter((p) => !p.department_id && !["대표", "본부장"].includes(p.rank)).map((p) => (
                  <button key={p.id} className="org-person small" onClick={() => onOpenPerson(p)}>
                    <strong>{p.name}</strong><span className="op-rank-sm">{p.rank}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card mt">
        <h2 className="card-title">페이지별 권한 현황</h2>
        <p className="card-sub">대표·본부장은 기본 전체 접근입니다. 그 외 직원은 부여된 페이지만 볼 수 있습니다.</p>
        {permissions.length === 0 ? (
          <EmptyState text="추가된 페이지 권한이 없습니다." />
        ) : (
          <div className="permission-list">
            {permissions.map((permission) => (
              <div className="permission-row" key={permission.id}>
                <div>
                  <strong>{people.find((person) => person.id === permission.person_id)?.name || "직원"}</strong>
                  <span>{permission.page_key} · {permission.permission}</span>
                </div>
                {canManage && <button className="btn small danger" type="button" onClick={() => onDeletePermission(permission)}>삭제</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Modal({
  modal, setModal, selectedReview, selectedProject, selectedExpense, selectedPerson,
  currentPerson, people, mobileDevices, mobileDeviceTableReady, departments, cash, projects, expenses, cards, categories, bonuses, labor, compReviews,
  onReviewStatus, onCreateProject, onUpdateProject, onCompleteProject, onCreateExpense, onCreateRecurring, onCreatePerson,
  onCreateBonus, onCreateLabor, onCreatePermission, onCreateCash, onUpdateExpense, onCreateCategory,
  onDeleteCategory, onCreateCard, onDeleteCard, onSaveMobileDevice, onDeleteMobileDevice, onDeleteProject, onDeleteExpense, onDeleteReview, onEditPerson
}: {
  modal: ModalKey;
  setModal: (modal: ModalKey) => void;
  selectedReview: ReviewItem | null;
  selectedProject: ProjectComputed | null;
  selectedExpense: ExpenseRequest | null;
  selectedPerson: Person | null;
  currentPerson: Person;
  people: Person[];
  mobileDevices: MobileReceiptDevice[];
  mobileDeviceTableReady: boolean;
  departments: Department[];
  cash: CashSnapshot[];
  projects: ProjectComputed[];
  expenses: ExpenseRequest[];
  cards: PaymentCard[];
  categories: ExpenseCategoryItem[];
  bonuses: BonusPayment[];
  labor: ProjectLaborAllocation[];
  compReviews: CompensationReview[];
  onReviewStatus: (review: ReviewItem, status: ReviewStatus) => Promise<void>;
  onCreateProject: (formData: FormData) => Promise<void>;
  onUpdateProject: (formData: FormData) => Promise<void>;
  onCompleteProject: (project: BusinessProject) => Promise<void>;
  onCreateExpense: (formData: FormData) => Promise<void>;
  onCreateRecurring: (formData: FormData) => Promise<void>;
  onCreatePerson: (formData: FormData) => Promise<void>;
  onCreateBonus: (formData: FormData) => Promise<void>;
  onCreateLabor: (formData: FormData) => Promise<void>;
  onCreatePermission: (formData: FormData) => Promise<void>;
  onCreateCash: (formData: FormData) => Promise<void>;
  onUpdateExpense: (formData: FormData) => Promise<void>;
  onCreateCategory: (formData: FormData) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onCreateCard: (formData: FormData) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
  onSaveMobileDevice: (formData: FormData) => Promise<void>;
  onDeleteMobileDevice: (deviceId: string) => Promise<void>;
  onDeleteProject: (project: BusinessProject) => Promise<void>;
  onDeleteExpense: (expense: ExpenseRequest) => Promise<void>;
  onDeleteReview: (review: ReviewItem) => Promise<void>;
  onEditPerson: (person: Person) => void;
}) {
  if (!modal) return null;
  const close = () => setModal(null);

  return (
    <div className="modal active">
      <div className="modal-card">
        {modal === "projectWizard" && (
          <ProjectWizardForm people={people} onSubmit={onCreateProject} onClose={close} />
        )}

        {modal === "projectForm" && (
          <FormModal title="새 프로젝트 등록" desc="외주용역 항목 기준입니다. 비용은 연결된 지출결의에서 자동 집계되므로 입력하지 않습니다." onSubmit={onCreateProject} onClose={close} draftKey="lupl.draft.projectForm">
            <label>프로젝트 내용<input name="name" required placeholder="프로젝트명을 입력하세요" /></label>
            <label>거래처/기관명<input name="client_name" placeholder="거래처 또는 기관명을 입력하세요" /></label>
            <label>거래처 구분<select name="client_type"><option value="">선택</option>{clientTypes.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>상태<select name="status" defaultValue="접수">{projectStatuses.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>책임자<select name="owner_label"><option value="">선택</option>{people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></label>
            <label>실무 담당자<input name="operator_label" list="project-form-operator-options" placeholder="실무 담당자 이름" /><datalist id="project-form-operator-options">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist></label>
            <label>유입 경로<select name="inflow_route"><option value="">선택</option>{inflowRoutes.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label>확정 금액(견적·계약 총액)<input className="money-input" name="confirmed_amount" defaultValue="0" onInput={handleMoneyInput} /></label>
            <label>수령 금액(실입금)<input className="money-input" name="received_amount" defaultValue="0" onInput={handleMoneyInput} /></label>
            <label>매출 부가세 처리<select name="revenue_tax_mode" defaultValue="부가세 포함"><option>부가세 포함</option><option>면세·부가세 없음</option></select><span className="field-hint">부가세는 회사 돈이 아니라 잠시 보관하는 세금 봉투입니다.</span></label>
            <label>대금 수령 상태<select name="receipt_status" defaultValue="미청구">{receiptStatuses.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label>실무 담당자 연락처<input name="contact" placeholder="전화/메일" /></label>
            <label>입금 예정일<input type="date" name="payment_due_date" /></label>
            <label>마감 날짜<input type="date" name="due_date" /></label>
            <label>세금계산서 발행일<input type="date" name="tax_invoice_date" /></label>
            <label>매출 인식일<input type="date" name="revenue_recognition_date" /><span className="field-hint">일을 끝내 고객에게 넘긴 날입니다.</span></label>
            <label>실제 입금일<input type="date" name="received_date" /><span className="field-hint">돈이 실제 통장에 들어온 날입니다.</span></label>
            <label className="check-label"><input type="checkbox" name="repeat_client" /><span>반복 가능 고객</span></label>
            <ProjectCategoryFields />
            <label className="wide">비고/메모<textarea name="memo" /></label>
          </FormModal>
        )}

        {modal === "projectEdit" && selectedProject && (
          <ProjectEditForm project={selectedProject} people={people} onSubmit={onUpdateProject} onClose={close} />
        )}

        {modal === "expenseForm" && (
          <ExpenseForm cards={cards} categories={categories} projects={projects} onSubmit={onCreateExpense} onClose={close} />
        )}

        {modal === "recurringForm" && (
          <RecurringWizardForm cards={cards} onSubmit={onCreateRecurring} onClose={close} />
        )}

        {modal === "expenseEdit" && selectedExpense && (
          <ExpenseEditForm expense={selectedExpense} cards={cards} categories={categories} projects={projects} onSubmit={onUpdateExpense} onClose={close} />
        )}

        {modal === "personForm" && (
          <FormModal
            title={selectedPerson ? "직원/내 정보 수정" : "직원 등록"}
            desc={selectedPerson ? "이름, 사번, 연락처, 연봉 정보를 수정합니다. 본인 계정은 새 비밀번호를 입력해 직접 변경할 수 있습니다." : "직원은 사번으로 등록합니다. 관리자는 이메일과 사번을 모두 입력할 수 있고, 이메일이 없으면 사번 기반 내부 로그인 계정을 생성합니다."}
            onSubmit={onCreatePerson}
            onClose={close}
            draftKey={selectedPerson ? undefined : "lupl.draft.personForm"}
          >
            <input type="hidden" name="person_id" value={selectedPerson?.id || ""} />
            <label>이름<input name="name" required defaultValue={selectedPerson?.name || ""} placeholder="홍길동" /></label>
            <label>사번<input name="employee_number" inputMode="numeric" pattern="[0-9]*" required={!selectedPerson} defaultValue={selectedPerson?.employee_number || ""} placeholder="20220612001" /></label>
            <label>이메일<span className="field-hint">관리자는 이메일·사번 모두 사용 가능</span><input name="email" type="email" defaultValue={selectedPerson?.email || ""} placeholder="member@lupl.kr" /></label>
            <label>휴대전화<input name="phone" defaultValue={formatPhoneNumber(selectedPerson?.phone || "")} onInput={handlePhoneInput} placeholder="010-0000-1234" /></label>
            <label>직위<select name="rank" defaultValue={selectedPerson?.rank || "매니저"}>{ranks.map((rank) => <option key={rank}>{rank}</option>)}</select></label>
            <label>부서<select name="department_id" defaultValue={selectedPerson?.department_id || ""}><option value="">선택 안 함</option>{departments.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
            <label>입사일<input type="date" name="hire_date" defaultValue={selectedPerson?.hire_date || ""} /></label>
            <SalaryFields person={selectedPerson} />
            {selectedPerson?.id === currentPerson.id && (
              <label className="wide">새 비밀번호<span className="field-hint">입력한 경우에만 변경됩니다. 비밀번호는 평문으로 저장하지 않습니다.</span><input name="new_password" type="password" minLength={6} placeholder="새 비밀번호" /></label>
            )}
            {!selectedPerson && <div className="form-help wide">초기 비밀번호는 lupl+휴대전화 뒷번호 4자리로 생성되며, 직원은 로그인 후 본인 정보에서 변경할 수 있습니다.</div>}
            <label className="wide">메모<textarea name="memo" defaultValue={selectedPerson?.memo || ""} /></label>
          </FormModal>
        )}

        {modal === "bonusForm" && (
          <BonusForm people={people} projects={projects} onSubmit={onCreateBonus} onClose={close} />
        )}

        {modal === "laborForm" && (
          <FormModal title="프로젝트별 맨먼스 입력" desc="직위별 투입률과 맨먼스를 저장합니다." onSubmit={onCreateLabor} onClose={close} draftKey="lupl.draft.laborForm">
            <label>프로젝트<select name="project_id" required>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>직원<select name="person_id"><option value="">선택 안 함</option>{people.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>직위<select name="rank">{ranks.map((rank) => <option key={rank}>{rank}</option>)}</select></label>
            <label>투입률<input name="allocation_rate" defaultValue="35%" /></label>
            <label>맨먼스<input name="man_months" defaultValue="0.35" /></label>
            <label>시간<input name="hours" defaultValue="56" /></label>
          </FormModal>
        )}

        {modal === "permissionForm" && (
          <FormModal title="페이지별 권한 추가" desc="선택한 사람에게 특정 페이지 접근 권한을 부여합니다." onSubmit={onCreatePermission} onClose={close} draftKey="lupl.draft.permissionForm">
            <label>직원<select name="person_id" required>{people.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>페이지<select name="page_key">{menu.map((m) => <option value={pageKeyMap[m.key]} key={m.key}>{m.label}</option>)}</select></label>
            <label>권한<select name="permission"><option>보기만 가능</option><option>입력 가능</option><option>승인 가능</option><option>관리자</option></select></label>
          </FormModal>
        )}

        {modal === "cashForm" && (
          <CashForm onSubmit={onCreateCash} onClose={close} />
        )}

        {modal === "cashHistory" && (
          <CashHistory cash={cash} onClose={close} onAddCash={() => setModal("cashForm")} />
        )}

        {modal === "categoryManage" && (
          <CategoryManage categories={categories} onCreate={onCreateCategory} onDelete={onDeleteCategory} onClose={close} />
        )}

        {modal === "cardManage" && (
          <CardManage cards={cards} onCreate={onCreateCard} onDelete={onDeleteCard} onClose={close} />
        )}

        {modal === "mobileDeviceManage" && (
          <MobileDeviceManage
            devices={mobileDevices}
            people={people}
            expenses={expenses}
            tableReady={mobileDeviceTableReady}
            onSave={onSaveMobileDevice}
            onDelete={onDeleteMobileDevice}
            onClose={close}
          />
        )}

        {(modal === "expenseReview" || modal === "taxReview" || modal === "projectDetail" || modal === "employeeDetail" || modal === "reviewDetail") && (
          <DetailModal
            modal={modal}
            selectedReview={selectedReview}
            selectedProject={selectedProject}
            selectedExpense={selectedExpense}
            selectedPerson={selectedPerson || currentPerson}
            people={people}
            mobileDevices={mobileDevices}
            cards={cards}
            projects={projects}
            bonuses={bonuses}
            labor={labor}
            compReviews={compReviews}
            onClose={close}
            onEditExpense={() => setModal("expenseEdit")}
            onReviewStatus={onReviewStatus}
            onDeleteProject={onDeleteProject}
            onCompleteProject={onCompleteProject}
            onDeleteExpense={onDeleteExpense}
            onDeleteReview={onDeleteReview}
            onEditProject={() => setModal("projectEdit")}
            onEditPerson={onEditPerson}
          />
        )}
      </div>
    </div>
  );
}

// 7,8,9번: 지출결의 폼 - 사용용도 설명, 결제방식/카드 대중소분류, 이체상태 선택, 과거 목적 자동완성
type ProjectWizardStep = {
  key: string;
  title: string;
  required?: boolean;
  body: React.ReactNode;
};

function CashForm({
  onSubmit, onClose
}: {
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const draftKey = "lupl.draft.cashForm";
  const recoveryOfferKey = "lupl.draft.cashFormRestoreOffer.v1";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [accounts, setAccounts] = useState([{ id: crypto.randomUUID(), bank: "", label: "", balance: "" }]);
  const [transfers, setTransfers] = useState([{ id: crypto.randomUUID(), purpose: "", amount: "", date: today(), memo: "" }]);
  const total = accounts.reduce((sum, item) => sum + (Number(item.balance.replace(/[^0-9]/g, "")) || 0), 0);

  // 저장하지 못한 입력 내용 복구
  useEffect(() => {
    const saved = draftStore.read(draftKey) as { month?: string; accounts?: typeof accounts; transfers?: typeof transfers } | null;
    if (!saved) {
      if (!window.localStorage.getItem(recoveryOfferKey) && window.confirm("방금 보내신 현금 현황 입력 내용을 불러오시겠습니까?")) {
        setMonth("2026-06");
        setAccounts([
          { id: crypto.randomUUID(), bank: "국민은행", label: "기업운영비용", balance: "1,390,588" },
          { id: crypto.randomUUID(), bank: "아이뱅크", label: "기술보증기금", balance: "128,153,360" },
          { id: crypto.randomUUID(), bank: "아이뱅크", label: "운영비 통장", balance: "453,899" }
        ]);
        setTransfers([
          { id: crypto.randomUUID(), purpose: "하나캐피탈(차량 렌트)", amount: "607,090", date: "2026-06-15", memo: "" }
        ]);
      }
      window.localStorage.setItem(recoveryOfferKey, "shown");
      return;
    }
    const hasContent = (saved.accounts || []).some((a) => a.bank || a.label || a.balance) || (saved.transfers || []).some((t) => t.purpose || t.amount);
    if (hasContent && window.confirm("저장하지 못한 현금 현황 입력 내용이 있습니다. 이어서 작성할까요?")) {
      if (saved.month) setMonth(saved.month);
      if (saved.accounts?.length) setAccounts(saved.accounts);
      if (saved.transfers?.length) setTransfers(saved.transfers);
    } else {
      draftStore.clear(draftKey);
    }
  }, []);

  // 입력 중 자동 임시저장
  useEffect(() => {
    draftStore.write(draftKey, { month, accounts, transfers });
  }, [month, accounts, transfers]);

  function updateAccount(id: string, key: "bank" | "label" | "balance", value: string) {
    setAccounts((items) => items.map((item) => item.id === id ? { ...item, [key]: key === "balance" ? formatMoneyInputValue(value) : value } : item));
  }

  function updateTransfer(id: string, key: "purpose" | "amount" | "date" | "memo", value: string) {
    setTransfers((items) => items.map((item) => item.id === id ? { ...item, [key]: key === "amount" ? formatMoneyInputValue(value) : value } : item));
  }

  return (
    <>
      <ModalHead title="현금 현황 입력" desc="은행별·통장별 잔액을 적으면 합계가 현재 현금으로 저장됩니다. 자동이체는 지출결의로 같이 등록됩니다." onClose={onClose} />
      <div className="alert-top info compact-notice modal-notice">
        <div>
          <strong>현재 현금만 입력하세요.</strong>
          <span>매출·지출·미수금·지급예정은 프로젝트, 지출결의, 직원 연봉에서 자동 계산됩니다.</span>
        </div>
      </div>
      <form
        className="modal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            await onSubmit(formData);
            draftStore.clear(draftKey); // 성공 시 임시저장 삭제
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "저장에 실패했습니다. 입력 내용은 임시저장했어요.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>기준 월<input type="month" name="snapshot_month" value={month} onChange={(event) => setMonth(event.target.value)} required /></label>
        <input type="hidden" name="current_cash" value={total} />

        <div className="wide form-section">
          <div className="form-section-head">
            <strong>은행별·통장별 잔액</strong>
            <button className="btn small" type="button" onClick={() => setAccounts((items) => [...items, { id: crypto.randomUUID(), bank: "", label: "", balance: "" }])}>통장 추가</button>
          </div>
          {accounts.map((item, index) => (
            <div className="inline-row" key={item.id}>
              <input name="account_bank" value={item.bank} onChange={(event) => updateAccount(item.id, "bank", event.target.value)} placeholder="은행명" />
              <input name="account_label" value={item.label} onChange={(event) => updateAccount(item.id, "label", event.target.value)} placeholder="통장명" />
              <input name="account_balance" value={item.balance} onChange={(event) => updateAccount(item.id, "balance", event.target.value)} placeholder="잔액" inputMode="numeric" />
              <button className="btn small" type="button" onClick={() => setAccounts((items) => items.filter((row) => row.id !== item.id))} disabled={accounts.length === 1}>삭제</button>
              {index === accounts.length - 1 && <span className="field-hint">합계 {formatWon(total)}</span>}
            </div>
          ))}
        </div>

        <div className="wide form-section">
          <div className="form-section-head">
            <strong>자동이체 처리된 지출</strong>
            <button className="btn small" type="button" onClick={() => setTransfers((items) => [...items, { id: crypto.randomUUID(), purpose: "", amount: "", date: today(), memo: "" }])}>자동이체 추가</button>
          </div>
          {transfers.map((item) => (
            <div className="inline-row transfer-row" key={item.id}>
              <input name="auto_transfer_purpose" value={item.purpose} onChange={(event) => updateTransfer(item.id, "purpose", event.target.value)} placeholder="목적/내용" />
              <input name="auto_transfer_amount" value={item.amount} onChange={(event) => updateTransfer(item.id, "amount", event.target.value)} placeholder="금액" inputMode="numeric" />
              <input name="auto_transfer_date" type="date" value={item.date} onChange={(event) => updateTransfer(item.id, "date", event.target.value)} />
              <input name="auto_transfer_memo" value={item.memo} onChange={(event) => updateTransfer(item.id, "memo", event.target.value)} placeholder="메모" />
              <button className="btn small" type="button" onClick={() => setTransfers((items) => items.filter((row) => row.id !== item.id))} disabled={transfers.length === 1}>삭제</button>
            </div>
          ))}
        </div>

        <div className="form-help wide">통장별 잔액은 합계 계산용으로 사용되고, 자동이체 항목은 지출결의에 새로 등록됩니다.</div>
        {message && <div className="form-help wide" style={{ color: "#c0392b" }}>{message}</div>}
        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>닫기</button>
          <button className="btn blue" disabled={busy}>{busy ? "저장 중" : "저장"}</button>
        </div>
      </form>
    </>
  );
}

function ProjectWizardForm({
  people, onSubmit, onClose
}: {
  people: Person[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const firstMajor = Object.keys(projectCategoryTree)[0] || "기타";
  const firstMiddle = Object.keys(projectCategoryTree[firstMajor] || {})[0] || "기타";
  const firstSmall = (projectCategoryTree[firstMajor]?.[firstMiddle] || ["기타"])[0] || "기타";
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({
    client_type: "기업",
    status: "접수",
    receipt_status: "미청구",
    inflow_route: "직접 문의",
    confirmed_amount: "0",
    received_amount: "0",
    project_major_category: firstMajor,
    project_middle_category: firstMiddle,
    project_small_category: firstSmall,
    payment_due_cycle: "once",
    revenue_tax_mode: "부가세 포함",
    repeat_client: "false"
  });

  const draftKey = "lupl.projectWizardDraft.v2";

  useEffect(() => {
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { step?: number; answers?: Record<string, string> };
      if (parsed.answers && Object.keys(parsed.answers).length && window.confirm("저장하지 못한 프로젝트 입력 내용이 있습니다. 이어서 작성할까요?")) {
        setAnswers((prev) => ({ ...prev, ...parsed.answers }));
        setStep(Math.min(Math.max(Number(parsed.step || 0), 0), 12));
      } else {
        window.localStorage.removeItem(draftKey);
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify({ step, answers }));
  }, [step, answers]);

  function setField(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function setMajor(value: string) {
    const nextMiddle = Object.keys(projectCategoryTree[value] || {})[0] || "기타";
    const nextSmall = (projectCategoryTree[value]?.[nextMiddle] || ["기타"])[0] || "기타";
    setAnswers((prev) => ({
      ...prev,
      project_major_category: value,
      project_middle_category: nextMiddle,
      project_small_category: nextSmall
    }));
  }

  function setMiddle(value: string) {
    const major = answers.project_major_category || firstMajor;
    const nextSmall = (projectCategoryTree[major]?.[value] || ["기타"])[0] || "기타";
    setAnswers((prev) => ({
      ...prev,
      project_middle_category: value,
      project_small_category: nextSmall
    }));
  }

  const major = answers.project_major_category || firstMajor;
  const middle = answers.project_middle_category || firstMiddle;
  const middles = Object.keys(projectCategoryTree[major] || {});
  const smalls = projectCategoryTree[major]?.[middle] || ["기타"];

  function closeWizard() {
    const hasDraft = Boolean(answers.name || answers.client_name || parseNumber(answers.confirmed_amount || null) > 0);
    if (hasDraft && !window.confirm("작성 중인 내용은 임시저장됩니다. 나가시겠습니까?")) return;
    onClose();
  }

  const steps: ProjectWizardStep[] = [
    {
      key: "name",
      title: "새 프로젝트 명이 뭔가요?",
      required: true,
      body: <input autoFocus value={answers.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="프로젝트명을 입력하세요" />
    },
    {
      key: "client_name",
      title: "거래처나 기관명은 무엇인가요?",
      body: <input autoFocus value={answers.client_name || ""} onChange={(e) => setField("client_name", e.target.value)} placeholder="거래처 또는 기관명을 입력하세요" />
    },
    {
      key: "client_type",
      title: "거래처 구분을 선택해 주세요.",
      body: <select value={answers.client_type || ""} onChange={(e) => setField("client_type", e.target.value)}>{clientTypes.map((item) => <option key={item}>{item}</option>)}</select>
    },
    {
      key: "status",
      title: "현재 프로젝트 상태는 어디인가요?",
      body: <select value={answers.status || "접수"} onChange={(e) => setField("status", e.target.value)}>{projectStatuses.map((item) => <option key={item}>{item}</option>)}</select>
    },
    {
      key: "owner_label",
      title: "책임자는 누구인가요?",
      body: <select value={answers.owner_label || ""} onChange={(e) => setField("owner_label", e.target.value)}><option value="">선택 안 함</option>{people.map((person) => <option value={person.name} key={person.id}>{person.name}</option>)}</select>
    },
    {
      key: "operator_label",
      title: "우리 팀 실무 담당자는 누구인가요?",
      body: (
        <>
          <input value={answers.operator_label || ""} onChange={(e) => setField("operator_label", e.target.value)} list="project-operator-options" placeholder="실무 담당자 이름 입력" />
          <datalist id="project-operator-options">{people.map((person) => <option value={person.name} key={person.id} />)}</datalist>
        </>
      )
    },
    {
      key: "money",
      title: "확정 금액과 수령 금액을 입력해 주세요.",
      body: (
        <div className="wizard-stack">
          <div className="wizard-pair">
            <input value={answers.confirmed_amount || ""} onChange={(e) => setField("confirmed_amount", formatMoneyInputValue(e.target.value))} placeholder="확정 금액" inputMode="numeric" />
            <input value={answers.received_amount || ""} onChange={(e) => setField("received_amount", formatMoneyInputValue(e.target.value))} placeholder="수령 금액" inputMode="numeric" />
          </div>
          <select value={answers.revenue_tax_mode || "부가세 포함"} onChange={(e) => setField("revenue_tax_mode", e.target.value)}>
            <option>부가세 포함</option>
            <option>면세·부가세 없음</option>
          </select>
          <span className="wizard-explain">부가세는 고객에게 받은 돈 중 회사 매출이 아니라 나라에 잠시 맡아 두는 10% 봉투와 같습니다.</span>
        </div>
      )
    },
    {
      key: "receipt_status",
      title: "대금 수령 상태는 어떤가요?",
      body: <select value={answers.receipt_status || "미청구"} onChange={(e) => setField("receipt_status", e.target.value)}>{receiptStatuses.map((item) => <option key={item}>{item}</option>)}</select>
    },
    {
      key: "client_contact",
      title: "요청 기관 담당자 정보를 적어 주세요.",
      body: (
        <div className="wizard-pair">
          <input autoFocus value={answers.client_contact_name || ""} onChange={(e) => setField("client_contact_name", e.target.value)} placeholder="기관 담당자 이름" />
          <input value={answers.client_contact_phone || ""} onChange={(e) => setField("client_contact_phone", formatPhoneNumber(e.target.value))} placeholder="010-0000-0000" inputMode="tel" />
        </div>
      )
    },
    {
      key: "dates",
      title: "일을 끝낸 날과 돈이 들어온 날을 구분해 주세요.",
      body: (
        <div className="wizard-stack">
          <div className="wizard-pair">
            <label>마감일<input type="date" value={answers.due_date || ""} onChange={(e) => setField("due_date", e.target.value)} /></label>
            <label>입금 예정일<input type="date" value={answers.payment_due_date || ""} onChange={(e) => setField("payment_due_date", e.target.value)} /></label>
          </div>
          <div className="wizard-pair">
            <label>매출 인식일<input type="date" value={answers.revenue_recognition_date || ""} onChange={(e) => setField("revenue_recognition_date", e.target.value)} /></label>
            <label>실제 입금일<input type="date" value={answers.received_date || ""} onChange={(e) => setField("received_date", e.target.value)} /></label>
          </div>
          <span className="wizard-explain">매출 인식일은 빵을 손님에게 건넨 날, 실제 입금일은 빵값이 통장에 들어온 날입니다. 아직 입금 전이면 실제 입금일은 비워 두세요.</span>
          <label className="check-label"><input type="checkbox" checked={answers.payment_due_cycle === "monthly"} onChange={(e) => setField("payment_due_cycle", e.target.checked ? "monthly" : "once")} /><span>매월 입금 예정입니다</span></label>
        </div>
      )
    },
    {
      key: "category",
      title: "프로젝트 분류를 골라 주세요.",
      body: (
        <div className="wizard-stack category-picked">
          <select className="wizard-selected" value={major} onChange={(e) => setMajor(e.target.value)}>{Object.keys(projectCategoryTree).map((item) => <option key={item}>{item}</option>)}</select>
          <select className="wizard-selected" value={middle} onChange={(e) => setMiddle(e.target.value)}>{middles.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="wizard-selected" value={answers.project_small_category || firstSmall} onChange={(e) => setField("project_small_category", e.target.value)}>{smalls.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
      )
    },
    {
      key: "extra",
      title: "유입 경로와 반복 고객 여부를 정해 주세요.",
      body: (
        <div className="wizard-stack">
          <select value={answers.inflow_route || ""} onChange={(e) => setField("inflow_route", e.target.value)}>{inflowRoutes.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="check-label"><input type="checkbox" checked={answers.repeat_client === "true"} onChange={(e) => setField("repeat_client", e.target.checked ? "true" : "false")} /><span>반복 가능 고객입니다</span></label>
        </div>
      )
    },
    {
      key: "memo",
      title: "마지막으로 메모가 있나요?",
      body: <textarea autoFocus value={answers.memo || ""} onChange={(e) => setField("memo", e.target.value)} placeholder="특이사항, 계약 조건, 참고 내용" />
    }
  ];

  const current = steps[step];
  const canGoNext = !current.required || Boolean((answers[current.key] || "").trim());

  async function submitWizard() {
    const formData = new FormData();
    Object.entries(answers).forEach(([key, value]) => {
      if (key === "repeat_client") {
        if (value === "true") formData.append("repeat_client", "on");
      } else {
        formData.append(key, value);
      }
    });
    setBusy(true);
    setMessage("");
    try {
      await onSubmit(formData);
      window.localStorage.removeItem(draftKey); // 성공 시 임시저장 삭제
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로젝트 등록에 실패했습니다. 입력 내용은 임시저장되어 있습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ModalHead title="질문형 프로젝트 등록" desc={`${step + 1}/${steps.length} 단계 · 답하면 다음 질문으로 넘어갑니다.`} onClose={closeWizard} />
      <div className="wizard-card">
        <div className="wizard-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        <h3>{current.title}</h3>
        <div className="wizard-field">{current.body}</div>
        {message && <div className="form-help">{message}</div>}
        <div className="wizard-summary">
          <strong>{answers.name || "프로젝트명 미입력"}</strong>
          <span>{answers.client_name || "거래처 미입력"} · {answers.confirmed_amount || "0"}원</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || busy}>이전</button>
        {step < steps.length - 1 ? (
          <button className="btn blue" type="button" onClick={() => setStep((value) => value + 1)} disabled={!canGoNext || busy}>다음 질문</button>
        ) : (
          <button className="btn blue" type="button" onClick={submitWizard} disabled={busy || !answers.name}>{busy ? "저장 중" : "프로젝트 만들기"}</button>
        )}
      </div>
    </>
  );
}

// 질문형 위저드 공통 셸 — 프로젝트 등록과 동일한 단계형 UI
type WizardStep = {
  key: string;
  title: string;
  required?: boolean;
  hint?: string;
  body: React.ReactNode;
};

function WizardShell({
  title, desc, steps, answers, busy, message, submitLabel, summaryPrimary, summarySecondary, onSubmit, onClose
}: {
  title: string;
  desc: string;
  steps: WizardStep[];
  answers: Record<string, string>;
  busy: boolean;
  message: string;
  submitLabel: string;
  summaryPrimary: string;
  summarySecondary: string;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const safeStep = Math.min(step, steps.length - 1);
  const current = steps[safeStep];
  const canGoNext = !current.required || Boolean((answers[current.key] || "").trim());

  return (
    <>
      <ModalHead title={title} desc={`${safeStep + 1}/${steps.length} 단계 · ${desc}`} onClose={onClose} />
      <div className="wizard-card">
        <div className="wizard-progress"><span style={{ width: `${((safeStep + 1) / steps.length) * 100}%` }} /></div>
        <h3>{current.title}</h3>
        <div className="wizard-field">{current.body}</div>
        {current.hint && <div className="form-help">{current.hint}</div>}
        {message && <div className="form-help" style={{ color: "#c0392b" }}>{message}</div>}
        <div className="wizard-summary">
          <strong>{summaryPrimary}</strong>
          <span>{summarySecondary}</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={safeStep === 0 || busy}>이전</button>
        {safeStep < steps.length - 1 ? (
          <button className="btn blue" type="button" onClick={() => setStep((value) => value + 1)} disabled={!canGoNext || busy}>다음 질문</button>
        ) : (
          <button className="btn blue" type="button" onClick={onSubmit} disabled={busy || !canGoNext}>{busy ? "저장 중" : submitLabel}</button>
        )}
      </div>
    </>
  );
}

// 빠른 지출 등록 - 질문형(프로젝트 등록과 동일한 방식) + 임시저장
function ExpenseForm({
  cards, categories, projects, onSubmit, onClose
}: {
  cards: PaymentCard[];
  categories: ExpenseCategoryItem[];
  projects: ProjectComputed[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const draftKey = "lupl.draft.expenseWizard";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pastPurposes, setPastPurposes] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({
    used_at: today(),
    usage: "운영비",
    payment_method: "카드",
    transfer_status: "결제 필요",
    cost_behavior: "고정비",
    tax_mode: "부가세 포함",
    paid_at: today(),
    amount: "0"
  });

  useEffect(() => {
    const saved = draftStore.read(draftKey) as Record<string, string> | null;
    if (saved && Object.keys(saved).length && window.confirm("저장하지 못한 지출결의 입력 내용이 있습니다. 이어서 작성할까요?")) {
      setAnswers((prev) => ({ ...prev, ...saved }));
    } else if (saved) {
      draftStore.clear(draftKey);
    }
  }, []);

  useEffect(() => {
    draftStore.write(draftKey, answers);
  }, [answers]);

  useEffect(() => {
    supabase.from("expense_requests").select("purpose").order("created_at", { ascending: false }).limit(200).then(({ data }) => {
      if (data) {
        const unique = Array.from(new Set(data.map((d: { purpose: string }) => d.purpose).filter(Boolean)));
        setPastPurposes(unique.slice(0, 30));
      }
    });
  }, []);

  function setField(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const usage = (answers.usage as ExpenseUsage) || "운영비";
  const subcategories = expenseSubcategoryTree[usage] || expenseSubcategoryTree["운영비"];
  const subcategory = answers.usage_subcategory || subcategories[0] || "";
  const method = (answers.payment_method as PaymentMethod) || "카드";

  function setUsage(value: string) {
    const nextUsage = value as ExpenseUsage;
    const nextSubcategory = expenseSubcategoryTree[nextUsage]?.[0] || "";
    setAnswers((prev) => ({
      ...prev,
      usage: nextUsage,
      usage_subcategory: nextSubcategory,
      cost_behavior: inferExpenseCostBehavior(nextUsage, prev.project_id || "")
    }));
  }

  const steps: WizardStep[] = [
    {
      key: "used_at",
      title: "지출일이 언제인가요?",
      body: <input type="date" value={answers.used_at || today()} onChange={(e) => setField("used_at", e.target.value)} />
    },
    {
      key: "purpose",
      title: "어떤 지출인가요? (목적·용도)",
      required: true,
      body: (
        <>
          <input autoFocus value={answers.purpose || ""} onChange={(e) => setField("purpose", e.target.value)} placeholder="예: 행사 다과 구입" list="wizard-past-purposes" />
          <datalist id="wizard-past-purposes">{pastPurposes.map((p) => <option key={p} value={p} />)}</datalist>
        </>
      )
    },
    {
      key: "usage",
      title: "사용 용도 대분류와 소분류를 골라 주세요.",
      hint: usageGuide[usage] || categories.find((c) => c.name === usage)?.description || undefined,
      body: (
        <div className="wizard-stack">
          <select value={usage} onChange={(e) => setUsage(e.target.value)}>
            {expenseUsages.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={subcategory} onChange={(e) => setField("usage_subcategory", e.target.value)}>
            {subcategories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      )
    },
    {
      key: "cost_behavior",
      title: "이 비용은 매출에 따라 늘어나는 돈인가요?",
      hint: "손님이 늘면 같이 늘어나는 재료비는 변동비, 손님이 없어도 나가는 월세·구독료는 고정비입니다.",
      body: (
        <div className="shortcut-row">
          {(["고정비", "변동비"] as const).map((item) => (
            <button key={item} type="button" className={answers.cost_behavior === item ? "shortcut-chip active" : "shortcut-chip"} onClick={() => setField("cost_behavior", item)}>{item}</button>
          ))}
        </div>
      )
    },
    {
      key: "amount",
      title: "금액은 얼마인가요?",
      required: true,
      body: <input value={answers.amount || ""} onChange={(e) => setField("amount", formatMoneyInputValue(e.target.value))} inputMode="numeric" placeholder="금액" />
    },
    {
      key: "tax_mode",
      title: "이 금액에 부가세가 포함되어 있나요?",
      hint: "부가세는 회사가 번 돈이 아니라 나라에 잠시 맡아 두는 10% 봉투입니다. 일반 영수증·세금계산서는 보통 부가세 포함입니다.",
      body: <select value={answers.tax_mode || "부가세 포함"} onChange={(e) => setField("tax_mode", e.target.value)}><option>부가세 포함</option><option>면세·불공제</option></select>
    },
    {
      key: "payment_method",
      title: "어떻게 결제했나요?",
      body: (
        <div className="wizard-stack">
          <div className="shortcut-row">
            <button type="button" className={method === "법인 계좌이체" ? "shortcut-chip active" : "shortcut-chip"} onClick={() => setAnswers((prev) => ({ ...prev, payment_method: "법인 계좌이체", transfer_status: "결제 완료", card_id: "" }))}>법인 계좌이체</button>
            <button type="button" className={method === "카드" ? "shortcut-chip active" : "shortcut-chip"} onClick={() => setAnswers((prev) => ({ ...prev, payment_method: "카드", transfer_status: "결제 완료" }))}>카드</button>
            <button type="button" className={method === "계좌이체" ? "shortcut-chip active" : "shortcut-chip"} onClick={() => setAnswers((prev) => ({ ...prev, payment_method: "계좌이체", transfer_status: "결제 필요", card_id: "" }))}>일반 계좌이체</button>
          </div>
          <select value={method} onChange={(e) => setField("payment_method", e.target.value)}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select>
          {method === "카드" && (
            <select value={answers.card_id || ""} onChange={(e) => setField("card_id", e.target.value)}>
              <option value="">카드 선택</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
          {method === "카드" && cards.length === 0 && <span className="field-hint">등록된 카드가 없습니다. 지출결의 화면에서 카드를 먼저 등록하세요.</span>}
        </div>
      )
    },
    {
      key: "transfer_status",
      title: "이체(지급) 상태는 어떤가요?",
      body: <select value={answers.transfer_status || "결제 필요"} onChange={(e) => setField("transfer_status", e.target.value)}>{transferStatuses.map((t) => <option key={t}>{t}</option>)}</select>
    },
    {
      key: "paid_at",
      title: "통장에서 실제로 돈이 빠진 날은 언제인가요?",
      hint: "지출일은 물건을 산 날, 실제 지급일은 통장 물통에서 돈이 빠진 날입니다. 아직 지급 전이면 예정일을 적어 두세요.",
      body: <input type="date" value={answers.paid_at || answers.used_at || today()} onChange={(e) => setField("paid_at", e.target.value)} />
    },
    {
      key: "project_id",
      title: "연결할 프로젝트가 있나요?",
      body: (
        <select value={answers.project_id || ""} onChange={(e) => setAnswers((prev) => ({
          ...prev,
          project_id: e.target.value,
          cost_behavior: inferExpenseCostBehavior(prev.usage || "운영비", e.target.value)
        }))}>
          <option value="">선택 안 함</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )
    },
    {
      key: "transfer_summary",
      title: "이체 내용(받는 분·계좌 등)이 있나요?",
      body: <textarea value={answers.transfer_summary || ""} onChange={(e) => setField("transfer_summary", e.target.value)} placeholder="계좌, 받는 분, 금액 등 필요한 내용" />
    },
    {
      key: "receipt",
      title: "영수증 사진이 있나요?",
      hint: "이미지(JPG/PNG/WEBP)면 자동 인식(OCR)을 시도합니다. 사진은 임시저장되지 않아요.",
      body: <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    },
    {
      key: "memo",
      title: "메모를 남길까요?",
      body: <textarea value={answers.memo || ""} onChange={(e) => setField("memo", e.target.value)} placeholder="특이사항" />
    }
  ];

  async function submit() {
    const formData = new FormData();
    Object.entries(answers).forEach(([key, value]) => formData.append(key, value));
    if (!formData.get("usage_subcategory")) formData.append("usage_subcategory", subcategory);
    if (file) formData.append("receipt", file);
    setBusy(true);
    setMessage("");
    try {
      await onSubmit(formData);
      draftStore.clear(draftKey);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "지출결의 등록에 실패했습니다. 입력 내용은 임시저장했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardShell
      title="질문형 지출결의 등록"
      desc="답하면 다음 질문으로 넘어갑니다."
      steps={steps}
      answers={answers}
      busy={busy}
      message={message}
      submitLabel="지출결의 등록"
      summaryPrimary={answers.purpose || "목적 미입력"}
      summarySecondary={`${answers.usage || "운영비"} · ${answers.usage_subcategory || subcategory} · ${answers.amount || "0"}원`}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}

function ExpenseEditForm({
  expense, cards, categories, projects, onSubmit, onClose
}: {
  expense: ExpenseRequest;
  cards: PaymentCard[];
  categories: ExpenseCategoryItem[];
  projects: ProjectComputed[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>((expense.payment_method || "카드") as PaymentMethod);
  const [usage, setUsageValue] = useState<ExpenseUsage>((expense.usage || "운영비") as ExpenseUsage);
  const [subcategory, setSubcategory] = useState(getExpenseSubcategoryLabel(expense) || expenseSubcategoryTree[(expense.usage || "운영비") as ExpenseUsage]?.[0] || "");
  const [isRecurring, setIsRecurring] = useState(Boolean(expense.is_recurring));
  const costBehavior = expense.cost_behavior || readMemoField(expense.memo, "비용 성격") || inferExpenseCostBehavior(String(expense.usage || ""), expense.project_id || "");
  const taxMode = expense.tax_mode || readMemoField(expense.memo, "부가세 처리") || "부가세 포함";
  const paidAt = expense.paid_at || readMemoField(expense.memo, "실제 지급일") || expense.used_at || today();
  const subcategories = expenseSubcategoryTree[usage] || expenseSubcategoryTree["운영비"];
  function setEditUsage(value: string) {
    const nextUsage = value as ExpenseUsage;
    setUsageValue(nextUsage);
    setSubcategory(expenseSubcategoryTree[nextUsage]?.[0] || "");
  }
  return (
    <>
      <ModalHead title="지출결의 수정" desc="관리자는 정기구독 금액을 포함해 지출결의 원본 내용을 수정할 수 있습니다." onClose={onClose} />
      <form
        className="modal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await onSubmit(new FormData(event.currentTarget));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="hidden" name="expense_id" value={expense.id} />
        <input type="hidden" name="evidence_status" value={expense.evidence_status || "증빙 필요"} />
        <label>사용일<input type="date" name="used_at" defaultValue={expense.used_at || today()} /></label>
        <label>목적/항목명<input name="purpose" defaultValue={expense.purpose} required /></label>
        <label>사용 용도 대분류<select name="usage" value={usage} onChange={(event) => setEditUsage(event.target.value)}>{expenseUsages.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>사용 용도 소분류<select name="usage_subcategory" value={subcategory} onChange={(event) => setSubcategory(event.target.value)}>{subcategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>금액<input className="money-input" name="amount" defaultValue={formatMoneyInputValue(String(expense.amount || ""))} onInput={handleMoneyInput} inputMode="numeric" required /></label>
        <label>비용 성격<select name="cost_behavior" defaultValue={costBehavior}><option>고정비</option><option>변동비</option></select><span className="field-hint">재료비처럼 매출과 같이 늘면 변동비, 월세처럼 매달 나가면 고정비입니다.</span></label>
        <label>부가세 처리<select name="tax_mode" defaultValue={taxMode}><option>부가세 포함</option><option>면세·불공제</option></select><span className="field-hint">부가세는 회사 비용과 분리하는 세금 봉투입니다.</span></label>
        <label>실제 지급일<input type="date" name="paid_at" defaultValue={paidAt} /><span className="field-hint">통장에서 실제 돈이 빠진 날입니다.</span></label>
        <label>결제방식<select name="payment_method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select></label>
        {method === "카드" && <label>카드<select name="card_id" defaultValue={expense.card_id || ""}><option value="">카드 선택</option>{cards.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
        <label>이체/지급 상태<select name="transfer_status" defaultValue={expense.transfer_status || "해당 없음"}>{transferStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>연결 프로젝트<select name="project_id" defaultValue={expense.project_id || ""}><option value="">선택 안 함</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="check-label"><input type="checkbox" name="is_recurring" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} /><span>정기 결제 항목</span></label>
        {isRecurring && <label>반복 주기<select name="recurring_cycle" defaultValue={expense.recurring_cycle || "매월"}><option>매월</option><option>매분기</option><option>매년</option></select></label>}
        <label className="wide">이체 내용 요약<textarea name="transfer_summary" defaultValue={expense.transfer_summary || ""} /></label>
        <label className="wide">메모<textarea name="memo" defaultValue={stripExpenseSystemMemo(expense.memo)} /></label>
        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>닫기</button>
          <button className="btn blue" disabled={busy}>{busy ? "저장 중" : "수정 저장"}</button>
        </div>
      </form>
    </>
  );
}

// 반복 지출(구독) 등록 - 질문형 + 임시저장
function RecurringWizardForm({
  cards, onSubmit, onClose
}: {
  cards: PaymentCard[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const draftKey = "lupl.draft.recurringWizard";
  const defaultCardId = cards.find((card) => card.label.includes("개인-이희은"))?.id
    || cards.find((card) => card.card_type === "개인")?.id
    || "";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({
    recurring_cycle: "매월",
    usage: "운영비",
    payment_method: "카드",
    card_id: defaultCardId,
    currency: "KRW",
    tax_mode: "부가세 포함",
    used_at: today(),
    amount: "0"
  });

  useEffect(() => {
    const saved = draftStore.read(draftKey) as Record<string, string> | null;
    if (saved && Object.keys(saved).length && window.confirm("저장하지 못한 반복 지출 입력 내용이 있습니다. 이어서 작성할까요?")) {
      setAnswers((prev) => ({ ...prev, ...saved }));
    } else if (saved) {
      draftStore.clear(draftKey);
    }
  }, []);

  useEffect(() => {
    draftStore.write(draftKey, answers);
  }, [answers]);

  function setField(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const method = (answers.payment_method as PaymentMethod) || "카드";
  const usage = (answers.usage as ExpenseUsage) || "운영비";
  const currency = answers.currency || "KRW";

  function setFxField(key: "foreign_amount" | "exchange_rate", value: string) {
    const next = { ...answers, [key]: key === "exchange_rate" ? formatMoneyInputValue(value) : value.replace(/[^0-9.]/g, "") };
    const foreignAmount = Number(String(next.foreign_amount || "").replace(/[^0-9.]/g, "")) || 0;
    const rate = Number(String(next.exchange_rate || "").replace(/[^0-9]/g, "")) || 0;
    next.amount = foreignAmount && rate ? formatMoneyInputValue(String(Math.round(foreignAmount * rate))) : "";
    setAnswers(next);
  }

  const steps: WizardStep[] = [
    {
      key: "usage",
      title: "정기 지출 대분류를 먼저 골라 주세요.",
      hint: "SaaS·도메인·서버·사무툴은 운영비, 광고 플랫폼은 홍보비, 식대·복지는 복리후생비로 묶으면 나중에 관리하기 쉽습니다.",
      body: <select value={usage} onChange={(e) => setField("usage", e.target.value)}>{recurringUsageGroups.map((item) => <option key={item}>{item}</option>)}</select>
    },
    {
      key: "purpose",
      title: "어떤 정기 지출인가요? (서비스·항목명)",
      required: true,
      body: <input autoFocus value={answers.purpose || ""} onChange={(e) => setField("purpose", e.target.value)} placeholder="예: ChatGPT 구독, 도메인 갱신" />
    },
    {
      key: "recurring_cycle",
      title: "결제 주기는 어떻게 되나요?",
      body: <select value={answers.recurring_cycle || "매월"} onChange={(e) => setField("recurring_cycle", e.target.value)}><option>매월</option><option>매분기</option><option>매년</option></select>
    },
    {
      key: "amount",
      title: "결제 금액은 얼마인가요?",
      required: true,
      hint: currency === "KRW" ? "원화 결제는 실제 카드 명세서에 찍히는 원화 금액을 그대로 넣으면 됩니다." : "달러 결제는 청구 전이면 예상 환율을 넣고, 카드 명세서가 나오면 실제 원화 청구액으로 수정하세요.",
      body: (
        <div className="wizard-stack">
          <select value={currency} onChange={(e) => setAnswers((prev) => ({ ...prev, currency: e.target.value, amount: e.target.value === "KRW" ? prev.amount : "" }))}>
            <option value="KRW">원화(KRW)</option>
            <option value="USD">달러(USD)</option>
          </select>
          {currency === "KRW" ? (
            <input value={answers.amount || ""} onChange={(e) => setField("amount", formatMoneyInputValue(e.target.value))} inputMode="numeric" placeholder="결제 금액" />
          ) : (
            <div className="wizard-pair">
              <label>달러 금액<input value={answers.foreign_amount || ""} onChange={(e) => setFxField("foreign_amount", e.target.value)} inputMode="decimal" placeholder="예: 20" /></label>
              <label>적용 환율<input value={answers.exchange_rate || ""} onChange={(e) => setFxField("exchange_rate", e.target.value)} inputMode="numeric" placeholder="예: 1400" /></label>
              <label className="wide">원화 예정액<input value={answers.amount || ""} readOnly placeholder="자동 계산" /></label>
            </div>
          )}
        </div>
      )
    },
    {
      key: "tax_mode",
      title: "이 정기 결제에 부가세가 포함되어 있나요?",
      hint: "부가세는 실제 운영비와 분리해 두는 세금 봉투입니다. 해외 서비스처럼 부가세를 따로 공제하지 못하면 면세·불공제를 선택하세요.",
      body: <select value={answers.tax_mode || "부가세 포함"} onChange={(e) => setField("tax_mode", e.target.value)}><option>부가세 포함</option><option>면세·불공제</option></select>
    },
    {
      key: "payment_method",
      title: "어떻게 결제하나요?",
      body: (
        <div className="wizard-stack">
          <select value={method} onChange={(e) => setField("payment_method", e.target.value)}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select>
          {method === "카드" && (
            <select value={answers.card_id || ""} onChange={(e) => setField("card_id", e.target.value)}>
              <option value="">카드 선택</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
        </div>
      )
    },
    {
      key: "used_at",
      title: "다음 결제 예정일은 언제인가요?",
      body: <input type="date" value={answers.used_at || today()} onChange={(e) => setField("used_at", e.target.value)} />
    },
    {
      key: "memo",
      title: "메모를 남길까요? (해지 조건·담당자 등)",
      body: <textarea value={answers.memo || ""} onChange={(e) => setField("memo", e.target.value)} placeholder="해지 조건, 담당자 등" />
    }
  ];

  async function submit() {
    const formData = new FormData();
    Object.entries(answers).forEach(([key, value]) => formData.append(key, value));
    setBusy(true);
    setMessage("");
    try {
      await onSubmit(formData);
      draftStore.clear(draftKey);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "반복 지출 등록에 실패했습니다. 입력 내용은 임시저장했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardShell
      title="질문형 반복 지출(구독) 등록"
      desc="답하면 다음 질문으로 넘어갑니다."
      steps={steps}
      answers={answers}
      busy={busy}
      message={message}
      submitLabel="반복 지출 등록"
      summaryPrimary={answers.purpose || "항목 미입력"}
      summarySecondary={`${answers.usage || "운영비"} · ${answers.recurring_cycle || "매월"} · ${answers.amount || "0"}원`}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}

// 21번: 상여금 폼 - 프로젝트 선택 시 순수익 자동, 지급률 선택, 상여금 자동계산
function BonusForm({
  people, projects, onSubmit, onClose
}: {
  people: Person[];
  projects: ProjectComputed[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [rate, setRate] = useState("10");

  const project = projects.find((p) => p.id === projectId);
  const profit = project ? Math.round(project._profit) : 0;
  const rateNumber = Number(rate.replace(/[^0-9.]/g, "")) || 0;
  const bonus = Math.round(profit * (rateNumber / 100));

  const quarter = Math.floor(new Date().getMonth() / 3) + 1;
  const periodOptions = [
    `${new Date().getFullYear()} Q${quarter}`,
    `${new Date().getFullYear()} Q${quarter === 4 ? 1 : quarter + 1}`,
    `${new Date().getFullYear()} 상반기`,
    `${new Date().getFullYear()} 하반기`,
    `${new Date().getFullYear()} 연간`
  ];

  return (
    <>
      <ModalHead title="상여금·성과보상 등록" desc="프로젝트를 선택하면 순수익이 자동 계산되고, 지급률에 따라 상여금이 자동 산출됩니다." onClose={onClose} />
      <form
        className="modal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          await onSubmit(new FormData(event.currentTarget));
          setBusy(false);
        }}
      >
        <label>지급 대상<select name="person_id"><option value="">선택</option>{people.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <label>프로젝트<select name="project_id" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">선택</option>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <label>기간<select name="period_label">{periodOptions.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label>지급률(%)
          <input name="bonus_rate" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" list="bonus-rate-options" placeholder="예: 10" />
          <datalist id="bonus-rate-options">{bonusRateOptions.map((r) => <option key={r} value={r.replace("%", "")} />)}</datalist>
        </label>
        <input type="hidden" name="profit_amount" value={profit} />
        <label>지급 예정일<input type="date" name="planned_payment_date" /></label>
        <label className="wide">메모<textarea name="memo" /></label>

        <div className="calc-box wide">
          <div className="calc-row"><span>프로젝트 순수익(자동)</span><strong>{project ? formatWon(profit) : "프로젝트를 선택하세요"}</strong></div>
          <div className="calc-row"><span>지급률</span><strong>{rateNumber}%</strong></div>
          <div className="calc-row total"><span>예상 상여금(자동)</span><strong>{project ? formatWon(bonus) : "-"}</strong></div>
        </div>

        <div className="modal-actions">
          <button className="btn blue" disabled={busy}>{busy ? "저장 중" : "저장"}</button>
        </div>
      </form>
    </>
  );
}

function ProjectEditForm({
  project, people, onSubmit, onClose
}: {
  project: ProjectComputed;
  people: Person[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const ownerOptions = people.map((person) => person.name);
  const clientName = project.client_name || projectMemoValue(project, "거래처/기관명");
  const clientType = project.client_type || projectMemoValue(project, "거래처 구분");
  const status = project.status || projectMemoValue(project, "상태") || "접수";
  const ownerLabel = project.owner_label || projectMemoValue(project, "책임자");
  const operatorLabel = project.operator_label || projectMemoValue(project, "실무 담당자");
  const contact = project.contact || projectMemoValue(project, "실무 담당자 연락처");
  const inflowRoute = project.inflow_route || projectMemoValue(project, "유입 경로");
  const receiptStatus = project.receipt_status || projectMemoValue(project, "대금 수령 상태") || "미청구";
  const paymentDueDate = project.payment_due_date || projectMemoValue(project, "입금 예정일");
  const dueDate = project.due_date || projectMemoValue(project, "마감 날짜");
  const taxInvoiceDate = project.tax_invoice_date || projectMemoValue(project, "세금계산서 발행일");
  const revenueRecognitionDate = project.revenue_recognition_date || projectMemoValue(project, "매출 인식일");
  const receivedDate = project.received_date || projectMemoValue(project, "실제 입금일");
  const revenueTaxMode = project.revenue_tax_mode || projectMemoValue(project, "매출 부가세 처리") || "부가세 포함";
  const repeatClient = project.repeat_client || projectMemoValue(project, "반복 가능 고객") === "예";
  const cleanMemo = getProjectPlainMemo(project);
  const categoryDefaults = {
    major: project.project_major_category || project.project_group?.[0] || "교육",
    middle: project.project_middle_category || project.project_group?.[1] || "",
    small: project.project_small_category || project.project_group?.[2] || ""
  };

  return (
    <>
      <ModalHead title="프로젝트 수정" desc="등록된 프로젝트의 상태, 금액, 담당자, 분류, 입금 일정을 수정합니다." onClose={onClose} />
      <form
        className="modal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await onSubmit(new FormData(event.currentTarget));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="hidden" name="project_id" value={project.id} />
        <label>프로젝트 내용<input name="name" required defaultValue={project.name} /></label>
        <label>거래처/기관명<input name="client_name" defaultValue={clientName} /></label>
        <label>거래처 구분<select name="client_type" defaultValue={clientType}><option value="">선택</option>{clientType && !clientTypes.includes(clientType as ClientType) && <option>{clientType}</option>}{clientTypes.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>상태<select name="status" defaultValue={status}>{projectStatuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>책임자<select name="owner_label" defaultValue={ownerLabel}><option value="">선택</option>{ownerLabel && !ownerOptions.includes(ownerLabel) && <option>{ownerLabel}</option>}{people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></label>
        <label>실무 담당자<input name="operator_label" defaultValue={operatorLabel} list="project-edit-operator-options" placeholder="실무 담당자 이름" /><datalist id="project-edit-operator-options">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist></label>
        <label>유입 경로<select name="inflow_route" defaultValue={inflowRoute}><option value="">선택</option>{inflowRoute && !inflowRoutes.includes(inflowRoute) && <option>{inflowRoute}</option>}{inflowRoutes.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>확정 금액(견적·계약 총액)<input className="money-input" name="confirmed_amount" defaultValue={formatMoneyInputValue(String(project._revenue || ""))} onInput={handleMoneyInput} /></label>
        <label>수령 금액(실입금)<input className="money-input" name="received_amount" defaultValue={formatMoneyInputValue(String(project.received_amount || ""))} onInput={handleMoneyInput} /></label>
        <label>매출 부가세 처리<select name="revenue_tax_mode" defaultValue={revenueTaxMode}><option>부가세 포함</option><option>면세·부가세 없음</option></select><span className="field-hint">부가세 포함이면 손익 매출에서는 10% 세금 봉투를 분리합니다.</span></label>
        <label>대금 수령 상태<select name="receipt_status" defaultValue={receiptStatus}>{receiptStatuses.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>실무 담당자 연락처<input name="contact" defaultValue={contact} /></label>
        <label>입금 예정일<input type="date" name="payment_due_date" defaultValue={paymentDueDate} /></label>
        <label>마감 날짜<input type="date" name="due_date" defaultValue={dueDate} /></label>
        <label>세금계산서 발행일<input type="date" name="tax_invoice_date" defaultValue={taxInvoiceDate} /></label>
        <label>매출 인식일<input type="date" name="revenue_recognition_date" defaultValue={revenueRecognitionDate} /><span className="field-hint">일을 끝내 고객에게 넘긴 날입니다.</span></label>
        <label>실제 입금일<input type="date" name="received_date" defaultValue={receivedDate} /><span className="field-hint">돈이 실제 통장에 들어온 날입니다.</span></label>
        <label>입금 반복<select name="payment_due_cycle" defaultValue={project.memo?.includes("매월 반복") ? "monthly" : "once"}><option value="once">일회성</option><option value="monthly">매월 반복</option></select></label>
        <label className="check-label"><input type="checkbox" name="repeat_client" defaultChecked={repeatClient} /><span>반복 가능 고객</span></label>
        <ProjectCategoryFields defaults={categoryDefaults} />
        <label className="wide">비고/메모<textarea name="memo" defaultValue={cleanMemo} /></label>
        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>닫기</button>
          <button className="btn blue" disabled={busy}>{busy ? "저장 중" : "수정 저장"}</button>
        </div>
      </form>
    </>
  );
}

// 19번: 카테고리 관리
function CategoryManage({
  categories, onCreate, onDelete, onClose
}: {
  categories: ExpenseCategoryItem[];
  onCreate: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <ModalHead title="카테고리 관리" desc="지출/사업 분류 카테고리를 추가·삭제합니다. 추가한 카테고리는 지출결의 ‘사용 용도’에 함께 나타납니다." onClose={onClose} />
      <form
        className="inline-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          await onCreate(new FormData(event.currentTarget));
          (event.currentTarget as HTMLFormElement).reset();
          setBusy(false);
        }}
      >
        <input name="name" placeholder="카테고리명" required />
        <input name="description" placeholder="설명(선택)" />
        <button className="btn blue" disabled={busy}>{busy ? "추가 중" : "추가"}</button>
      </form>
      <div className="manage-list">
        {categories.length === 0 && <EmptyState text="등록된 카테고리가 없습니다. 위에서 추가하세요." />}
        {categories.map((c) => (
          <div className="manage-row" key={c.id}>
            <div><strong>{c.name}</strong><span>{c.description || "설명 없음"}</span></div>
            <button className="btn small ghost danger" onClick={() => onDelete(c.id)}>삭제</button>
          </div>
        ))}
      </div>
    </>
  );
}

// 8번: 카드/소유자 관리
function CardManage({
  cards, onCreate, onDelete, onClose
}: {
  cards: PaymentCard[];
  onCreate: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [cardType, setCardType] = useState<"법인" | "개인">("법인");
  return (
    <>
      <ModalHead title="결제수단(카드) 관리" desc="카드명, 법인/개인 구분, 소유자를 등록합니다. 등록한 카드는 지출결의에서 선택할 수 있습니다." onClose={onClose} />
      <form
        className="inline-form card-inline-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          await onCreate(new FormData(event.currentTarget));
          event.currentTarget.reset();
          setCardType("법인");
          setBusy(false);
        }}
      >
        <input name="label" placeholder="카드명을 입력하세요" required />
        <select name="card_type" value={cardType} onChange={(e) => setCardType(e.target.value as "법인" | "개인")}>
          <option value="법인">법인</option>
          <option value="개인">개인</option>
        </select>
        <input name="owner_name" placeholder={cardType === "개인" ? "소유자 이름" : "관리자/사용자 메모"} />
        <button className="btn blue" disabled={busy} type="submit">{busy ? "등록 중" : "등록"}</button>
      </form>
      <div className="manage-list card-manage-list">
        {cards.length === 0 && <EmptyState text="등록된 결제수단이 없습니다." />}
        {cards.map((c) => (
          <div className="manage-row" key={c.id}>
            <div><strong>{c.label}</strong><span>{c.card_type}{c.owner_name ? ` · ${c.owner_name}` : ""}</span></div>
            <button className="btn small ghost danger" onClick={() => onDelete(c.id)} type="button">삭제</button>
          </div>
        ))}
      </div>
    </>
  );
}

function MobileDeviceManage({
  devices, people, expenses, tableReady, onSave, onDelete, onClose
}: {
  devices: MobileReceiptDevice[];
  people: Person[];
  expenses: ExpenseRequest[];
  tableReady: boolean;
  onSave: (formData: FormData) => Promise<void>;
  onDelete: (deviceId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const candidateIds = Array.from(new Set(expenses.map(getExpenseDeviceId).filter(Boolean))).sort();

  return (
    <>
      <ModalHead title="모바일 기기 관리" desc="폰앱에서 올라온 기기 ID를 직원 이름과 연결합니다. 한 번 연결하면 지출결의 상세에서 업로드 담당자가 표시됩니다." onClose={onClose} />
      {!tableReady && (
        <div className="alert-top warn compact-notice modal-notice">
          <strong>기기 관리 테이블이 아직 없습니다.</strong>
          <p>Supabase SQL Editor에서 <code>supabase/mobile_receipt_devices.sql</code> 파일 내용을 한 번 실행하면 저장이 활성화됩니다.</p>
        </div>
      )}
      <form
        className="inline-form mobile-device-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          await onSave(new FormData(event.currentTarget));
          event.currentTarget.reset();
          setBusy(false);
        }}
      >
        <input name="device_id" list="mobile-device-candidates" placeholder="기기 ID" required />
        <datalist id="mobile-device-candidates">
          {candidateIds.map((id) => <option key={id} value={id} />)}
        </datalist>
        <select name="person_id" defaultValue="">
          <option value="">직원 선택</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        <input name="owner_name" placeholder="담당자명 직접 입력" />
        <input name="memo" placeholder="메모(선택)" />
        <label className="check-label device-active"><input type="checkbox" name="is_active" defaultChecked /><span>사용</span></label>
        <button className="btn blue" disabled={busy || !tableReady} type="submit">{busy ? "저장 중" : "저장"}</button>
      </form>
      {candidateIds.length > 0 && (
        <p className="form-help">최근 지출결의에서 발견한 기기 ID: {candidateIds.slice(0, 3).join(", ")}{candidateIds.length > 3 ? ` 외 ${candidateIds.length - 3}개` : ""}</p>
      )}
      <div className="manage-list mobile-device-list">
        {devices.length === 0 && <EmptyState text={tableReady ? "등록된 모바일 기기가 없습니다. 위에서 기기 ID와 담당자를 연결하세요." : "테이블 생성 후 기기 담당자를 등록할 수 있습니다."} />}
        {devices.map((device) => (
          <div className="manage-row" key={device.device_id}>
            <div>
              <strong>{device.owner_name || "담당자 미등록"}</strong>
              <span className="mobile-device-id">{device.device_id}</span>
              {device.memo && <span>{device.memo}</span>}
            </div>
            <button className="btn small ghost danger" onClick={() => onDelete(device.device_id)} type="button">삭제</button>
          </div>
        ))}
      </div>
    </>
  );
}


function ProjectCategoryFields({ defaults }: { defaults?: { major?: string | null; middle?: string | null; small?: string | null } }) {
  const majors = Object.keys(projectCategoryTree);
  const initialMajor = defaults?.major && projectCategoryTree[defaults.major] ? defaults.major : majors[0] || "기타";
  const initialMiddles = Object.keys(projectCategoryTree[initialMajor] || {});
  const initialMiddle = defaults?.middle && projectCategoryTree[initialMajor]?.[defaults.middle] ? defaults.middle : initialMiddles[0] || "기타";
  const initialSmalls = projectCategoryTree[initialMajor]?.[initialMiddle] || ["기타"];
  const initialSmall = defaults?.small && initialSmalls.includes(defaults.small) ? defaults.small : initialSmalls[0] || "기타";
  const [major, setMajorValue] = useState(initialMajor);
  const [middle, setMiddleValue] = useState(initialMiddle);
  const [small, setSmall] = useState(initialSmall);
  const middles = Object.keys(projectCategoryTree[major] || {});
  const smalls = projectCategoryTree[major]?.[middle] || ["기타"];

  function setMajor(value: string) {
    setMajorValue(value);
    const nextMiddle = Object.keys(projectCategoryTree[value] || {})[0] || "기타";
    setMiddleValue(nextMiddle);
    setSmall((projectCategoryTree[value]?.[nextMiddle] || ["기타"])[0] || "기타");
  }

  function setMiddle(value: string) {
    setMiddleValue(value);
    setSmall((projectCategoryTree[major]?.[value] || ["기타"])[0] || "기타");
  }

  return (
    <>
      <label>대분류
        <select name="project_major_category" value={major} onChange={(e) => setMajor(e.target.value)}>
          {majors.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>중분류
        <select name="project_middle_category" value={middle} onChange={(e) => setMiddle(e.target.value)}>
          {middles.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>소분류
        <select name="project_small_category" value={small} onChange={(e) => setSmall(e.target.value)}>
          {smalls.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    </>
  );
}

function SalaryFields({ person }: { person: Person | null }) {
  const [days, setDays] = useState(Number(person?.weekly_work_days || 5));
  const [hours, setHours] = useState(Number(person?.daily_work_hours || 8));
  const [annualSalary, setAnnualSalary] = useState(Number(person?.annual_salary || 0));
  const [monthlySalary, setMonthlySalary] = useState(Math.round(Number(person?.annual_salary || 0) / 12));
  const [hourlyWage, setHourlyWage] = useState(calcHourlyWage(Number(person?.annual_salary || 0), calcMonthlyCapacity(days, hours)));
  const monthly = calcMonthlyCapacity(days, hours);

  useEffect(() => {
    setHourlyWage(calcHourlyWage(annualSalary, monthly));
    setMonthlySalary(Math.round(annualSalary / 12));
  }, [days, hours]);

  function updateAnnualSalary(value: string) {
    const nextAnnual = Number(value.replace(/[^0-9]/g, "")) || 0;
    setAnnualSalary(nextAnnual);
    setMonthlySalary(Math.round(nextAnnual / 12));
    setHourlyWage(calcHourlyWage(nextAnnual, monthly));
  }

  function updateMonthlySalary(value: string) {
    const nextMonthly = Number(value.replace(/[^0-9]/g, "")) || 0;
    const nextAnnual = nextMonthly * 12;
    setMonthlySalary(nextMonthly);
    setAnnualSalary(nextAnnual);
    setHourlyWage(calcHourlyWage(nextAnnual, monthly));
  }

  function updateHourlyWage(value: string) {
    const nextHourly = Number(value.replace(/[^0-9]/g, "")) || 0;
    const nextAnnual = calcAnnualSalary(nextHourly, monthly);
    setHourlyWage(nextHourly);
    setAnnualSalary(nextAnnual);
    setMonthlySalary(Math.round(nextAnnual / 12));
  }

  return (
    <>
      <label>계약연봉
        <input className="money-input" name="annual_salary" value={formatMoneyInputValue(String(annualSalary || ""))} onChange={(e) => updateAnnualSalary(e.target.value)} />
      </label>
      <label>월급
        <input className="money-input" value={formatMoneyInputValue(String(monthlySalary || ""))} onChange={(e) => updateMonthlySalary(e.target.value)} />
      </label>
      <label>시급
        <input className="money-input" value={formatMoneyInputValue(String(hourlyWage || ""))} onChange={(e) => updateHourlyWage(e.target.value)} />
      </label>
      <label>전년도 연봉
        <input className="money-input" name="previous_annual_salary" defaultValue={formatMoneyInputValue(String(person?.previous_annual_salary || ""))} onInput={handleMoneyInput} />
      </label>
      <div className="form-help wide">운영설정: 근태관리에서 쓰는 주 근무일, 일 근무시간, 월 소정근로시간을 인건비 계산에도 그대로 사용합니다.</div>
      <label>주 근무일
        <input name="weekly_work_days" type="number" min="1" max="7" step="0.5" value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </label>
      <label>일 근무시간
        <input name="daily_work_hours" type="number" min="1" max="24" step="0.5" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      </label>
      <label>월 소정근로시간
        <span className="field-hint">주휴시간 포함 급여 산정 기준입니다. 주 5일·일 8시간은 209시간입니다.</span>
        <input name="monthly_capacity_hours" readOnly value={monthly} />
      </label>
    </>
  );
}

function FormModal({
  title, desc, children, onSubmit, onClose, draftKey
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  draftKey?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // 마운트 시 임시저장된 내용이 있으면 복구 여부를 묻는다.
  useEffect(() => {
    if (!draftKey) return;
    const saved = draftStore.read(draftKey);
    if (!saved || Object.keys(saved).length === 0) return;
    if (!window.confirm("이전에 저장하지 못한 입력 내용이 있습니다. 이어서 작성할까요?")) {
      draftStore.clear(draftKey);
      return;
    }
    const form = formRef.current;
    if (!form) return;
    Object.entries(saved).forEach(([name, value]) => {
      const elements = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`);
      elements.forEach((el) => {
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
          el.checked = value === "on" || value === el.value;
        } else if (el.type !== "file") {
          el.value = String(value ?? "");
        }
      });
    });
  }, [draftKey]);

  function serialize(formData: FormData): Record<string, string> {
    const obj: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") obj[key] = value; // File 은 임시저장하지 않음
    });
    return obj;
  }

  return (
    <>
      <ModalHead title={title} desc={desc} onClose={onClose} />
      <form
        ref={formRef}
        className="modal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            await onSubmit(formData);
            if (draftKey) draftStore.clear(draftKey); // 성공 시 임시저장 삭제
          } catch (error) {
            if (draftKey) draftStore.write(draftKey, serialize(formData)); // 실패 시 임시저장
            setMessage(error instanceof Error ? error.message : "저장에 실패했습니다. 입력 내용은 임시저장했어요.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
        {message && <div className="form-help wide" style={{ color: "#c0392b" }}>{message}</div>}
        <div className="modal-actions">
          <button className="btn blue" disabled={busy}>{busy ? "저장 중" : "저장"}</button>
        </div>
      </form>
    </>
  );
}

function DetailModal({
  modal, selectedReview, selectedProject, selectedExpense, selectedPerson,
  people, mobileDevices, cards, projects, bonuses, labor, compReviews, onClose, onEditExpense, onReviewStatus
  , onDeleteProject, onCompleteProject, onDeleteExpense, onDeleteReview, onEditProject, onEditPerson
}: {
  modal: ModalKey;
  selectedReview: ReviewItem | null;
  selectedProject: ProjectComputed | null;
  selectedExpense: ExpenseRequest | null;
  selectedPerson: Person;
  people: Person[];
  mobileDevices: MobileReceiptDevice[];
  cards: PaymentCard[];
  projects: ProjectComputed[];
  bonuses: BonusPayment[];
  labor: ProjectLaborAllocation[];
  compReviews: CompensationReview[];
  onClose: () => void;
  onEditExpense: () => void;
  onReviewStatus: (review: ReviewItem, status: ReviewStatus) => Promise<void>;
  onDeleteProject: (project: BusinessProject) => Promise<void>;
  onCompleteProject: (project: BusinessProject) => Promise<void>;
  onDeleteExpense: (expense: ExpenseRequest) => Promise<void>;
  onDeleteReview: (review: ReviewItem) => Promise<void>;
  onEditProject: (project: BusinessProject) => void;
  onEditPerson: (person: Person) => void;
}) {
  // 20번: 프로젝트 상세 - 인포그래픽 + 매출/비용/순이익
  if (modal === "projectDetail" && selectedProject) {
    const p = selectedProject;
    const maxBar = Math.max(p._revenue, p._cost, Math.abs(p._profit), 1);
    const clientName = p.client_name || projectMemoValue(p, "거래처/기관명") || "-";
    const clientType = p.client_type || projectMemoValue(p, "거래처 구분") || "-";
    const status = p.status || projectMemoValue(p, "상태") || "-";
    const ownerLabel = p.owner_label || projectMemoValue(p, "책임자") || "-";
    const operatorLabel = p.operator_label || projectMemoValue(p, "실무 담당자") || "-";
    const contact = p.contact || projectMemoValue(p, "실무 담당자 연락처") || "-";
    const inflowRoute = p.inflow_route || projectMemoValue(p, "유입 경로") || "-";
    const receiptStatus = p.receipt_status || projectMemoValue(p, "대금 수령 상태") || "-";
    const paymentDueDate = p.payment_due_date || projectMemoValue(p, "입금 예정일") || "-";
    const dueDate = p.due_date || projectMemoValue(p, "마감 날짜") || "-";
    const taxInvoiceDate = p.tax_invoice_date || projectMemoValue(p, "세금계산서 발행일") || "-";
    const revenueRecognitionDate = p.revenue_recognition_date || projectMemoValue(p, "매출 인식일") || "-";
    const receivedDate = p.received_date || projectMemoValue(p, "실제 입금일") || "-";
    const revenueTaxMode = p.revenue_tax_mode || projectMemoValue(p, "매출 부가세 처리") || "-";
    const repeatClient = p.repeat_client || projectMemoValue(p, "반복 가능 고객") === "예";
    return (
      <>
        <ModalHead title={`${p.name}`} desc="외주용역 항목 상세입니다. 비용은 연결된 지출결의에서 자동 집계됩니다." onClose={onClose} />

        {/* 인포그래픽 바 */}
        <div className="proj-graph">
          <ProjBar label="매출(확정금액)" value={p._revenue} max={maxBar} tone="revenue" />
          <ProjBar label="비용(자동집계)" value={p._cost} max={maxBar} tone="expense" />
          <ProjBar label="순이익" value={p._profit} max={maxBar} tone="net" />
        </div>
        <div className="proj-kpis">
          <div className="proj-kpi green"><span>매출</span><strong>{formatWon(p._revenue)}</strong></div>
          <div className="proj-kpi red"><span>비용</span><strong>{formatWon(p._cost)}</strong></div>
          <div className="proj-kpi blue"><span>순이익</span><strong>{formatWon(p._profit)}</strong></div>
          <div className="proj-kpi amber"><span>마진율</span><strong>{formatPercent(p._marginRate)}</strong></div>
        </div>

        <div className="modal-info">
          <Info label="거래처/기관명" value={clientName} />
          <Info label="거래처 구분" value={clientType} />
          <Info label="상태" value={status} />
          <Info label="책임자" value={ownerLabel} />
          <Info label="실무 담당자" value={operatorLabel} />
          <Info label="실무 담당자 연락처" value={contact} />
          <Info label="유입 경로" value={inflowRoute} />
          <Info label="프로젝트 분류" value={getProjectCategoryLabel(p)} />
          <Info label="확정 금액" value={formatWon(p._revenue)} />
          <Info label="월 반복 입금" value={p._isMonthlyRecurring ? `${formatWon(p._monthlyRevenue)} · 매월 매출 반영` : "해당 없음"} />
          <Info label="수령 금액" value={formatWon(p.received_amount)} />
          <Info label="미수금" value={formatWon(p._receivable)} />
          <Info label="자동집계 비용" value={formatWon(p._autoCost)} />
          <Info label="대금 수령 상태" value={receiptStatus} />
          <Info label="입금 예정일" value={paymentDueDate} />
          <Info label="마감 날짜" value={dueDate} />
          <Info label="세금계산서 발행일" value={taxInvoiceDate} />
          <Info label="매출 인식일" value={`${revenueRecognitionDate} · 일을 끝내 고객에게 넘긴 날`} />
          <Info label="실제 입금일" value={`${receivedDate} · 통장에 돈이 들어온 날`} />
          <Info label="매출 부가세" value={`${revenueTaxMode} · 나라에 맡길 세금 봉투`} />
          <Info label="반복 가능 고객" value={repeatClient ? "예" : "아니오"} />
          <Info label="메모" value={getProjectPlainMemo(p) || "-"} />
        </div>
        <div className="modal-actions project-actions">
          <button className="btn blue" type="button" onClick={() => onEditProject(p)}>프로젝트 수정</button>
          <button className="btn" type="button" onClick={() => onCompleteProject(p)} disabled={p.status === "납품 완료"}>{p.status === "납품 완료" ? "완료됨" : "완료 처리"}</button>
          <button className="btn danger" type="button" onClick={() => onDeleteProject(p)}>프로젝트 삭제</button>
        </div>
        <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} onDeleteReview={onDeleteReview} />
      </>
    );
  }

  if (modal === "employeeDetail") {
    const personBonuses = bonuses.filter((bonus) => bonus.person_id === selectedPerson.id);
    const personLabor = labor.filter((item) => item.person_id === selectedPerson.id);
    const review = compReviews.find((item) => item.person_id === selectedPerson.id);
    const raiseRate = selectedPerson.previous_annual_salary
      ? ((Number(selectedPerson.annual_salary || 0) - Number(selectedPerson.previous_annual_salary || 0)) / Number(selectedPerson.previous_annual_salary)) * 100
      : 0;

    return (
      <>
        <ModalHead title={`${selectedPerson.name} 상세`} desc="직원별 연봉, 인상률, 지원사업, 상여금, 투입 프로젝트를 봅니다." onClose={onClose} />
        <div className="modal-info">
          <Info label="기본정보" value={`${selectedPerson.rank} · ${selectedPerson.email || "-"}`} />
          <Info label="사번" value={selectedPerson.employee_number || "미등록"} />
          <Info label="입사일" value={selectedPerson.hire_date || "-"} />
          <Info label="계약연봉" value={formatWon(selectedPerson.annual_salary)} />
          <Info label="전년도 연봉" value={formatWon(selectedPerson.previous_annual_salary)} />
          <Info label="인상률" value={`${raiseRate.toFixed(1)}%`} />
          <Info label="월 급여" value={formatWon(Number(selectedPerson.annual_salary || 0) / 12)} />
          <Info label="총인건비 추정" value={formatWon((Number(selectedPerson.annual_salary || 0) / 12) * 1.15)} />
          <Info label="지원사업 연결" value={review?.grant_program_name || "미등록"} />
          <Info label="상여금 현황" value={`${personBonuses.length}건 · ${formatWon(personBonuses.reduce((s, b) => s + Number(b.bonus_amount || 0), 0))}`} />
          <Info label="투입 프로젝트" value={`${personLabor.length}건 · ${personLabor.reduce((s, l) => s + Number(l.man_months || 0), 0).toFixed(2)}MM`} />
          <Info label="비밀번호 변경" value={selectedPerson.password_changed_at ? formatDateTime(selectedPerson.password_changed_at) : "초기 비밀번호 사용 가능"} />
        </div>
        <div className="modal-actions">
          <button className="btn blue" type="button" onClick={() => onEditPerson(selectedPerson)}>직원 정보 수정</button>
        </div>
        <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} onDeleteReview={onDeleteReview} />
      </>
    );
  }

  if ((modal === "expenseReview" || modal === "taxReview") && selectedExpense) {
    const linkedProject = projects.find((project) => project.id === selectedExpense.project_id);
    const receiptUrl = getExpenseReceiptUrl(selectedExpense);
    const deviceId = getExpenseDeviceId(selectedExpense);
    const deviceOwner = getDeviceOwnerName(deviceId, mobileDevices);
    const visibleMemo = cleanExpenseMemo(selectedExpense.memo);
    return (
      <>
        <ModalHead title={selectedExpense.purpose} desc="지출결의 상세입니다. 증빙·결제수단·이체 내용을 확인하고 승인할 수 있습니다." onClose={onClose} />
        {/* 13번: 무엇을 검토할지 */}
        {selectedReview?.checklist && (
          <div className="checklist-box">
            <div className="checklist-title">검토 포인트</div>
            <p>{selectedReview.checklist}</p>
          </div>
        )}
        <div className="modal-info">
          <Info label="사용일" value={selectedExpense.used_at} className="important" />
          <Info label="금액" value={formatWon(selectedExpense.amount)} />
          <Info label="지출 대분류" value={getExpenseUsageLabel(selectedExpense)} />
          <Info label="지출 소분류" value={getExpenseSubcategoryLabel(selectedExpense) || "-"} />
          <Info label="비용 성격" value={`${selectedExpense.cost_behavior || readMemoField(selectedExpense.memo, "비용 성격") || inferExpenseCostBehavior(String(selectedExpense.usage || ""), selectedExpense.project_id || "")} · 재료비인지 월세인지 구분`} />
          <Info label="공급가액" value={`${formatWon(selectedExpense.supply_amount || Number(readMemoField(selectedExpense.memo, "공급가액").replace(/[^0-9.-]/g, "")) || selectedExpense.amount)} · 실제 회사 비용`} />
          <Info label="부가세" value={`${formatWon(selectedExpense.vat_amount || Number(readMemoField(selectedExpense.memo, "부가세").replace(/[^0-9.-]/g, "")) || 0)} · 나라에 맡길 세금 봉투`} />
          <Info label="실제 지급일" value={`${selectedExpense.paid_at || readMemoField(selectedExpense.memo, "실제 지급일") || selectedExpense.used_at} · 통장에서 돈이 빠진 날`} />
          <Info label="결제방식" value={getExpensePaymentLabel(selectedExpense, cards)} />
          {isRecurringExpense(selectedExpense) && <Info label="반복 주기" value={getExpenseCycleLabel(selectedExpense)} />}
          <Info label="이체 여부" value={selectedExpense.transfer_status || "-"} />
          <Info label="연결 프로젝트" value={linkedProject?.name || "미연결"} />
          <Info label="증빙 상태" value={selectedExpense.evidence_status || "-"} />
          <Info label="업로드 담당자" value={deviceOwner || (deviceId ? "미등록 기기" : "-")} />
          <Info label="OCR 거래처" value={selectedExpense.ocr_vendor_name || "OCR 미실행/미인식"} />
          <Info label="OCR 금액" value={selectedExpense.ocr_total_amount ? formatWon(selectedExpense.ocr_total_amount) : "-"} />
          <Info label="파일" value={receiptUrl ? "첨부됨" : "없음"} />
          <Info label="이체 내용 요약" value={selectedExpense.transfer_summary || "-"} />
          <Info label="메모" value={visibleMemo || "-"} />
        </div>
        {receiptUrl && (
          <div className="receipt-preview">
            <div className="receipt-preview-head">
              <strong>영수증 이미지</strong>
              <a className="btn small" href={receiptUrl} target="_blank" rel="noreferrer">원본 열기</a>
            </div>
            <img src={receiptUrl} alt={`${selectedExpense.purpose} 영수증`} loading="lazy" />
          </div>
        )}
        <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} onDeleteReview={onDeleteReview}>
          <button className="btn" type="button" onClick={onEditExpense}>지출결의 수정</button>
          <button className="btn danger" type="button" onClick={() => onDeleteExpense(selectedExpense)}>지출결의 삭제</button>
        </ReviewActions>
      </>
    );
  }

  // reviewDetail (기타 검토 항목)
  return (
    <>
      <ModalHead title={selectedReview?.title || "상세"} desc={selectedReview?.reason || "상세 정보를 확인합니다."} onClose={onClose} />
      {selectedReview?.checklist && (
        <div className="checklist-box">
          <div className="checklist-title">검토 포인트</div>
          <p>{selectedReview.checklist}</p>
        </div>
      )}
      <div className="modal-info">
        <Info label="영역" value={selectedReview?.area || "-"} />
        <Info label="영향" value={selectedReview?.amount_or_impact || "-"} />
        <Info label="담당" value={selectedReview?.owner_label || "-"} />
        <Info label="상태" value={selectedReview?.status || "-"} />
      </div>
      <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} onDeleteReview={onDeleteReview} />
    </>
  );
}

function ReviewActions({
  selectedReview, onClose, onReviewStatus, onDeleteReview, children
}: {
  selectedReview: ReviewItem | null;
  onClose: () => void;
  onReviewStatus: (review: ReviewItem, status: ReviewStatus) => Promise<void>;
  onDeleteReview?: (review: ReviewItem) => Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <div className="modal-actions">
      {selectedReview ? (
        <>
          <button className="btn" onClick={() => onReviewStatus(selectedReview, "수정 요청")}>수정 요청</button>
          <button className="btn" onClick={() => onReviewStatus(selectedReview, "보류")}>보류</button>
          <button className="btn blue" onClick={() => onReviewStatus(selectedReview, "승인")}>승인</button>
          {onDeleteReview && <button className="btn danger" onClick={() => onDeleteReview(selectedReview)}>검토 항목 삭제</button>}
          {children}
        </>
      ) : (
        <>
          {children}
          <button className="btn blue" onClick={onClose}>확인</button>
        </>
      )}
    </div>
  );
}

// 10번: X버튼 겹침 해결 - 헤더 안에 닫기 버튼 배치(floating 제거)
function ModalHead({ title, desc, onClose }: { title: string; desc: string; onClose: () => void }) {
  return (
    <div className="modal-head">
      <div className="modal-head-text">
        <h2 className="modal-title">{title}</h2>
        <p className="modal-desc">{desc}</p>
      </div>
      <button className="modal-close" onClick={onClose} type="button" aria-label="닫기">×</button>
    </div>
  );
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`info-box ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FloatingActions({ onQuick }: { onQuick: () => void }) {
  return (
    <div className="fab">
      <button className="fab-main" onClick={onQuick}>+ 빠른 지출 등록</button>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="hero-mini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CashSignal({
  label, value, tone, amount, max, onClick
}: {
  label: string;
  value: string;
  tone: "green" | "orange" | "red" | "blue";
  amount: number;
  max: number;
  onClick: () => void;
}) {
  const width = Math.max(6, Math.min(100, (Math.abs(amount) / Math.max(max, 1)) * 100));
  return (
    <button className={`cash-signal ${tone}`} type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="cash-signal-track"><i style={{ width: `${width}%` }} /></div>
    </button>
  );
}

function KpiCard({
  label, value, chip, tone, compact, empty, onClick, active
}: {
  label: string;
  value: string;
  chip: string;
  tone: "green" | "red" | "orange" | "blue" | "purple";
  compact?: boolean;
  empty?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const isClickable = Boolean(onClick);
  return (
    <div
      className={`card kpi-card ${compact ? "resource-kpi" : ""} ${empty ? "is-empty" : ""} ${isClickable ? "clickable-card" : ""} ${active ? "is-active" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
      <span className={`chip ${empty ? "" : tone}`}>{chip}</span>
    </div>
  );
}

function InfoCard({ title, copy, value }: { title: string; copy: string; value: string }) {
  return (
    <div className="quick-card info-card">
      <strong>{title}</strong>
      <span>{copy}</span>
      <div className="info-card-value">{value}</div>
    </div>
  );
}

function Metric({ title, copy, value }: { title: string; copy: string; value: string }) {
  return (
    <div className="metric-card">
      <div>
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
      <div className="value">{value}</div>
    </div>
  );
}

function QuickCard({
  title, copy, icon, onClick
}: {
  title: string;
  copy: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="quick-card" onClick={onClick} type="button">
      {icon && <div className="quick-icon">{icon}</div>}
      <strong>{title}</strong>
      <span>{copy}</span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-dot" />
      <p>{text}</p>
    </div>
  );
}

function CashHistory({ cash, onClose, onAddCash }: { cash: CashSnapshot[]; onClose: () => void; onAddCash: () => void }) {
  const items = [...cash].sort((a, b) => String(b.snapshot_month).localeCompare(String(a.snapshot_month)));
  return (
    <>
      <ModalHead title="입력한 현금 현황" desc="월별로 저장한 현재 현금과 자동 계산된 매출·지출·미수금·지급예정을 확인합니다." onClose={onClose} />
      <div className="modal-inline-actions">
        <button className="btn blue" type="button" onClick={onAddCash}>통장별 현금 입력</button>
      </div>
      {items.length === 0 ? (
        <EmptyState text="아직 입력된 현금 현황이 없습니다." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>기준 월</th>
                <th className="num" style={{ width: 140 }}>현재 현금</th>
                <th style={{ width: 240 }}>통장별 현금 현황</th>
                <th className="num" style={{ width: 130 }}>매출</th>
                <th className="num" style={{ width: 130 }}>지출</th>
                <th className="num" style={{ width: 130 }}>순현금흐름</th>
                <th className="num" style={{ width: 120 }}>미수금</th>
                <th className="num" style={{ width: 120 }}>지급예정</th>
                <th className="num" style={{ width: 90 }}>Runway</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const accounts = getCashAccounts(item);
                const accountSum = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
                return (
                  <tr key={item.id}>
                    <td>{String(item.snapshot_month).slice(0, 7)}</td>
                    <td className="num strong-num">{formatWon(item.current_cash)}</td>
                    <td>
                      {accounts.length > 0 ? (
                        <div className="cash-account-list">
                          {accounts.map((account, index) => (
                            <div key={`${item.id}-${index}`}><span>{[account.bank, account.label].filter(Boolean).join(" · ") || "통장"}</span><strong>{formatWon(account.balance)}</strong></div>
                          ))}
                          <div className="cash-account-total"><span>통장 합계</span><strong>{formatWon(accountSum)}</strong></div>
                        </div>
                      ) : (
                        <span className="muted-cell">세부 내역 미저장</span>
                      )}
                    </td>
                    <td className="num">{formatWon(item.revenue)}</td>
                    <td className="num">{formatWon(item.expense)}</td>
                    <td className="num">{formatWon(Number(item.revenue || 0) - Number(item.expense || 0))}</td>
                    <td className="num">{formatWon(item.receivable_amount)}</td>
                    <td className="num">{formatWon(item.payable_amount)}</td>
                    <td className="num">{item.runway_months ? `${item.runway_months}개월` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="modal-actions">
        <button className="btn blue" type="button" onClick={onClose}>확인</button>
      </div>
    </>
  );
}

// 4번: 토스 블루 계열 직관적 색상 (CSS 변수로 정의됨)
function CashFlowChart({ cash, onAddCash }: { cash: CashSnapshot[]; onAddCash: () => void }) {
  const items = cash
    .filter((item) => String(item.snapshot_month || "").slice(0, 7) >= "2026-06")
    .sort((a, b) => String(a.snapshot_month).localeCompare(String(b.snapshot_month)));
  if (items.length === 0) {
    return (
      <div className="chart-empty">
        <EmptyState text="현금 현황을 입력하면 월별 추이가 그려집니다." />
        <button className="btn small blue" onClick={onAddCash}>현금 현황 입력</button>
      </div>
    );
  }
  const maxValue = Math.max(...items.flatMap((item) => [Number(item.revenue || 0), Number(item.expense || 0), Math.abs(Number(item.net_burn || 0))]), 1);

  return (
    <div className="cash-chart">
      {items.map((item) => (
        <div className="cash-month" key={item.id}>
          <strong>{item.snapshot_month.slice(5, 7)}월</strong>
          <div className="cash-bars">
            <div className="mini-track"><div className="mini-fill revenue" style={{ width: `${(Number(item.revenue || 0) / maxValue) * 100}%` }} /></div>
            <div className="mini-track"><div className="mini-fill expense" style={{ width: `${(Number(item.expense || 0) / maxValue) * 100}%` }} /></div>
            <div className="mini-track"><div className="mini-fill net" style={{ width: `${(Math.abs(Number(item.net_burn || 0)) / maxValue) * 100}%` }} /></div>
          </div>
          <div className="cash-num">매출 {formatWonShort(item.revenue)} / 비용 {formatWonShort(item.expense)} / 현금 {formatWonShort(item.current_cash)}</div>
        </div>
      ))}
    </div>
  );
}

// 24번: 버블 클릭 시 프로젝트 상세
function ProfitMap({ projects, onOpenProject }: { projects: ProjectComputed[]; onOpenProject: (p: ProjectComputed) => void }) {
  const items = projects.slice(0, 6);
  if (items.length === 0) {
    return <EmptyState text="등록된 프로젝트가 없습니다." />;
  }
  const maxRevenue = Math.max(...items.map((item) => item._revenue), 1);

  return (
    <div className="profit-map">
      <div className="axis y">매출 규모 ↑</div>
      <div className="axis x">마진율 →</div>
      {items.map((project, index) => {
        const margin = Math.max(0, project._marginRate);
        const revenueRatio = project._revenue / maxRevenue;
        const size = Math.max(78, Math.min(128, 70 + revenueRatio * 58));
        const left = Math.min(70, 10 + margin * 120);
        const top = Math.max(10, 70 - revenueRatio * 54);
        const tones = ["green", "blue", "orange", "purple"];
        return (
          <button
            key={project.id}
            className={`bubble ${tones[index % tones.length]}`}
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
            onClick={() => onOpenProject(project)}
            type="button"
            title={`${project.name} · 마진 ${formatPercent(project._marginRate)}`}
          >
            {project.name.length > 8 ? project.name.slice(0, 7) + "…" : project.name}
          </button>
        );
      })}
    </div>
  );
}

// 20번: 프로젝트 상세 인포그래픽 바
function ProjBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = Math.max(2, Math.min(100, (Math.abs(value) / max) * 100));
  return (
    <div className="proj-bar-row">
      <span className="proj-bar-label">{label}</span>
      <div className="proj-bar-track">
        <div className={`proj-bar-fill ${tone} ${value < 0 ? "negative" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="proj-bar-value">{formatWon(value)}</span>
    </div>
  );
}

function StackRow({
  project, segments, mm
}: {
  project: string;
  segments: Array<[Rank, number]>;
  mm: string;
}) {
  const classMap: Record<Rank, string> = {
    "대표": "a", "본부장": "b", "책임": "c", "선임": "d", "매니저": "e"
  };
  return (
    <div className="stack-row">
      <strong className="stack-project-name">{project}</strong>
      <div className="stack-bar">
        {segments.map(([rank, width], index) => (
          <div key={`${project}-${rank}-${index}`} className={`stack-seg ${classMap[rank]}`} style={{ width: `${width}%` }}>
            {width >= 12 ? `${width}` : ""}
          </div>
        ))}
      </div>
      <span className="num">{mm}</span>
    </div>
  );
}
