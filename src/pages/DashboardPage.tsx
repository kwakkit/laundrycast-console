import { useState } from 'react';
import { AsyncView } from '../components/AsyncView';
import { DataTable as Table } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { Meter } from '../components/Meter';
import { Section } from '../components/Section';
import { StatTile } from '../components/StatTile';
import { fetchOverview } from '../lib/api';
import {
  eventLabel, fabricLabel, fetchKindLabel, formatDateTime, formatDay, formatMinutes, formatNumber,
  formatPercent, localeLabel, overallMae, placeLabel, providerLabel, pushKindLabel,
} from '../lib/format';
import type { Overview } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const RANGES = [7, 14, 30] as const;

/** 첫 화면 — 글로벌 관문 지표(예측 정확도·피드백)를 맨 위에. 하루 경계는 한국 시각. */
export function DashboardPage() {
  const [days, setDays] = useState<number>(14);
  const state = useAsync(() => fetchOverview(days), [days]);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>대시보드</h1>
        </div>
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="기간">
            {RANGES.map((d) => (
              <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>
                {d}일
              </button>
            ))}
          </div>
          <button className="btn" onClick={state.reload} disabled={state.loading}>
            새로고침
          </button>
        </div>
      </header>
      <AsyncView state={state}>{(o) => <Body o={o} />}</AsyncView>
    </>
  );
}

