import { describe, expect, it } from 'vitest';
import {
  formatDay, formatMinutes, formatPercent, isoToKstInput, isSemver, kstInputToIso, noticeState, overallMae, quotaLevel,
} from './format';

describe('format', () => {
  it('한국 시각 입력 ↔ UTC ISO', () => {
    expect(kstInputToIso('2026-10-21T09:00')).toBe('2026-10-21T00:00:00.000Z');
    expect(kstInputToIso('2026-10-21T08:30')).toBe('2026-10-20T23:30:00.000Z');
    expect(kstInputToIso('')).toBeNull();
    expect(isoToKstInput('2026-10-20T23:30:00.000Z')).toBe('2026-10-21T08:30');
  });

  it('날짜 · 분 · 비율', () => {
    expect(formatDay('2026-10-21')).toBe('10.21 (수)');
    expect(formatMinutes(38.4)).toBe('38분');
    expect(formatMinutes(72)).toBe('1시간 12분');
    expect(formatMinutes(120)).toBe('2시간');
    expect(formatMinutes(null)).toBe('—');
    expect(formatPercent(1, 3)).toBe('33%');
    expect(formatPercent(1, 0)).toBe('—');
  });

  it('공지 상태 · 호출 한도 · 버전 형식', () => {
    const now = new Date('2026-10-21T00:00:00Z');
    expect(noticeState('2026-10-22T00:00:00Z', null, now)).toBe('scheduled');
    expect(noticeState('2026-10-20T00:00:00Z', null, now)).toBe('live');
    expect(noticeState('2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', now)).toBe('ended');
    expect(quotaLevel(6000, 9000)).toBe('ok');
    expect(quotaLevel(6300, 9000)).toBe('warn');
    expect(quotaLevel(8100, 9000)).toBe('danger');
    expect(isSemver('1.0.0')).toBe(true);
    expect(isSemver('1.0')).toBe(false);
  });

  it('전체 MAE 는 시각 기록 수로 가중', () => {
    expect(overallMae([{ timed: 1, mae_min: 60 }, { timed: 3, mae_min: 20 }, { timed: 0, mae_min: null }])).toBe(30);
    expect(overallMae([])).toBeNull();
  });
});
