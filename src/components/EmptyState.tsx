/** 빈 목록 안내 — 표·카드 자리에 같은 테두리로. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="panel">
      <p className="empty">{message}</p>
    </div>
  );
}
