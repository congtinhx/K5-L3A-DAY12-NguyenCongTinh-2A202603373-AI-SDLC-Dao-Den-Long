// Bảng xếp hạng cục bộ (Ticket-04 §3) — logic thuần, dùng chung cho server và trình duyệt.
export interface LeaderboardEntry { name: string; score: number; nights_won: number; achieved_at: string; seed: number }

export const MAX_ENTRIES = 10;
/** 3–12 ký tự chữ (kể cả tiếng Việt có dấu), số hoặc _. */
export function validateName(raw: string): string | null {
  const name = raw.normalize('NFC').trim();
  const len = [...name].length;
  if (len < 3 || len > 12) return null;
  return /^[\p{L}\p{M}\p{N}_]+$/u.test(name) ? name : null;
}

/** ISO 8601 có múi giờ địa phương, ví dụ 2026-11-20T16:50:00+07:00. */
export function isoLocal(d: Date): string {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}

export function validateEntry(e: unknown): LeaderboardEntry | null {
  const o = e as Record<string, unknown>;
  if (!o || typeof o !== 'object') return null;
  const name = typeof o.name === 'string' ? validateName(o.name) : null;
  if (!name) return null;
  if (!Number.isInteger(o.score) || (o.score as number) < 0) return null;
  if (!Number.isInteger(o.nights_won) || (o.nights_won as number) < 0 || (o.nights_won as number) > 3) return null;
  if (typeof o.achieved_at !== 'string' || Number.isNaN(Date.parse(o.achieved_at))) return null;
  if (!Number.isInteger(o.seed)) return null;
  return { name, score: o.score as number, nights_won: o.nights_won as number, achieved_at: o.achieved_at, seed: o.seed as number };
}

/** Sắp xếp điểm giảm dần; bằng điểm thì ai đạt trước đứng trên; giữ top 10. */
export function sortEntries(list: LeaderboardEntry[]): LeaderboardEntry[] {
  return list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.score - a.e.score || Date.parse(a.e.achieved_at) - Date.parse(b.e.achieved_at) || a.i - b.i)
    .map((x) => x.e)
    .slice(0, MAX_ENTRIES);
}

export function addEntry(list: LeaderboardEntry[], e: LeaderboardEntry): { entries: LeaderboardEntry[]; rank: number } {
  const entries = sortEntries([...list, e]);
  return { entries, rank: entries.indexOf(e) + 1 }; // 0 = không vào top 10
}
