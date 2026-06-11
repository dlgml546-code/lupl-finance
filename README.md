# LUPL 경영관리 대시보드 Working Version

이번 버전은 노션 연동을 제외하고, Supabase 기준으로 실제 저장·조회·수정이 작동하도록 만든 버전입니다.

## 실제 작동하는 기능

- Supabase Auth 로그인/회원가입
- 첫 번째 가입자 자동 `대표` 등록
- 직원 정보 등록
- 이메일 기준 직원 초대/연결
- 페이지별 권한 설정
- 경영현황 데이터 조회
- 대표 검토함 조회 및 승인/보류/수정요청 처리
- 지출결의 등록
- 영수증 파일 Supabase Storage 업로드
- OCR Edge Function 연동 코드 포함
- 사업·매출 프로젝트 생성
- 프로젝트별 매출·비용·순이익·마진율 조회
- 직원별 연봉/인건비 상세
- 상여금·성과보상 등록
- 프로젝트별 맨먼스 등록
- 프로젝트별 직위 투입률 그래프
- 조직도/권한관리

## 아직 제외한 것

- Notion 연동

## 1. Supabase SQL 실행

Supabase Dashboard → SQL Editor에서 아래 파일을 전체 실행합니다.

```text
supabase/schema.sql
```

## 2. Supabase Auth 설정

Supabase Dashboard → Authentication → Providers → Email 활성화

개발 중에는 이메일 인증을 끄면 바로 로그인 테스트가 편합니다.

```text
Authentication
→ Providers
→ Email
→ Confirm email 끄기
```

## 3. Supabase Edge Function 배포

OCR까지 쓰려면 Supabase CLI에서 실행합니다.

```bash
supabase functions deploy receipt-ocr
```

그리고 Secret을 넣습니다.

```bash
supabase secrets set OPENAI_API_KEY=본인_OPENAI_API_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=본인_SUPABASE_SERVICE_ROLE_KEY
supabase secrets set OCR_MODEL=gpt-4o-mini
```

OCR을 당장 안 쓸 거면 이 단계는 건너뛰어도 지출결의 저장과 파일 업로드는 됩니다.

## 4. Vercel 환경변수

Vercel → Project → Settings → Environment Variables

```text
VITE_SUPABASE_URL=Supabase Project URL
VITE_SUPABASE_ANON_KEY=Supabase anon public key
```

이번 버전은 데모모드가 없습니다.
환경변수를 넣어야 실제 작동합니다.

## 5. GitHub/Vercel 배포

```bash
npm install
npm run build
```

Vercel 설정:

```text
Build Command: npm run build
Output Directory: dist
```

## 6. 첫 로그인

첫 번째로 가입/로그인하는 계정은 자동으로 `대표` 권한이 됩니다.
그 이후 직원은 조직·권한관리에서 이메일로 직원 정보를 먼저 등록한 뒤, 해당 이메일로 로그인하면 연결됩니다.

## 7. 권한 구조

대표와 본부장은 기본 전체 접근입니다.
책임/선임/매니저는 `page_permissions`에 등록된 페이지를 볼 수 있습니다.
