import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ThemeToggle } from './components/ThemeToggle';
import { isAdmin } from './lib/api';
import { isConfigured, supabase } from './lib/supabase';
import { ConfigPage } from './pages/ConfigPage';
import { DashboardPage } from './pages/DashboardPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { Brand, LoginPage } from './pages/LoginPage';
import { NoticesPage } from './pages/NoticesPage';

const PAGES = [
  { id: 'dashboard', label: '대시보드', view: DashboardPage },
  { id: 'notices', label: '공지', view: NoticesPage },
  { id: 'config', label: '원격 설정', view: ConfigPage },
  { id: 'feedback', label: '제보함', view: FeedbackPage },
] as const;
type PageId = (typeof PAGES)[number]['id'];

const pageFromHash = (): PageId => {
  const id = location.hash.replace('#/', '');
  return PAGES.some((p) => p.id === id) ? (id as PageId) : 'dashboard';
};

/** 설정 없음 → 안내, 로그인 전 → 로그인, 관리자 아님 → 차단, 관리자 → 콘솔. */
export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [admin, setAdmin] = useState<boolean | 'error' | undefined>(undefined);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    setAdmin(undefined);
    if (!uid) return;
    isAdmin().then(setAdmin, () => setAdmin('error'));
  }, [uid]);

  if (!isConfigured) {
    return (
      <Notice>
        Supabase 설정이 없습니다. <code>.env.local</code> 에 <code>VITE_SUPABASE_URL</code>·
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> 를 넣고 다시 빌드하세요.
      </Notice>
    );
  }
  if (session === undefined || (session && admin === undefined)) return <Notice>확인 중…</Notice>;
  if (!session) return <LoginPage />;
  // 앱 사용자(익명 로그인)는 같은 프로젝트를 쓰므로 여기서 한 번 더 막는다 — 실제 권한은 RLS 가 막는다.
  if (session.user.is_anonymous || admin !== true) {
    return (
      <Notice>
        {admin === 'error' ? '관리자 확인에 실패했습니다.' : '이 계정은 런디캐스트 콘솔 관리자가 아닙니다.'}
        <button className="btn" onClick={() => supabase.auth.signOut()}>
          로그아웃
        </button>
      </Notice>
    );
  }
  return <Shell email={session.user.email ?? ''} />;
}

function Shell({ email }: { email: string }) {
  const [page, setPage] = useState<PageId>(pageFromHash);
  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  const View = PAGES.find((p) => p.id === page)!.view;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="메뉴">
          {PAGES.map((p) => (
            <a key={p.id} href={`#/${p.id}`} aria-current={page === p.id ? 'page' : undefined}>
              {p.label}
            </a>
          ))}
        </nav>
        <div className="account">
          <span className="muted small ellipsis">{email}</span>
          <ThemeToggle />
          <button className="btn ghost small" onClick={() => supabase.auth.signOut()}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="content">
        <View />
      </main>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <main className="center">
      <div className="panel login">
        <Brand />
        <div className="stack">{children}</div>
      </div>
    </main>
  );
}
