import { useMemo, useState } from 'react';
import { Info, Truck } from 'lucide-react';
import {
  APP_TODAY,
  addDays,
  formatDateISO,
  mape,
  reorderPoint,
  safetyStock,
  stdDev,
} from '../lib/calculations';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { branches, enrichForecastRows, forecastSeries30, methodRecommendations } from '../lib/mockData';
import { loadBranches, loadForecastSeries30, loadMethodRecommendations } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card } from './ui';

const tabList = ['Daily Demand', 'PO Recommendations', 'Forecast Accuracy', 'Safety Stock'] as const;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dowIndex(d: Date) {
  const i = d.getDay();
  return i === 0 ? 6 : i - 1;
}

export function RawMaterialDemandTable() {
  const { data: branchData } = useApiData(loadBranches, branches);
  const { data: forecastData } = useApiData(loadForecastSeries30, forecastSeries30);
  const { data: methodData } = useApiData(loadMethodRecommendations, methodRecommendations);
  const [tab, setTab] = useState<(typeof tabList)[number]>('Daily Demand');
  const [shelfAlert, setShelfAlert] = useState(7);
  const [consumptionTarget, setConsumptionTarget] = useState(20);
  const [deliveryDays, setDeliveryDays] = useState<Set<number>>(new Set([0, 3]));
  const [errorTol, setErrorTol] = useState(10);
  const [branch, setBranch] = useState('All');
  const [material, setMaterial] = useState('RM-102');
  const [notice, setNotice] = useState<string | null>(null);

  const toggleDay = (i: number) => {
    setDeliveryDays((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const demandSeries = useMemo(() => {
    const base = enrichForecastRows(forecastData).map((r) => Math.max(20, Math.round(r.forecast * 0.35)));
    return base;
  }, [forecastData]);

  const dailyRows = useMemo(() => {
    let opening = 800;
    const rows: {
      date: string;
      opening: number;
      delivery: number;
      demand: number;
      closing: number;
      coverage: number;
      status: string;
      isDelivery: boolean;
    }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(addDays(APP_TODAY, -29), i);
      const iso = formatDateISO(d);
      const isDelivery = deliveryDays.has(dowIndex(d));
      const delivery = isDelivery ? 400 : 0;
      const demand = demandSeries[i] ?? 100;
      const closing = opening + delivery - demand;
      const coverage = demand > 0 ? closing / demand : 0;
      let status = 'Sufficient';
      if (closing < consumptionTarget * 0.01 * 800) status = 'PO Required';
      if (coverage < 2) status = 'Critical';
      else if (coverage < 5) status = 'Low';
      else if (coverage > 5) status = 'Sufficient';
      rows.push({
        date: iso,
        opening,
        delivery,
        demand,
        closing,
        coverage,
        status,
        isDelivery,
      });
      opening = closing;
    }
    return rows;
  }, [consumptionTarget, deliveryDays, demandSeries]);

  const forecastRows = enrichForecastRows(forecastData).slice(-14);
  const std = stdDev(forecastRows.map((r) => r.actual));
  const ss = safetyStock(std, 5, 1.65);
  const rop = reorderPoint(meanDemand(forecastRows.map((r) => r.actual)), 5, ss);

  async function persist(path: string, body: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest(path, { method: 'POST', body });
    } catch {
      setNotice('Backend update failed — local action completed.');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Raw Material Demand</h1>
        <p className="mt-1 text-slate-600">คำนวณความต้องการ แนะนำ PO และ Safety Stock วัตถุดิบ</p>
        {notice ? <p className="mt-1 text-sm text-blue-700">{notice}</p> : null}
      </header>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Threshold Configuration</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            Shelf Life Alert (days)
            <input
              type="number"
              value={shelfAlert}
              onChange={(e) => setShelfAlert(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Consumption Target (%)
            <input
              type="number"
              value={consumptionTarget}
              onChange={(e) => setConsumptionTarget(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Error Tolerance (%)
            <input
              type="number"
              value={errorTol}
              onChange={(e) => setErrorTol(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="text-sm">
            <span className="font-medium text-slate-700">Delivery Days</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    deliveryDays.has(i) ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="text-sm">
            Branch
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
            >
              <option>All</option>
              {branchData.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.code}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Material
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
            >
              {['RM-101', 'RM-102', 'RM-103'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Current Stock', v: '640 kg', sub: `as of ${formatDateISO(APP_TODAY)}` },
          { label: 'Monthly Stock Take', v: '612 kg', sub: 'May cycle' },
          { label: 'Shelf Life', v: `${shelfAlert}+ days policy`, sub: 'alert threshold' },
          { label: 'QC Status', v: 'Pass', sub: 'Lot RM-102-B' },
          { label: 'Days Coverage', v: '4.2', sub: 'from closing/demand' },
        ].map((c) => (
          <Card key={c.label}>
            <p className="text-xs uppercase text-slate-500">{c.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{c.v}</p>
            <p className="text-xs text-slate-600">{c.sub}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabList.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Daily Demand' && (
        <>
          <Card>
            <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-sm text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>Opening(N) = Closing(N-1) · Closing = Opening + Delivery − Demand · Coverage = Closing / Demand</p>
              </div>
            </div>
            <div className="app-scroll-region mt-4 max-h-[480px] overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-600">
                  <tr>
                    {['Date', 'Opening', 'Delivery', 'Forecast Demand', 'Closing', 'Coverage', 'Status'].map((h) => (
                      <th key={h} className="px-2 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyRows.map((r) => {
                    let rowBg = '';
                    if (r.isDelivery) rowBg = 'bg-blue-50/80';
                    if (r.status === 'Critical') rowBg = 'bg-red-50';
                    return (
                      <tr key={r.date} className={`hover:bg-slate-50/80 ${rowBg}`}>
                        <td className="whitespace-nowrap px-2 py-1.5 font-mono">
                          {r.isDelivery ? <Truck className="mr-1 inline h-3.5 w-3.5 text-blue-600" /> : null}
                          {r.date}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">{r.opening}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.delivery}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.demand}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.closing}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.coverage.toFixed(2)}</td>
                        <td className="px-2 py-1.5">
                          <Badge
                            variant={
                              r.status === 'Critical'
                                ? 'danger'
                                : r.status === 'Low'
                                  ? 'warn'
                                  : r.status === 'PO Required'
                                    ? 'warn'
                                    : 'success'
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'PO Recommendations' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Info className="mt-0.5 h-4 w-4 text-blue-600" />
              <p>
                สร้าง PO เมื่อดีมานด์คาดว่าจะกินสต็อกต่ำกว่าเกณฑ์ · จัดส่งให้สอดคล้อง lead time · QC = Pass เท่านั้น
              </p>
            </div>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                name: 'All-Purpose Flour',
                code: 'RM-102',
                status: 'Recommended' as const,
                qty: 800,
                eta: '2026-05-09',
                lead: 3,
                branch: 'CPB-001',
                reason: 'Forecast depletes stock below 20% within 3 days',
              },
              {
                name: 'Premium Cocoa',
                code: 'RM-101',
                status: 'In Transit' as const,
                qty: 150,
                eta: '2026-05-08',
                lead: 5,
                branch: 'SPG-002',
                reason: 'Aligned to Thu delivery window',
              },
            ].map((p) => (
              <Card key={p.code + p.status}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {p.name} <span className="font-mono text-xs text-slate-500">({p.code})</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      Branch {p.branch} · Lead {p.lead}d · ETA {p.eta}
                    </p>
                  </div>
                  <Badge variant={p.status === 'Recommended' ? 'info' : 'warn'}>{p.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-700">Qty {p.qty} · {p.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(`PO created for ${p.code}, qty ${p.qty}.`);
                      void persist('/purchase-orders', {
                        products: [p.code],
                        quantity: p.qty,
                        etd: p.eta,
                      });
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Create PO
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotice(`Adjustment requested for ${p.code}.`)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Adjust
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'Forecast Accuracy' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <p className="text-xs uppercase text-slate-500">MAPE</p>
            <p className="mt-1 text-2xl font-bold">{mapeRm(forecastRows)}%</p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-slate-500">RMSE</p>
            <p className="mt-1 text-2xl font-bold">{rmseRm(forecastRows).toFixed(2)}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-slate-500">MAE</p>
            <p className="mt-1 text-2xl font-bold">{maeRm(forecastRows).toFixed(2)}</p>
          </Card>
          <Card className="lg:col-span-3">
            <h3 className="font-semibold text-slate-900">Time-Series Features</h3>
            <div className="app-scroll-region mt-2 max-h-64 overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">DOW</th>
                    <th className="px-2 py-2">Holiday</th>
                    <th className="px-2 py-2">Forecast</th>
                    <th className="px-2 py-2">Lag-1</th>
                    <th className="px-2 py-2">Lag-7</th>
                    <th className="px-2 py-2">7d Mean</th>
                    <th className="px-2 py-2">7d Std</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastRows.map((r) => (
                    <tr key={r.date} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 font-mono">{r.date}</td>
                      <td className="px-2 py-1.5">{r.dow}</td>
                      <td className="px-2 py-1.5">{r.holiday ? 'Yes' : 'No'}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.forecast}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.lag1}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.lag7}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.rollMean.toFixed(1)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.rollStd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="lg:col-span-3">
            <h3 className="font-semibold text-slate-900">Recommended Method</h3>
            <p className="mt-2 text-sm text-slate-700">
              {methodData[0].branch} ({methodData[0].code}) — {methodData[0].method}: {methodData[0].reason}. Accuracy{' '}
              {methodData[0].accuracy}%. Features: {methodData[0].features}. Training: {methodData[0].trainDays} days.
            </p>
          </Card>
        </div>
      )}

      {tab === 'Safety Stock' && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Raw Material Safety Stock</h3>
          <p className="mt-1 text-sm text-slate-600">
            SS = 1.65 × σ × √L · ROP = (Avg Daily Demand × L) + SS — σ from last 14 actuals (mock linkage)
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Material</th>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">Avg Daily</th>
                  <th className="px-3 py-2">Std Dev</th>
                  <th className="px-3 py-2">Lead</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">SS</th>
                  <th className="px-3 py-2">ROP</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2">RM-102</td>
                  <td className="px-3 py-2 font-mono text-xs">CPB-001</td>
                  <td className="px-3 py-2 tabular-nums">{meanDemand(forecastRows.map((r) => r.actual)).toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums">{std.toFixed(2)}</td>
                  <td className="px-3 py-2">5</td>
                  <td className="px-3 py-2">95%</td>
                  <td className="px-3 py-2 tabular-nums">{Math.round(ss)}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold">{Math.round(rop)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function meanDemand(vals: number[]) {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function mapeRm(rows: { actual: number; forecast: number }[]) {
  return mape(
    rows.map((r) => r.actual),
    rows.map((r) => r.forecast),
  ).toFixed(2);
}

function rmseRm(rows: { actual: number; forecast: number }[]) {
  const a = rows.map((r) => r.actual);
  const f = rows.map((r) => r.forecast);
  return Math.sqrt(a.reduce((s, x, i) => s + (x - f[i]) ** 2, 0) / a.length);
}

function maeRm(rows: { actual: number; forecast: number }[]) {
  const a = rows.map((r) => r.actual);
  const f = rows.map((r) => r.forecast);
  return a.reduce((s, x, i) => s + Math.abs(x - f[i]), 0) / a.length;
}
