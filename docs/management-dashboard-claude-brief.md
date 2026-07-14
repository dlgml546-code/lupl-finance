# LUPL 경영대시보드 구현 브리프

작성일: 2026-07-14  
대상 레포: `dlgml546-code/lupl-finance`  
프로덕션 URL: `https://lupl-finance.vercel.app`

이 문서는 Claude 또는 다른 개발 도구가 현재 LUPL 경영대시보드를 같은 방향으로 이어서 구현할 수 있도록 정리한 기준 문서입니다. 실제 비밀키, 토큰, Supabase 키 값은 절대 문서에 적지 않습니다.

## 1. 현재 상태

- 프론트엔드: React 18 + TypeScript + Vite
- 백엔드/DB: Supabase Auth, Postgres, Storage, Edge Functions
- 배포: Vercel
- 주요 파일:
  - 앱 본체: `src/App.tsx`
  - 재무계획 화면: `src/FinancePlanning.tsx`
  - 타입: `src/types.ts`
  - 스타일: `src/styles.css`
  - Supabase 클라이언트: `src/lib/supabase.ts`
  - DB 스키마: `supabase/schema.sql`
  - 전체 리셋 스키마: `supabase/reset_schema.sql`
  - 개선함 마이그레이션: `supabase/migrations/202607130001_improvement_requests.sql`
  - AI 대화 API: `api/finance-ai.js`
  - 개선함 AI 요약 API: `api/improvement-summarize.js`
  - 개선함 GitHub Issue API: `api/improvement-github-issue.js`

## 2. 실행 및 검증

```bash
npm ci --no-audit --no-fund
npm run build
```

Vercel 설정:

```text
Install Command: npm ci --no-audit --no-fund
Build Command: npm run build
Output Directory: dist
```

필수 환경변수:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

서버 API에서 쓰는 선택 환경변수:

```text
OPENAIAPIkeys
OPENAI_API_KEY
OPENAI_API_KEYS
LUPL_GITHUB_TOKEN
GITHUB_TOKEN
LUPL_GITHUB_REPO
LUPL_GITHUB_ISSUE_LABELS
```

## 3. 운영 원칙

- 실제 데이터는 Supabase 기준으로 저장, 조회, 수정한다.
- 더미 데이터는 쓰지 않는다.
- `main`은 프로덕션 배포 브랜치다.
- 기능 실험은 가능하면 `db` 또는 별도 작업 브랜치에서 하고, 검증 후 `main`에 반영한다.
- Vercel 자동 배포는 현재 `main` push 기준으로 동작한다.
- 비밀키, Supabase service role key, OpenAI key, GitHub token은 코드나 문서에 넣지 않는다.

## 4. 화면 메뉴

현재 주요 메뉴는 `src/App.tsx`의 `SectionKey`, `sectionMeta`, `menu`에 정의되어 있다.

- 경영현황
- 재무계획
- 지출결의
- 사업매출 관리
- 인건비 보상
- 마진계산기
- AI 경영입력
- 모바일 기기 관리
- 조직·권한관리
- 개선함

우측 하단에는 전역 개선 메모 버튼이 있다.

- 버튼 라벨: `개선`
- 단축키: `Ctrl+Shift+M`
- 현재 페이지, 하위 항목, 요청 유형, 메모, 사용자 환경을 함께 저장한다.
- 저장 테이블: `improvement_requests`

## 5. 핵심 기능

### 5.1 경영현황

목표:

- 대표가 현재 현금, 매출, 지출, 미수금, 지급예정, 런웨이를 빠르게 본다.
- 현재 현금은 직접 입력한 월별/통장별 현금 내역을 기준으로 보여준다.
- 매출, 지출, 미수금, 지급예정은 프로젝트, 지출결의, 직원 연봉에서 자동 계산한다.
- 숫자는 1,000원 단위 쉼표를 사용한다.
- 카드 안에서 숫자가 잘리지 않도록 `min-width`, `font-size`, `overflow`를 조정한다.

관련 데이터:

- `cash_snapshots`
- `business_projects`
- `expense_requests`
- `people`

### 5.2 재무계획

파일: `src/FinancePlanning.tsx`

목표:

- 월별 계획과 실제를 비교한다.
- 매출, 변동비, 고정비, 영업이익을 계획/실제/차이로 보여준다.
- 통장 현금 흐름을 월초 현금 + 실제 입금 - 실제 출금 = 예상 월말 현금으로 계산한다.
- 프로젝트의 매출 인식일, 실제 입금일, 지출의 실제 지급일을 반영한다.
- 매월 반복되는 정기 지출은 해당 월에도 반영한다.

