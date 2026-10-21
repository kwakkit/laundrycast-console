import type { ReactNode } from 'react';
import type { AsyncState } from '../lib/useAsync';

/** 로딩(자리 표시) · 오류(다시 시도) · 데이터. 다시 읽는 중엔 이전 데이터를 그대로 보여 준다. */
export function AsyncView<T>({ state, children }: { state: AsyncState<T>; children: (data: T) => ReactNode }) {
  if (state.error) {
    return (
      <div className="panel state" role="alert">
        <p>불러오지 못했습니다.</p>
        <p className="muted small">{state.error}</p>
        <button className="btn" onClick={state.reload}>다시 시도</button>
      </div>
    );
  }
  if (state.data === undefined) {
    return <div className="panel skeleton" aria-busy="true" aria-label="불러오는 중" />;
  }
  return <>{children(state.data)}</>;
}
