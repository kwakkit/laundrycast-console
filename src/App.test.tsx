// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const m = vi.hoisted(() => ({
  session: null as unknown,
  isAdmin: vi.fn<() => Promise<boolean>>(),
}));

vi.mock('./lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: m.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('./lib/api', () => ({
  isAdmin: m.isAdmin,
  // 관리자로 들어가면 대시보드가 뜬다 — 응답은 안 오게(자리 표시만).
  fetchOverview: () => new Promise(() => {}),
}));

const user = (over: object = {}) => ({ user: { id: 'u1', email: 'admin@example.com', is_anonymous: false, ...over } });

afterEach(cleanup);
beforeEach(() => {
  m.session = null;
  m.isAdmin.mockReset();
});

describe('로그인 차단', () => {
  it('로그인 전 → 로그인 화면', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: '로그인' })).toBeTruthy();
    expect(m.isAdmin).not.toHaveBeenCalled();
  });

  it('익명(앱 사용자) → 차단', async () => {
    m.session = user({ is_anonymous: true, email: undefined });
    m.isAdmin.mockResolvedValue(false);
    render(<App />);
    expect(await screen.findByText('이 계정은 런디캐스트 콘솔 관리자가 아닙니다.')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('익명인데 관리자 확인이 true 여도 차단', async () => {
    m.session = user({ is_anonymous: true });
    m.isAdmin.mockResolvedValue(true);
    render(<App />);
    expect(await screen.findByText('이 계정은 런디캐스트 콘솔 관리자가 아닙니다.')).toBeTruthy();
  });

  it('관리자 아님 → 차단', async () => {
    m.session = user();
    m.isAdmin.mockResolvedValue(false);
    render(<App />);
    expect(await screen.findByText('이 계정은 런디캐스트 콘솔 관리자가 아닙니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
  });

  it('관리자 확인 실패 → 차단 + 안내', async () => {
    m.session = user();
    m.isAdmin.mockRejectedValue(new Error('network'));
    render(<App />);
    expect(await screen.findByText('관리자 확인에 실패했습니다.')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('관리자 → 메뉴', async () => {
    m.session = user();
    m.isAdmin.mockResolvedValue(true);
    render(<App />);
    const nav = await screen.findByRole('navigation', { name: '메뉴' });
    expect(nav.textContent).toContain('건조 모델');
    expect(screen.getByText('admin@example.com')).toBeTruthy();
  });
});