### 5.3 지출결의

목표:

- 빠른 지출 등록, 반복 지출, 결제수단 관리, 모바일 기기 관리, 검토 흐름을 한 화면에서 관리한다.
- 정기결제는 너무 큰 카드가 아니라 접힌 상세/토글 또는 한 줄 요약 중심으로 표시한다.
- 이번 달 누적 사용비용을 크게 보여준다.
- 지출 대분류와 소분류는 별도 필드로 보인다.
- OCR로 들어온 영수증은 모바일 기기 등록 정보를 보고 담당자를 추정한다.
- 개인카드 사용분은 월말 일괄 정산 안내를 제공한다.
- 계좌이체에는 법인 계좌이체 버튼이 보여야 한다.

주요 분류:

- 대분류: 여비·출장비, 업무 추진비, 내부 사업비, 외부 사업비(외주용역), 복리후생비, 운영비, 차량비, 홍보비(광고비), 자산취득비
- 소분류는 `expenseSubcategoryTree` 기준이다.
- OCR 앱에서는 소분류를 선택하고, 경영대시보드에서는 소분류 기준으로 대분류를 자동 계산한다.

관련 테이블:

- `expense_requests`
- `expense_categories`
- `payment_cards`
- `mobile_receipt_devices`
- `review_items`

### 5.4 사업매출 관리

목표:

- 프로젝트 등록, 수정, 상세, 삭제, 완료 처리가 가능해야 한다.
- 질문형 프로젝트 등록에서 입력한 정보가 프로젝트 상세에 그대로 보여야 한다.
- 실무 담당자 이름, 거래처/기관명, 유입경로, 책임자, 상태, 입금 예정일, 매출 인식일, 실제 입금일이 사라지면 안 된다.
- 프로젝트 분류는 대분류/중분류/소분류 구조다.
- `business_category` enum 오류가 나지 않도록 text 기반 분류 컬럼을 우선 사용한다.
- 매월 반복되는 프로젝트 수입은 월별 매출 계산에 반영한다.

주요 필드:

- `project_major_category`
- `project_middle_category`
- `project_small_category`
- `owner_label`
- `operator_label`
- `client_name`
- `client_type`
- `payment_due_date`
- `revenue_recognition_date`
- `received_date`
- `revenue_tax_mode`
- `confirmed_amount`
- `received_amount`

### 5.5 인건비 보상

목표:

- 이달의 월급 총액과 연봉 총액을 상단에 크게 보여준다.
- 직원 추가 시 입사일 기준 사번 자동 생성:
  - 예: 2026-06-25 입사 첫 번째 직원 `26062501`
  - 같은 날 두 번째 직원 `26062502`
- 이메일은 사용자가 직접 입력할 수 있어야 한다.
- 초기 비밀번호는 `lupl` + 휴대전화 뒤 4자리 기준이다.
- 직원 연봉 현황은 필요한 단어가 보이는 정도로 compact하게 유지한다.
- 상여금/성과보상 현황은 직원 연봉 현황 아래에 배치하고 높이를 줄인다.
- 근태관리 운영설정 기준값을 인건비 계산 참고 영역에 보여준다.

관련 테이블:

- `people`
- `compensation_reviews`
- `bonus_payments`
- `project_labor_allocations`
- `departments`

### 5.6 마진계산기

목표:

- `lupl-margin-calculator`의 핵심 흐름을 경영대시보드 안에서 사용할 수 있어야 한다.
- 강의/프로젝트 모드가 있다.
- PDF 기준 수입 구성, 강사, 고정비, 변동비, 결과, 인포그래픽 항목이 보여야 한다.
- 기관/학교가 강사에게 직접 지급하고 회사가 회수해야 하는 구조를 계산한다.
- 강사별 실제 입금액, 회사 회수 예정액, 회수 완료액, 강사에게 실제 지급하기로 한 금액, 회사 매출을 분리한다.
- 프로젝트별 마진 계산 결과는 해당 프로젝트 메모에 JSON 블록으로 저장한다.

프로젝트 메모 저장 구분자:

```text
__LUPL_MARGIN_CALC_START__
JSON
__LUPL_MARGIN_CALC_END__
```

### 5.7 AI 경영입력

API: `api/finance-ai.js`

목표:

