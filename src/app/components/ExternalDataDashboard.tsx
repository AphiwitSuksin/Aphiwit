import { useState } from 'react';
import { CloudSun, Fuel, LineChart as LineChartIcon, MapPin, Users } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fuelPriceHistory, holidaysTh, weatherForecast7 } from '../lib/mockData';
import { loadFuelPriceHistory, loadHolidays, loadWeatherForecast } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card } from './ui';

export function ExternalDataDashboard() {
  const [mode, setMode] = useState<'Overview' | 'Detailed'>('Overview');
  const [region, setRegion] = useState('Bangkok Metro');
  const { data: holidaysData } = useApiData(loadHolidays, holidaysTh);
  const { data: fuelPriceData } = useApiData(loadFuelPriceHistory, fuelPriceHistory);
  const { data: weatherData } = useApiData(loadWeatherForecast, weatherForecast7);
  const currentWeather = weatherData[0];

  const upcoming = holidaysData.filter((h) => new Date(h.date) >= new Date('2026-05-05')).slice(0, 4);
  const fuelMin = Math.min(...fuelPriceData.map((d) => d.price));
  const fuelMax = Math.max(...fuelPriceData.map((d) => d.price));
  const fuelCurrent = fuelPriceData[fuelPriceData.length - 1].price;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Internal Data</h1>
          <p className="mt-1 text-slate-600">
            ERP, warehouse, and production feeds — operational data for planning (same explorer as external
            analytics in the reference design).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {['Bangkok Metro', 'North', 'Northeast', 'Central', 'South'].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            {(['Overview', 'Detailed'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  mode === m ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <CloudSun className="h-4 w-4 text-amber-500" />
            Current Weather
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{currentWeather?.temp ?? 32}°C</p>
          <p className="text-sm text-slate-600">{currentWeather?.condition ?? 'Partly cloudy'} · BKK</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <MapPin className="h-4 w-4 text-violet-500" />
            Upcoming Holidays (30d)
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{upcoming.length}</p>
          <p className="text-sm text-slate-600">National + local</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Fuel className="h-4 w-4 text-rose-500" />
            Fuel Price
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">฿{fuelCurrent.toFixed(2)}/L</p>
          <p className="text-sm text-slate-600">Range 30d: ฿{fuelMin.toFixed(2)}–{fuelMax.toFixed(2)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Users className="h-4 w-4 text-sky-500" />
            Avg Traffic
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">Moderate</p>
          <p className="text-sm text-slate-600">Sukhumvit corridor</p>
        </Card>
      </div>

      {mode === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Weather Trends (7-day)</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">Condition</th>
                    <th className="px-3 py-2">Humidity</th>
                    <th className="px-3 py-2">Sales Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weatherData.map((w) => (
                    <tr key={w.date} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2 font-mono text-xs">{w.date}</td>
                      <td className="px-3 py-2">{w.temp}°C</td>
                      <td className="px-3 py-2">{w.condition}</td>
                      <td className="px-3 py-2">{w.humidity}%</td>
                      <td className="px-3 py-2">{w.salesImpact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Holidays</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {holidaysData.map((h) => (
                <li key={h.name} className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 p-2">
                  <div>
                    <p className="font-medium text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.date}</p>
                  </div>
                  <Badge variant={h.type === 'National' ? 'info' : 'purple'}>{h.type}</Badge>
                  <p className="hidden w-full basis-full text-xs text-slate-600 sm:block">{h.impact}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <LineChartIcon className="h-5 w-5 text-blue-600" />
              Fuel Price Trend (30 days)
            </h2>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelPriceData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`฿${v.toFixed(2)}`, 'Price']} />
                  <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Current ฿{fuelCurrent.toFixed(2)} · Min ฿{fuelMin.toFixed(2)} · Max ฿{fuelMax.toFixed(2)}
            </p>
          </Card>
        </div>
      )}

      {mode === 'Detailed' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Traffic Conditions</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {['Siam', 'Asoke', 'Rama IX', 'Silom'].map((z, i) => (
                <li key={z} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
                  <span>{z}</span>
                  <Badge variant={i % 2 ? 'warn' : 'danger'}>{i % 2 ? 'Moderate' : 'Heavy'}</Badge>
                  <span className="text-xs text-slate-600">+{10 + i * 4} min delivery</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Population Density</h2>
            <p className="text-sm text-slate-600">Region: {region}</p>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {[
                  ['Bangkok Metro', '10.7M', '+0.8% YoY'],
                  ['Peripheral', '3.1M', 'stable'],
                ].map(([a, b, c]) => (
                  <tr key={String(a)} className="border-t border-slate-100">
                    <td className="py-2 font-medium">{a}</td>
                    <td className="py-2 tabular-nums">{b}</td>
                    <td className="py-2 text-xs text-slate-600">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-600">Correlation with bakery demand: +0.42 (mock)</p>
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Custom Factors · Impact Analysis</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { n: 'Competitor promo', impact: '-6% margin', conf: 'Medium' },
                { n: 'Line OA campaign', impact: '+9% traffic', conf: 'High' },
                { n: 'Concert (Impact Arena)', impact: '+15% late sales', conf: 'High' },
              ].map((c) => (
                <div key={c.n} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm">
                  <p className="font-medium text-slate-900">{c.n}</p>
                  <p className="mt-1 text-slate-700">{c.impact}</p>
                  <div className="mt-2">
                    <Badge variant="info">{c.conf}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
