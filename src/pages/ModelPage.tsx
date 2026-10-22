import { Fragment, useMemo, useState } from 'react';
import { AsyncView } from '../components/AsyncView';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { fetchModelParams, updateModelParams } from '../lib/api';
import { formatDateTime, formatNumber } from '../lib/format';
import {
  PARAM_FIELDS, changedFields, effectiveValues, mergeParams, storedValue, validateParams, type ParamField,
  type ParamKey, type ParamValues,
} from '../lib/modelParams';
import type { ModelParamsRow } from '../lib/types';
import { useAsync } from '../lib/useAsync';

/** 건조 모델 파라미터 — 앱(예보 받을 때)과 알림 계산(Edge Function, 매번)이 서버 값을 읽는다. v1 피드백 보정의 손잡이. */
export function ModelPage() {
  const state = useAsync(fetchModelParams, []);
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Drying model · lc_model_params</p>
          <h1>건조 모델</h1>
        </div>
      </header>
      <div className="panel note">
        <strong>주의</strong> — 저장하면 알림(서버)은 다음 실행부터, 앱은 다음에 예보를 새로 받을 때(앱을 다시 열거나 새로고침 — 켜 둔 채면 늦어도 1시간 안)부터 씁니다. 정확도(대시보드 오차)를
        보고 조금씩 바꾸세요. 널기 탐색 범위는 앱만 씁니다.
      </div>
      <AsyncView state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState message="모델 파라미터 행이 없습니다. scope 추가는 마이그레이션으로만." />
          ) : (
            <div className="stack">
              {rows.map((r) => (
                // 저장 뒤 다시 읽으면 updated_at 이 바뀌어 입력칸이 서버 값으로 새로 채워진다.
                <ParamsEditor key={`${r.scope}@${r.updated_at}`} row={r} onSaved={state.reload} />
              ))}
            </div>
          )
        }
      </AsyncView>
    </>
  );
}

const fmt = (f: ParamField, v: number) => `${v}${f.unit === '×' ? '' : ` ${f.unit}`}`;

function toInputs(values: ParamValues): Record<ParamKey, string> {
  const out = {} as Record<ParamKey, string>;
  for (const f of PARAM_FIELDS) out[f.key] = String(values[f.key]);
  return out;
}

function ParamsEditor({ row, onSaved }: { row: ModelParamsRow; onSaved: () => void }) {
  const server = useMemo(() => effectiveValues(row.params), [row.params]);
  const [inputs, setInputs] = useState(() => toInputs(server));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const check = validateParams(inputs);
  const changes = check.values ? changedFields(row.params, check.values) : [];
  const dirty = PARAM_FIELDS.some((f) => inputs[f.key].trim() !== String(server[f.key]));

  function set(key: ParamKey, v: string) {
    setInputs((s) => ({ ...s, [key]: v }));
    setMsg(null);
  }

  function fill(values: ParamValues) {
    setInputs(toInputs(values));
    setMsg(null);
  }

  async function save() {
    if (!check.values || changes.length === 0) return;
    const lines = changes.map((c) => `· ${c.field.group} ${c.field.label}: ${fmt(c.field, c.from)} → ${fmt(c.field, c.to)}`);
    if (!confirm(`${row.scope} 모델 값을 바꿀까요? 앱 · 알림 계산에 바로 쓰입니다.\n\n${lines.join('\n')}`)) return;
    setSaving(true);
    try {
      await updateModelParams(row.scope, mergeParams(row.params, check.values));
      setMsg({ ok: true, text: '저장했습니다.' });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  const fallbackValues = Object.fromEntries(PARAM_FIELDS.map((f) => [f.key, f.fallback])) as ParamValues;

  return (
    <section className="section">
      <div className="card-head">
        <code className="key">{row.scope}</code>
        <span className="muted small">수정 {formatDateTime(row.updated_at)}</span>
        <span className="muted small">
          {row.fitted_at
            ? `피드백 보정 ${formatDateTime(row.fitted_at)} · 표본 ${formatNumber(row.n_samples)}`
            : '보정 전(손으로 정한 값)'}
        </span>
      </div>
      <DataTable head={['항목', '앱 기본값', '서버 값', '새 값']} numeric={[1, 2]} hideNarrow={[1]}>
        {PARAM_FIELDS.map((f, i) => {
          const stored = storedValue(row.params, f.key);
          const err = check.errors[f.key];
          return (
            <Fragment key={f.key}>
              {(i === 0 || PARAM_FIELDS[i - 1].group !== f.group) && (
                <tr className="group-row">
                  <th scope="rowgroup" colSpan={4}>
                    {f.group}
                  </th>
                </tr>
              )}
              <tr>
                <td className="wrap">
                  {f.label} <span className="muted small">({f.unit})</span>
                  {f.help && <div className="muted small">{f.help}</div>}
                  <div className="muted small show-narrow">앱 기본값 {f.fallback}</div>
                </td>
                <td className="num hide-narrow">{f.fallback}</td>
                <td className="num wrap-narrow">
                  {stored === undefined ? (
                    <span className="muted small">없음 · 기본값 씀</span>
                  ) : (
                    <>
                      {stored !== f.fallback && <span className="pill">기본과 다름</span>} {stored}
                    </>
                  )}
                </td>
                <td className="input-cell">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={inputs[f.key]}
                    aria-label={`${f.group} ${f.label} 새 값`}
                    aria-invalid={err ? true : undefined}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                  <div className={`small ${err ? 'text-danger' : 'muted'}`}>
                    {err ?? `${f.min}~${f.max}`}
                  </div>
                </td>
              </tr>
            </Fragment>
          );
        })}
      </DataTable>
      {check.warnings.length > 0 && (
        <div className="panel note" role="status">
          <strong>확인</strong> — {check.warnings.join(' ')}
        </div>
      )}
      <div className="card-actions wrap-actions">
        <span className="muted small grow" role="status">
          {msg ? (
            <span className={msg.ok ? 'text-ok' : 'text-danger'}>{msg.text}</span>
          ) : changes.length > 0 ? (
            `바뀐 값 ${changes.length}개`
          ) : (
            ''
          )}
        </span>
        <button className="btn" onClick={() => fill(fallbackValues)}>
          앱 기본값으로 채우기
        </button>
        <button className="btn" onClick={() => fill(server)} disabled={!dirty}>
          되돌리기
        </button>
        <button className="btn primary" onClick={save} disabled={saving || !check.values || changes.length === 0}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </section>
  );
}
