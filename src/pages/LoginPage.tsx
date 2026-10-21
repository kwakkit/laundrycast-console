import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

/** 관리자 로그인 — 이메일·비밀번호. 관리자 여부는 로그인 뒤 lc_is_admin() 으로 확인한다. */
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 맞지 않습니다.' : error.message);
    setBusy(false);
  }

  return (
    <main className="center">
      <form className="panel login" onSubmit={submit}>
        <Brand />
        <p className="muted small">관리자 계정으로 로그인하세요.</p>
        <label>
          이메일
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-danger small" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </main>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="3" y="2" width="18" height="20" rx="4" fill="currentColor" opacity="0.18" />
        <circle cx="12" cy="13" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="7" cy="5.5" r="1.1" fill="currentColor" />
      </svg>
      <span>런디캐스트 콘솔</span>
    </div>
  );
}
