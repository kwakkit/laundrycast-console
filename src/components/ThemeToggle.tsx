import { useEffect, useState } from 'react';

type Mode = 'system' | 'light' | 'dark';
const KEY = 'lc-console-theme';
const next: Record<Mode, Mode> = { system: 'light', light: 'dark', dark: 'system' };
const label: Record<Mode, string> = { system: '테마: 시스템', light: '테마: 라이트', dark: '테마: 다크' };

function read(): Mode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** 시스템 → 라이트 → 다크. 기기마다 기억. */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(read);
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // 저장 못 해도 이번 화면엔 적용된다.
    }
  }, [mode]);
  return (
    <button className="btn ghost small" onClick={() => setMode(next[mode])}>
      {label[mode]}
    </button>
  );
}
