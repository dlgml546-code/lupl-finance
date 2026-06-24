import React, { useEffect, useMemo, useState } from "react";
import type {
  BusinessProject,
  CashSnapshot,
  ExpenseRequest,
  FinancialMonthlyPlan,
  Person
} from "./types";

type FinanceProject = BusinessProject & {
  _revenue?: number;
  _receivable?: number;
  _isMonthlyRecurring?: boolean;
};

type FinancePlanningProps = {
  plans: FinancialMonthlyPlan[];
  cash: CashSnapshot[];
  projects: FinanceProject[];
  expenses: ExpenseRequest[];
  people: Person[];
  tableReady: boolean;
  onSave: (formData: FormData) => Promise<void>;
};

type CostTone = "blue" | "green" | "red" | "orange";

const money = (value: number | null | undefined) =>
  `${Math.round(Number(value || 0)).toLocaleString("ko-KR")}원`;

const shortMoney = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 100000000) return `${(amount / 100000000).toFixed(1)}억원`;
  if (Math.abs(amount) >= 10000) return `${Math.round(amount / 10000).toLocaleString("ko-KR")}만원`;
  return money(amount);
};

const monthKey = (value: string | null | undefined) => String(value || "").slice(0, 7);
const monthDate = (month: string) => `${month}-01`;

