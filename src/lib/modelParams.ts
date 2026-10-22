import { fabricLabel, placeLabel } from './format';
import type { Fabric, Place } from './types';

// lc_model_params.params(jsonb) 를 화면 입력칸으로 풀고, 검사해서 다시 jsonb 로 묶는다.
// 앱(ModelParams.paramsOf)과 Edge Function(withDefaults)은 빠진 키를 기본값으로 채운다 — 여기서도 같게 보여 준다.

export type ParamKey =
  | `place_factor.${Place}`
  | `theta.${Fabric}`
  | 'rain_prob_threshold'
  | 'day_end_hour'
  | 'earliest_hang_hour'
  | 'latest_hang_hour';

export interface ParamField {
  key: ParamKey;
  group: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  integer: boolean;
  /** 앱 ModelParams.fallback 과 같은 값 — 서버 값을 못 받았을 때 앱이 쓰는 추정치. */
  fallback: number;
  help?: string;
}

const PLACES: Place[] = ['outdoor', 'balcony', 'indoor'];
const FABRICS: Fabric[] = ['thin', 'normal', 'thick'];

// 앱 lib/core/drying/model_params.dart `ModelParams.fallback`(2026-10-20 θ 임시 조정 반영)과 맞춘다.
const FALLBACK_PLACE: Record<Place, number> = { outdoor: 1.0, balcony: 0.5, indoor: 0.2 };
const FALLBACK_THETA: Record<Fabric, number> = { thin: 0.3, normal: 0.5, thick: 0.8 };

export const PARAM_FIELDS: ParamField[] = [
  ...PLACES.map((p): ParamField => ({
    key: `place_factor.${p}`, group: '장소계수 k', label: placeLabel[p], unit: '×',
    min: 0, max: 1.5, step: 0.05, integer: false, fallback: FALLBACK_PLACE[p],
    help: 'ET0 에 곱하는 값',
  })),
  ...FABRICS.map((f): ParamField => ({
    key: `theta.${f}`, group: '마름 기준 θ', label: fabricLabel[f], unit: 'mm',
    min: 0.1, max: 5, step: 0.05, integer: false, fallback: FALLBACK_THETA[f],
    help: '누적 ET0 × k 가 이 값에 닿으면 마름',
  })),
  {
    key: 'rain_prob_threshold', group: '비 · 시간', label: '비 확률 기준', unit: '%',
    min: 0, max: 100, step: 5, integer: true, fallback: 50, help: '이 강수확률 이상이면 비로 봄',
  },
  {
    key: 'day_end_hour', group: '비 · 시간', label: '하루 마감', unit: '시',
    min: 0, max: 23, step: 1, integer: true, fallback: 21, help: '이때까지 안 마르면 "오늘은 안 말라요"',
  },
  {
    key: 'earliest_hang_hour', group: '비 · 시간', label: '널기 탐색 시작', unit: '시',
    min: 0, max: 23, step: 1, integer: true, fallback: 6,
  },
  {
    key: 'latest_hang_hour', group: '비 · 시간', label: '널기 탐색 끝', unit: '시',
    min: 0, max: 23, step: 1, integer: true, fallback: 18,
  },
];

export type ParamValues = Record<ParamKey, number>;
type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function getPath(params: Json, key: ParamKey): unknown {
  const [a, b] = key.split('.');
  if (b === undefined) return params[a];
  const inner = params[a];
  return isObj(inner) ? inner[b] : undefined;
}

/** 서버에 실제로 있는 값(숫자만). 없으면 undefined — 앱은 이때 기본값을 쓴다. */
export function storedValue(params: Json, key: ParamKey): number | undefined {
  const v = getPath(params, key);
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** 앱이 실제로 쓰는 값 — 서버 값, 없으면 기본값. */
export function effectiveValues(params: Json): ParamValues {
  const out = {} as ParamValues;
  for (const f of PARAM_FIELDS) out[f.key] = storedValue(params, f.key) ?? f.fallback;
  return out;
}

export interface Validation {
  values: ParamValues | null;
  /** 칸별 오류 — 있으면 저장 안 됨. */
  errors: Partial<Record<ParamKey, string>>;
  /** 저장은 되지만 확인이 필요한 것(모델상 어색한 순서 등). */
  warnings: string[];
}

/** 입력 문자열 → 숫자 · 범위 · 서로의 관계 검사. */
export function validateParams(inputs: Record<ParamKey, string>): Validation {
  const errors: Validation['errors'] = {};
  const values = {} as ParamValues;
  for (const f of PARAM_FIELDS) {
    const raw = inputs[f.key].trim();
    const n = Number(raw);
    if (raw === '' || !Number.isFinite(n)) errors[f.key] = '숫자를 넣어 주세요.';
    else if (f.integer && !Number.isInteger(n)) errors[f.key] = '정수여야 합니다.';
    else if (n < f.min || n > f.max) errors[f.key] = `${f.min}~${f.max} 사이여야 합니다.`;
    else values[f.key] = n;
  }
  const has = (...ks: ParamKey[]) => ks.every((k) => values[k] !== undefined);
  if (has('earliest_hang_hour', 'latest_hang_hour') && values.earliest_hang_hour >= values.latest_hang_hour) {
    errors.latest_hang_hour = '탐색 끝은 시작보다 뒤여야 합니다.';
  }
  if (has('latest_hang_hour', 'day_end_hour') && values.latest_hang_hour >= values.day_end_hour) {
    errors.day_end_hour = '하루 마감은 널기 탐색 끝보다 뒤여야 합니다.';
  }

  const warnings: string[] = [];
  const pf = (p: Place) => values[`place_factor.${p}`];
  const th = (f: Fabric) => values[`theta.${f}`];
  if (PLACES.every((p) => pf(p) !== undefined) && !(pf('outdoor') >= pf('balcony') && pf('balcony') >= pf('indoor'))) {
    warnings.push('장소계수가 야외 ≥ 베란다 ≥ 실내 순서가 아닙니다.');
  }
  if (FABRICS.every((f) => th(f) !== undefined) && !(th('thin') <= th('normal') && th('normal') <= th('thick'))) {
    warnings.push('θ 가 얇은 옷 ≤ 보통 ≤ 두꺼운 옷 순서가 아닙니다.');
  }

  return { values: Object.keys(errors).length === 0 ? values : null, errors, warnings };
}

/** 새 값을 기존 params 위에 덮는다 — 화면이 모르는 키(앞으로 추가될 것)는 그대로 둔다. */
export function mergeParams(params: Json, values: ParamValues): Json {
  const out: Json = { ...params };
  for (const f of PARAM_FIELDS) {
    const [a, b] = f.key.split('.');
    if (b === undefined) out[a] = values[f.key];
    else out[a] = { ...(isObj(out[a]) ? out[a] : {}), [b]: values[f.key] };
  }
  return out;
}

/** 저장 확인용 — 서버 값(없으면 기본값)과 달라진 칸. */
export function changedFields(params: Json, values: ParamValues): { field: ParamField; from: number; to: number }[] {
  const before = effectiveValues(params);
  return PARAM_FIELDS.filter((f) => before[f.key] !== values[f.key]).map((f) => ({
    field: f,
    from: before[f.key],
    to: values[f.key],
  }));
}
