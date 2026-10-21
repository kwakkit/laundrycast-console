export type Place = 'outdoor' | 'balcony' | 'indoor';
export type Fabric = 'thin' | 'normal' | 'thick';
export type FeedbackStatus = 'new' | 'checking' | 'done';
export type FeedbackCategory = 'bug' | 'idea' | 'etc';

/** lc_console_overview() 결과. 하루 경계는 Asia/Seoul. */
export interface Overview {
  generated_at: string;
  days: number;
  devices: { total: number; active_7d: number; active_30d: number; push_ready: number; new_7d: number };
  devices_by_region: { region: string; devices: number }[];
  devices_by_locale: { locale: string; devices: number }[];
  cells: { active: number; total: number };
  kma_calls_today: number;
  kma_daily_cap: number;
  fetch_daily: { day: string; provider: string; kind: string; calls: number; failures: number }[];
  push_daily: { day: string; kind: string; sent: number; failed: number; pending: number }[];
  loads_30d: { hung: number; ended: number; canceled: number; feedbacks: number; feedbacks_timed: number };
  accuracy: {
    place: Place;
    fabric: Fabric;
    feedbacks: number;
    timed: number;
    median_abs_err_min: number | null;
    mae_min: number | null;
  }[];
  events_daily: { day: string; name: string; events: number; devices: number }[];
  feedback_new: number;
}

export interface Notice {
  id: number;
  title: string;
  body: string;
  starts_at: string;
  ends_at: string | null;
  updated_at: string;
}

export interface ConfigEntry {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export interface FeedbackItem {
  id: number;
  device_id: string | null;
  app_version: string | null;
  os: string | null;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  admin_note: string | null;
  created_at: string;
}
