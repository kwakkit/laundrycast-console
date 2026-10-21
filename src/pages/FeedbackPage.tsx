import { useState } from 'react';
import { AsyncView } from '../components/AsyncView';
import { EmptyState } from '../components/EmptyState';
import { fetchFeedback, updateFeedback } from '../lib/api';
import { categoryLabel, formatDateTime, statusLabel } from '../lib/format';
import type { FeedbackItem, FeedbackStatus } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const FILTERS: (FeedbackStatus | null)[] = ['new', 'checking', 'done', null];

/** 제보함 — 앱 설정 > 문의·오류 제보. 자동 첨부는 앱 버전·OS·기기 랜덤 UUID(서버 계정·위치와 연결되지 않음). */
export function FeedbackPage() {
  const [filter, setFilter] = useState<FeedbackStatus | null>('new');
  const state = useAsync(() => fetchFeedback(filter), [filter]);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Inbox · 문의 · 오류 제보</p>
          <h1>제보함</h1>
        </div>
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="상태">
            {FILTERS.map((f) => (
              <button key={f ?? 'all'} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f ? statusLabel[f] : '전체'}
              </button>
            ))}
          </div>
        </div>
      </header>
      <AsyncView state={state}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState message="제보가 없습니다. 앱 설정 → 문의·오류 제보로 들어옵니다." />
          ) : (
            <div className="stack">
              {items.map((item) => (
                <FeedbackCard key={item.id} item={item} onSaved={state.reload} />
              ))}
            </div>
          )
        }
      </AsyncView>
    </>
  );
}

function FeedbackCard({ item, onSaved }: { item: FeedbackItem; onSaved: () => void }) {
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [note, setNote] = useState(item.admin_note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = status !== item.status || note.trim() !== (item.admin_note ?? '');

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateFeedback(item.id, status, note);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="panel card">
      <div className="card-head">
        <span className={`pill cat-${item.category}`}>{categoryLabel[item.category]}</span>
        <span className="muted small">
          {formatDateTime(item.created_at)} · 앱 {item.app_version || '?'} · {item.os || '?'}
        </span>
      </div>
      <p className="body-text">{item.message}</p>
      {item.device_id && <p className="muted small mono">기기 {item.device_id.slice(0, 8)}</p>}
      <div className="row">
        <label className="inline">
          상태
          <select value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
            {(Object.keys(statusLabel) as FeedbackStatus[]).map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </label>
        <input aria-label="관리자 메모" placeholder="관리자 메모" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn primary" onClick={save} disabled={!dirty || saving}>
          저장
        </button>
      </div>
      {error && <p className="text-danger small" role="alert">{error}</p>}
    </article>
  );
}
