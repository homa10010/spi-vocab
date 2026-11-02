const DAY_START_HOUR = 4;
const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toUtcMs(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 端末の現地時刻で、午前4時を日付の区切りとした YYYY-MM-DD */
export function dayKey(date: Date): string {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

export function addDays(day: string, n: number): string {
  return fromUtcMs(toUtcMs(day) + n * MS_PER_DAY);
}

/** a − b の日数 */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / MS_PER_DAY);
}
