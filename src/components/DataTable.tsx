import type { ReactNode } from 'react';

/** 표 — 숫자 칸(`td.num`, 머리는 [numeric] 열 번호)은 오른쪽 · 자릿수 맞춤. 좁은 화면에선 가로 스크롤.
 * [hideNarrow] 열은 좁은 화면에서 숨긴다(본문 칸에도 `hide-narrow` 를 같이 단다). */
export function DataTable({
  head,
  numeric = [],
  hideNarrow = [],
  children,
}: {
  head: string[];
  numeric?: number[];
  hideNarrow?: number[];
  children: ReactNode;
}) {
  return (
    <div className="panel table-wrap">
      <table>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className={
                  [numeric.includes(i) && 'num', hideNarrow.includes(i) && 'hide-narrow'].filter(Boolean).join(' ') ||
                  undefined
                }
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
