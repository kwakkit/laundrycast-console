# 런디캐스트 콘솔 (laundrycast-console)

런디캐스트(`../laundrycast/`) 운영용 관리자 웹. React 18 + TypeScript + Vite, Supabase(`@supabase/supabase-js`).
하차각 콘솔과는 **별개**(표 · 관리자 모두 따로). 실행 · 배포 · 관리자 등록은 [README.md](README.md).

## 현재 상태 (2026-10-22)

- 로그인(이메일/비밀번호) → `lc_is_admin()` 확인 → 대시보드 · 공지 · 원격 설정 · 건조 모델 · 제보함. 라이트/다크, 좁은 화면(390px) 확인.
- 실 Supabase 로 종단 확인: 콘솔에서 만든 공지를 앱(익명 키)이 읽음, 앱 제보를 콘솔에서 처리.
- 배포됨(2026-10-21): GitHub `kwakkit/laundrycast-console`(공개) → Actions → https://kwakkit.github.io/laundrycast-console/ .
  저장소 변수 `VITE_SUPABASE_URL`·`VITE_SUPABASE_PUBLISHABLE_KEY` 설정됨.
- 2026-10-22: Actions 를 Node 24 대응 메이저로(checkout · setup-node v7, upload-pages-artifact · deploy-pages v5, Node 22) ·
  건조 모델 화면 · 공지 배너 미리보기 · 화면 테스트(RTL + jsdom). **건조 모델 저장은 화면에서 미확인**(DB 권한은 확인됨).
- 실행: VS Code "런디캐스트 콘솔 (Chrome)"(F5 — dev 서버를 띄우고 Chrome 으로 엶) 또는 `npm run dev`.

## 다음 할 일 (2026-10-22 기준, 위에서부터)

1. **배포본 로그인 확인** — 관리자 등록됨(2026-10-22, 하차각 콘솔 관리자와 같은 계정을 `lc_admins` 에 추가 ·
   DB 에서 그 사용자로 `lc_is_admin()` true · `lc_model_params` 쓰기 RLS 통과 확인). 남은 것: Pages 에서 실제 로그인 ·
   건조 모델 저장 한 번(같은 값으로 되돌려 둠). 관리자 추가는 `insert into public.lc_admins (user_id) select id from auth.users
   where email = '…'`(마이그레이션 저장소에서 `supabase db query --linked`).
2. **Actions 경고 사라졌는지** — 푸시 뒤 첫 배포 실행 로그에서 Node 20 경고가 없는지 확인.
3. (앱 FCM 이후) 대시보드 푸시 표 · 이벤트 `push_opened`/`notification_permission` 이 실제로 채워지는지 확인.
4. (v1 피드백 보정 때) 자동 보정이 `lc_model_params` 를 쓰면 `fitted_at` · `n_samples` 를 채울 것 — 콘솔에서 손으로 저장하면
   `fitted_at` 을 비운다(0011 임시 조정과 같은 뜻: "보정값 아님").

## 구조

- `src/lib/supabase.ts` — 클라이언트(`VITE_*` 빌드 주입). `src/lib/api.ts` — **Supabase 호출은 여기에만**.
- `src/lib/types.ts`(DB 행 · `Overview`) · `src/lib/format.ts`(한국 시각 · 라벨 · 계산, `format.test.ts`) · `src/lib/useAsync.ts`.
- `src/lib/modelParams.ts` — 건조 모델 칸 정의 · 범위 검사 · 병합(모르는 키 보존). 기본값은 앱 `ModelParams.fallback` 과 **손으로 맞춘다**
  (앱 · Edge Function `DEFAULT_PARAMS` 를 바꾸면 여기도).
- `src/components/` — `AsyncView`(로딩·오류·다시 시도) · `DataTable` · `StatTile` · `Meter` · `Section` · `EmptyState` · `ThemeToggle`.
- `src/pages/` — `DashboardPage` · `NoticesPage` · `ConfigPage` · `ModelPage` · `FeedbackPage` · `LoginPage`. 화면 전환은 해시(`#/notices`) — 라우터 없음.
- 테스트: `src/lib/*.test.ts`(node) · `src/App.test.tsx` · `src/pages/pages.test.tsx`(파일 첫 줄 `// @vitest-environment jsdom`,
  `../lib/api` 를 `vi.mock` 으로 갈아 끼움 — 실 Supabase 안 부름).
- `src/index.css` — 색 토큰(`:root` 라이트, `prefers-color-scheme` · `[data-theme]` 다크). 앱과 같은 브랜드 색(라이트 `#1F6FD1`, 다크 `#4DB2FF`) · Noto Sans KR.

## 데이터 (공유 Supabase 프로젝트 `kwakkit`, ref `xsbdwhbrrvmdmpgzjdnm`)

- 표: `lc_notices` · `lc_app_config` · `lc_feedback` · `lc_events` · `lc_admins`, 집계 `lc_console_overview(p_days)` — 0017.
  `lc_model_params`(0005, 관리자 쓰기 RLS 는 0017) — 앱은 예보 받을 때, `lc-send-push` 는 실행마다 읽는다.
- **마이그레이션은 이 저장소에 두지 않는다** — 공유 DB 이력은 `../hachagak-console/supabase/migrations/` 한 곳(0017 이 이 콘솔용).
  스키마를 바꾸려면 거기에 새 파일 + `supabase db push`.
- 시각: DB 는 UTC, 화면은 Asia/Seoul(한국 단계). 집계 하루 경계도 Asia/Seoul.

## 규칙

- 명령: `npm run check`(tsc + eslint + vitest)를 커밋 전 통과. `npm run build` 는 `base: '/laundrycast-console/'`.
- 키는 `.env.local`(git 제외) · GitHub Actions **Variables**. secret key 금지.
- 색은 의미 있는 곳에만 — 주 동작 · 막대는 primary, 상태색(warn · danger)은 상태에만 + 글자/기호를 함께(색만으로 전달 금지).
  숫자 열은 `td.num`(오른쪽 · tabular-nums), 대표 숫자는 화면당 하나(`.hero`).
- 대시보드에 원본 행(기기 · 빨래)을 가져오지 말 것 — 필요한 지표는 `lc_console_overview` 에 집계로 추가.
