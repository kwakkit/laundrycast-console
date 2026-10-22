// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigEntry, ModelParamsRow, Overview } from '../lib/types';
import { ConfigPage } from './ConfigPage';
import { DashboardPage } from './DashboardPage';
import { ModelPage } from './ModelPage';

const api = vi.hoisted(() => ({
  fetchOverview: vi.fn(),
  fetchConfig: vi.fn(),
  updateConfig: vi.fn(),
  fetchModelParams: vi.fn(),
  updateModelParams: vi.fn(),
}));
vi.mock('../lib/api', () => api);

afterEach(cleanup);
beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.updateConfig.mockResolvedValue(undefined);
  api.updateModelParams.mockResolvedValue(undefined);
});

const EMPTY: Overview = {
  generated_at: '2026-10-22T02:00:00Z',
  days: 14,
  devices: { total: 0, active_7d: 0, active_30d: 0, push_ready: 0, new_7d: 0 },
  devices_by_region: [],
  devices_by_locale: [],
  cells: { active: 0, total: 0 },
  kma_calls_today: 0,
  kma_daily_cap: 10000,
  fetch_daily: [],
  push_daily: [],
  loads_30d: { hung: 0, ended: 0, canceled: 0, feedbacks: 0, feedbacks_timed: 0 },
  accuracy: [],
  events_daily: [],
  feedback_new: 0,
};

describe('대시보드', () => {
  it('데이터가 없어도 빈 상태 안내로 그린다', async () => {
    api.fetchOverview.mockResolvedValue(EMPTY);
    render(<DashboardPage />);
    expect(await screen.findByText('아직 마른 시각이 기록된 피드백이 없습니다')).toBeTruthy();
    expect(screen.getByText(/아직 피드백이 없습니다/)).toBeTruthy();
    expect(screen.getAllByText('활성 기기가 없습니다.')).toHaveLength(2);
    expect(screen.getByText('기간 안에 수집 기록이 없습니다.')).toBeTruthy();
    expect(screen.getByText(/기간 안에 보낸 알림이 없습니다/)).toBeTruthy();
    expect(screen.getByText('기간 안에 들어온 이벤트가 없습니다.')).toBeTruthy();
    // 오차(기록 없음) · 피드백률(0/0)은 0 이 아니라 "—".
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('0%')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(api.fetchOverview).toHaveBeenCalledWith(14);
  });

  it('불러오기 실패 → 다시 시도', async () => {
    api.fetchOverview.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(EMPTY);
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('아직 마른 시각이 기록된 피드백이 없습니다')).toBeTruthy();
    expect(api.fetchOverview).toHaveBeenCalledTimes(2);
  });
});

describe('원격 설정', () => {
  const entry: ConfigEntry = { key: 'min_version', value: '0.1.0', description: null, updated_at: '2026-10-21T00:00:00Z' };

  it('버전 형식이 틀리면 저장하지 않는다', async () => {
    api.fetchConfig.mockResolvedValue([entry]);
    render(<ConfigPage />);
    const input = await screen.findByLabelText('min_version 값');
    fireEvent.change(input, { target: { value: '1.2' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('버전은 1.2.3 형식이어야 합니다.')).toBeTruthy();
    expect(api.updateConfig).not.toHaveBeenCalled();
  });

  it('맞는 형식은 앞뒤 공백을 빼고 저장', async () => {
    api.fetchConfig.mockResolvedValue([entry]);
    render(<ConfigPage />);
    fireEvent.change(await screen.findByLabelText('min_version 값'), { target: { value: ' 0.2.0 ' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('저장했습니다.')).toBeTruthy();
    expect(api.updateConfig).toHaveBeenCalledWith('min_version', '0.2.0');
  });
});

describe('건조 모델', () => {
  const row: ModelParamsRow = {
    scope: 'kr',
    params: {
      place_factor: { outdoor: 1, balcony: 0.5, indoor: 0.2 },
      theta: { thin: 0.3, normal: 0.5, thick: 0.8 },
      rain_prob_threshold: 50,
      day_end_hour: 21,
    },
    fitted_at: null,
    n_samples: 0,
    updated_at: '2026-10-20T00:21:46Z',
  };

  it('범위 밖이면 오류 표시 · 저장 막음', async () => {
    api.fetchModelParams.mockResolvedValue([row]);
    render(<ModelPage />);
    const input = await screen.findByLabelText('장소계수 k 베란다 새 값');
    fireEvent.change(input, { target: { value: '2' } });
    expect(screen.getByText('0~1.5 사이여야 합니다.')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('확인 뒤 기존 params 에 덮어 저장', async () => {
    api.fetchModelParams.mockResolvedValue([row]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ModelPage />);
    fireEvent.change(await screen.findByLabelText('마름 기준 θ 보통 새 값'), { target: { value: '0.6' } });
    expect(screen.getByText('바뀐 값 1개')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(api.updateModelParams).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0]).toContain('보통: 0.5 mm → 0.6 mm');
    const [scope, params] = api.updateModelParams.mock.calls[0];
    expect(scope).toBe('kr');
    expect(params.theta).toEqual({ thin: 0.3, normal: 0.6, thick: 0.8 });
    expect(params.earliest_hang_hour).toBe(6); // 빠졌던 키는 기본값으로 채워 저장
    confirm.mockRestore();
  });

  it('확인을 취소하면 저장하지 않는다', async () => {
    api.fetchModelParams.mockResolvedValue([row]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ModelPage />);
    fireEvent.change(await screen.findByLabelText('비 · 시간 비 확률 기준 새 값'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(api.updateModelParams).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