function Body({ o }: { o: Overview }) {
  const mae = overallMae(o.accuracy);
  const timed = o.accuracy.reduce((s, r) => s + r.timed, 0);
  const l = o.loads_30d;
  const maxRegion = Math.max(1, ...o.devices_by_region.map((r) => r.devices));

  return (
    <div className="stack">
      <p className="muted small">갱신 {formatDateTime(o.generated_at)} · 최근 {o.days}일 · 한국 시각 기준</p>

      <div className="hero panel">
        <div>
          <div className="tile-label">예측 오차(평균 절대 오차)</div>
          <div className="hero-value">{formatMinutes(mae)}</div>
          <div className="tile-sub">
            {timed > 0
              ? `마른 시각을 기록한 피드백 ${formatNumber(timed)}건 기준 · 글로벌 확장 관문 지표`
              : '아직 마른 시각이 기록된 피드백이 없습니다'}
          </div>
        </div>
      </div>

      <div className="tiles">
        <StatTile label="활성 기기(7일)" value={formatNumber(o.devices.active_7d)} sub={`30일 ${formatNumber(o.devices.active_30d)} · 전체 ${formatNumber(o.devices.total)}`} />
        <StatTile label="새 기기(7일)" value={formatNumber(o.devices.new_7d)} sub={`푸시 가능 ${formatNumber(o.devices.push_ready)}`} />
        <StatTile label="피드백률(30일)" value={formatPercent(l.feedbacks, l.ended)} sub={`피드백 ${formatNumber(l.feedbacks)} / 걷은 빨래 ${formatNumber(l.ended)}`} />
        <StatTile label="수집 중인 격자" value={formatNumber(o.cells.active)} sub={`등록 ${formatNumber(o.cells.total)}칸`} />
        <StatTile label="새 제보" value={formatNumber(o.feedback_new)} sub="제보함에서 확인" />
      </div>

      <Meter label="오늘 기상청 호출" used={o.kma_calls_today} cap={o.kma_daily_cap} />

      <Section title="예측 정확도" note="장소 · 옷 두께별, 전체 기간">
        {o.accuracy.length === 0 ? (
          <EmptyState message="아직 피드백이 없습니다. 앱에서 '걷었어요' 피드백이 쌓이면 채워집니다." />
        ) : (
          <Table head={['장소', '두께', '피드백', '시각 기록', '오차 중앙값', '평균 절대 오차']} numeric={[2, 3, 4, 5]}>
            {o.accuracy.map((r) => (
              <tr key={`${r.place}-${r.fabric}`}>
                <td>{placeLabel[r.place]}</td>
                <td>{fabricLabel[r.fabric]}</td>
                <td className="num">{formatNumber(r.feedbacks)}</td>
                <td className="num">{formatNumber(r.timed)}</td>
                <td className="num">{formatMinutes(r.median_abs_err_min)}</td>
                <td className="num">{formatMinutes(r.mae_min)}</td>
              </tr>
            ))}
          </Table>
        )}
        <p className="muted small">
          최근 30일 널기 {formatNumber(l.hung)} · 걷음 {formatNumber(l.ended)} · 취소 {formatNumber(l.canceled)}
        </p>
      </Section>

      <div className="grid-2">
        <Section title="사용자 · 지역" note="최근 30일 활성 · 미세먼지 권역(시·도 수준)">
          {o.devices_by_region.length === 0 ? (
            <EmptyState message="활성 기기가 없습니다." />
          ) : (
            <Table head={['권역', '기기', '']} numeric={[1]}>
              {o.devices_by_region.map((r) => (
                <tr key={r.region}>
                  <td>{r.region}</td>
                  <td className="num">{formatNumber(r.devices)}</td>
                  <td className="bar-cell" aria-hidden="true">
                    <div className="bar" style={{ width: `${(r.devices / maxRegion) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Section>
        <Section title="사용자 · 언어" note="최근 30일 활성">
          {o.devices_by_locale.length === 0 ? (
            <EmptyState message="활성 기기가 없습니다." />
          ) : (
            <Table head={['언어', '기기']} numeric={[1]}>
              {o.devices_by_locale.map((r) => (
                <tr key={r.locale}>
                  <td>{localeLabel(r.locale)}</td>
                  <td className="num">{formatNumber(r.devices)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Section>
      </div>

      <Section title="날씨 API 호출" note={`일별 · 기상청 하루 상한 ${formatNumber(o.kma_daily_cap)}회`}>
        {o.fetch_daily.length === 0 ? (
          <EmptyState message="기간 안에 수집 기록이 없습니다." />
        ) : (
          <Table head={['날짜', '공급자', '종류', '호출', '실패']} numeric={[3, 4]}>
            {o.fetch_daily.map((r) => (
              <tr key={`${r.day}-${r.provider}-${r.kind}`}>
                <td>{formatDay(r.day)}</td>
                <td>{providerLabel(r.provider)}</td>
                <td>{fetchKindLabel(r.kind)}</td>
                <td className="num">{formatNumber(r.calls)}</td>
                <td className={`num ${r.failures > 0 ? 'text-danger' : ''}`}>
                  {r.failures > 0 ? `⚠ ${formatNumber(r.failures)}` : '0'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="푸시" note="일별 · 종류별(아침 · 비 경고 · 예상 변경 · 마름)">
        {o.push_daily.length === 0 ? (
          <EmptyState message="기간 안에 보낸 알림이 없습니다. 앱 푸시(FCM)를 붙이면 채워집니다." />
        ) : (
          <Table head={['날짜', '종류', '성공', '실패', '대기']} numeric={[2, 3, 4]}>
            {o.push_daily.map((r) => (
              <tr key={`${r.day}-${r.kind}`}>
                <td>{formatDay(r.day)}</td>
                <td>{pushKindLabel(r.kind)}</td>
                <td className="num">{formatNumber(r.sent)}</td>
                <td className={`num ${r.failed > 0 ? 'text-danger' : ''}`}>
                  {r.failed > 0 ? `⚠ ${formatNumber(r.failed)}` : '0'}
                </td>
                <td className="num">{formatNumber(r.pending)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="이벤트" note="일별 — DB 에 없는 것만(온보딩 완료 · 알림 열기 · 알림 권한)">
        {o.events_daily.length === 0 ? (
          <EmptyState message="기간 안에 들어온 이벤트가 없습니다." />
        ) : (
          <Table head={['날짜', '이벤트', '건수', '기기']} numeric={[2, 3]}>
            {o.events_daily.map((r) => (
              <tr key={`${r.day}-${r.name}`}>
                <td>{formatDay(r.day)}</td>
                <td>{eventLabel(r.name)}</td>
                <td className="num">{formatNumber(r.events)}</td>
                <td className="num">{formatNumber(r.devices)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}