function memoValue(memo: string | null | undefined, label: string) {
  const line = String(memo || "").split("\n").find((item) => item.trim().startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : "";
}

function memoNumber(memo: string | null | undefined, label: string) {
  return Number(memoValue(memo, label).replace(/[^0-9.-]/g, "")) || 0;
}

function projectRecognitionDate(project: FinanceProject) {
  return project.revenue_recognition_date
    || memoValue(project.memo, "매출 인식일")
    || project.tax_invoice_date
    || project.due_date
    || project.payment_due_date
    || "";
}

function projectReceivedDate(project: FinanceProject) {
  return project.received_date
    || memoValue(project.memo, "실제 입금일")
    || project.payment_due_date
    || projectRecognitionDate(project);
}

function projectRevenueNet(project: FinanceProject) {
  const gross = Number(project._revenue ?? project.confirmed_amount ?? 0);
  const mode = project.revenue_tax_mode || memoValue(project.memo, "매출 부가세 처리");
  return mode === "부가세 포함" ? Math.round(gross / 1.1) : gross;
}

function expenseCostBehavior(expense: ExpenseRequest) {
  const direct = expense.cost_behavior || memoValue(expense.memo, "비용 성격");
  if (direct === "고정비" || direct === "변동비") return direct;
  if (expense.project_id || ["내부 사업비", "외부 사업비(외주용역)", "여비·출장비"].includes(String(expense.usage))) return "변동비";
  return "고정비";
}

function expenseSupplyAmount(expense: ExpenseRequest) {
  const direct = Number(expense.supply_amount || 0);
  if (direct) return direct;
  const memoAmount = memoNumber(expense.memo, "공급가액");
  return memoAmount || Number(expense.amount || 0);
}

function expensePaidDate(expense: ExpenseRequest) {
  return expense.paid_at || memoValue(expense.memo, "실제 지급일") || expense.used_at;
}

function isMonthlyRecurring(expense: ExpenseRequest) {
  const recurring = Boolean(expense.is_recurring || expense.recurring_cycle || String(expense.memo || "").includes("반복주기"));
  return recurring && (!expense.recurring_cycle || expense.recurring_cycle === "매월" || String(expense.memo || "").includes("매월"));
}

function occursInMonth(date: string | null | undefined, selectedMonth: string, recurring = false) {
  const base = monthKey(date);
  if (!base) return false;
  return recurring ? base <= selectedMonth : base === selectedMonth;
}

function Metric({
  label, value, explanation, analogy, tone
}: {
  label: string;
  value: string;
  explanation: string;
  analogy: string;
  tone: CostTone;
}) {
  return (
    <div className={`finance-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{explanation}</p>
      <em>쉽게 말하면: {analogy}</em>
    </div>
  );
}

function CompareRow({ label, plan, actual }: { label: string; plan: number; actual: number }) {
  const max = Math.max(Math.abs(plan), Math.abs(actual), 1);
  const gap = actual - plan;
  return (
    <div className="finance-compare-row">
      <div className="finance-compare-head">
        <strong>{label}</strong>
        <span>계획 {shortMoney(plan)} · 실제 {shortMoney(actual)} · 차이 {gap >= 0 ? "+" : ""}{shortMoney(gap)}</span>
      </div>
      <div className="finance-compare-bars">
        <i className="plan" style={{ width: `${Math.min(100, Math.abs(plan) / max * 100)}%` }} />
        <i className="actual" style={{ width: `${Math.min(100, Math.abs(actual) / max * 100)}%` }} />
      </div>
    </div>
  );
}

function inputValue(value: number | null | undefined) {
  return value ? String(Math.round(value)) : "";
}

export default function FinancePlanning({
  plans, cash, projects, expenses, people, tableReady, onSave
}: FinancePlanningProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedPlan = plans.find((item) => monthKey(item.period_month) === selectedMonth);
  const matchingCash = cash.find((item) => monthKey(item.snapshot_month) === selectedMonth);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft({
      planned_revenue: inputValue(selectedPlan?.planned_revenue),
      planned_variable_cost: inputValue(selectedPlan?.planned_variable_cost),
      planned_fixed_cost: inputValue(selectedPlan?.planned_fixed_cost),
      planned_capex: inputValue(selectedPlan?.planned_capex),
      planned_receivable: inputValue(selectedPlan?.planned_receivable),
      planned_payable: inputValue(selectedPlan?.planned_payable),
      opening_cash: inputValue(selectedPlan?.opening_cash ?? matchingCash?.current_cash),
      sales_quantity: inputValue(selectedPlan?.sales_quantity),
      average_unit_price: inputValue(selectedPlan?.average_unit_price),
      note: selectedPlan?.note || ""
    });
  }, [selectedMonth, selectedPlan?.id, selectedPlan?.updated_at, matchingCash?.id]);

  const actual = useMemo(() => {
    const recognizedProjects = projects.filter((project) =>
      occursInMonth(projectRecognitionDate(project), selectedMonth, Boolean(project._isMonthlyRecurring))
    );
    const cashProjects = projects.filter((project) =>
      Number(project.received_amount || 0) > 0
      && occursInMonth(projectReceivedDate(project), selectedMonth, Boolean(project._isMonthlyRecurring))
    );
    const monthExpenses = expenses.filter((expense) =>
      occursInMonth(expense.used_at, selectedMonth, isMonthlyRecurring(expense))
    );
    const paidExpenses = expenses.filter((expense) => {
      if (!["결제 완료", "이체 완료", "해당 없음"].includes(String(expense.transfer_status || ""))) return false;
      return occursInMonth(expensePaidDate(expense), selectedMonth, isMonthlyRecurring(expense));
    });
    const operatingExpenses = monthExpenses.filter((expense) => String(expense.usage) !== "자산취득비(비품 구입 등)");
    const capexExpenses = monthExpenses.filter((expense) => String(expense.usage) === "자산취득비(비품 구입 등)");
    const payroll = people.filter((person) => person.is_active).reduce((sum, person) => sum + Number(person.annual_salary || 0) / 12, 0);
    const revenue = recognizedProjects.reduce((sum, project) => sum + projectRevenueNet(project), 0);
    const variableCost = operatingExpenses
      .filter((expense) => expenseCostBehavior(expense) === "변동비")
      .reduce((sum, expense) => sum + expenseSupplyAmount(expense), 0);
    const fixedExpense = operatingExpenses
      .filter((expense) => expenseCostBehavior(expense) === "고정비")
      .reduce((sum, expense) => sum + expenseSupplyAmount(expense), 0);
    const fixedCost = fixedExpense + payroll;
    const contribution = revenue - variableCost;
    const contributionRate = revenue > 0 ? contribution / revenue : 0;
    const operatingProfit = contribution - fixedCost;
    const breakEvenRevenue = contributionRate > 0 ? fixedCost / contributionRate : 0;
    const cashIn = cashProjects.reduce((sum, project) => sum + Number(project.received_amount || 0), 0);
    const cashOut = paidExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) + payroll;
    const capex = capexExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const receivable = projects.reduce((sum, project) => sum + Number(project._receivable || 0), 0);
    const payable = expenses
      .filter((expense) => !["결제 완료", "이체 완료", "해당 없음"].includes(String(expense.transfer_status || "")))
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return {
      revenue, variableCost, fixedCost, contribution, contributionRate, operatingProfit,
      breakEvenRevenue, cashIn, cashOut, capex, receivable, payable
    };
  }, [projects, expenses, people, selectedMonth]);

  const plan = {
    revenue: Number(selectedPlan?.planned_revenue || 0),
    variableCost: Number(selectedPlan?.planned_variable_cost || 0),
    fixedCost: Number(selectedPlan?.planned_fixed_cost || 0),
    capex: Number(selectedPlan?.planned_capex || 0),
    cashIn: Number(selectedPlan?.planned_receivable || 0),
    cashOut: Number(selectedPlan?.planned_payable || 0),
    openingCash: Number(selectedPlan?.opening_cash ?? matchingCash?.current_cash ?? 0)
  };
  const planContribution = plan.revenue - plan.variableCost;
  const planProfit = planContribution - plan.fixedCost;
  const actualEndingCash = plan.openingCash + actual.cashIn - actual.cashOut;
  const plannedEndingCash = plan.openingCash + plan.cashIn - plan.cashOut - plan.capex;

  const forecastRows = useMemo(() => {
    const year = Number(selectedMonth.slice(0, 4));
    let carry = plans.find((item) => monthKey(item.period_month) === `${year}-01`)?.opening_cash || 0;
    return Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, "0")}`;
      const row = plans.find((item) => monthKey(item.period_month) === month);
      const opening = Number(row?.opening_cash || carry || 0);
      const closing = opening + Number(row?.planned_receivable || 0) - Number(row?.planned_payable || 0) - Number(row?.planned_capex || 0);
      carry = closing;
      return { month, opening, closing, revenue: Number(row?.planned_revenue || 0), profit: Number(row?.planned_revenue || 0) - Number(row?.planned_variable_cost || 0) - Number(row?.planned_fixed_cost || 0) };
    });
  }, [plans, selectedMonth]);

  function setField(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await onSave(new FormData(event.currentTarget));
      setMessage("월 계획을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "월 계획 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section active finance-page">
      <div className="finance-intro">
        <div>
          <strong>숫자를 세 장부로 나눠 봅니다.</strong>
          <p><b>손익</b>은 이번 달 장사가 남았는지, <b>현금</b>은 통장에 실제 돈이 있는지, <b>계획 대비</b>는 약속한 목표를 지켰는지 보여줍니다.</p>
        </div>
        <label>보고 싶은 달<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
      </div>

      {!tableReady && (
        <div className="alert-top warn">
          <div><strong>재무계획 표를 서버에 만드는 중입니다.</strong><span>현재 입력은 이 브라우저에 임시 보관되며, DB 배포 후 자동으로 서버 저장을 사용합니다.</span></div>
        </div>
      )}

      <div className="finance-metric-grid">
        <Metric label="매출" value={money(actual.revenue)} explanation="이 달에 일을 끝내 고객에게 넘긴 금액입니다." analogy="빵을 손님에게 건넨 날의 빵값입니다." tone="blue" />
        <Metric label="변동비" value={money(actual.variableCost)} explanation="매출이나 프로젝트가 늘면 함께 늘어나는 비용입니다." analogy="빵을 더 만들수록 더 필요한 밀가루 값입니다." tone="red" />
        <Metric label="공헌이익" value={money(actual.contribution)} explanation={`매출에서 변동비를 뺀 돈입니다. 매출의 ${Math.round(actual.contributionRate * 100)}%입니다.`} analogy="빵 하나를 팔고 밀가루 값을 뺀 뒤 월세를 낼 수 있는 돈입니다." tone="green" />
        <Metric label="고정비" value={money(actual.fixedCost)} explanation="직원 월급과 운영비처럼 매출과 상관없이 나가는 비용입니다." analogy="손님이 없어도 매달 나가는 월세와 직원 급여입니다." tone="orange" />
        <Metric label="영업이익" value={money(actual.operatingProfit)} explanation="공헌이익에서 고정비까지 뺀 실제 사업 성과입니다." analogy="재료비와 월세를 모두 내고 장사로 남은 돈입니다." tone={actual.operatingProfit >= 0 ? "green" : "red"} />
        <Metric label="손익분기 매출" value={money(actual.breakEvenRevenue)} explanation="이 금액 이상 팔아야 영업이익이 0원을 넘습니다." analogy="오늘 장사가 딱 본전이 되는 최소 매출선입니다." tone="blue" />
      </div>

      <div className="finance-two-column">
        <div className="finance-band">
          <div className="finance-band-head">
            <div><h2>계획과 실제 비교</h2><p>파란 선은 미리 세운 계획, 초록 선은 실제 결과입니다.</p></div>
          </div>
          <CompareRow label="매출" plan={plan.revenue} actual={actual.revenue} />
          <CompareRow label="변동비" plan={plan.variableCost} actual={actual.variableCost} />
          <CompareRow label="고정비" plan={plan.fixedCost} actual={actual.fixedCost} />
          <CompareRow label="영업이익" plan={planProfit} actual={actual.operatingProfit} />
        </div>

        <div className="finance-band">
          <div className="finance-band-head">
            <div><h2>통장 물통</h2><p>손익이 좋아도 입금이 늦으면 물통인 통장은 비어 있을 수 있습니다.</p></div>
          </div>
          <div className="cash-equation">
            <span>월초 현금<strong>{money(plan.openingCash)}</strong></span>
            <b>+</b>
            <span>실제 입금<strong>{money(actual.cashIn)}</strong></span>
            <b>−</b>
            <span>실제 출금<strong>{money(actual.cashOut)}</strong></span>
            <b>=</b>
            <span className={actualEndingCash >= 0 ? "positive" : "negative"}>예상 월말<strong>{money(actualEndingCash)}</strong></span>
          </div>
          <div className="finance-note">
            <strong>외상장부</strong>
            <span>아직 받을 돈 {money(actual.receivable)} · 아직 줄 돈 {money(actual.payable)}</span>
            <p>외상값은 장사가 끝나도 통장에 아직 들어오지 않았거나, 비용은 생겼지만 아직 송금하지 않은 돈입니다.</p>
          </div>
          <div className="finance-note compact">
            <strong>계획 월말 현금</strong>
            <span>{money(plannedEndingCash)}</span>
            <p>월초 현금 + 계획 입금 − 계획 출금 − 장비 구입비로 계산합니다.</p>
          </div>
        </div>
      </div>

      <form className="finance-plan-form" onSubmit={savePlan}>
        <div className="finance-band-head">
          <div><h2>{selectedMonth.replace("-", "년 ")}월 계획 입력</h2><p>매출·비용은 부가세를 뺀 금액, 현금 입출금은 통장에서 실제 오갈 금액을 적습니다.</p></div>
          <button className="btn blue" disabled={busy}>{busy ? "저장 중" : "월 계획 저장"}</button>
        </div>
        <input type="hidden" name="period_month" value={monthDate(selectedMonth)} />
        <div className="finance-form-grid">
          <label>월초 현금<span>달이 시작할 때 물통에 있던 돈</span><input name="opening_cash" type="number" value={draft.opening_cash || ""} onChange={(event) => setField("opening_cash", event.target.value)} /></label>
          <label>계획 매출<span>이번 달에 건네기로 한 빵값</span><input name="planned_revenue" type="number" value={draft.planned_revenue || ""} onChange={(event) => setField("planned_revenue", event.target.value)} /></label>
          <label>계획 변동비<span>매출이 늘면 같이 늘어나는 재료비</span><input name="planned_variable_cost" type="number" value={draft.planned_variable_cost || ""} onChange={(event) => setField("planned_variable_cost", event.target.value)} /></label>
          <label>계획 고정비<span>월급·월세·구독료처럼 매달 나가는 돈</span><input name="planned_fixed_cost" type="number" value={draft.planned_fixed_cost || ""} onChange={(event) => setField("planned_fixed_cost", event.target.value)} /></label>
          <label>장비·자산 구입<span>컴퓨터처럼 오래 쓰는 큰 도구 구입비</span><input name="planned_capex" type="number" value={draft.planned_capex || ""} onChange={(event) => setField("planned_capex", event.target.value)} /></label>
          <label>통장 입금 예정<span>이번 달 물통으로 실제 들어올 돈</span><input name="planned_receivable" type="number" value={draft.planned_receivable || ""} onChange={(event) => setField("planned_receivable", event.target.value)} /></label>
          <label>통장 출금 예정<span>이번 달 물통에서 실제 빠질 돈</span><input name="planned_payable" type="number" value={draft.planned_payable || ""} onChange={(event) => setField("planned_payable", event.target.value)} /></label>
          <label>판매 수량<span>몇 개·몇 회·몇 명에게 팔 계획인지</span><input name="sales_quantity" type="number" value={draft.sales_quantity || ""} onChange={(event) => setField("sales_quantity", event.target.value)} /></label>
          <label>평균 단가<span>한 개·한 회당 평균 가격</span><input name="average_unit_price" type="number" value={draft.average_unit_price || ""} onChange={(event) => setField("average_unit_price", event.target.value)} /></label>
          <label className="wide">계획 메모<span>왜 이 숫자로 잡았는지 근거를 적어 두세요.</span><textarea name="note" value={draft.note || ""} onChange={(event) => setField("note", event.target.value)} /></label>
        </div>
        <div className="finance-form-check">
          <strong>수량 × 단가로 본 예상 매출</strong>
          <span>{money(Number(draft.sales_quantity || 0) * Number(draft.average_unit_price || 0))}</span>
          <p>예: 교육 10회 × 회당 50만원 = 계획 매출 500만원입니다.</p>
        </div>
        {message && <div className="form-help">{message}</div>}
      </form>

      <div className="finance-band finance-forecast">
        <div className="finance-band-head">
          <div><h2>{selectedMonth.slice(0, 4)}년 12개월 자금 지도</h2><p>각 달의 월말 현금을 다음 달 월초로 이어서, 언제 돈이 부족해질지 미리 봅니다.</p></div>
        </div>
        <div className="table-scroll compact-table">
          <table>
            <thead><tr><th>월</th><th className="num">계획 매출</th><th className="num">계획 영업이익</th><th className="num">월초 현금</th><th className="num">월말 현금</th></tr></thead>
            <tbody>
              {forecastRows.map((row) => (
                <tr key={row.month}>
                  <td>{Number(row.month.slice(5))}월</td>
                  <td className="num">{money(row.revenue)}</td>
                  <td className={`num ${row.profit < 0 ? "finance-negative" : ""}`}>{money(row.profit)}</td>
                  <td className="num">{money(row.opening)}</td>
                  <td className={`num ${row.closing < 0 ? "finance-negative" : ""}`}>{money(row.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="finance-note">
          <strong>왜 이 표가 필요한가요?</strong>
          <p>연간 장사는 흑자여도 3월 입금 전에 2월 월급을 못 내면 문제가 생깁니다. 이 표는 “돈이 총 얼마 남나”보다 “어느 달에 먼저 마르나”를 찾는 지도입니다.</p>
        </div>
      </div>
    </section>
  );
}
