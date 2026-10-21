# 런디캐스트 콘솔 (laundrycast-console)

런디캐스트(`../laundrycast/`) 운영용 관리자 웹. React 18 + TypeScript + Vite, Supabase(`@supabase/supabase-js`).
하차각 콘솔과는 **별개**(표 · 관리자 모두 따로). 실행 · 배포 · 관리자 등록은 [README.md](README.md).

## 현재 상태 (2026-10-21)

- 로그인(이메일/비밀번호) → `lc_is_admin()` 확인 → 대시보드 · 공지 · 원격 설정 · 제보함. 라이트/다크, 좁은 화면(390px) 확인.
- 실 Supabase 로 종단 확인: 콘솔에서 만든 공지를 앱(익명 키)이 읽음, 앱 제보를 콘솔에서 처리.
- 남은 일: GitHub 저장소 · Pages 첫 배포, 실제 관리자 계정 등록(README "관리자 등록").

## 구조

- `src/lib/supabase.ts` — 클라이언트(`VITE_*` 빌드 주입). `src/lib/api.ts` — **Supabase 호출은 여기에만**.
- `src/lib/types.ts`(DB 행 · `Overview`) · `src/lib/format.ts`(한국 시각 · 라벨 · 계산, `format.test.ts`) · `src/lib/useAsync.ts`.
- `src/components/` — `AsyncView`(로딩·오류·다시 시도) · `DataTable` · `StatTile` · `Meter` · `Section` · `EmptyState` · `ThemeToggle`.
- `src/pages/` — `DashboardPage` · `NoticesPage` · `ConfigPage` · `FeedbackPage` · `LoginPage`. 화면 전환은 해시(`#/notices`) — 라우터 없음.
- `src/index.css` — 색 토큰(`:root` 라이트, `prefers-color-scheme` · `[data-theme]` 다크). 앱과 같은 브랜드 색(라이트 `#1F6FD1`, 다크 `#4DB2FF`) · Noto Sans KR.

## 데이터 (공유 Supabase 프로젝트 `kwakkit`, ref `xsbdwhbrrvmdmpgzjdnm`)

- 표: `lc_notices` · `lc_app_config` · `lc_feedback` · `lc_events` · `lc_admins`, 집계 `lc_console_overview(p_days)` — 0017.
- **마이그레이션은 이 저장소에 두지 않는다** — 공유 DB 이력은 `../hachagak-console/supabase/migrations/` 한 곳(0017 이 이 콘솔용).
  스키마를 바꾸려면 거기에 새 파일 + `supabase db push`.
- 시각: DB 는 UTC, 화면은 Asia/Seoul(한국 단계). 집계 하루 경계도 Asia/Seoul.

## 규칙

- 명령: `npm run check`(tsc + eslint + vitest)를 커밋 전 통과. `npm run build` 는 `base: '/laundrycast-console/'`.
- 키는 `.env.local`(git 제외) · GitHub Actions **Variables**. secret key 금지.
- 색은 의미 있는 곳에만 — 주 동작 · 막대는 primary, 상태색(warn · danger)은 상태에만 + 글자/기호를 함께(색만으로 전달 금지).
  숫자 열은 `td.num`(오른쪽 · tabular-nums), 대표 숫자는 화면당 하나(`.hero`).
- 대시보드에 원본 행(기기 · 빨래)을 가져오지 말 것 — 필요한 지표는 `lc_console_overview` 에 집계로 추가.
