import { supabase } from './supabase';
import type { ConfigEntry, FeedbackItem, FeedbackStatus, Notice, Overview } from './types';

// Supabase 호출은 이 파일에만. 화면은 이 함수들만 부른다.

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function isAdmin(): Promise<boolean> {
  return check(await supabase.rpc('lc_is_admin')) === true;
}

export async function fetchOverview(days: number): Promise<Overview> {
  return check(await supabase.rpc('lc_console_overview', { p_days: days })) as Overview;
}

export async function fetchNotices(): Promise<Notice[]> {
  return check(await supabase.from('lc_notices').select('*').order('starts_at', { ascending: false })) as Notice[];
}

export interface NoticeDraft {
  title: string;
  body: string;
  starts_at: string;
  ends_at: string | null;
}

export async function saveNotice(draft: NoticeDraft, id?: number): Promise<void> {
  if (id == null) check(await supabase.from('lc_notices').insert(draft));
  else check(await supabase.from('lc_notices').update(draft).eq('id', id));
}

export async function deleteNotice(id: number): Promise<void> {
  check(await supabase.from('lc_notices').delete().eq('id', id));
}

export async function fetchConfig(): Promise<ConfigEntry[]> {
  return check(await supabase.from('lc_app_config').select('*').order('key')) as ConfigEntry[];
}

export async function updateConfig(key: string, value: unknown): Promise<void> {
  const rows = check(await supabase.from('lc_app_config').update({ value }).eq('key', key).select('key'));
  if (!rows || rows.length === 0) throw new Error('저장되지 않았습니다(권한 또는 키 확인)');
}

export async function fetchFeedback(status: FeedbackStatus | null): Promise<FeedbackItem[]> {
  let q = supabase.from('lc_feedback').select('*');
  if (status) q = q.eq('status', status);
  return check(await q.order('created_at', { ascending: false }).limit(200)) as FeedbackItem[];
}

export async function updateFeedback(id: number, status: FeedbackStatus, adminNote: string): Promise<void> {
  const note = adminNote.trim();
  check(await supabase.from('lc_feedback').update({ status, admin_note: note === '' ? null : note }).eq('id', id));
}
