import { createClient } from '@supabase/supabase-js';

// 빌드 때 주입(.env.local · GitHub Actions 변수). Publishable key 만 — secret key 는 절대 넣지 않는다.
// 권한은 전부 DB RLS 가 막는다(관리자 = lc_admins 에 있는 계정).
const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isConfigured = url.startsWith('https://') && key.length > 0;

export const supabase = createClient(isConfigured ? url : 'https://placeholder.invalid', key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lc-console-auth' },
});
