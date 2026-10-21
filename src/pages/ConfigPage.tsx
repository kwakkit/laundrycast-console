import { useState } from 'react';
import { AsyncView } from '../components/AsyncView';
import { EmptyState } from '../components/EmptyState';
import { fetchConfig, updateConfig } from '../lib/api';
import { formatDateTime, isSemver } from '../lib/format';
import type { ConfigEntry } from '../lib/types';
import { useAsync } from '../lib/useAsync';

/** 원격 설정 — 앱은 시작할 때 읽는다(3초 제한 → 기기 캐시 → 기본값). 키 추가·삭제는 마이그레이션으로만. */
export function ConfigPage() {
  const state = useAsync(fetchConfig, []);
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Remote config · 다음 앱 실행부터 적용</p>
          <h1>원격 설정</h1>
        </div>
      </header>
      <div className="panel note">
        <strong>주의</strong> — Play 스토어 페이지가 생기기 전에는 <code>min_version</code> 을 올리지 마세요. 업데이트할 곳
        없이 앱이 막힙니다.
      </div>
      <AsyncView state={state}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState message="설정 키가 없습니다." />
          ) : (
            <div className="stack">
              {list.map((e) => (
                <ConfigRow key={e.key} entry={e} onSaved={state.reload} />
              ))}
            </div>
          )
        }
      </AsyncView>
    </>
  );
}

function ConfigRow({ entry, onSaved }: { entry: ConfigEntry; onSaved: () => void }) {
  const isText = typeof entry.value === 'string';
  const initial = isText ? (entry.value as string) : JSON.stringify(entry.value);
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function parse(): unknown {
    if (entry.key.endsWith('_version')) {
      if (!isSemver(text.trim())) throw new Error('버전은 1.2.3 형식이어야 합니다.');
      return text.trim();
    }
    if (isText) return text;
    return JSON.parse(text);
  }

  async function save() {
    let value: unknown;
    try {
      value = parse();
    } catch (e) {
      return setMsg({ ok: false, text: e instanceof Error ? e.message : '형식이 올바르지 않습니다.' });
    }
    setSaving(true);
    try {
      await updateConfig(entry.key, value);
      setMsg({ ok: true, text: '저장했습니다.' });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel card">
      <div className="card-head">
        <code className="key">{entry.key}</code>
        <span className="muted small">수정 {formatDateTime(entry.updated_at)}</span>
      </div>
      {entry.description && <p className="muted small">{entry.description}</p>}
      <div className="row">
        <input
          aria-label={`${entry.key} 값`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMsg(null);
          }}
        />
        <button className="btn primary" onClick={save} disabled={saving || text === initial}>
          저장
        </button>
      </div>
      {msg && (
        <p className={`small ${msg.ok ? 'text-ok' : 'text-danger'}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
