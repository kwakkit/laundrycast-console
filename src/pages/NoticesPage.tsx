import { useState, type FormEvent } from 'react';
import { AsyncView } from '../components/AsyncView';
import { EmptyState } from '../components/EmptyState';
import { deleteNotice, fetchNotices, saveNotice } from '../lib/api';
import { formatDateTime, isoToKstInput, kstInputToIso, noticeState } from '../lib/format';
import type { Notice } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const stateLabel = { scheduled: '예약', live: '게시 중', ended: '종료' } as const;

/** 공지 — 게시 중인 것이 앱 오늘 화면 맨 위 배너로 뜬다(사용자가 닫으면 그 공지는 다시 안 뜸). */
export function NoticesPage() {
  const state = useAsync(fetchNotices, []);
  const [editing, setEditing] = useState<Notice | 'new' | null>(null);

  async function remove(n: Notice) {
    if (!confirm(`"${n.title}" 공지를 삭제할까요?`)) return;
    try {
      await deleteNotice(n.id);
      state.reload();
    } catch (e) {
      alert(`삭제하지 못했습니다: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Notices · 앱 오늘 화면 배너</p>
          <h1>공지</h1>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={() => setEditing('new')}>
            새 공지
          </button>
        </div>
      </header>
      <AsyncView state={state}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState message="공지가 없습니다. 게시 중인 공지는 앱 오늘 화면 맨 위에 배너로 뜹니다." />
          ) : (
            <div className="stack">
              {list.map((n) => {
                const s = noticeState(n.starts_at, n.ends_at);
                return (
                  <article key={n.id} className="panel card">
                    <div className="card-head">
                      <span className={`pill ${s}`}>{stateLabel[s]}</span>
                      <span className="muted small">
                        {formatDateTime(n.starts_at)} ~ {n.ends_at ? formatDateTime(n.ends_at) : '계속'}
                      </span>
                    </div>
                    <h3>{n.title}</h3>
                    <p className="body-text">{n.body}</p>
                    <div className="card-actions">
                      <button className="btn" onClick={() => setEditing(n)}>
                        수정
                      </button>
                      <button className="btn danger" onClick={() => remove(n)}>
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        }
      </AsyncView>
      {editing && (
        <NoticeEditor
          notice={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function NoticeEditor({ notice, onClose, onSaved }: { notice: Notice | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(notice?.title ?? '');
  const [body, setBody] = useState(notice?.body ?? '');
  const [starts, setStarts] = useState(isoToKstInput(notice?.starts_at ?? new Date().toISOString()));
  const [ends, setEnds] = useState(notice?.ends_at ? isoToKstInput(notice.ends_at) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const startsIso = kstInputToIso(starts);
    const endsIso = ends ? kstInputToIso(ends) : null;
    if (!title.trim() || !body.trim()) return setError('제목과 내용을 적어 주세요.');
    if (!startsIso) return setError('시작 시각을 확인해 주세요.');
    if (endsIso && endsIso <= startsIso) return setError('종료는 시작보다 뒤여야 합니다.');
    setSaving(true);
    setError(null);
    try {
      await saveNotice({ title: title.trim(), body: body.trim(), starts_at: startsIso, ends_at: endsIso }, notice?.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="panel modal"
        role="dialog"
        aria-modal="true"
        aria-label={notice ? '공지 수정' : '새 공지'}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2>{notice ? '공지 수정' : '새 공지'}</h2>
        <label>
          제목
          <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label>
          내용
          <textarea value={body} maxLength={2000} rows={6} onChange={(e) => setBody(e.target.value)} />
        </label>
        <NoticePreview title={title.trim()} body={body.trim()} />
        <div className="row">
          <label>
            시작(한국 시각)
            <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
          </label>
          <label>
            종료(비우면 계속)
            <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
          </label>
        </div>
        {error && <p className="text-danger small" role="alert">{error}</p>}
        <div className="card-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** 앱 오늘 화면 배너 모양(앱 notice_banner.dart) — 제목 한 줄 + 본문 2줄까지, 누르면 전문. */
function NoticePreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="stack tight">
      <span className="muted small">앱 미리보기 · 오늘 화면 맨 위 (본문은 2줄까지, 누르면 전문)</span>
      <div className="notice-preview" aria-label="앱 배너 미리보기">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"
          />
        </svg>
        <div className="notice-preview-text">
          <strong className={title ? undefined : 'placeholder'}>{title || '제목'}</strong>
          <p className={body ? undefined : 'placeholder'}>{body || '내용'}</p>
        </div>
        <span className="notice-preview-close" aria-hidden="true">
          ×
        </span>
      </div>
    </div>
  );
}
