# LUPL 경영관리 대시보드

러플 경영관리 대시보드 최종 개발용 프로젝트입니다.

## 포함 기능

- 경영현황
- 대표 검토함
- 지출결의
- 사업·매출관리
- 인건비·보상
- 인력투입·매출분석
- 조직·권한관리
- Supabase DB 스키마
- Vercel 배포 설정

## 배포 순서

### 1. GitHub 업로드

압축을 풀고 폴더 전체를 GitHub 저장소에 업로드합니다.

### 2. Supabase 설정

Supabase 프로젝트를 만들고 SQL Editor에서 아래 파일을 실행합니다.

```text
supabase/schema.sql
```

### 3. Vercel 배포

Vercel에서 GitHub 저장소를 Import합니다.

Build Command:

```text
npm run build
```

Output Directory:

```text
dist
```

### 4. 환경변수 설정

Vercel Project Settings → Environment Variables에 아래 값을 추가합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_USE_DEMO_MODE
```

처음 확인용으로는 아래처럼 둬도 됩니다.

```text
VITE_USE_DEMO_MODE=true
```

Supabase Auth를 실제로 붙일 때는 `false`로 바꾸면 됩니다.

## 권한 구조

기본 지휘체계는 아래 기준입니다.

```text
대표 → 본부장 → 책임 → 선임 → 매니저
```

페이지별 권한은 Supabase 테이블 `page_permissions`에서 관리합니다.

- 보기만 가능
- 입력 가능
- 승인 가능
- 관리자

## 다음 개발 단계

1. Supabase Auth 로그인 연결
2. 지출결의 파일 업로드 Storage 연결
3. 영수증 OCR Edge Function 연결
4. Notion 지출결의 DB 단방향 가져오기
5. 대표 검토함 승인/보류/수정요청 실제 저장
