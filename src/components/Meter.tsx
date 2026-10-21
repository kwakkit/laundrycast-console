import { formatNumber, quotaLevel } from '../lib/format';

const levelText = { ok: '여유', warn: '주의 — 70% 넘음', danger: '위험 — 90% 넘음' } as const;

/** 한도 대비 사용량. 채움 색은 상태(여유·주의·위험), 상태는 글자로도 함께 쓴다(색만으로 전달하지 않음). */
export function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const level = quotaLevel(used, cap);
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div className="panel meter">
      <div className="meter-head">
        <span className="tile-label">{label}</span>
        <span className={`meter-state ${level}`}>{levelText[level]}</span>
      </div>
      <div className="meter-figure">
        <strong>{formatNumber(used)}</strong>
        <span className="muted"> / {formatNumber(cap)}회</span>
      </div>
      <div
        className={`meter-track ${level}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={used}
        aria-label={label}
      >
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
