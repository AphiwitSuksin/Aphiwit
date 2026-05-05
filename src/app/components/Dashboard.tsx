import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  ClipboardList,
  CloudSun,
  Gauge,
  Minus,
  Package,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { APP_TODAY } from '../lib/calculations';
import {
  dashboardBranchPerformance,
  dashboardKpis,
  externalFactors,
  inventoryAlerts,
  poRecommendations,
  recentActivity,
} from '../lib/mockData';
import {
  loadDashboardBranchPerformance,
  loadDashboardKpis,
  loadExternalFactors,
  loadInventoryAlerts,
  loadPoRecommendations,
  loadRecentActivity,
} from '../lib/dataEndpoints';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Badge, Card, KpiCard } from './ui';

function formatLastUpdated(d: Date) {
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function Dashboard() {
  const { data: kpisData } = useApiData(loadDashboardKpis, dashboardKpis);
  const { data: branchPerformanceData } = useApiData(loadDashboardBranchPerformance, [...dashboardBranchPerformance]);
  const { data: inventoryAlertsData } = useApiData(loadInventoryAlerts, inventoryAlerts);
  const { data: poRecommendationsData } = useApiData(loadPoRecommendations, poRecommendations);
  const { data: externalFactorsData } = useApiData(loadExternalFactors, externalFactors);
  const { data: recentActivityData } = useApiData(loadRecentActivity, recentActivity);
  const [poItems, setPoItems] = useState(poRecommendationsData);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPoItems(poRecommendationsData);
  }, [poRecommendationsData]);

  const createPoFromRecommendation = async (code: string) => {
    const found = poItems.find((p) => p.materialCode === code);
    if (!found) return;
    const payload = {
      products: [found.materialCode],
      quantity: found.qty,
      etd: found.delivery,
    };
    setPoItems((prev) =>
      prev.map((p) => (p.materialCode === code ? { ...p, priority: 'medium' as const } : p)),
    );
    setNotice(`Created PO draft for ${found.materialCode}.`);
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest('/purchase-orders', { method: 'POST', body: payload });
    } catch {
      setNotice('PO draft created locally, but backend request failed.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supply Chain Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Executive overview — demand forecast, inventory, procurement, and external factors in one place.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span>Last updated: {formatLastUpdated(APP_TODAY)}</span>
        </p>
      </header>
      {notice ? <p className="text-sm text-blue-700">{notice}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Active Branches"
          value={String(kpisData.activeBranches)}
          sub="Bangkok metro footprint"
          icon={Building2}
          tone="blue"
        />
        <KpiCard
          label="Products"
          value={String(kpisData.productsCount)}
          sub="Finished + planning SKUs"
          icon={Package}
          tone="purple"
        />
        <KpiCard
          label="Raw Materials"
          value={String(kpisData.rawMaterialsCount)}
          sub="RM- prefix items"
          icon={ClipboardList}
          tone="green"
        />
        <KpiCard
          label="Active POs"
          value={String(kpisData.activePos)}
          sub="In flight (not completed)"
          icon={ShoppingCart}
          tone="amber"
        />
        <KpiCard
          label="Inventory Alerts"
          value={String(kpisData.inventoryCriticalCount)}
          sub="Critical SKUs"
          icon={Truck}
          tone="red"
        />
        <KpiCard
          label="Forecast Accuracy"
          value={`${kpisData.forecastAccuracyPct.toFixed(1)}%`}
          sub="Rolling model performance"
          icon={Target}
          tone="teal"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Branch Performance
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Key locations — daily performance vs plan (mock reference layout).
          </p>
          <ul className="mt-4 space-y-4">
            {branchPerformanceData.map((b) => (
              <li key={b.code} className="rounded-lg border border-slate-100 bg-white/90 p-3 shadow-sm/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.code}</p>
                  </div>
                  <p className="font-mono text-sm font-semibold tabular-nums text-slate-800">{b.amountLabel}</p>
                </div>
                <div className="mt-3">
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${b.barClass}`}
                      style={{ width: `${b.progressPct}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">Inventory Alerts</h2>
          <ul className="mt-3 space-y-2">
            {inventoryAlertsData.map((a) => {
              const bg =
                a.severity === 'Critical'
                  ? 'bg-red-50 border-red-200'
                  : a.severity === 'High'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-amber-50 border-amber-200';
              const pulse = a.severity === 'Critical' && a.daysLeft < 2;
              const label =
                a.severity === 'Critical' ? 'Critical' : a.severity === 'High' ? 'High' : 'Monitor';
              const badgeVariant =
                a.severity === 'Critical' ? 'danger' : a.severity === 'High' ? 'warn' : 'warn';
              return (
                <li
                  key={`${a.material}-${a.branch}`}
                  className={`rounded-lg border p-3 text-sm ${bg} ${pulse ? 'animate-pulse-critical' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{a.material}</span>
                    <Badge variant={badgeVariant}>{label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Branch {a.branch} · {a.daysLeft} day{a.daysLeft === 1 ? '' : 's'} remaining
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">PO Recommendations</h2>
          <ul className="mt-3 space-y-3">
            {poItems.map((p) => (
              <li key={p.material} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{p.material}</p>
                    <p className="text-xs text-slate-600">
                      {p.materialCode} · Qty {p.qty.toLocaleString()} · ETA {p.delivery}
                    </p>
                  </div>
                  <Badge variant={p.priority === 'high' ? 'danger' : 'warn'}>
                    {p.priority === 'high' ? 'High' : 'Medium'}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => void createPoFromRecommendation(p.materialCode)}
                  className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  Create PO
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CloudSun className="h-5 w-5 text-amber-500" />
            External Factors
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {externalFactorsData.map((f) => (
              <li key={f.name} className="rounded-lg border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{f.name}</span>
                  {f.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  ) : f.trend === 'down' ? (
                    <ArrowDownRight className="h-4 w-4 text-rose-600" />
                  ) : (
                    <Minus className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <p className="mt-1 text-xs font-medium text-slate-800">{f.value}</p>
                <p className="mt-1 text-xs text-slate-600">{f.impact}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Activity className="h-5 w-5 text-indigo-600" />
            Recent Activity
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {recentActivityData.map((r) => (
              <li key={r.text} className="flex gap-3 rounded-lg border border-slate-100 bg-white/80 p-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    r.type === 'po' ? 'bg-emerald-500' : r.type === 'alert' ? 'bg-amber-500' : 'bg-sky-500'
                  }`}
                />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {r.timeLabel}
                  </p>
                  <p className="text-slate-800">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Total PO Value</p>
          <p className="mt-1 text-xl font-bold text-slate-900">฿12.4M</p>
          <p className="mt-1 text-xs text-emerald-600">+3.2% vs last month</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Inventory Turnover</p>
          <p className="mt-1 text-xl font-bold text-slate-900">8.6x</p>
          <p className="mt-1 text-xs text-emerald-600">+0.4x improvement</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">On-Time Delivery</p>
          <p className="mt-1 text-xl font-bold text-slate-900">93.8%</p>
          <p className="mt-1 text-xs text-slate-600">Rolling 90 days</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Cost Savings</p>
          <p className="mt-1 text-xl font-bold text-slate-900">฿2.1M</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
            <Gauge className="h-3.5 w-3.5" />
            From route & lot sizing optimization
          </p>
        </Card>
      </div>
    </div>
  );
}
