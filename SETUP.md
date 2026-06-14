# LUPL Finance v3 — 적용 가이드

## 1. 코드 배포
이 폴더 전체를 GitHub 레포에 덮어쓰고 푸시하면 Vercel이 자동 배포합니다.
(package-lock.json은 정상 레지스트리로 새로 생성됨 → 빌드 오류 없음)

## 2. DB 스키마 적용 (중요)
Supabase 대시보드 → SQL Editor에서 `supabase/schema.sql` 전체를 실행하세요.
- 기존 더미 데이터가 들어간 테이블이 있으면, 컬럼 구조가 바뀌었으므로
  business_projects / expense_requests 테이블은 비우거나 새로 만드는 걸 권장합니다.
- 새로 추가된 테이블: payment_cards(결제수단), expense_categories(카테고리)
- 부서·결제수단·카테고리는 시드로 자동 입력되고, 그 외 더미 데이터는 없습니다.

## 3. 영수증 자동 인식(OCR) — 11번
영수증 OCR이 작동하려면 Supabase Edge Function에 OpenAI 키가 필요합니다.
키가 없으면 영수증은 첨부되지만 자동 인식은 건너뜁니다(앱이 안내 토스트를 띄움).

```
supabase functions deploy receipt-ocr
supabase functions deploy admin-create-user
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

## 4. 첫 로그인
첫 번째로 가입/로그인한 계정이 자동으로 '대표'가 됩니다.
이후 조직·권한관리에서 직원을 사번 기준으로 추가하고 직급/부서를 배정하세요. 직원 초기 비밀번호는 lupl+휴대전화 뒷번호 4자리입니다.
