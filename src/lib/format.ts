import type { Fabric, FeedbackCategory, FeedbackStatus, Place } from './types';

// 콘솔의 시각은 모두 한국 시각(Asia/Seoul) — 한국 단계. DB 는 UTC.
export const TZ = 'Asia/Seoul';
const KST_OFFSET_MIN = 9 * 60;

const num = new Intl.NumberFormat('ko-KR');
export const formatNumber = (n: number) => num.format(n);

/** ISO → "10.21 14:05" (한국 시각). */
export function formatDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TZ, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}

/** "2026-10-21" → "10.21 (화)". */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const wd = '일월화수목금토'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} (${wd})`;
}

/** 분 → "1시간 12분" / "38분". null → "—". */
export function formatMinutes(min: number | null | undefined): string {
  if (min == null || Number.isNaN(min)) return '—';
  const m = Math.round(min);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h}시간` : `${h}시간 ${m % 60}분`;
}

export function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

/** `<input type="datetime-local">` 값(한국 시각으로 해석) → ISO(UTC). 빈 값 → null. */
export function kstInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - KST_OFFSET_MIN * 60_000).toISOString();
}

/** ISO → `<input type="datetime-local">` 값(한국 시각). */
export function isoToKstInput(iso: string): string {
  const t = new Date(new Date(iso).getTime() + KST_OFFSET_MIN * 60_000);
  return t.toISOString().slice(0, 16);
}

export const isSemver = (v: string) => /^\d+\.\d+\.\d+$/.test(v);

/** 게시 상태 — 지금 기준. */
export function noticeState(startsAt: string, endsAt: string | null, now = new Date()): 'scheduled' | 'live' | 'ended' {
  if (new Date(startsAt) > now) return 'scheduled';
  if (endsAt && new Date(endsAt) <= now) return 'ended';
  return 'live';
}

/** 기상청 호출 한도 대비 상태 — 70% 주의, 90% 위험. */
export function quotaLevel(used: number, cap: number): 'ok' | 'warn' | 'danger' {
  const r = cap > 0 ? used / cap : 0;
  return r >= 0.9 ? 'danger' : r >= 0.7 ? 'warn' : 'ok';
}

/** 시각을 기록한 피드백 수로 가중한 전체 MAE(분). 없으면 null. */
export function overallMae(rows: { timed: number; mae_min: number | null }[]): number | null {
  let n = 0;
  let sum = 0;
  for (const r of rows) {
    if (r.mae_min == null || r.timed <= 0) continue;
    n += r.timed;
    sum += r.mae_min * r.timed;
  }
  return n === 0 ? null : sum / n;
}

export const placeLabel: Record<Place, string> = { outdoor: '야외', balcony: '베란다', indoor: '실내' };
export const fabricLabel: Record<Fabric, string> = { thin: '얇은 옷', normal: '보통', thick: '두꺼운 옷' };
export const statusLabel: Record<FeedbackStatus, string> = { new: '새 제보', checking: '확인 중', done: '완료' };
export const categoryLabel: Record<FeedbackCategory, string> = { bug: '오류', idea: '제안', etc: '기타' };

const pushKinds: Record<string, string> = { morning: '아침', rain: '비 경고', eta_change: '예상 변경', dry: '마름' };
export const pushKindLabel = (k: string) => pushKinds[k] ?? k;

const providers: Record<string, string> = { kma: '기상청', airkorea: '에어코리아' };
export const providerLabel = (p: string) => providers[p] ?? p;

const fetchKinds: Record<string, string> = {
  vilage: '단기예보', getMidLandFcst: '중기 육상', getMidTa: '중기 기온', PM10: '미세먼지', PM25: '초미세먼지',
};
export const fetchKindLabel = (k: string) => fetchKinds[k] ?? k;

const events: Record<string, string> = {
  onboarding_done: '온보딩 완료', push_opened: '알림 열기', notification_permission: '알림 권한 응답',
};
export const eventLabel = (n: string) => events[n] ?? n;

const locales: Record<string, string> = { ko: '한국어', en: 'English', ja: '日本語' };
export const localeLabel = (l: string) => locales[l] ?? l;
