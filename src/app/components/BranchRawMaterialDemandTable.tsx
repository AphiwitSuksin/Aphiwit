import { useMemo, useState } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { APP_TODAY, addDays, formatDateISO, mape, safetyStock, stdDev } from '../lib/calculations';
import { branches, products } from '../lib/mockData';
import { loadBranches, loadProducts } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card } from './ui';

const METHOD_BADGE = ['ARIMA', 'ML Ensemble', 'Interpretable'] as const;

type Row = {
  date: string;
  branch: string;
  branchCode: string;
  item: string;
  itemCode: string;
  itemType: 'RM' | 'PROD';
  initialStock: number;
  available: number;
  shelfDays: number;
  forecast: number;
  scheduledDel: number;
  inTransit: number;
  qc: 'Pass' | 'Fail';
  safety: number;
  remaining: number;
  mape: number;
  rmse: number;
  mae: number;
  outlier: boolean;
  roll7: number;
  rollStd: number;
  method: (typeof METHOD_BADGE)[number];
  suggest: 'Increase' | 'Decrease' | 'Maintain';
};

export function BranchRawMaterialDemandTable() {
  const { data: branchData } = useApiData(loadBranches, branches);
  const { data: productData } = useApiData(loadProducts, products);
  const [shelfTh, setShelfTh] = useState(5);
  const [consumptionTarget] = useState(20);
  const [deliveryDays, setDeliveryDays] = useState<Set<number>>(new Set([0, 3]));
  const [rangeDays, setRangeDays] = useState(30);
  const [branchFilter, setBranchFilter] = useState('All');
  const [matFilter, setMatFilter] = useState('All');

  const toggleDay = (i: number) => {
    setDeliveryDays((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const rows = useMemo(() => {
    const out: Row[] = [];
    const rms = productData.filter((p) => p.type === 'Raw Material');
    for (let d = 0; d < rangeDays; d++) {
      const date = formatDateISO(addDays(addDays(APP_TODAY, -(rangeDays - 1)), d));
      const dt = new Date(date + 'T12:00:00');
      const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
      const isDel = deliveryDays.has(dow);
      branchData.forEach((b, bi) => {
        rms.forEach((rm, mi) => {
          const baseAvail = 400 + mi * 120 + (bi % 3) * 40;
          const demand = 35 + ((d + mi + bi) % 11) * 3;
          const scheduled = isDel ? 200 : 0;
          const inTransit = d % 9 === 0 ? 150 : 0;
          const shelfDays = 10 + ((d + mi) % 20);
          const hist = Array.from({ length: 7 }, (_, k) => demand + k * 2 - 3);
          const roll7 = hist.reduce((a, x) => a + x, 0) / hist.length;
          const rollStd = stdDev(hist);
          const actualSeries = hist.map((h) => h * (1 + (mi % 3) / 100));
          const forecastSeries = actualSeries.map((a) => a * 0.97);
          const mapeV = mape(actualSeries, forecastSeries);
          const rmseV = Math.sqrt(
            actualSeries.reduce((s, a, i) => s + (a - forecastSeries[i]) ** 2, 0) / actualSeries.length,
          );
          const maeV =
            actualSeries.reduce((s, a, i) => s + Math.abs(a - forecastSeries[i]), 0) / actualSeries.length;
          const ss = safetyStock(rollStd, rm.leadTimeDays, 1.65);
          const remaining = baseAvail + scheduled + inTransit - demand;
          const outlier = Math.abs(demand - roll7) > rollStd * 2;
          const method = METHOD_BADGE[(bi + mi) % 3];
          const suggest: Row['suggest'] = mapeV > 10 ? 'Increase' : mapeV < 5 ? 'Maintain' : 'Decrease';
          out.push({
            date,
            branch: b.name,
            branchCode: b.code,
            item: rm.name,
            itemCode: rm.code,
            itemType: 'RM',
            initialStock: 620,
            available: baseAvail,
            shelfDays,
            forecast: demand * (rangeDays > 30 ? 1.05 : 1),
            scheduledDel: scheduled,
            inTransit,
            qc: 'Pass',
            safety: Math.round(ss),
            remaining,
            mape: mapeV,
            rmse: rmseV,
            mae: maeV,
            outlier,
            roll7,
            rollStd,
            method,
            suggest,
          });
        });
      });
    }
    return out;
  }, [branchData, deliveryDays, productData, rangeDays]);

  const filtered = rows.filter((r) => {
    if (branchFilter !== 'All' && r.branchCode !== branchFilter) return false;
    if (matFilter !== 'All' && r.itemCode !== matFilter) return false;
    return r.qc === 'Pass' && r.shelfDays > shelfTh;
  });

  const summary = useMemo(() => {
    const lowErr = filtered.filter((r) => r.mape < 5).length;
    const medErr = filtered.filter((r) => r.mape >= 5 && r.mape <= 10).length;
    const outliers = filtered.filter((r) => r.outlier).length;
    const needsPo = filtered.filter((r) => r.forecast > r.available && r.remaining < r.safety).length;
    return { lowErr, medErr, outliers, needsPo };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Branch Demand Analysis</h1>
        <p className="mt-1 text-slate-600">วิเคราะห์ความต้องการรายสาขา — ครบทุกคอลัมน์สำหรับแผนงาน</p>
      </header>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Configuration</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            Shelf Life Threshold (days)
            <input
              type="number"
              value={shelfTh}
              onChange={(e) => setShelfTh(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Consumption Target (%)
            <input
              type="number"
              value={consumptionTarget}
              readOnly
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Date Range
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              {[30, 90, 180, 365].map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="font-medium">Delivery Days</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    deliveryDays.has(i) ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
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
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
            >
              <option>All</option>
              {branchData.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Material / Product
            <select
              value={matFilter}
              onChange={(e) => setMatFilter(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
            >
              <option>All</option>
              {productData.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Showing {filtered.length} items (QC Pass, Shelf Life &gt; {shelfTh} days)
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Items</p>
          <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Low Error</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{summary.lowErr}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Medium Error</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{summary.medErr}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Outliers</p>
          <p className="mt-1 text-2xl font-bold text-violet-700">{summary.outliers}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Needs PO</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{summary.needsPo}</p>
        </Card>
      </div>

      <Card>
        <div className="app-scroll-region max-h-[560px] overflow-auto">
          <table className="min-w-[2200px] text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase text-slate-600">
              <tr>
                {[
                  'Date',
                  'Branch',
                  'Item',
                  'Init Stock',
                  'Available',
                  'Shelf d',
                  'Forecast',
                  'Sched Del',
                  'In Transit',
                  'QC',
                  'Safety',
                  'Remaining',
                  'MAPE',
                  'RMSE',
                  'MAE',
                  'Outlier',
                  '7d Avg',
                  '7d Std',
                  'Method',
                  'SS Adj',
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 200).map((r, idx) => {
                const poNeed = r.forecast > r.available && r.remaining < r.safety;
                const delDay = r.scheduledDel > 0;
                let bg = '';
                if (poNeed) bg = 'bg-red-50';
                else if (r.outlier) bg = 'bg-amber-50';
                else if (delDay) bg = 'bg-blue-50/80';
                const mapeBadge =
                  r.mape < 5 ? ('success' as const) : r.mape <= 10 ? ('warn' as const) : ('danger' as const);
                return (
                  <tr key={`${r.date}-${r.branchCode}-${r.itemCode}-${idx}`} className={`hover:bg-slate-50/80 ${bg}`}>
                    <td className="whitespace-nowrap px-2 py-1 font-mono">{r.date}</td>
                    <td className="px-2 py-1">
                      <span className="font-medium">{r.branch}</span>
                      <span className="ml-1 font-mono text-[10px] text-slate-500">{r.branchCode}</span>
                    </td>
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-slate-500" />
                        {r.item}{' '}
                        <span className="font-mono text-[10px] text-violet-700">{r.itemCode}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1 tabular-nums">{r.initialStock}</td>
                    <td className="px-2 py-1 tabular-nums">{r.available}</td>
                    <td className="px-2 py-1 tabular-nums">{r.shelfDays}</td>
                    <td className="px-2 py-1 tabular-nums">{r.forecast.toFixed(0)}</td>
                    <td className="px-2 py-1 tabular-nums">{r.scheduledDel}</td>
                    <td className="px-2 py-1 tabular-nums">{r.inTransit}</td>
                    <td className="px-2 py-1">
                      <Badge variant="success">{r.qc}</Badge>
                    </td>
                    <td className="px-2 py-1 tabular-nums">{r.safety}</td>
                    <td
                      className={`px-2 py-1 tabular-nums font-bold ${
                        r.remaining < 0 ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {r.remaining}
                    </td>
                    <td className="px-2 py-1">
                      <Badge variant={mapeBadge}>{r.mape.toFixed(1)}%</Badge>
                    </td>
                    <td className="px-2 py-1 tabular-nums">{r.rmse.toFixed(2)}</td>
                    <td className="px-2 py-1 tabular-nums">{r.mae.toFixed(2)}</td>
                    <td className="px-2 py-1">
                      {r.outlier ? (
                        <span className="inline-flex items-center gap-1 text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-2 py-1 tabular-nums">{r.roll7.toFixed(1)}</td>
                    <td className="px-2 py-1 tabular-nums">{r.rollStd.toFixed(2)}</td>
                    <td className="px-2 py-1">
                      <Badge variant="purple">{r.method}</Badge>
                    </td>
                    <td className="px-2 py-1">
                      <Badge variant={r.suggest === 'Increase' ? 'warn' : 'neutral'}>{r.suggest}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-3 text-xs text-orange-950">
            <p className="font-semibold">PO Trigger</p>
            <p className="mt-1">
              Forecast &gt; Available และ Remaining &lt; Safety · ส่งมอบให้เหลือ ~{consumptionTarget}% ภายใน 3 วันหลังรับ
            </p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-950">
            <p className="font-semibold">Outlier Detection</p>
            <p className="mt-1">เทียบความต้องการกับสถิติ 7 วัน — หากเกิน 2σ จะแจ้งเตือน</p>
          </div>
        </div>
      </Card>
    </div>
  );
}