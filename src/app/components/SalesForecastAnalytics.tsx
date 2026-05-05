import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { enrichForecastRows, forecastSeries30, methodRecommendations } from '../lib/mockData';
import { loadForecastSeries30, loadMethodRecommendations } from '../lib/dataEndpoints';
import { mae, mape, rmse, safetyStock, reorderPoint } from '../lib/calculations';
import { useApiData } from '../lib/useApiData';
import { Badge, Card } from './ui';

const tabs = ['Forecast Table', 'Visualization', 'Forecasting Methods', 'Safety Stock'] as const;

function errorColor(pct: number) {
  const a = Math.abs(pct);
  if (a < 5) return 'text-emerald-700 bg-emerald-50';
  if (a <= 10) return 'text-amber-800 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

export function SalesForecastAnalytics() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Forecast Table');
  const { data: forecastData } = useApiData(loadForecastSeries30, forecastSeries30);
  const { data: methodData } = useApiData(loadMethodRecommendations, methodRecommendations);
  const rows = useMemo(() => enrichForecastRows(forecastData), [forecastData]);
  const actual = rows.map((r) => r.actual);
  const forecast = rows.map((r) => r.forecast);

  const metrics = useMemo(
    () => ({
      mape: mape(actual, forecast),
      rmse: rmse(actual, forecast),
      mae: mae(actual, forecast),
    }),
    [actual, forecast],
  );

  const histData = rows.map((r) => ({ err: r.error }));
  const rollChart = rows.map((r) => ({
    date: r.date.slice(5),
    mean: r.rollMean,
    std: r.rollStd,
  }));

  const safetyRows = [
    { product: 'PROD-001', branch: 'CPB-001', avg: 118, std: 14, lt: 3, sl: 95 },
    { product: 'PROD-002', branch: 'SPG-002', avg: 210, std: 22, lt: 2, sl: 95 },
    { product: 'PROD-001', branch: 'T21-003', avg: 96, std: 18, lt: 4, sl: 95 },
  ].map((r) => {
    const ss = safetyStock(r.std, r.lt, 1.65);
    const rop = reorderPoint(r.avg, r.lt, ss);
    return { ...r, ss: Math.round(ss), rop: Math.round(rop) };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Sales Forecast Analytics</h1>
        <p className="mt-1 text-slate-600">ตารางพยากรณ์ กราฟ วิธีคำนวณ และ Safety Stock</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
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

      {tab === 'Forecast Table' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <p className="text-xs uppercase text-slate-500">MAPE</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.mape.toFixed(2)}%</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">RMSE</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.rmse.toFixed(2)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">MAE</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.mae.toFixed(2)}</p>
            </Card>
          </div>
          <Card>
            <div className="app-scroll-region max-h-[520px] overflow-auto">
              <table className="min-w-[1200px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase text-slate-600">
                  <tr>
                    {[
                      'Date',
                      'Branch',
                      'Product',
                      'Actual',
                      'Forecast',
                      'Error',
                      '%Err',
                      'Lag-1',
                      'Lag-7',
                      '7d Mean',
                      '7d Std',
                      'DOW',
                      'Holiday',
                    ].map((h) => (
                      <th key={h} className="whitespace-nowrap px-2 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.date + r.branchCode} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono">{r.date}</td>
                      <td className="px-2 py-1.5">{r.branchCode}</td>
                      <td className="px-2 py-1.5">{r.product}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.actual}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.forecast}</td>
                      <td className={`px-2 py-1.5 tabular-nums ${errorColor((r.error / r.actual) * 100)}`}>
                        {r.error}
                      </td>
                      <td className={`px-2 py-1.5 tabular-nums ${errorColor(r.pctErr)}`}>
                        {r.pctErr.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">{r.lag1}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.lag7}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.rollMean.toFixed(1)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{r.rollStd.toFixed(2)}</td>
                      <td className="px-2 py-1.5">{r.dow}</td>
                      <td className="px-2 py-1.5">{r.holiday ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'Visualization' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Actual vs Forecast</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="actual" stroke="#16a34a" strokeWidth={2} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="#2563eb" strokeWidth={2} dot={false} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Error Distribution</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="err" hide />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="err" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Rolling Mean & Std</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rollChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="mean" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Mean" />
                  <Line type="monotone" dataKey="std" stroke="#f97316" strokeWidth={2} dot={false} name="Std" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {tab === 'Forecasting Methods' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {methodData.map((m) => (
            <Card key={m.code}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{m.branch}</p>
                  <p className="text-xs text-slate-500">{m.code}</p>
                </div>
                <Badge variant="purple">{m.method}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{m.reason}</p>
              <p className="mt-2 text-sm">
                <span className="text-slate-500">Accuracy:</span>{' '}
                <span className="font-semibold text-emerald-700">{m.accuracy}%</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">Features: {m.features}</p>
              <p className="mt-1 text-xs text-slate-600">Training window: {m.trainDays} days</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'Safety Stock' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Safety Stock (Z=1.65, 95%)</h2>
          <p className="mt-1 text-sm text-slate-600">
            SS = Z × σ × √L · ROP = (Avg Daily Demand × L) + SS
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">Avg Daily</th>
                  <th className="px-3 py-2">Std Dev</th>
                  <th className="px-3 py-2">Lead Time</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Safety Stock</th>
                  <th className="px-3 py-2">Reorder Point</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safetyRows.map((r) => (
                  <tr key={r.branch + r.product}>
                    <td className="px-3 py-2 font-medium">{r.product}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.branch}</td>
                    <td className="px-3 py-2 tabular-nums">{r.avg}</td>
                    <td className="px-3 py-2 tabular-nums">{r.std}</td>
                    <td className="px-3 py-2 tabular-nums">{r.lt}d</td>
                    <td className="px-3 py-2">{r.sl}%</td>
                    <td className="px-3 py-2 tabular-nums">{r.ss}</td>
                    <td className="px-3 py-2 tabular-nums font-semibold">{r.rop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
