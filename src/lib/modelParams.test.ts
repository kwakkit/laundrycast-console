import { describe, expect, it } from 'vitest';
import {
  PARAM_FIELDS, changedFields, effectiveValues, mergeParams, storedValue, validateParams, type ParamKey,
} from './modelParams';

// 실서버 kr 행(2026-10-22) — earliest/latest_hang_hour 는 없음(앱이 기본값을 씀).
const KR = {
  place_factor: { outdoor: 1, balcony: 0.5, indoor: 0.2 },
  theta: { thin: 0.3, normal: 0.5, thick: 0.8 },
  rain_prob_threshold: 50,
  day_end_hour: 21,
};

const inputsOf = (over: Partial<Record<ParamKey, string>> = {}) => {
  const v = effectiveValues(KR);
  const out = {} as Record<ParamKey, string>;
  for (const f of PARAM_FIELDS) out[f.key] = over[f.key] ?? String(v[f.key]);
  return out;
};

describe('modelParams', () => {
  it('빠진 키는 기본값(앱 ModelParams.fallback)으로', () => {
    expect(storedValue(KR, 'earliest_hang_hour')).toBeUndefined();
    expect(storedValue(KR, 'theta.normal')).toBe(0.5);
    const v = effectiveValues({ theta: { thin: 0.4 } });
    expect(v['theta.thin']).toBe(0.4);
    expect(v['theta.thick']).toBe(0.8);
    expect(v['place_factor.balcony']).toBe(0.5);
    expect(v.latest_hang_hour).toBe(18);
    // 숫자가 아닌 값은 없는 것으로.
    expect(storedValue({ day_end_hour: '21' }, 'day_end_hour')).toBeUndefined();
  });

  it('지금 값은 통과', () => {
    const r = validateParams(inputsOf());
    expect(r.errors).toEqual({});
    expect(r.warnings).toEqual([]);
    expect(r.values?.['theta.thick']).toBe(0.8);
  });

  it('형식 · 범위 · 정수', () => {
    const r = validateParams(
      inputsOf({ 'place_factor.outdoor': '1.6', 'theta.thin': '0.05', rain_prob_threshold: '50.5', day_end_hour: '' }),
    );
    expect(r.values).toBeNull();
    expect(r.errors['place_factor.outdoor']).toMatch('0~1.5');
    expect(r.errors['theta.thin']).toMatch('0.1~5');
    expect(r.errors.rain_prob_threshold).toMatch('정수');
    expect(r.errors.day_end_hour).toMatch('숫자');
    expect(validateParams(inputsOf({ 'theta.normal': 'abc' })).errors['theta.normal']).toBeDefined();
  });

  it('시각 순서: 탐색 시작 < 탐색 끝 < 하루 마감', () => {
    expect(validateParams(inputsOf({ earliest_hang_hour: '18' })).errors.latest_hang_hour).toBeDefined();
    expect(validateParams(inputsOf({ latest_hang_hour: '21' })).errors.day_end_hour).toBeDefined();
    expect(validateParams(inputsOf({ latest_hang_hour: '20' })).values).not.toBeNull();
  });

  it('어색한 순서는 경고만(저장 가능)', () => {
    const r = validateParams(inputsOf({ 'place_factor.indoor': '0.6', 'theta.thin': '0.9' }));
    expect(r.values).not.toBeNull();
    expect(r.warnings).toHaveLength(2);
  });

  it('저장 — 모르는 키는 보존, 빠진 키는 채움', () => {
    const params = { ...KR, future_key: { a: 1 } };
    const values = { ...effectiveValues(params), 'theta.normal': 0.6 };
    const merged = mergeParams(params, values);
    expect(merged.future_key).toEqual({ a: 1 });
    expect(merged.theta).toEqual({ thin: 0.3, normal: 0.6, thick: 0.8 });
    expect(merged.earliest_hang_hour).toBe(6);
    expect(params.theta.normal).toBe(0.5); // 원본은 그대로
  });

  it('바뀐 칸만', () => {
    const values = { ...effectiveValues(KR), 'theta.normal': 0.6, rain_prob_threshold: 60 };
    expect(changedFields(KR, values).map((c) => [c.field.key, c.from, c.to])).toEqual([
      ['theta.normal', 0.5, 0.6],
      ['rain_prob_threshold', 50, 60],
    ]);
  });
});
