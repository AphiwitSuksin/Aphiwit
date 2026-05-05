import { type ComponentType, useMemo, useState } from 'react';
import { Clock, Layers, LocateFixed, Truck } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Circle as LeafletCircle } from 'react-leaflet';
import { branches, delayAnalysisRows, delayAnalysisSummary } from '../lib/mockData';
import { loadBranches, loadDelayAnalysisRows, loadDelayAnalysisSummary } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card } from './ui';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function MapAnalytics() {
  const OSMMapContainer = MapContainer as unknown as ComponentType<Record<string, unknown>>;
  const OSMTileLayer = TileLayer as unknown as ComponentType<Record<string, unknown>>;
  const OSMCircle = LeafletCircle as unknown as ComponentType<Record<string, unknown>>;
  const OSMCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;

  const { data: branchData } = useApiData(loadBranches, branches);
  const { data: delayRowsData } = useApiData(loadDelayAnalysisRows, delayAnalysisRows);
  const { data: delaySummaryData } = useApiData(loadDelayAnalysisSummary, delayAnalysisSummary);
  const [selectedId, setSelectedId] = useState(branches[0].id);
  const [radiusKm, setRadiusKm] = useState(3);
  const [heat, setHeat] = useState(true);
  const [traffic, setTraffic] = useState(false);
  const [pop, setPop] = useState(false);
  const [weather, setWeather] = useState(false);

  const selected = branchData.find((b) => b.id === selectedId) ?? branchData[0];
  if (!selected) return null;
  const mapCenter: [number, number] = [selected.lat, selected.lng];

  const branchRows = useMemo(
    () =>
      branchData.map((b) => ({
        ...b,
        dist: haversineKm(selected.lat, selected.lng, b.lat, b.lng),
        sales: b.monthlySalesThb,
      })),
    [branchData, selected.lat, selected.lng],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Delay Analysis</h1>
        <p className="mt-1 text-slate-600">
          ETA vs actual delivery, late shipments, and geographic context for Bangkok branches.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
            <Clock className="h-4 w-4 text-slate-400" />
            Avg. delay
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
    {delaySummaryData.avgDelayDays.toFixed(1)} days
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
            <Truck className="h-4 w-4 text-amber-500" />
            Late shipments
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">
            {delaySummaryData.lateShipmentPct}%
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">On-time</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
            {delaySummaryData.onTimePct}%
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Open exceptions</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{delaySummaryData.openExceptions}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Shipment delays</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">PO</th>
                <th className="py-2 pr-3">Branch</th>
                <th className="py-2 pr-3">Supplier</th>
                <th className="py-2 pr-3">ETA</th>
                <th className="py-2 pr-3">Delivered</th>
                <th className="py-2 pr-3">Delay (d)</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {delayRowsData.map((row) => (
                <tr key={row.po} className="hover:bg-slate-50/80">
                  <td className="py-2 pr-3 font-mono text-xs font-medium">{row.po}</td>
                  <td className="py-2 pr-3">{row.branch}</td>
                  <td className="py-2 pr-3 text-slate-700">{row.supplier}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.eta}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.delivered}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.delayDays}</td>
                  <td className="py-2">
                    <Badge
                      variant={
                        row.status === 'Late' ? 'danger' : row.status === 'Pending' ? 'warn' : 'success'
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Geographic context</h2>
      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <LocateFixed className="h-4 w-4 text-blue-600" />
              Bangkok Metropolitan Area (simplified)
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { k: 'heat', label: 'Sales Heatmap', v: heat, set: setHeat },
                { k: 'traffic', label: 'Traffic', v: traffic, set: setTraffic },
                { k: 'pop', label: 'Population', v: pop, set: setPop },
                { k: 'weather', label: 'Weather', v: weather, set: setWeather },
              ].map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => t.set(!t.v)}
                  className={`rounded-full border px-3 py-1 font-medium ${
                    t.v ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <Layers className="mr-1 inline h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              Radius: {radiusKm} km
              <input
                type="range"
                min={1}
                max={10}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-48 accent-blue-600"
              />
              {[1, 3, 5, 10].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRadiusKm(k)}
                  className="rounded-md border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50"
                >
                  {k}km
                </button>
              ))}
            </label>
          </div>

          <div className="mt-4 h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 bg-sky-50/40">
            <OSMMapContainer
              center={mapCenter}
              zoom={12}
              className="h-full w-full"
              scrollWheelZoom
            >
              <OSMTileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <OSMCircle
                center={mapCenter}
                radius={radiusKm * 1000}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.12, weight: 2 }}
              />
              {branchData.map((b) => (
                <OSMCircleMarker
                  key={b.id}
                  center={[b.lat, b.lng]}
                  radius={b.id === selectedId ? 10 : 7}
                  eventHandlers={{ click: () => setSelectedId(b.id) }}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: b.id === selectedId ? '#1d4ed8' : '#64748b',
                    fillOpacity: 1,
                  }}
                />
              ))}
            </OSMMapContainer>
          </div>
          {traffic ? <p className="mt-2 text-xs text-amber-700">Traffic layer is not available in standard OpenStreetMap tiles.</p> : null}
          <p className="mt-2 text-xs text-slate-500">
            Heatmap: red &gt;฿2M · orange ฿1.5–2M · yellow ฿1–1.5M · green &lt;฿1M
          </p>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Radius Correlation</h2>
            <p className="text-xs text-slate-600">Within {radiusKm} km of {selected.name}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Avg weather</span>
                <span className="font-medium">31°C · Cloudy</span>
              </li>
              <li className="flex justify-between">
                <span>Traffic</span>
                <Badge variant="warn">Moderate</Badge>
              </li>
              <li className="flex justify-between">
                <span>Avg fuel</span>
                <span className="font-mono">฿36.10/L</span>
              </li>
              <li className="flex justify-between">
                <span>Population density</span>
                <span>High</span>
              </li>
              <li className="flex justify-between">
                <span>Holiday count (30d)</span>
                <span className="tabular-nums">2</span>
              </li>
            </ul>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Branches</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-2">Branch</th>
                    <th className="py-2 pr-2">Code</th>
                    <th className="py-2 pr-2">Sales</th>
                    <th className="py-2 pr-2">Lat,Lng</th>
                    <th className="py-2">Dist.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchRows.map((b) => (
                    <tr
                      key={b.id}
                      className={`cursor-pointer hover:bg-slate-50 ${b.id === selectedId ? 'bg-blue-50/60' : ''}`}
                      onClick={() => setSelectedId(b.id)}
                    >
                      <td className="py-2 pr-2 font-medium">{b.name}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{b.code}</td>
                      <td className="py-2 pr-2 tabular-nums">฿{(b.sales / 1_000_000).toFixed(2)}M</td>
                      <td className="py-2 pr-2 font-mono text-[10px] text-slate-600">
                        {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                      </td>
                      <td className="py-2 tabular-nums text-xs">{b.dist.toFixed(2)} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
