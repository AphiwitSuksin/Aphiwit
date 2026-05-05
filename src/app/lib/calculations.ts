/** Reference date for demo — align with app "today" */
export const APP_TODAY = new Date('2026-05-05');

export function calculateRemainingDays(expiryDate: string, today: Date = APP_TODAY): number {
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function mape(actual: number[], forecast: number[]): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    if (a === 0 || Number.isNaN(a)) continue;
    sum += Math.abs((a - forecast[i]) / a);
    n++;
  }
  return n ? (sum / n) * 100 : 0;
}

export function rmse(actual: number[], forecast: number[]): number {
  if (!actual.length) return 0;
  const sumSq = actual.reduce((s, a, i) => s + (a - forecast[i]) ** 2, 0);
  return Math.sqrt(sumSq / actual.length);
}

export function mae(actual: number[], forecast: number[]): number {
  if (!actual.length) return 0;
  return actual.reduce((s, a, i) => s + Math.abs(a - forecast[i]), 0) / actual.length;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

const Z_95 = 1.65;

export function safetyStock(stdDevDemand: number, leadTimeDays: number, z: number = Z_95): number {
  return z * stdDevDemand * Math.sqrt(leadTimeDays);
}

export function reorderPoint(avgDailyDemand: number, leadTimeDays: number, ss: number): number {
  return avgDailyDemand * leadTimeDays + ss;
}

export function formatThbK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `฿${Math.round(n / 1000).toLocaleString('en-US')}K`;
  return `฿${n.toFixed(0)}`;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
