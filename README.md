# 런디캐스트 콘솔 (laundrycast-console)

빨래 건조 예보 앱 **런디캐스트**를 운영하는 관리자 웹. React + TypeScript + Vite, 데이터는 Supabase(RLS).
배포: GitHub Pages — `https://kwakkit.github.io/laundrycast-console/`

| 화면 | 하는 일 | 표 · 함수 |
|---|---|---|
| 대시보드 | 예측 정확도(오차 · 피드백률) · 활성 기기 · 수집 격자 · 기상청 호출 대 한도 · 날씨 API · 푸시 · 이벤트 · 지역/언어별 사용자 | `lc_console_overview()` (집계만) |
| 공지 | 앱 오늘 화면 맨 위 배너. 게시 기간(한국 시각) | `lc_notices` |
| 원격 설정 | 버전 체크(`min_version` · `latest_version`) 등 — 앱은 시작할 때 읽음 | `lc_app_config` |
| 제보함 | 앱 설정 > 문의·오류 제보. 상태 · 관리자 메모 | `lc_feedback` |

## 실행

```bash
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL · VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:5173/laundrycast-console/
npm run check                # 타입 검사 + 린트 + 테스트
npm run build                # dist/
```

## 관리자 등록

콘솔 관리자는 `lc_admins` 표에 있는 계정만(하차각 콘솔 관리자와 별개).

1. Supabase 대시보드 → Authentication → Users → **Add user**(이메일 · 비밀번호, Auto Confirm).
2. SQL Editor 에서:
   ```sql
   insert into public.lc_admins (user_id)
   select id from auth.users where email = 'YOUR_EMAIL';
   ```

## 배포 (GitHub Pages)

`main` 에 push 하면 `.github/workflows/deploy.yml` 이 검사 → 빌드 → Pages 배포.
처음 한 번: 저장소 Settings → Pages → Source **GitHub Actions**, Settings → Secrets and variables → Actions →
**Variables** 에 `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 보안

- 키는 Publishable key 만. **secret(service_role) key 는 어디에도 넣지 않는다** — 권한은 전부 DB RLS.
- 앱 사용자(익명 로그인)도 같은 Supabase 프로젝트를 쓴다 → 콘솔은 로그인 뒤 `lc_is_admin()` 으로 한 번 더 막고,
  실제 권한은 RLS(`lc_is_admin()`)가 막는다. 대시보드는 집계 함수만 불러 원본 기기 행이 화면으로 오지 않는다.
- 정확한 위치는 없다 — 지역은 미세먼지 권역(시·도 수준) 집계, 제보의 기기 id 는 앱이 만든 랜덤 UUID.
