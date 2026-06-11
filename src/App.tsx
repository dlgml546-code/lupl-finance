import { useMemo, useState } from "react";
import {
  Building2,
  Camera,
  Check,
  Clock,
  FilePlus2,
  FolderPlus,
  LockKeyhole,
  Plus,
  ReceiptText,
  ShieldCheck,
  Upload,
  Users
} from "lucide-react";
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
  | null;

const sectionMeta: Record<SectionKey, { title: string; desc: string; count: string }> = {
  overview: {
    title: "경영현황",
    desc: "현재 현금, 이번 달 매출, 직원 월급 포함 지출, 현금소진액을 먼저 보여줍니다. 검토할 항목은 대표 검토함에서 팝업으로 확인하고 승인합니다.",
    count: "4"
  },
  review: {
    title: "대표 검토함",
    desc: "지출결의, 사업·매출, 인건비, 인력투입, 권한 요청까지 대표가 검토할 항목을 한곳에 모읍니다.",
    count: "20"
  },
  expense: {
    title: "지출결의",
    desc: "영수증 사진을 빠르게 등록하고, 기존 노션 지출결의처럼 검토 요약과 상세 목록을 함께 확인합니다.",
    count: "신규"
  },
  revenue: {
    title: "사업·매출관리",
    desc: "프로젝트 단위로 매출, 비용, 순이익, 마진율, 수금 상태를 관리합니다.",
    count: "2"
  },
  compensation: {
    title: "인건비·보상",
    desc: "직원별 연봉, 인상률, 지원사업 인건비, 상여금·성과보상을 한 화면에서 관리합니다.",
    count: "신규"
  },
  resource: {
    title: "인력투입·매출분석",
    desc: "프로젝트별 맨먼스, 가동률, 수익성 지도, 직위별 투입비율을 함께 봅니다.",
    count: "84%"
  },
  org: {
    title: "조직·권한관리",
    desc: "조직도와 페이지별 접근 권한을 관리합니다.",
    count: "관리"
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

const reviewRows = [
  {
    area: "지출결의",
    title: "광명학교 전시 출력물 제작",
    reason: "프로젝트 태그 확인",
    impact: "240,000원",
    owner: "경영지원부",
    status: "검토 전",
    modal: "expenseReview" as ModalKey
  },
  {
    area: "지출결의",
    title: "AI 교육 외부강사비",
    reason: "원천징수 확인",
    impact: "300,000원",
    owner: "AI부",
    status: "검토 전",
    modal: "taxReview" as ModalKey
  },
  {
    area: "사업·매출",
    title: "성보학교 전시 수금",
    reason: "입금 예정일 확인",
    impact: "8,000,000원",
    owner: "PM",
    status: "대기",
    modal: "projectDetail" as ModalKey
  },
  {
    area: "인건비",
    title: "창업도약패키지 인건비",
    reason: "2개월 후 종료",
    impact: "+1,300,000원",
    owner: "대표",
    status: "검토",
    modal: "employeeDetail" as ModalKey
  }
];

const projectRows = [
  { name: "AI 교육 운영", category: "교육 용역", revenue: "12,300,000원", cost: "8,200,000원", profit: "4,100,000원", margin: "33%", status: "수금 완료" },
  { name: "성보학교 전시", category: "전시·행사", revenue: "20,000,000원", cost: "13,000,000원", profit: "7,000,000원", margin: "35%", status: "일부 미수" },
  { name: "장애유형별 연구", category: "연구용역", revenue: "50,000,000원", cost: "29,000,000원", profit: "21,000,000원", margin: "42%", status: "계약 진행" },
  { name: "굿즈·작품 판매", category: "상품/IP", revenue: "5,000,000원", cost: "3,600,000원", profit: "1,400,000원", margin: "28%", status: "수금 완료" }
];

function App() {
  const [section, setSection] = useState<SectionKey>("overview");
  const [modal, setModal] = useState<ModalKey>(null);
  const [approvedItems, setApprovedItems] = useState<string[]>([]);

  const activeMeta = sectionMeta[section];

  const pendingReviewCount = useMemo(
    () => reviewRows.filter((row) => !approvedItems.includes(row.title)).length,
    [approvedItems]
  );

  function approve(title: string) {
    setApprovedItems((prev) => Array.from(new Set([...prev, title])));
    setModal(null);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">경영</div>
          <div>
            <div className="brand-title">LUPL Finance</div>
            <div className="brand-sub">경영관리 대시보드</div>
          </div>
        </div>

        <div className="menu-label">메뉴</div>
        <nav className="nav" aria-label="주요 메뉴">
          {menu.map((item) => (
            <button
              key={item.key}
              className={section === item.key ? "active" : ""}
              onClick={() => setSection(item.key)}
            >
              <span className="nav-dot" />
              <span>{item.label}</span>
              <span className="nav-count">
                {item.key === "review" ? pendingReviewCount : sectionMeta[item.key].count}
              </span>
            </button>
          ))}
        </nav>

        <div className="side-summary">
          <h3>Runway</h3>
          <div className="risk-line" />
          <p>
            최근 3개월 평균 현금소진액 기준
            <br />
            현재 예상 생존기간은 <strong>6.8개월</strong>입니다.
          </p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">LUPL Management · v1</div>
            <h1 className="page-title">{activeMeta.title}</h1>
            <p className="page-desc">{activeMeta.desc}</p>
          </div>

          <div className={`home-actions ${section !== "overview" ? "hidden" : ""}`}>
            <select className="btn" aria-label="기준월">
              <option>2026년 6월</option>
              <option>2026년 5월</option>
            </select>
            <button className="btn">월간 리포트</button>
            <button className="btn dark">거래 업로드</button>
          </div>
        </header>

        {section === "overview" && (
          <Overview setSection={setSection} reviewCount={pendingReviewCount} />
        )}
        {section === "review" && (
          <ReviewInbox
            approvedItems={approvedItems}
            onOpenModal={setModal}
            onApprove={approve}
          />
        )}
        {section === "expense" && <Expense onOpenModal={setModal} />}
        {section === "revenue" && <Revenue onOpenModal={setModal} />}
        {section === "compensation" && <Compensation onOpenModal={setModal} />}
        {section === "resource" && <Resource />}
        {section === "org" && <Org />}

        <FloatingActions setSection={setSection} />
      </main>

      <Modal modal={modal} setModal={setModal} onApprove={approve} />
    </div>
  );
}

function Overview({
  setSection,
  reviewCount
}: {
  setSection: (key: SectionKey) => void;
  reviewCount: number;
}) {
  return (
    <section className="section active">
      <div className="alert-top">
        <div>
          <strong>대표 검토함에 처리할 항목이 {reviewCount}건 있습니다.</strong>
          <span>지출결의, 사업·매출, 인건비, 인력투입, 권한 요청을 한곳에서 검토합니다.</span>
        </div>
        <button className="btn small" onClick={() => setSection("review")}>
          대표 검토함 열기
        </button>
      </div>

      <div className="grid kpi">
        <div className="card hero-card">
          <div>
            <div className="hero-label">현재 현금</div>
            <div className="hero-value">24,000,000원</div>
            <div className="hero-copy">
              전월 대비 3,200,000원 증가했습니다. 다만 이번 달 직원 월급과 지원사업 인건비 종료분을
              반영하면 다음 달 현금소진액이 증가할 수 있습니다.
            </div>
          </div>
          <div className="hero-insights">
            <InfoMini label="이번 달 입금예정" value="8,000,000원" />
            <InfoMini label="이번 달 지급예정" value="6,200,000원" />
            <InfoMini label="지원금 종료 영향" value="+1,300,000원" />
            <InfoMini label="예상 월말 현금" value="25,800,000원" />
          </div>
        </div>

        <KpiCard label="이번 달 매출" value="12,300,000원" chip="목표 대비 82%" tone="green" />
        <KpiCard label="직원 월급 포함 지출" value="15,800,000원" chip="전월 대비 +9%" tone="red" />
        <KpiCard label="현금소진액 / Runway" value="350만 · 6.8개월" chip="주의 구간" tone="orange" />
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
          <CashFlowChart />
        </div>

        <div className="card">
          <h2 className="card-title">이번 달 경영 요약</h2>
          <p className="card-sub">검토함과 중복되지 않도록, 이 자리에는 요약 지표만 배치했습니다.</p>
          <div className="metric-list">
            <Metric title="매출 대비 지출률" copy="지출 ÷ 매출 기준" value="128%" />
            <Metric title="인건비 비중" copy="직원 급여와 회사부담분 포함" value="46%" />
            <Metric title="미수금" copy="세금계산서 발행 후 미수금" value="5,000,000원" />
            <Metric title="다음 달 고정지출" copy="급여, 구독료, 임차료 중심" value="11,400,000원" />
          </div>
        </div>
      </div>

      <div className="point-card blue">
        <div>
          <div className="point-title">이번 달 의사결정 포인트</div>
          <div className="point-copy">
            지원사업 인건비 종료 전, 신규 채용·상여금·외주비 집행 가능성을 함께 확인해야 합니다.
          </div>
        </div>
        <div className="point-value">6.8개월</div>
      </div>
    </section>
  );
}

function ReviewInbox({
  approvedItems,
  onOpenModal,
  onApprove
}: {
  approvedItems: string[];
  onOpenModal: (modal: ModalKey) => void;
  onApprove: (title: string) => void;
}) {
  const visibleRows = reviewRows.map((row) => ({
    ...row,
    approved: approvedItems.includes(row.title)
  }));

  return (
    <section className="section active">
      <div className="alert-top">
        <div>
          <strong>대표 검토함 전체 {visibleRows.filter((r) => !r.approved).length}건</strong>
          <span>항목명을 누르면 팝업이 열리고, 승인·보류·수정요청을 바로 처리할 수 있습니다.</span>
        </div>
        <button
          className="btn small"
          onClick={() => visibleRows.forEach((row) => onApprove(row.title))}
        >
          선택 항목 일괄 승인
        </button>
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
                <th style={{ width: 110 }}>영역</th>
                <th style={{ width: 230 }}>항목명</th>
                <th style={{ width: 180 }}>검토 사유</th>
                <th style={{ width: 140 }} className="num">금액/영향</th>
                <th style={{ width: 150 }}>담당</th>
                <th style={{ width: 130 }}>상태</th>
                <th style={{ width: 190 }}>처리</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.title} className={row.approved ? "muted-row" : ""}>
                  <td>{row.area}</td>
                  <td>
                    <button className="btn small ghost" onClick={() => onOpenModal(row.modal)}>
                      {row.title}
                    </button>
                  </td>
                  <td>{row.reason}</td>
                  <td className="num">{row.impact}</td>
                  <td>{row.owner}</td>
                  <td>
                    <span className={`chip ${row.approved ? "green" : "orange"}`}>
                      {row.approved ? "승인" : row.status}
                    </span>
                  </td>
                  <td>
                    {row.approved ? (
                      <span className="chip green">처리 완료</span>
                    ) : (
                      <button className="btn small blue" onClick={() => onOpenModal(row.modal)}>
                        상세·승인
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Expense({ onOpenModal }: { onOpenModal: (modal: ModalKey) => void }) {
  return (
    <section className="section active">
      <div className="grid two">
        <div className="card">
          <h2 className="card-title">빠른 지출 등록</h2>
          <p className="card-sub">페이지를 찾아 들어오지 않아도, 우측 하단 빠른 등록 버튼에서 영수증 사진을 바로 올리는 구조입니다.</p>
          <div className="quick-actions quick-two">
            <QuickCard icon={<Camera size={18} />} title="영수증 사진 촬영" copy="모바일에서 바로 카메라 실행" />
            <QuickCard icon={<Upload size={18} />} title="사진 여러 장 업로드" copy="한 번에 OCR 처리 후 검토함 생성" />
            <QuickCard icon={<FilePlus2 size={18} />} title="공유 등록" copy="사진첩·카카오톡·파일 앱에서 바로 전달" />
            <QuickCard icon={<Clock size={18} />} title="반복 지출 불러오기" copy="구독료, 정기결제 자동 완성" />
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">지출결의 검토 요약</h2>
          <p className="card-sub">검토가 필요한 지출결의 항목만 먼저 보여줍니다.</p>
          <div className="queue">
            <QueueItem tone="orange" title="분류 확인" copy="운영비, 내부 사업비, 외주용역 구분" count="8건" onClick={() => onOpenModal("expenseReview")} />
            <QueueItem tone="red" title="필수 증빙 누락" copy="사업자등록증, 견적서, 전자세금계산서" count="5건" onClick={() => onOpenModal("expenseReview")} />
            <QueueItem title="이체 내용 요약 확인" copy="은행, 계좌번호, 예금주, 금액 확인" count="4건" onClick={() => onOpenModal("expenseReview")} />
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
                <th style={{ width: 110 }}>사용일</th>
                <th style={{ width: 200 }}>목적 및 용도</th>
                <th style={{ width: 130 }}>사용 용도</th>
                <th style={{ width: 120 }}>결제방식</th>
                <th style={{ width: 120 }} className="num">사용 금액</th>
                <th style={{ width: 160 }}>증빙</th>
                <th style={{ width: 170 }}>이체 여부</th>
                <th style={{ width: 210 }}>검토 사유</th>
              </tr>
            </thead>
            <tbody>
              <tr className="clickable" onClick={() => onOpenModal("expenseReview")}>
                <td>2026-06-08</td><td>광명학교 전시 출력물 제작</td><td>내부 사업비</td><td>카드</td><td className="num">240,000원</td><td><span className="chip orange">견적서 확인</span></td><td>결제 완료</td><td>프로젝트 태그 확인 필요</td>
              </tr>
              <tr className="clickable" onClick={() => onOpenModal("taxReview")}>
                <td>2026-06-09</td><td>AI 교육 외부강사비</td><td>외부 사업비</td><td>계좌이체</td><td className="num">300,000원</td><td><span className="chip red">원천징수 확인</span></td><td>이체 필요</td><td>소득구분 확인 필요</td>
              </tr>
              <tr className="clickable" onClick={() => onOpenModal("expenseReview")}>
                <td>2026-06-10</td><td>OpenAI 구독료</td><td>운영비</td><td>카드</td><td className="num">32,000원</td><td><span className="chip green">카드전표 완료</span></td><td>결제 완료</td><td>공통 운영으로 확정 가능</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Revenue({ onOpenModal }: { onOpenModal: (modal: ModalKey) => void }) {
  return (
    <section className="section active">
      <div className="quick-actions">
        <QuickCard icon={<FolderPlus size={18} />} title="새 프로젝트 생성" copy="교육, 전시, 연구, 상품/IP, 지원금으로 구분" />
        <QuickCard icon={<Plus size={18} />} title="입금 예정 등록" copy="수금 예정일과 미수금 관리" />
        <QuickCard icon={<ReceiptText size={18} />} title="비용 항목 추가" copy="프로젝트별 직접비·외주비·제작비 입력" />
        <QuickCard icon={<Building2 size={18} />} title="카테고리 관리" copy="사업 유형과 수입처 분류값 수정" />
      </div>

      <div className="grid four">
        <KpiCard compact label="총 매출" value="87,300,000원" chip="누적" tone="green" />
        <KpiCard compact label="총 비용" value="61,800,000원" chip="직접비 포함" tone="red" />
        <KpiCard compact label="순이익" value="25,500,000원" chip="마진 29.2%" tone="blue" />
        <KpiCard compact label="미수금" value="5,000,000원" chip="수금 확인" tone="orange" />
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
                {projectRows.map((row) => (
                  <tr key={row.name} className="clickable" onClick={() => onOpenModal("projectDetail")}>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td className="num">{row.revenue}</td>
                    <td className="num">{row.cost}</td>
                    <td className="num">{row.profit}</td>
                    <td className="num">{row.margin}</td>
                    <td><span className={`chip ${row.status === "수금 완료" ? "green" : "orange"}`}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">프로젝트 상세 미리보기</h2>
          <p className="card-sub">목록을 클릭했을 때 팝업에 표시되는 핵심 인포그래픽 예시입니다.</p>
          <div className="metric-list">
            <Metric title="매출" copy="공급가액 기준" value="20,000,000원" />
            <Metric title="비용" copy="직접비, 외주비, 제작비 포함" value="13,000,000원" />
            <Metric title="순이익" copy="매출 - 비용" value="7,000,000원" />
            <Metric title="마진율" copy="순이익 ÷ 매출" value="35%" />
          </div>
          <div className="point-card green">
            <div>
              <div className="point-title">수익성 양호</div>
              <div className="point-copy">대표 투입시간을 줄이면 확장 가능성이 높습니다.</div>
            </div>
            <div className="point-value">35%</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Compensation({ onOpenModal }: { onOpenModal: (modal: ModalKey) => void }) {
  return (
    <section className="section active">
      <div className="grid two">
        <div className="card solid">
          <h2 className="card-title">직위별 연봉 테이블</h2>
          <p className="card-sub">직원명을 누르면 직원 상세 페이지 팝업이 열립니다.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>직위</th><th className="num">하한</th><th className="num">기준</th><th className="num">상한</th><th>협상 기준</th><th>직원</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>대표</td><td className="num">별도</td><td className="num">별도</td><td className="num">별도</td><td>현금흐름·임원보수 기준</td><td><button className="btn small ghost" onClick={() => onOpenModal("employeeDetail")}>이희은</button></td></tr>
                <tr><td>본부장</td><td className="num">48,000,000</td><td className="num">56,000,000</td><td className="num">68,000,000</td><td>조직 운영·성과 총괄</td><td>미정</td></tr>
                <tr><td>책임</td><td className="num">38,000,000</td><td className="num">44,000,000</td><td className="num">54,000,000</td><td>프로젝트 성과 책임</td><td><button className="btn small ghost" onClick={() => onOpenModal("employeeDetail")}>AI부 책임</button></td></tr>
                <tr><td>선임</td><td className="num">32,000,000</td><td className="num">36,000,000</td><td className="num">44,000,000</td><td>전문 실무 리드</td><td><button className="btn small ghost" onClick={() => onOpenModal("employeeDetail")}>AI 교육 선임</button></td></tr>
                <tr><td>매니저</td><td className="num">26,000,000</td><td className="num">30,000,000</td><td className="num">36,000,000</td><td>독립 실무 수행</td><td><button className="btn small ghost" onClick={() => onOpenModal("employeeDetail")}>개발 매니저</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">상여금·성과보상 현황</h2>
          <p className="card-sub">입력뿐 아니라 지급 예정, 보류, 완료 상태를 한눈에 봅니다.</p>
          <div className="metric-list">
            <Metric title="AI 교육 선임" copy="AI 교육 순수익 10%, 분기별 지급" value="1,260,000원" />
            <Metric title="콘텐츠 선임" copy="광명학교 전시 순수익 5%, 종료 후 지급" value="350,000원" />
            <Metric title="개발 매니저" copy="플랫폼 납품 보너스, 대표 확인 전" value="보류" />
          </div>
          <div className="point-card">
            <div>
              <div className="point-title">상여금 입력</div>
              <div className="point-copy">프로젝트 순수익, 지급률, 지급 주기, 지급 조건을 직접 입력해 관리합니다.</div>
            </div>
            <div className="point-value">신규</div>
          </div>
        </div>
      </div>

      <div className="grid two mt">
        <div className="card">
          <h2 className="card-title">연봉 인상 계산</h2>
          <div className="form-row">
            <label>전년도 연봉<input defaultValue="34,000,000" /></label>
            <label>인상률<input defaultValue="5%" /></label>
            <label>지원사업<input defaultValue="창업도약패키지" /></label>
            <label>종료 알림<input defaultValue="2개월 후" /></label>
          </div>
          <div className="metric-list">
            <Metric title="연봉 인상액" copy="전년도 연봉 대비 증가분" value="1,700,000원" />
            <Metric title="인상 후 연봉" copy="확정 시 적용될 계약 연봉" value="35,700,000원" />
            <Metric title="월 급여 증가분" copy="매월 추가로 발생하는 급여" value="141,667원" />
          </div>
        </div>
        <div className="card">
          <h2 className="card-title">상여금·성과보상 입력</h2>
          <div className="form-row two-cols">
            <label>프로젝트명<input defaultValue="AI 교육 운영" /></label>
            <label>지급 대상<input defaultValue="AI 교육 선임" /></label>
            <label>순수익<input defaultValue="12,600,000" /></label>
            <label>지급률<input defaultValue="10%" /></label>
          </div>
          <div className="point-card">
            <div>
              <div className="point-title">예상 상여금</div>
              <div className="point-copy">수금 완료 및 대표 승인 후 지급</div>
            </div>
            <div className="point-value">1,260,000원</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Resource() {
  return (
    <section className="section active">
      <div className="grid four resource-top">
        <KpiCard compact label="총 가용시간" value="640h" chip="4명 기준" tone="blue" />
        <KpiCard compact label="확정 투입" value="420h" chip="65.6%" tone="green" />
        <KpiCard compact label="예정 투입" value="120h" chip="가정 포함" tone="orange" />
        <KpiCard compact label="평균 가동률" value="84%" chip="주의" tone="orange" />
      </div>

      <div className="grid two">
        <div className="card">
          <h2 className="card-title">수익성 지도</h2>
          <p className="card-sub">상단 카드와 겹치지 않도록 여백을 확보하고, 사업별 수익성과 인력투입 데이터를 함께 봅니다.</p>
          <ProfitMap />
        </div>

        <div className="card">
          <h2 className="card-title">맨먼스·판단 카드</h2>
          <div className="metric-list">
            <Metric title="1인월 매출" copy="프로젝트 매출 ÷ 맨먼스" value="3,319만" />
            <Metric title="대표 투입 과다" copy="대표 150h로 위임 필요" value="주의" />
            <Metric title="AI 교육 수요" copy="확정 수요가 가용시간을 초과할 가능성" value="부족" />
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
        <StackRow project="AI 교육 운영" segments={[["a", 35], ["c", 20], ["d", 45]]} mm="0.48MM" />
        <StackRow project="성보학교 전시" segments={[["a", 25], ["b", 15], ["c", 25], ["d", 25], ["e", 10]]} mm="0.75MM" />
        <StackRow project="사생대회 운영" segments={[["a", 40], ["b", 15], ["c", 20], ["d", 15], ["e", 10]]} mm="1.80MM" />
        <StackRow project="연구용역" segments={[["a", 20], ["b", 20], ["c", 30], ["d", 20], ["e", 10]]} mm="1.20MM" />
      </div>
    </section>
  );
}

function Org() {
  return (
    <section className="section active">
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
              <OrgNode title="홍보마케팅부" copy="브랜드·홍보" />
              <OrgNode title="경영지원부" copy="돈·계약·증빙" />
              <OrgNode title="AI부" copy="교육·콘텐츠" />
              <OrgNode title="개발부" copy="플랫폼·자동화" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">페이지별 권한 설정</h2>
          <p className="card-sub">관리자가 초대한 사람만 보거나, 페이지별로 선택한 사람만 볼 수 있게 설계합니다.</p>
          <div className="form-row">
            <label>페이지 선택<select><option>지출결의</option><option>인건비·보상</option><option>사업·매출관리</option></select></label>
            <label>초대할 사람<input defaultValue="경영지원 매니저" /></label>
            <label>권한<select><option>보기만 가능</option><option>입력 가능</option><option>승인 가능</option></select></label>
            <label>공개 범위<select><option>선택한 사람만</option><option>부서 전체</option><option>관리자 전체</option></select></label>
          </div>
          <div className="metric-list">
            <Metric title="대표" copy="전체 열람·승인·삭제·권한관리 가능" value="관리자" />
            <Metric title="본부장/책임" copy="부서·담당 프로젝트 데이터 확인 및 승인" value="운영" />
            <Metric title="선임/매니저" copy="초대된 페이지와 본인 업무만 확인" value="제한" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingActions({ setSection }: { setSection: (key: SectionKey) => void }) {
  return (
    <div className="fab">
      <button className="fab-sub" onClick={() => setSection("expense")}>
        영수증 사진 바로 등록
      </button>
      <button className="fab-main" onClick={() => setSection("expense")}>
        + 빠른 지출 등록
      </button>
    </div>
  );
}

function Modal({
  modal,
  setModal,
  onApprove
}: {
  modal: ModalKey;
  setModal: (modal: ModalKey) => void;
  onApprove: (title: string) => void;
}) {
  if (!modal) return null;

  const content = {
    expenseReview: {
      title: "광명학교 전시 출력물 제작",
      desc: "프로젝트 태그와 증빙을 확인한 뒤 승인할 수 있습니다.",
      rows: [
        ["사용일", "2026-06-08"],
        ["사용 금액", "240,000원"],
        ["추천 분류", "내부 사업비 · 제작비"],
        ["프로젝트 태그", "광명학교 전시"],
        ["증빙", "카드전표 완료, 견적서 확인 필요"],
        ["처리 제안", "프로젝트 태그 확정 후 승인"]
      ],
      approveTitle: "광명학교 전시 출력물 제작"
    },
    taxReview: {
      title: "AI 교육 외부강사비",
      desc: "개인 강사료 지급 건으로 원천징수와 소득구분 확인이 필요합니다.",
      rows: [
        ["지급 대상", "김OO 강사"],
        ["지급 총액", "300,000원"],
        ["예상 원천징수", "9,900원"],
        ["차인지급액", "290,100원"],
        ["소득구분", "사업소득 또는 기타소득 확인"],
        ["처리 제안", "회계 기준 확인 후 지급 승인"]
      ],
      approveTitle: "AI 교육 외부강사비"
    },
    projectDetail: {
      title: "성보학교 전시 상세",
      desc: "프로젝트별 매출, 비용, 순이익, 마진율, 미수금, 맨먼스를 한눈에 봅니다.",
      rows: [
        ["카테고리", "전시·행사 용역"],
        ["매출", "20,000,000원"],
        ["비용", "13,000,000원"],
        ["순이익", "7,000,000원"],
        ["마진율", "35%"],
        ["맨먼스", "0.75MM"],
        ["수금 상태", "일부 미수 · 8,000,000원 확인 필요"],
        ["판단", "수익성 양호, 대표 투입시간 축소 필요"]
      ],
      approveTitle: "성보학교 전시 수금"
    },
    employeeDetail: {
      title: "AI 교육 선임 상세",
      desc: "직원별 연봉, 인상률, 지원사업, 상여금, 투입 프로젝트, 권한 범위를 관리합니다.",
      rows: [
        ["기본정보", "AI부 · 선임 · 정규직"],
        ["입사일 / 근속", "2025-03-01 · 1년 4개월"],
        ["계약연봉", "35,700,000원"],
        ["전년도 연봉 / 인상률", "34,000,000원 · 5%"],
        ["월 급여", "2,975,000원"],
        ["총인건비", "약 3,420,000원"],
        ["지원사업 연결", "창업도약패키지 · 2개월 후 종료"],
        ["회사 실부담 변화", "종료 후 +1,300,000원/월"],
        ["상여금 규칙", "AI 교육 순수익 10% · 분기별"],
        ["투입 프로젝트", "AI 교육 운영 45%, 성보 전시 25%"],
        ["권한 범위", "AI부 자료 입력, 교육 프로젝트 열람"],
        ["퇴직급여 대상", "대상 · 월별 충당 필요"]
      ],
      approveTitle: "창업도약패키지 인건비"
    }
  }[modal];

  return (
    <div className="modal active" onClick={() => setModal(null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 className="modal-title">{content.title}</h2>
            <p className="modal-desc">{content.desc}</p>
          </div>
          <button className="modal-close" onClick={() => setModal(null)}>×</button>
        </div>
        <div className="modal-info">
          {content.rows.map(([label, value]) => (
            <div className="info-box" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        {modal === "projectDetail" && (
          <div className="point-card green">
            <div>
              <div className="point-title">상세 인포그래픽 포인트</div>
              <div className="point-copy">매출 대비 비용이 안정적이며, 마진율 35%로 확장 가능성이 있습니다.</div>
            </div>
            <div className="point-value">35%</div>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={() => setModal(null)}>수정 요청</button>
          <button className="btn" onClick={() => setModal(null)}>보류</button>
          <button className="btn blue" onClick={() => onApprove(content.approveTitle)}>승인</button>
        </div>
      </div>
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

function QuickCard({ title, copy, icon }: { title: string; copy: string; icon?: React.ReactNode }) {
  return (
    <button className="quick-card">
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

function CashFlowChart() {
  return (
    <div className="cash-chart">
      <CashMonth month="1월" revenue={52} expense={67} net={22} copy="매출 8.1 / 비용 10.5" />
      <CashMonth month="3월" revenue={83} expense={70} net={34} copy="매출 13.0 / 비용 11.0" />
      <CashMonth month="6월" revenue={78} expense={100} net={31} copy="매출 12.3 / 비용 15.8" />
    </div>
  );
}

function CashMonth({
  month,
  revenue,
  expense,
  net,
  copy
}: {
  month: string;
  revenue: number;
  expense: number;
  net: number;
  copy: string;
}) {
  return (
    <div className="cash-month">
      <strong>{month}</strong>
      <div className="cash-bars">
        <div className="mini-track"><div className="mini-fill revenue" style={{ width: `${revenue}%` }} /></div>
        <div className="mini-track"><div className="mini-fill expense" style={{ width: `${expense}%` }} /></div>
        <div className="mini-track"><div className="mini-fill net" style={{ width: `${net}%` }} /></div>
      </div>
      <div className="cash-num">{copy}</div>
    </div>
  );
}

function ProfitMap() {
  return (
    <div className="profit-map">
      <div className="axis y">매출 규모 ↑</div>
      <div className="axis x">마진율 →</div>
      <div className="bubble green" style={{ left: "56%", top: "12%", width: 132, height: 132 }}>연구<br />용역</div>
      <div className="bubble blue" style={{ left: "40%", top: "40%", width: 120, height: 120 }}>성보<br />전시</div>
      <div className="bubble orange" style={{ left: "18%", top: "54%", width: 112, height: 112 }}>사생<br />대회</div>
      <div className="bubble purple" style={{ left: "67%", top: "62%", width: 102, height: 102 }}>AI<br />교육</div>
    </div>
  );
}

function StackRow({
  project,
  segments,
  mm
}: {
  project: string;
  segments: Array<[string, number]>;
  mm: string;
}) {
  return (
    <div className="stack-row">
      <strong>{project}</strong>
      <div className="stack-bar">
        {segments.map(([cls, width]) => (
          <div key={`${project}-${cls}`} className={`stack-seg ${cls}`} style={{ width: `${width}%` }}>
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

export default App;
