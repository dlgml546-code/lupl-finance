import React, { useEffect, useState } from "react";
import {
  Building2,
  Camera,
  Clock,
  FilePlus2,
  FolderPlus,
  LogOut,
  Plus,
  ReceiptText,
  RefreshCcw,
  Upload
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type {
  BonusPayment,
  BusinessCategory,
  BusinessProject,
  CashSnapshot,
  CompensationReview,
  Department,
  ExpenseCategory,
  ExpenseRequest,
  PagePermission,
  Person,
  ProjectLaborAllocation,
  Rank,
  ReviewItem,
  ReviewStatus
} from "./types";
import "./styles.css";

type SectionKey =
  | "overview"
  | "review"
  | "expense"
  | "revenue"
  | "compensation"
  | "resource"
  | "org";

type ModalKey =
  | "expenseReview"
  | "taxReview"
  | "projectDetail"
  | "employeeDetail"
  | "projectForm"
  | "expenseForm"
  | "personForm"
  | "bonusForm"
  | "laborForm"
  | "permissionForm"
  | null;

type Toast = { type: "ok" | "warn" | "err"; message: string } | null;

const sectionMeta: Record<SectionKey, { title: string; desc: string }> = {
  overview: {
    title: "경영현황",
    desc: "현재 현금, 이번 달 매출, 직원 월급 포함 지출, 현금소진액을 먼저 보여줍니다. 검토할 항목은 대표 검토함에서 팝업으로 확인하고 승인합니다."
  },
  review: {
    title: "대표 검토함",
    desc: "지출결의, 사업·매출, 인건비, 인력투입, 권한 요청까지 대표가 검토할 항목을 한곳에 모읍니다."
  },
  expense: {
    title: "지출결의",
    desc: "영수증 사진을 빠르게 등록하고, 기존 노션 지출결의처럼 검토 요약과 상세 목록을 함께 확인합니다."
  },
  revenue: {
    title: "사업·매출관리",
    desc: "프로젝트 단위로 매출, 비용, 순이익, 마진율, 수금 상태를 관리합니다."
  },
  compensation: {
    title: "인건비·보상",
    desc: "직원별 연봉, 인상률, 지원사업 인건비, 상여금·성과보상을 한 화면에서 관리합니다."
  },
  resource: {
    title: "인력투입·매출분석",
    desc: "프로젝트별 맨먼스, 가동률, 수익성 지도, 직위별 투입비율을 함께 봅니다."
  },
  org: {
    title: "조직·권한관리",
    desc: "조직도와 페이지별 접근 권한을 관리합니다."
  }
};

const menu: Array<{ key: SectionKey; label: string }> = [
  { key: "overview", label: "경영현황" },
  { key: "review", label: "대표 검토함" },
  { key: "expense", label: "지출결의" },
  { key: "revenue", label: "사업·매출관리" },
  { key: "compensation", label: "인건비·보상" },
  { key: "resource", label: "인력투입·매출분석" },
  { key: "org", label: "조직·권한관리" }
];

const pageKeyMap: Record<SectionKey, string> = {
  overview: "overview",
  review: "review",
  expense: "expense",
  revenue: "revenue",
  compensation: "compensation",
  resource: "resource",
  org: "org"
};

const businessCategories: BusinessCategory[] = ["교육 용역", "전시·행사", "연구용역", "상품/IP", "지원금", "콘텐츠 제작", "기타"];
const expenseCategories: ExpenseCategory[] = ["운영비", "내부 사업비", "외부 사업비", "외주용역비", "인건비", "제작비", "AI 구독료", "여비교통비", "기타"];
const ranks: Rank[] = ["대표", "본부장", "책임", "선임", "매니저"];
const reviewStatuses: ReviewStatus[] = ["검토 전", "승인", "보류", "수정 요청", "반려"];

function formatWon(value: number | null | undefined) {
  return `${Math.round(Number(value || 0)).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function parseNumber(value: FormDataEntryValue | null) {
  if (value === null) return 0;
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
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

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [compReviews, setCompReviews] = useState<CompensationReview[]>([]);
  const [bonuses, setBonuses] = useState<BonusPayment[]>([]);
  const [labor, setLabor] = useState<ProjectLaborAllocation[]>([]);
  const [cash, setCash] = useState<CashSnapshot[]>([]);

  const [section, setSection] = useState<SectionKey>("overview");
  const [modal, setModal] = useState<ModalKey>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [selectedProject, setSelectedProject] = useState<BusinessProject | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const pendingReviews = reviews.filter((review) => review.status === "검토 전");
  const latestCash = cash[0];

  const activeMeta = sectionMeta[section];
  const availableMenu = menu.filter((item) => canOpenPage(currentPerson, permissions, item.key));

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
      const [departmentsRes, peopleRes, permissionsRes, projectsRes, expensesRes, reviewsRes, compRes, bonusesRes, laborRes, cashRes] =
        await Promise.all([
          supabase.from("departments").select("*").order("name"),
          supabase.from("people").select("*").order("rank").order("name"),
          supabase.from("page_permissions").select("*"),
          supabase.from("business_projects").select("*").order("created_at", { ascending: false }),
          supabase.from("expense_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("review_items").select("*").order("created_at", { ascending: false }),
          supabase.from("compensation_reviews").select("*").order("created_at", { ascending: false }),
          supabase.from("bonus_payments").select("*").order("created_at", { ascending: false }),
          supabase.from("project_labor_allocations").select("*").order("created_at", { ascending: false }),
          supabase.from("cash_snapshots").select("*").order("snapshot_month", { ascending: false })
        ]);

      const responses = [departmentsRes, peopleRes, permissionsRes, projectsRes, expensesRes, reviewsRes, compRes, bonusesRes, laborRes, cashRes];
      const firstError = responses.find((res) => res.error)?.error;
      if (firstError) throw firstError;

      setDepartments((departmentsRes.data || []) as Department[]);
      setPeople((peopleRes.data || []) as Person[]);
      setPermissions((permissionsRes.data || []) as PagePermission[]);
      setProjects((projectsRes.data || []) as BusinessProject[]);
      setExpenses((expensesRes.data || []) as ExpenseRequest[]);
      setReviews((reviewsRes.data || []) as ReviewItem[]);
      setCompReviews((compRes.data || []) as CompensationReview[]);
      setBonuses((bonusesRes.data || []) as BonusPayment[]);
      setLabor((laborRes.data || []) as ProjectLaborAllocation[]);
      setCash((cashRes.data || []) as CashSnapshot[]);
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

  async function createReviewItem(payload: Omit<ReviewItem, "id">) {
    const { error } = await supabase.from("review_items").insert(payload);
    if (error) throw error;
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
    }

    showToast(`${status} 처리했습니다.`);
    setModal(null);
    await loadAll();
  }

  async function createProject(formData: FormData) {
    try {
      const revenue = parseNumber(formData.get("revenue"));
      const cost = parseNumber(formData.get("cost"));
      const profit = revenue - cost;
      const marginRate = revenue > 0 ? profit / revenue : 0;

      const payload = {
        name: String(formData.get("name") || ""),
        category: String(formData.get("category") || "기타") as BusinessCategory,
        client_name: String(formData.get("client_name") || ""),
        status: String(formData.get("status") || "진행 중"),
        revenue,
        cost,
        profit,
        margin_rate: marginRate,
        receivable_amount: parseNumber(formData.get("receivable_amount")),
        man_months: Number(String(formData.get("man_months") || "0")) || 0,
        start_date: String(formData.get("start_date") || "") || null,
        end_date: String(formData.get("end_date") || "") || null,
        owner_id: currentPerson?.id || null,
        memo: String(formData.get("memo") || "")
      };

      const { data, error } = await supabase.from("business_projects").insert(payload).select().single();
      if (error) throw error;

      await createReviewItem({
        area: "사업·매출",
        title: `${data.name} 프로젝트 생성`,
        reason: "신규 프로젝트 검토",
        amount_or_impact: formatWon(data.revenue),
        owner_label: currentPerson?.name || "담당자",
        status: "검토 전",
        target_table: "business_projects",
        target_id: data.id
      });

      showToast("프로젝트를 생성했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "프로젝트 생성 실패", "err");
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
        if (uploadError) throw uploadError;

        const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        fileUrl = signed?.signedUrl || null;

        const { data: ocrData, error: ocrError } = await supabase.functions.invoke("receipt-ocr", {
          body: { storagePath }
        });

        if (!ocrError && ocrData) {
          ocrResult = ocrData as Record<string, unknown>;
        }
      }

      const payload = {
        used_at: String(formData.get("used_at") || today()),
        purpose: String(formData.get("purpose") || ocrResult?.purpose || "영수증 지출"),
        category: String(formData.get("category") || "기타") as ExpenseCategory,
        payment_method: String(formData.get("payment_method") || "카드"),
        amount: parseNumber(formData.get("amount")) || Number(ocrResult?.total_amount || 0),
        evidence_status: fileUrl ? "영수증 첨부" : "증빙 필요",
        transfer_status: String(formData.get("transfer_status") || "결제 완료"),
        project_id: String(formData.get("project_id") || "") || null,
        requested_by: currentPerson?.id || null,
        review_status: "검토 전" as ReviewStatus,
        review_reason: "대표 검토 필요",
        receipt_file_url: fileUrl,
        receipt_storage_path: storagePath,
        ocr_vendor_name: String(ocrResult?.vendor_name || "") || null,
        ocr_total_amount: Number(ocrResult?.total_amount || 0) || null,
        ocr_transaction_date: String(ocrResult?.transaction_date || "") || null,
        memo: String(formData.get("memo") || "")
      };

      const { data, error } = await supabase.from("expense_requests").insert(payload).select().single();
      if (error) throw error;

      await createReviewItem({
        area: "지출결의",
        title: data.purpose,
        reason: data.review_reason || "지출결의 확인",
        amount_or_impact: formatWon(data.amount),
        owner_label: currentPerson?.name || "담당자",
        status: "검토 전",
        target_table: "expense_requests",
        target_id: data.id
      });

      showToast("지출결의를 등록했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "지출결의 등록 실패", "err");
    }
  }

  async function createPerson(formData: FormData) {
    try {
      const payload = {
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        rank: String(formData.get("rank") || "매니저") as Rank,
        department_id: String(formData.get("department_id") || "") || null,
        hire_date: String(formData.get("hire_date") || "") || null,
        annual_salary: parseNumber(formData.get("annual_salary")),
        previous_annual_salary: parseNumber(formData.get("previous_annual_salary")),
        monthly_capacity_hours: parseNumber(formData.get("monthly_capacity_hours")) || 160,
        memo: String(formData.get("memo") || ""),
        is_active: true
      };

      const existing = payload.email
        ? await supabase.from("people").select("id").eq("email", payload.email).maybeSingle()
        : { data: null, error: null };

      if (existing.error) throw existing.error;

      const result = existing.data
        ? await supabase.from("people").update(payload).eq("id", existing.data.id)
        : await supabase.from("people").insert(payload);

      if (result.error) throw result.error;

      showToast("직원 정보를 저장했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "직원 저장 실패", "err");
    }
  }

  async function createBonus(formData: FormData) {
    try {
      const profitAmount = parseNumber(formData.get("profit_amount"));
      const bonusRateRaw = Number(String(formData.get("bonus_rate") || "0").replace("%", ""));
      const bonusRate = bonusRateRaw / 100;
      const bonusAmount = Math.round(profitAmount * bonusRate);

      const payload = {
        person_id: String(formData.get("person_id") || "") || null,
        project_id: String(formData.get("project_id") || "") || null,
        period_label: String(formData.get("period_label") || ""),
        profit_amount: profitAmount,
        bonus_rate: bonusRate,
        bonus_amount: bonusAmount,
        payment_status: "검토 전" as ReviewStatus,
        planned_payment_date: String(formData.get("planned_payment_date") || "") || null,
        memo: String(formData.get("memo") || "")
      };

      const { data, error } = await supabase.from("bonus_payments").insert(payload).select().single();
      if (error) throw error;

      await createReviewItem({
        area: "인건비",
        title: "상여금 지급 검토",
        reason: "상여금 지급 조건 확인",
        amount_or_impact: formatWon(data.bonus_amount),
        owner_label: currentPerson?.name || "대표",
        status: "검토 전",
        target_table: "bonus_payments",
        target_id: data.id
      });

      showToast("상여금 항목을 등록했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "상여금 저장 실패", "err");
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

      const { error } = await supabase.from("project_labor_allocations").insert(payload);
      if (error) throw error;

      showToast("맨먼스 투입 정보를 저장했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "맨먼스 저장 실패", "err");
    }
  }

  async function createPermission(formData: FormData) {
    try {
      const payload = {
        person_id: String(formData.get("person_id") || ""),
        page_key: String(formData.get("page_key") || "overview"),
        permission: String(formData.get("permission") || "보기만 가능")
      };

      const { error } = await supabase.from("page_permissions").upsert(payload, { onConflict: "person_id,page_key" });
      if (error) throw error;

      showToast("권한을 저장했습니다.");
      setModal(null);
      await loadAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "권한 저장 실패", "err");
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

        <div className="user-box">
          <strong>{currentPerson.name}</strong>
          <span>{currentPerson.rank} · {userEmail}</span>
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
              {item.key === "review" && (
                <span className="nav-count">{pendingReviews.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="side-summary">
          <h3>Runway</h3>
          <div className="risk-line" />
          <p>
            최근 3개월 평균 현금소진액 기준
            <br />
            현재 예상 생존기간은 <strong>{latestCash?.runway_months || 0}개월</strong>입니다.
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

          <div className={`home-actions ${section !== "overview" ? "hidden" : ""}`}>
            <select className="btn" aria-label="기준월">
              {cash.map((item) => (
                <option key={item.id}>{item.snapshot_month.slice(0, 7)}</option>
              ))}
            </select>
            <button className="btn" onClick={loadAll}><RefreshCcw size={16} /> 새로고침</button>
            <button className="btn dark" onClick={() => setModal("expenseForm")}>거래 업로드</button>
          </div>
        </header>

        {section === "overview" && (
          <Overview setSection={setSection} reviewCount={pendingReviews.length} cash={cash} projects={projects} expenses={expenses} />
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
                setSelectedProject(projects.find((item) => item.id === review.target_id) || projects[0] || null);
                setModal("projectDetail");
              } else if (review.target_table === "compensation_reviews") {
                setSelectedPerson(people[0] || currentPerson);
                setModal("employeeDetail");
              } else {
                setModal("expenseReview");
              }
            }}
            onUpdateReview={updateReviewStatus}
          />
        )}
        {section === "expense" && (
          <Expense
            projects={projects}
            expenses={expenses}
            onOpenExpense={(expense) => {
              setSelectedExpense(expense);
              setModal(expense.purpose.includes("강사") ? "taxReview" : "expenseReview");
            }}
            onCreate={() => setModal("expenseForm")}
          />
        )}
        {section === "revenue" && (
          <Revenue
            projects={projects}
            onCreate={() => setModal("projectForm")}
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
            projects={projects}
            bonuses={bonuses}
            onOpenPerson={(person) => {
              setSelectedPerson(person);
              setModal("employeeDetail");
            }}
            onCreatePerson={() => setModal("personForm")}
            onCreateBonus={() => setModal("bonusForm")}
          />
        )}
        {section === "resource" && (
          <Resource projects={projects} people={people} labor={labor} onCreateLabor={() => setModal("laborForm")} />
        )}
        {section === "org" && (
          <Org
            currentPerson={currentPerson}
            canManage={canManage(currentPerson)}
            people={people}
            departments={departments}
            permissions={permissions}
            onCreatePerson={() => setModal("personForm")}
            onCreatePermission={() => setModal("permissionForm")}
          />
        )}

        <FloatingActions setSection={setSection} setModal={setModal} />
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
        departments={departments}
        projects={projects}
        bonuses={bonuses}
        labor={labor}
        compReviews={compReviews}
        onReviewStatus={updateReviewStatus}
        onCreateProject={createProject}
        onCreateExpense={createExpense}
        onCreatePerson={createPerson}
        onCreateBonus={createBonus}
        onCreateLabor={createLabor}
        onCreatePermission={createPermission}
      />
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAuth(formData: FormData) {
    setBusy(true);
    setMessage("");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(mode === "signup" ? "가입했습니다. 메일 확인 설정이 켜져 있으면 이메일 인증 후 로그인하세요." : "로그인했습니다.");
    }
    setBusy(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">경영</div>
        <h1>러플 경영관리 대시보드</h1>
        <p>Supabase 계정으로 로그인하면 실제 데이터가 저장됩니다.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleAuth(new FormData(event.currentTarget));
          }}
        >
          <label>이메일<input name="email" type="email" required placeholder="cs@lupl.kr" /></label>
          <label>비밀번호<input name="password" type="password" required minLength={6} placeholder="6자 이상" /></label>
          <button className="btn blue" type="submit" disabled={busy}>{mode === "login" ? "로그인" : "회원가입"}</button>
        </form>
        <button className="link-btn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "처음이면 회원가입" : "이미 계정이 있으면 로그인"}
        </button>
        {message && <div className="auth-message">{message}</div>}
      </div>
    </div>
  );
}

function Overview({
  setSection,
  reviewCount,
  cash,
  projects,
  expenses
}: {
  setSection: (key: SectionKey) => void;
  reviewCount: number;
  cash: CashSnapshot[];
  projects: BusinessProject[];
  expenses: ExpenseRequest[];
}) {
  const latest = cash[0];
  const monthlyRevenue = latest?.revenue ?? projects.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const monthlyExpense = latest?.expense ?? expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentCash = latest?.current_cash || 0;
  const runway = latest?.runway_months || 0;
  const receivable = latest?.receivable_amount ?? projects.reduce((sum, item) => sum + Number(item.receivable_amount || 0), 0);
  const payable = latest?.payable_amount ?? expenses.filter((item) => item.review_status !== "승인").reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <section className="section active">
      <div className="alert-top">
        <div>
          <strong>대표 검토함에 처리할 항목이 {reviewCount}건 있습니다.</strong>
          <span>지출결의, 사업·매출, 인건비, 인력투입, 권한 요청을 한곳에서 검토합니다.</span>
        </div>
        <button className="btn small" onClick={() => setSection("review")}>대표 검토함 열기</button>
      </div>

      <div className="grid kpi">
        <div className="card hero-card">
          <div>
            <div className="hero-label">현재 현금</div>
            <div className="hero-value">{formatWon(currentCash)}</div>
            <div className="hero-copy">
              현재 현금, 입금예정, 지급예정, 지원금 종료 영향을 함께 봅니다.
              현금 기준 데이터는 cash_snapshots 테이블에서 불러옵니다.
            </div>
          </div>
          <div className="hero-insights">
            <InfoMini label="이번 달 입금예정" value={formatWon(receivable)} />
            <InfoMini label="이번 달 지급예정" value={formatWon(payable)} />
            <InfoMini label="직원 월급 포함 지출" value={formatWon(monthlyExpense)} />
            <InfoMini label="예상 월말 현금" value={formatWon(currentCash + receivable - payable)} />
          </div>
        </div>

        <KpiCard label="이번 달 매출" value={formatWon(monthlyRevenue)} chip="Supabase 연결" tone="green" />
        <KpiCard label="직원 월급 포함 지출" value={formatWon(monthlyExpense)} chip="전월 대비 확인" tone="red" />
        <KpiCard label="현금소진액 / Runway" value={`${formatWon(latest?.net_burn || 0)}`} chip={`${runway}개월 runway`} tone="orange" />
      </div>

      <div className="grid two">
        <div className="card">
          <h2 className="card-title">현금흐름 추이</h2>
          <p className="card-sub">월별로 매출, 비용, 순현금흐름을 다른 색으로 분리해 보여줍니다.</p>
          <div className="legend">
            <span className="legend-item"><i className="legend-dot" />매출</span>
            <span className="legend-item"><i className="legend-dot expense" />비용</span>
            <span className="legend-item"><i className="legend-dot net" />순현금흐름</span>
          </div>
          <CashFlowChart cash={cash} />
        </div>

        <div className="card">
          <h2 className="card-title">이번 달 경영 요약</h2>
          <p className="card-sub">검토함과 중복되지 않도록, 이 자리에는 요약 지표만 배치했습니다.</p>
          <div className="metric-list">
            <Metric title="매출 대비 지출률" copy="지출 ÷ 매출 기준" value={monthlyRevenue ? `${Math.round((monthlyExpense / monthlyRevenue) * 100)}%` : "0%"} />
            <Metric title="프로젝트 수" copy="사업·매출관리 등록 기준" value={`${projects.length}개`} />
            <Metric title="미수금" copy="세금계산서 발행 후 미수금" value={formatWon(receivable)} />
            <Metric title="다음 지급 예정" copy="승인 전 지출결의 기준" value={formatWon(payable)} />
          </div>
        </div>
      </div>

      <div className="point-card blue">
        <div>
          <div className="point-title">이번 달 의사결정 포인트</div>
          <div className="point-copy">지원사업 인건비 종료 전, 신규 채용·상여금·외주비 집행 가능성을 함께 확인해야 합니다.</div>
        </div>
        <div className="point-value">{runway}개월</div>
      </div>
    </section>
  );
}

function ReviewInbox({
  reviews,
  onOpenReview,
  onUpdateReview
}: {
  reviews: ReviewItem[];
  onOpenReview: (review: ReviewItem) => void;
  onUpdateReview: (review: ReviewItem, status: ReviewStatus) => void;
}) {
  return (
    <section className="section active">
      <div className="alert-top">
        <div>
          <strong>대표 검토함 전체 {reviews.filter((r) => r.status === "검토 전").length}건</strong>
          <span>항목명을 누르면 팝업이 열리고, 승인·보류·수정요청을 바로 처리할 수 있습니다.</span>
        </div>
      </div>

      <div className="quick-actions">
        <QuickCard title="지출결의" copy="증빙, 이체, 분류 검토" />
        <QuickCard title="사업·매출" copy="수금, 카테고리, 손익 검토" />
        <QuickCard title="인건비·보상" copy="연봉, 지원사업, 상여금 검토" />
        <QuickCard title="권한 요청" copy="페이지별 접근 권한 승인" />
      </div>

      <div className="card solid">
        <h2 className="card-title">검토함 상세</h2>
        <p className="card-sub">각 항목은 팝업으로 상세 내용을 확인하고 버튼으로 처리합니다.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>영역</th>
                <th style={{ width: 200 }}>항목명</th>
                <th style={{ width: 160 }}>검토 사유</th>
                <th style={{ width: 130 }} className="num">금액/영향</th>
                <th style={{ width: 120 }}>담당</th>
                <th style={{ width: 110 }}>상태</th>
                <th style={{ width: 220 }}>처리</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((row) => (
                <tr key={row.id} className={row.status !== "검토 전" ? "muted-row" : ""}>
                  <td>{row.area}</td>
                  <td><button className="btn small ghost" onClick={() => onOpenReview(row)}>{row.title}</button></td>
                  <td>{row.reason}</td>
                  <td className="num">{row.amount_or_impact}</td>
                  <td>{row.owner_label}</td>
                  <td><span className={`chip ${row.status === "승인" ? "green" : row.status === "검토 전" ? "orange" : "red"}`}>{row.status}</span></td>
                  <td className="action-cell">
                    <button className="btn small blue" onClick={() => onOpenReview(row)}>상세</button>
                    <button className="btn small" onClick={() => onUpdateReview(row, "승인")}>승인</button>
                    <button className="btn small" onClick={() => onUpdateReview(row, "보류")}>보류</button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && <tr><td colSpan={7}>검토할 항목이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Expense({
  projects,
  expenses,
  onOpenExpense,
  onCreate
}: {
  projects: BusinessProject[];
  expenses: ExpenseRequest[];
  onOpenExpense: (expense: ExpenseRequest) => void;
  onCreate: () => void;
}) {
  const pending = expenses.filter((item) => item.review_status === "검토 전");

  return (
    <section className="section active">
      <div className="grid two">
        <div className="card">
          <h2 className="card-title">빠른 지출 등록</h2>
          <p className="card-sub">페이지를 찾아 들어오지 않아도, 우측 하단 빠른 등록 버튼에서 영수증 사진을 바로 올리는 구조입니다.</p>
          <div className="quick-actions quick-two">
            <QuickCard icon={<Camera size={18} />} title="영수증 사진 촬영" copy="모바일에서 바로 카메라 실행" onClick={onCreate} />
            <QuickCard icon={<Upload size={18} />} title="사진 업로드" copy="OCR 처리 후 검토함 생성" onClick={onCreate} />
            <QuickCard icon={<FilePlus2 size={18} />} title="수기 등록" copy="증빙 없이 먼저 지출결의 생성" onClick={onCreate} />
            <QuickCard icon={<Clock size={18} />} title="반복 지출" copy="구독료, 정기결제 자동 완성" onClick={onCreate} />
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">지출결의 검토 요약</h2>
          <p className="card-sub">검토가 필요한 지출결의 항목만 먼저 보여줍니다.</p>
          <div className="queue">
            <QueueItem tone="orange" title="검토 전 지출" copy="대표 승인 필요" count={`${pending.length}건`} />
            <QueueItem tone="red" title="증빙 누락 가능" copy="영수증 파일이 없는 항목" count={`${expenses.filter((item) => !item.receipt_file_url).length}건`} />
            <QueueItem title="등록 프로젝트" copy="지출 연결 가능한 프로젝트" count={`${projects.length}개`} />
          </div>
        </div>
      </div>

      <div className="card solid mt">
        <h2 className="card-title">지출결의 상세 목록</h2>
        <p className="card-sub">항목을 누르면 증빙, 이체 내용, 분류를 확인하는 팝업이 열립니다.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>사용일</th>
                <th style={{ width: 200 }}>목적 및 용도</th>
                <th style={{ width: 110 }}>사용 용도</th>
                <th style={{ width: 100 }}>결제방식</th>
                <th style={{ width: 120 }} className="num">사용 금액</th>
                <th style={{ width: 130 }}>증빙</th>
                <th style={{ width: 130 }}>이체 여부</th>
                <th style={{ width: 110 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="clickable" onClick={() => onOpenExpense(expense)}>
                  <td>{expense.used_at}</td>
                  <td>{expense.purpose}</td>
                  <td>{expense.category}</td>
                  <td>{expense.payment_method}</td>
                  <td className="num">{formatWon(expense.amount)}</td>
                  <td><span className={`chip ${expense.receipt_file_url ? "green" : "orange"}`}>{expense.evidence_status || "확인 필요"}</span></td>
                  <td>{expense.transfer_status}</td>
                  <td><span className={`chip ${expense.review_status === "승인" ? "green" : "orange"}`}>{expense.review_status}</span></td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={8}>등록된 지출결의가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Revenue({
  projects,
  onCreate,
  onOpenProject
}: {
  projects: BusinessProject[];
  onCreate: () => void;
  onOpenProject: (project: BusinessProject) => void;
}) {
  const totals = projects.reduce(
    (acc, project) => {
      acc.revenue += Number(project.revenue || 0);
      acc.cost += Number(project.cost || 0);
      acc.profit += Number(project.profit || 0);
      acc.receivable += Number(project.receivable_amount || 0);
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, receivable: 0 }
  );

  return (
    <section className="section active">
      <div className="quick-actions">
        <QuickCard icon={<FolderPlus size={18} />} title="새 프로젝트 생성" copy="교육, 전시, 연구, 상품/IP, 지원금으로 구분" onClick={onCreate} />
        <QuickCard icon={<Plus size={18} />} title="입금 예정 등록" copy="프로젝트 생성/수정에서 미수금 관리" onClick={onCreate} />
        <QuickCard icon={<ReceiptText size={18} />} title="비용 항목 추가" copy="지출결의에서 프로젝트 연결" onClick={onCreate} />
        <QuickCard icon={<Building2 size={18} />} title="카테고리 관리" copy="프로젝트 유형 선택 가능" onClick={onCreate} />
      </div>

      <div className="grid four">
        <KpiCard compact label="총 매출" value={formatWon(totals.revenue)} chip="누적" tone="green" />
        <KpiCard compact label="총 비용" value={formatWon(totals.cost)} chip="직접비 포함" tone="red" />
        <KpiCard compact label="순이익" value={formatWon(totals.profit)} chip={`마진 ${totals.revenue ? Math.round((totals.profit / totals.revenue) * 100) : 0}%`} tone="blue" />
        <KpiCard compact label="미수금" value={formatWon(totals.receivable)} chip="수금 확인" tone="orange" />
      </div>

      <div className="grid two mt">
        <div className="card solid">
          <h2 className="card-title">프로젝트 목록</h2>
          <p className="card-sub">프로젝트를 누르면 매출, 비용, 순이익, 마진율이 인포그래픽으로 보입니다.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>프로젝트</th>
                  <th style={{ width: 130 }}>카테고리</th>
                  <th className="num" style={{ width: 130 }}>매출</th>
                  <th className="num" style={{ width: 130 }}>비용</th>
                  <th className="num" style={{ width: 130 }}>순이익</th>
                  <th className="num" style={{ width: 90 }}>마진율</th>
                  <th style={{ width: 150 }}>수금 상태</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((row) => (
                  <tr key={row.id} className="clickable" onClick={() => onOpenProject(row)}>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td className="num">{formatWon(row.revenue)}</td>
                    <td className="num">{formatWon(row.cost)}</td>
                    <td className="num">{formatWon(row.profit)}</td>
                    <td className="num">{formatPercent(row.margin_rate)}</td>
                    <td><span className={`chip ${Number(row.receivable_amount || 0) > 0 ? "orange" : "green"}`}>{Number(row.receivable_amount || 0) > 0 ? "일부 미수" : "수금 완료"}</span></td>
                  </tr>
                ))}
                {projects.length === 0 && <tr><td colSpan={7}>등록된 프로젝트가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">프로젝트 상세 미리보기</h2>
          <p className="card-sub">목록을 클릭했을 때 팝업에 표시되는 핵심 인포그래픽 예시입니다.</p>
          <div className="metric-list">
            <Metric title="매출" copy="공급가액 기준" value={formatWon(projects[0]?.revenue || 0)} />
            <Metric title="비용" copy="직접비, 외주비, 제작비 포함" value={formatWon(projects[0]?.cost || 0)} />
            <Metric title="순이익" copy="매출 - 비용" value={formatWon(projects[0]?.profit || 0)} />
            <Metric title="마진율" copy="순이익 ÷ 매출" value={formatPercent(projects[0]?.margin_rate || 0)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Compensation({
  people,
  departments,
  projects,
  bonuses,
  onOpenPerson,
  onCreatePerson,
  onCreateBonus
}: {
  people: Person[];
  departments: Department[];
  projects: BusinessProject[];
  bonuses: BonusPayment[];
  onOpenPerson: (person: Person) => void;
  onCreatePerson: () => void;
  onCreateBonus: () => void;
}) {
  const totalSalary = people.reduce((sum, person) => sum + Number(person.annual_salary || 0), 0);
  const bonusTotal = bonuses.reduce((sum, bonus) => sum + Number(bonus.bonus_amount || 0), 0);

  function getDeptName(deptId: string | null) {
    if (!deptId) return "-";
    return departments.find((d) => d.id === deptId)?.name || "-";
  }

  return (
    <section className="section active">
      <div className="quick-actions">
        <QuickCard title="직원 추가" copy="이메일로 초대 전 직원 정보 생성" onClick={onCreatePerson} />
        <QuickCard title="상여금 추가" copy="순수익과 지급률 기준으로 계산" onClick={onCreateBonus} />
        <QuickCard title="연봉 검토" copy="전년도 대비 인상률 확인" onClick={onCreatePerson} />
        <QuickCard title="지원사업 인건비" copy="지원금 종료 영향 관리" onClick={onCreatePerson} />
      </div>

      <div className="grid two">
        <div className="card solid">
          <h2 className="card-title">직원·연봉 현황</h2>
          <p className="card-sub">직원명을 누르면 직원 상세 페이지 팝업이 열립니다.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>이름</th><th>직위</th><th>부서</th><th className="num">계약연봉</th><th className="num">전년도 연봉</th><th>상세</th></tr>
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
                {people.length === 0 && <tr><td colSpan={6}>등록된 직원이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="point-card blue">
            <div><div className="point-title">연봉 총액</div><div className="point-copy">등록 직원의 계약연봉 합계입니다.</div></div>
            <div className="point-value">{formatWon(totalSalary)}</div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">상여금·성과보상 현황</h2>
          <p className="card-sub">입력뿐 아니라 지급 예정, 보류, 완료 상태를 한눈에 봅니다.</p>
          <div className="metric-list">
            {bonuses.map((bonus) => (
              <Metric
                key={bonus.id}
                title={people.find((person) => person.id === bonus.person_id)?.name || "지급 대상 미정"}
                copy={`${projects.find((project) => project.id === bonus.project_id)?.name || "프로젝트 미정"} · ${bonus.period_label || ""}`}
                value={formatWon(bonus.bonus_amount)}
              />
            ))}
            {bonuses.length === 0 && <Metric title="등록된 상여금 없음" copy="상여금 추가 버튼으로 등록하세요." value="0원" />}
          </div>
          <div className="point-card">
            <div><div className="point-title">상여금 합계</div><div className="point-copy">검토 전·승인 항목 포함</div></div>
            <div className="point-value">{formatWon(bonusTotal)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Resource({
  projects,
  people,
  labor,
  onCreateLabor
}: {
  projects: BusinessProject[];
  people: Person[];
  labor: ProjectLaborAllocation[];
  onCreateLabor: () => void;
}) {
  const totalCapacity = people.filter((p) => p.is_active).reduce((sum, p) => sum + Number(p.monthly_capacity_hours || 160), 0);
  const totalHours = labor.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const totalMm = labor.reduce((sum, item) => sum + Number(item.man_months || 0), 0);

  return (
    <section className="section active">
      <div className="quick-actions">
        <QuickCard title="맨먼스 추가" copy="프로젝트별 직위·인원 투입률 입력" onClick={onCreateLabor} />
        <QuickCard title="투입률 조정" copy="대표/본부장/책임/선임/매니저 비율 관리" onClick={onCreateLabor} />
        <QuickCard title="비청구 시간 확인" copy="행정·회의 시간 분리 관리" onClick={onCreateLabor} />
        <QuickCard title="가동률 보고서" copy="프로젝트별 투입시간 확인" onClick={onCreateLabor} />
      </div>

      <div className="grid four resource-top">
        <KpiCard compact label="총 가용시간" value={`${totalCapacity}h`} chip="월 기준" tone="blue" />
        <KpiCard compact label="확정 투입" value={`${Math.round(totalHours)}h`} chip={totalCapacity ? `${Math.round((totalHours / totalCapacity) * 100)}%` : "0%"} tone="green" />
        <KpiCard compact label="총 맨먼스" value={`${totalMm.toFixed(2)}MM`} chip="프로젝트 합계" tone="orange" />
        <KpiCard compact label="평균 가동률" value={`${totalCapacity ? Math.round((totalHours / totalCapacity) * 100) : 0}%`} chip="실시간" tone="orange" />
      </div>

      <div className="grid two">
        <div className="card">
          <h2 className="card-title">수익성 지도</h2>
          <p className="card-sub">사업별 수익성과 인력투입 데이터를 함께 봅니다.</p>
          <ProfitMap projects={projects} />
        </div>

        <div className="card">
          <h2 className="card-title">맨먼스·판단 카드</h2>
          <div className="metric-list">
            <Metric title="1인월 매출" copy="프로젝트 매출 ÷ 맨먼스" value={totalMm ? formatWon(projects.reduce((s, p) => s + Number(p.revenue || 0), 0) / totalMm) : "0원"} />
            <Metric title="대표 투입 확인" copy="대표 비중이 높은 프로젝트를 확인합니다." value={`${labor.filter((item) => item.rank === "대표").length}건`} />
            <Metric title="AI 교육 수요" copy="확정 수요가 가용시간을 초과할 가능성" value="검토" />
            <Metric title="개발 가용시간" copy="현재 범위에서는 여유가 있음" value="여유" />
          </div>
        </div>
      </div>

      <div className="card solid mt">
        <h2 className="card-title">프로젝트별 인력투입 맨먼스</h2>
        <p className="card-sub">프로젝트별로 대표, 본부장, 책임, 선임, 매니저의 투입 비율을 100% 기준으로 나눠 봅니다.</p>
        <div className="legend">
          <span className="legend-item"><i className="legend-dot a" />대표</span>
          <span className="legend-item"><i className="legend-dot b" />본부장</span>
          <span className="legend-item"><i className="legend-dot c" />책임</span>
          <span className="legend-item"><i className="legend-dot d" />선임</span>
          <span className="legend-item"><i className="legend-dot e" />매니저</span>
        </div>
        {projects.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 16 }}>등록된 프로젝트가 없습니다.</p>}
        {projects.map((project) => {
          const items = labor.filter((item) => item.project_id === project.id);
          if (items.length === 0) return (
            <div key={project.id} className="stack-row">
              <strong>{project.name}</strong>
              <div className="stack-bar" style={{ background: "rgba(16,24,40,0.055)" }} />
              <span className="num">0.00MM</span>
            </div>
          );
          const total = items.reduce((sum, item) => sum + Number(item.allocation_rate || 0), 0);
          const segments = items.map((item) => [item.rank, total ? Math.round((Number(item.allocation_rate) / total) * 100) : 0] as [Rank, number]);
          const mm = items.reduce((sum, item) => sum + Number(item.man_months || 0), 0) || Number(project.man_months || 0);
          return <StackRow key={project.id} project={project.name} segments={segments} mm={`${mm.toFixed(2)}MM`} />;
        })}
      </div>
    </section>
  );
}

function Org({
  currentPerson,
  canManage,
  people,
  departments,
  permissions,
  onCreatePerson,
  onCreatePermission
}: {
  currentPerson: Person;
  canManage: boolean;
  people: Person[];
  departments: Department[];
  permissions: PagePermission[];
  onCreatePerson: () => void;
  onCreatePermission: () => void;
}) {
  return (
    <section className="section active">
      <div className="quick-actions">
        <QuickCard title="직원 추가" copy="이메일 기준으로 직원 등록" onClick={onCreatePerson} />
        <QuickCard title="페이지 권한 추가" copy="선택한 사람만 페이지 접근 허용" onClick={onCreatePermission} />
        <QuickCard title="관리자 확인" copy={`${currentPerson.name} · ${currentPerson.rank}`} />
        <QuickCard title="권한 상태" copy={canManage ? "관리 가능" : "관리 제한"} />
      </div>

      <div className="grid two">
        <div className="card">
          <h2 className="card-title">조직도</h2>
          <p className="card-sub">확정 지휘체계와 4개 부서를 시각화합니다.</p>
          <div className="org-chart">
            <div className="org-row"><OrgNode title="대표" copy="최종 책임" /></div>
            <div className="org-row"><OrgNode title="본부장" copy="운영 총괄" /></div>
            <div className="org-row">
              <OrgNode title="책임" copy="성과 책임" />
              <OrgNode title="선임" copy="품질 책임" />
              <OrgNode title="매니저" copy="실무 책임" />
            </div>
            <div className="org-row">
              {departments.map((dept) => <OrgNode key={dept.id} title={dept.name} copy={dept.description || ""} />)}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">페이지별 권한 현황</h2>
          <p className="card-sub">관리자가 초대한 사람만 보거나, 페이지별로 선택한 사람만 볼 수 있게 관리합니다.</p>
          <div className="metric-list">
            {permissions.map((permission) => (
              <Metric
                key={permission.id}
                title={people.find((person) => person.id === permission.person_id)?.name || "직원"}
                copy={permission.page_key}
                value={permission.permission}
              />
            ))}
            {permissions.length === 0 && <Metric title="등록 권한 없음" copy="대표와 본부장은 기본 전체 접근입니다." value="기본" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function Modal({
  modal,
  setModal,
  selectedReview,
  selectedProject,
  selectedExpense,
  selectedPerson,
  currentPerson,
  people,
  departments,
  projects,
  bonuses,
  labor,
  compReviews,
  onReviewStatus,
  onCreateProject,
  onCreateExpense,
  onCreatePerson,
  onCreateBonus,
  onCreateLabor,
  onCreatePermission
}: {
  modal: ModalKey;
  setModal: (modal: ModalKey) => void;
  selectedReview: ReviewItem | null;
  selectedProject: BusinessProject | null;
  selectedExpense: ExpenseRequest | null;
  selectedPerson: Person | null;
  currentPerson: Person;
  people: Person[];
  departments: Department[];
  projects: BusinessProject[];
  bonuses: BonusPayment[];
  labor: ProjectLaborAllocation[];
  compReviews: CompensationReview[];
  onReviewStatus: (review: ReviewItem, status: ReviewStatus) => Promise<void>;
  onCreateProject: (formData: FormData) => Promise<void>;
  onCreateExpense: (formData: FormData) => Promise<void>;
  onCreatePerson: (formData: FormData) => Promise<void>;
  onCreateBonus: (formData: FormData) => Promise<void>;
  onCreateLabor: (formData: FormData) => Promise<void>;
  onCreatePermission: (formData: FormData) => Promise<void>;
}) {
  if (!modal) return null;

  return (
    <div className="modal active" onClick={() => setModal(null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {modal === "projectForm" && (
          <FormModal title="새 프로젝트 생성" desc="사업·매출관리에서 관리할 프로젝트를 생성합니다." onSubmit={onCreateProject} onClose={() => setModal(null)}>
            <label>프로젝트명<input name="name" required placeholder="예: 성보학교 전시" /></label>
            <label>카테고리<select name="category">{businessCategories.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>거래처/기관<input name="client_name" placeholder="예: 대구성보학교" /></label>
            <label>상태<input name="status" defaultValue="진행 중" /></label>
            <label>매출<input name="revenue" defaultValue="0" /></label>
            <label>비용<input name="cost" defaultValue="0" /></label>
            <label>미수금<input name="receivable_amount" defaultValue="0" /></label>
            <label>맨먼스<input name="man_months" defaultValue="0" /></label>
            <label>시작일<input type="date" name="start_date" /></label>
            <label>종료일<input type="date" name="end_date" /></label>
            <label className="wide">메모<textarea name="memo" /></label>
          </FormModal>
        )}

        {modal === "expenseForm" && (
          <FormModal title="지출결의 등록" desc="영수증 사진을 업로드하면 Storage에 저장되고 OCR Edge Function이 실행됩니다." onSubmit={onCreateExpense} onClose={() => setModal(null)}>
            <label>사용일<input type="date" name="used_at" defaultValue={today()} required /></label>
            <label>목적 및 용도<input name="purpose" required placeholder="예: AI 교육 외부강사비" /></label>
            <label>카테고리<select name="category">{expenseCategories.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>결제방식<input name="payment_method" defaultValue="카드" /></label>
            <label>금액<input name="amount" defaultValue="0" /></label>
            <label>이체상태<input name="transfer_status" defaultValue="결제 완료" /></label>
            <label>프로젝트<select name="project_id"><option value="">선택 안 함</option>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>영수증 사진<input type="file" name="receipt" accept="image/*,.pdf" /></label>
            <label className="wide">메모<textarea name="memo" /></label>
          </FormModal>
        )}

        {modal === "personForm" && (
          <FormModal title="직원 등록" desc="이메일을 기준으로 직원 정보를 만들고, 해당 이메일로 로그인하면 자동 연결됩니다." onSubmit={onCreatePerson} onClose={() => setModal(null)}>
            <label>이름<input name="name" required placeholder="홍길동" /></label>
            <label>이메일<input name="email" type="email" required placeholder="member@lupl.kr" /></label>
            <label>전화번호<input name="phone" /></label>
            <label>직위<select name="rank">{ranks.map((rank) => <option key={rank}>{rank}</option>)}</select></label>
            <label>부서<select name="department_id"><option value="">선택 안 함</option>{departments.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
            <label>입사일<input type="date" name="hire_date" /></label>
            <label>계약연봉<input name="annual_salary" defaultValue="0" /></label>
            <label>전년도 연봉<input name="previous_annual_salary" defaultValue="0" /></label>
            <label>월 가용시간<input name="monthly_capacity_hours" defaultValue="160" /></label>
            <label className="wide">메모<textarea name="memo" /></label>
          </FormModal>
        )}

        {modal === "bonusForm" && (
          <FormModal title="상여금·성과보상 등록" desc="프로젝트 순수익과 지급률을 입력하면 예상 상여금이 계산되어 저장됩니다." onSubmit={onCreateBonus} onClose={() => setModal(null)}>
            <label>지급 대상<select name="person_id"><option value="">선택</option>{people.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>프로젝트<select name="project_id"><option value="">선택</option>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>기간<input name="period_label" placeholder="예: 2026 Q2" /></label>
            <label>순수익<input name="profit_amount" defaultValue="0" /></label>
            <label>지급률<input name="bonus_rate" defaultValue="10%" /></label>
            <label>지급 예정일<input type="date" name="planned_payment_date" /></label>
            <label className="wide">메모<textarea name="memo" /></label>
          </FormModal>
        )}

        {modal === "laborForm" && (
          <FormModal title="프로젝트별 맨먼스 입력" desc="대표/본부장/책임/선임/매니저별 투입률과 맨먼스를 저장합니다." onSubmit={onCreateLabor} onClose={() => setModal(null)}>
            <label>프로젝트<select name="project_id" required>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>직원<select name="person_id"><option value="">선택 안 함</option>{people.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>직위<select name="rank">{ranks.map((rank) => <option key={rank}>{rank}</option>)}</select></label>
            <label>투입률<input name="allocation_rate" defaultValue="35%" /></label>
            <label>맨먼스<input name="man_months" defaultValue="0.35" /></label>
            <label>시간<input name="hours" defaultValue="56" /></label>
          </FormModal>
        )}

        {modal === "permissionForm" && (
          <FormModal title="페이지별 권한 추가" desc="선택한 사람에게 특정 페이지 접근 권한을 부여합니다." onSubmit={onCreatePermission} onClose={() => setModal(null)}>
            <label>직원<select name="person_id" required>{people.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>페이지<select name="page_key">{menu.map((m) => <option value={pageKeyMap[m.key]} key={m.key}>{m.label}</option>)}</select></label>
            <label>권한<select name="permission"><option>보기만 가능</option><option>입력 가능</option><option>승인 가능</option><option>관리자</option></select></label>
          </FormModal>
        )}

        {["expenseReview", "taxReview", "projectDetail", "employeeDetail"].includes(modal) && (
          <DetailModal
            modal={modal}
            selectedReview={selectedReview}
            selectedProject={selectedProject}
            selectedExpense={selectedExpense}
            selectedPerson={selectedPerson || currentPerson}
            people={people}
            projects={projects}
            bonuses={bonuses}
            labor={labor}
            compReviews={compReviews}
            onClose={() => setModal(null)}
            onReviewStatus={onReviewStatus}
          />
        )}

        <button className="modal-close floating-close" onClick={() => setModal(null)}>×</button>
      </div>
    </div>
  );
}

function FormModal({
  title,
  desc,
  children,
  onSubmit,
  onClose
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="modal-head">
        <div>
          <h2 className="modal-title">{title}</h2>
          <p className="modal-desc">{desc}</p>
        </div>
        <button className="modal-close" onClick={onClose} type="button">×</button>
      </div>
      <form
        className="modal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          await onSubmit(new FormData(event.currentTarget));
          setBusy(false);
        }}
      >
        {children}
        <div className="modal-actions">
          <button className="btn blue" disabled={busy}>{busy ? "저장 중" : "저장"}</button>
        </div>
      </form>
    </>
  );
}

function DetailModal({
  modal,
  selectedReview,
  selectedProject,
  selectedExpense,
  selectedPerson,
  people,
  projects,
  bonuses,
  labor,
  compReviews,
  onClose,
  onReviewStatus
}: {
  modal: ModalKey;
  selectedReview: ReviewItem | null;
  selectedProject: BusinessProject | null;
  selectedExpense: ExpenseRequest | null;
  selectedPerson: Person;
  people: Person[];
  projects: BusinessProject[];
  bonuses: BonusPayment[];
  labor: ProjectLaborAllocation[];
  compReviews: CompensationReview[];
  onClose: () => void;
  onReviewStatus: (review: ReviewItem, status: ReviewStatus) => Promise<void>;
}) {
  if (modal === "projectDetail" && selectedProject) {
    return (
      <>
        <ModalHead title={`${selectedProject.name} 상세`} desc="프로젝트별 매출, 비용, 순이익, 마진율, 미수금, 맨먼스를 한눈에 봅니다." onClose={onClose} />
        <div className="modal-info">
          <Info label="카테고리" value={selectedProject.category} />
          <Info label="거래처/기관" value={selectedProject.client_name || "-"} />
          <Info label="매출" value={formatWon(selectedProject.revenue)} />
          <Info label="비용" value={formatWon(selectedProject.cost)} />
          <Info label="순이익" value={formatWon(selectedProject.profit)} />
          <Info label="마진율" value={formatPercent(selectedProject.margin_rate)} />
          <Info label="미수금" value={formatWon(selectedProject.receivable_amount)} />
          <Info label="맨먼스" value={`${selectedProject.man_months || 0}MM`} />
        </div>
        <div className="point-card green">
          <div><div className="point-title">상세 인포그래픽 포인트</div><div className="point-copy">매출 대비 비용과 맨먼스를 함께 봅니다.</div></div>
          <div className="point-value">{formatPercent(selectedProject.margin_rate)}</div>
        </div>
        <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} />
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
        <ModalHead title={`${selectedPerson.name} 상세`} desc="직원별 연봉, 인상률, 지원사업, 상여금, 투입 프로젝트, 권한 범위를 관리합니다." onClose={onClose} />
        <div className="modal-info">
          <Info label="기본정보" value={`${selectedPerson.rank} · ${selectedPerson.email || "-"}`} />
          <Info label="입사일" value={selectedPerson.hire_date || "-"} />
          <Info label="계약연봉" value={formatWon(selectedPerson.annual_salary)} />
          <Info label="전년도 연봉" value={formatWon(selectedPerson.previous_annual_salary)} />
          <Info label="인상률" value={`${raiseRate.toFixed(1)}%`} />
          <Info label="월 급여" value={formatWon(Number(selectedPerson.annual_salary || 0) / 12)} />
          <Info label="총인건비 추정" value={formatWon((Number(selectedPerson.annual_salary || 0) / 12) * 1.15)} />
          <Info label="지원사업 연결" value={review?.grant_program_name || "미등록"} />
          <Info label="회사 실부담 변화" value={formatWon(review?.company_monthly_impact || 0)} />
          <Info label="상여금 규칙/현황" value={`${personBonuses.length}건 · ${formatWon(personBonuses.reduce((s, b) => s + Number(b.bonus_amount || 0), 0))}`} />
          <Info label="투입 프로젝트" value={`${personLabor.length}건 · ${personLabor.reduce((s, l) => s + Number(l.man_months || 0), 0).toFixed(2)}MM`} />
          <Info label="퇴직급여 대상" value="대상 · 월별 충당 필요" />
        </div>
        <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} />
      </>
    );
  }

  if ((modal === "expenseReview" || modal === "taxReview") && selectedExpense) {
    const linkedProject = projects.find((project) => project.id === selectedExpense.project_id);
    return (
      <>
        <ModalHead title={selectedExpense.purpose} desc="지출결의 상세 내용입니다. 증빙, 이체, 분류를 확인하고 승인할 수 있습니다." onClose={onClose} />
        <div className="modal-info">
          <Info label="사용일" value={selectedExpense.used_at} />
          <Info label="사용 금액" value={formatWon(selectedExpense.amount)} />
          <Info label="분류" value={selectedExpense.category} />
          <Info label="결제방식" value={selectedExpense.payment_method || "-"} />
          <Info label="프로젝트" value={linkedProject?.name || "미연결"} />
          <Info label="증빙 상태" value={selectedExpense.evidence_status || "-"} />
          <Info label="OCR 거래처" value={selectedExpense.ocr_vendor_name || "OCR 미실행/미인식"} />
          <Info label="OCR 금액" value={formatWon(selectedExpense.ocr_total_amount || 0)} />
          <Info label="이체 상태" value={selectedExpense.transfer_status || "-"} />
          <Info label="검토 사유" value={selectedExpense.review_reason || "-"} />
          <Info label="파일" value={selectedExpense.receipt_file_url ? "첨부됨" : "없음"} />
          <Info label="메모" value={selectedExpense.memo || "-"} />
        </div>
        <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} />
      </>
    );
  }

  return (
    <>
      <ModalHead title={selectedReview?.title || "상세"} desc={selectedReview?.reason || "상세 정보를 확인합니다."} onClose={onClose} />
      <div className="modal-info">
        <Info label="영역" value={selectedReview?.area || "-"} />
        <Info label="영향" value={selectedReview?.amount_or_impact || "-"} />
        <Info label="상태" value={selectedReview?.status || "-"} />
      </div>
      <ReviewActions selectedReview={selectedReview} onClose={onClose} onReviewStatus={onReviewStatus} />
    </>
  );
}

function ReviewActions({
  selectedReview,
  onClose,
  onReviewStatus
}: {
  selectedReview: ReviewItem | null;
  onClose: () => void;
  onReviewStatus: (review: ReviewItem, status: ReviewStatus) => Promise<void>;
}) {
  return (
    <div className="modal-actions">
      {selectedReview ? (
        <>
          <button className="btn" onClick={() => onReviewStatus(selectedReview, "수정 요청")}>수정 요청</button>
          <button className="btn" onClick={() => onReviewStatus(selectedReview, "보류")}>보류</button>
          <button className="btn blue" onClick={() => onReviewStatus(selectedReview, "승인")}>승인</button>
        </>
      ) : (
        <button className="btn blue" onClick={onClose}>확인</button>
      )}
    </div>
  );
}

function ModalHead({ title, desc, onClose }: { title: string; desc: string; onClose: () => void }) {
  return (
    <div className="modal-head">
      <div>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-desc">{desc}</p>
      </div>
      <button className="modal-close" onClick={onClose} type="button">×</button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FloatingActions({
  setSection,
  setModal
}: {
  setSection: (key: SectionKey) => void;
  setModal: (modal: ModalKey) => void;
}) {
  return (
    <div className="fab">
      <button className="fab-sub" onClick={() => { setSection("expense"); setModal("expenseForm"); }}>
        영수증 사진 바로 등록
      </button>
      <button className="fab-main" onClick={() => { setSection("expense"); setModal("expenseForm"); }}>
        + 빠른 지출 등록
      </button>
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

function KpiCard({
  label,
  value,
  chip,
  tone,
  compact
}: {
  label: string;
  value: string;
  chip: string;
  tone: "green" | "red" | "orange" | "blue" | "purple";
  compact?: boolean;
}) {
  return (
    <div className={`card kpi-card ${compact ? "resource-kpi" : ""}`}>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
      <span className={`chip ${tone}`}>{chip}</span>
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
  title,
  copy,
  icon,
  onClick
}: {
  title: string;
  copy: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="quick-card" onClick={onClick}>
      {icon && <div className="quick-icon">{icon}</div>}
      <strong>{title}</strong>
      <span>{copy}</span>
    </button>
  );
}

function QueueItem({
  title,
  copy,
  count,
  tone,
  onClick
}: {
  title: string;
  copy: string;
  count: string;
  tone?: "red" | "orange" | "green" | "purple";
  onClick?: () => void;
}) {
  return (
    <div className={`queue-item ${tone || ""}`} onClick={onClick}>
      <div>
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
      <div className="count">{count}</div>
    </div>
  );
}

function CashFlowChart({ cash }: { cash: CashSnapshot[] }) {
  const items = cash.slice(0, 6).reverse();
  const maxValue = Math.max(...items.flatMap((item) => [Number(item.revenue || 0), Number(item.expense || 0), Math.abs(Number(item.net_burn || 0))]), 1);

  if (items.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>등록된 현금 스냅샷이 없습니다.</p>;
  }

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
          <div className="cash-num">매출 {Math.round(Number(item.revenue || 0) / 1000000)}M / 비용 {Math.round(Number(item.expense || 0) / 1000000)}M</div>
        </div>
      ))}
    </div>
  );
}

function ProfitMap({ projects }: { projects: BusinessProject[] }) {
  const items = projects.slice(0, 4);
  const maxRevenue = Math.max(...items.map((item) => Number(item.revenue || 0)), 1);

  if (items.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>등록된 프로젝트가 없습니다.</p>;
  }

  return (
    <div className="profit-map">
      <div className="axis y">매출 규모 ↑</div>
      <div className="axis x">마진율 →</div>
      {items.map((project, index) => {
        const margin = Math.max(0, Number(project.margin_rate || 0));
        const revenueRatio = Number(project.revenue || 0) / maxRevenue;
        const size = Math.max(90, Math.min(138, 80 + revenueRatio * 60));
        const left = Math.min(72, 12 + margin * 130);
        const top = Math.max(12, 70 - revenueRatio * 52);
        const tones = ["green", "blue", "orange", "purple"];
        return (
          <div
            key={project.id}
            className={`bubble ${tones[index % tones.length]}`}
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
          >
            {project.name.split(" ").slice(0, 2).join("\n")}
          </div>
        );
      })}
    </div>
  );
}

function StackRow({
  project,
  segments,
  mm
}: {
  project: string;
  segments: Array<[Rank, number]>;
  mm: string;
}) {
  const classMap: Record<Rank, string> = {
    "대표": "a",
    "본부장": "b",
    "책임": "c",
    "선임": "d",
    "매니저": "e"
  };

  return (
    <div className="stack-row">
      <strong>{project}</strong>
      <div className="stack-bar">
        {segments.map(([rank, width], index) => (
          <div key={`${project}-${rank}-${index}`} className={`stack-seg ${classMap[rank]}`} style={{ width: `${width}%` }}>
            {width}
          </div>
        ))}
      </div>
      <span className="num">{mm}</span>
    </div>
  );
}

function OrgNode({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="org-node">
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}

// unused import guard
void reviewStatuses;