- 대표가 자연어로 프로젝트/강사/입금 경로/고용 여부를 설명하면 AI가 질문을 이어간다.
- 버튼식 quick reply를 제공한다.
- 최종적으로 프로젝트 초안, 강사별 정산 정보, 고용 후보, 월급/연봉 추정값을 structured JSON으로 만든다.
- 서버 환경변수 `OPENAIAPIkeys` 또는 `OPENAI_API_KEY`를 사용한다.

### 5.8 조직·권한관리

목표:

- 부서는 `~부서` 형식으로 표시한다.
- 디자인부서가 있어야 한다.
- 김소현님은 디자인부서에 배치한다.
- 페이지별 권한은 직원별로 상세 화면에서 체크/해제할 수 있어야 한다.
- 실제 경영대시보드에 등록된 직원만 권한 부여 대상에 보인다.
- 대표/본부장은 기본 전체 접근이다.

관련 테이블:

- `people`
- `departments`
- `page_permissions`

### 5.9 개선함

목표:

- 근태관리의 개선 메모 패턴을 경영대시보드에 적용한다.
- 전역 우측 하단 `개선` 버튼을 제공한다.
- 단축키 `Ctrl+Shift+M`으로 열고 닫는다.
- 페이지별/카테고리별/유형별 개선 요청을 저장한다.
- 대표/본부장은 AI 정리, GitHub Issue 생성, 상태 변경을 할 수 있다.

테이블:

```sql
public.improvement_requests
```

주요 상태:

- `open`
- `reviewing`
- `planned`
- `done`
- `dismissed`

API:

- `api/improvement-summarize.js`
- `api/improvement-github-issue.js`

## 6. DB 주요 테이블

- `departments`
- `people`
- `page_permissions`
- `payment_cards`
- `expense_categories`
- `business_projects`
- `expense_requests`
- `review_items`
- `improvement_requests`
- `compensation_reviews`
- `bonus_payments`
- `project_labor_allocations`
- `cash_snapshots`
- `financial_monthly_plans`

전체 스키마 적용:

```sql
supabase/schema.sql
```

초기화용:

```sql
supabase/reset_schema.sql
```

신규 기능 마이그레이션:

```sql
supabase/migrations/202607130001_improvement_requests.sql
```

## 7. 디자인 기준

- 한국어 업무용 대시보드다.
- 토스/노션처럼 간결하고 숫자가 먼저 보이게 만든다.
- 너무 큰 카드, 불필요한 여백, 설명문 과다는 피한다.
- 중요한 숫자는 상단에 배치한다.
- 숫자는 잘리지 않게 하고, 모든 금액은 쉼표를 넣는다.
- 페이지별로 디자인 톤이 다르면 기존 경영대시보드 카드 스타일에 맞춘다.
- 버튼은 나란히 놓고, 액션 위치는 사용 흐름 가까이에 둔다.
- 카드 안에 카드가 중첩되지 않게 한다.
- 모바일에서도 텍스트가 한 글자씩 세로로 떨어지면 안 된다.

## 8. Claude에 맡길 때 추천 작업 방식

Claude에 같은 GitHub 계정을 연결해도 된다. 다만 아래 원칙을 지킨다.

1. GitHub OAuth 또는 GitHub App 방식으로 연결한다.
2. SSH private key는 Claude나 웹 서비스에 붙여넣지 않는다.
3. 가능하면 Claude 작업 브랜치를 따로 만든다.
   - 예: `claude/finance-ui`
4. Codex와 Claude가 같은 파일을 동시에 고치지 않게 한다.
5. 작업 전 항상 최신 `main`을 pull 한다.
6. 큰 기능은 PR로 비교하고, 바로 main에 밀지 않는다.
7. Vercel 배포 전 `npm run build`를 통과시킨다.

Claude에게 줄 수 있는 짧은 지시문:

```text
이 레포는 LUPL 경영대시보드입니다. docs/management-dashboard-claude-brief.md를 먼저 읽고, 현재 코드 구조를 유지하면서 요청된 화면/기능만 수정하세요. 더미 데이터는 쓰지 말고 Supabase 스키마 기준으로 구현하세요. 작업은 별도 브랜치에서 하고 npm run build를 통과시킨 뒤 변경 요약을 주세요.
```

## 9. 주의사항

- Supabase free plan은 자동 백업/PITR이 제한적이다.
- 영수증 파일은 Supabase Storage에 저장되며, DB 백업만으로 파일 복구가 보장되지 않는다.
- 장기적으로는 Supabase 운영 + AWS S3 불변 백업 조합을 권장한다.
- 관리자 기능, Edge Function, AI API는 server-side에서만 민감키를 사용해야 한다.
- 브라우저 localStorage는 임시 백업 용도로만 사용한다.
