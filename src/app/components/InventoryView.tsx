import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Search, Trash2 } from 'lucide-react';
import { inventoryRows, type InventoryRow } from '../lib/mockData';
import { calculateRemainingDays } from '../lib/calculations';
import { loadInventoryRows } from '../lib/dataEndpoints';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Badge, Card, IconButton } from './ui';

export function InventoryView() {
  const { data: inventoryData } = useApiData(loadInventoryRows, inventoryRows);
  const [mutableInventory, setMutableInventory] = useState<InventoryRow[]>(inventoryData);
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState<'All' | 'Normal' | 'Risk' | 'High risk'>('All');
  const [ptype, setPtype] = useState<'All' | 'Raw Material' | 'Finished Product'>('All');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMutableInventory(inventoryData);
  }, [inventoryData]);

  async function persist(method: 'PUT' | 'DELETE', path: string, body?: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest(path, { method, body });
    } catch {
      setNotice('Backend update failed — local view was updated.');
    }
  }

  const editInventory = async (row: InventoryRow) => {
    const qtyInput = window.prompt(`Edit quantity for ${row.code}`, String(row.quantity));
    if (!qtyInput) return;
    const quantity = Number(qtyInput);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setNotice('Quantity must be 0 or greater.');
      return;
    }
    const next = { ...row, quantity };
    setMutableInventory((prev) => prev.map((r) => (r.id === row.id ? next : r)));
    setNotice(`Updated ${row.code}.`);
    await persist('PUT', `/inventory/${row.id}`, next);
  };

  const deleteInventory = async (row: InventoryRow) => {
    if (!window.confirm(`Delete ${row.code}?`)) return;
    setMutableInventory((prev) => prev.filter((r) => r.id !== row.id));
    setNotice(`Deleted ${row.code}.`);
    await persist('DELETE', `/inventory/${row.id}`);
  };

  const rows = useMemo(() => {
    return mutableInventory
      .map((r) => ({
      ...r,
      daysLeft: calculateRemainingDays(r.expiryDate),
      }))
      .filter((r) => {
      if (risk !== 'All' && r.risk !== risk) return false;
      if (ptype !== 'All' && r.productType !== ptype) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s);
    });
  }, [mutableInventory, q, risk, ptype]);

  const normal = mutableInventory.filter((r) => r.risk === 'Normal').length;
  const atRisk = mutableInventory.filter((r) => r.risk === 'Risk').length;
  const highRisk = mutableInventory.filter((r) => r.risk === 'High risk').length;
  const expSoon = mutableInventory.filter((r) => calculateRemainingDays(r.expiryDate) < 4).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <p className="mt-1 text-slate-600">สต็อกคลังและคำเตือนอายุสินค้า</p>
        {notice ? <p className="mt-1 text-sm text-blue-700">{notice}</p> : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <p className="text-xs uppercase text-emerald-800">Normal Stock</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{normal}</p>
        </Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <p className="text-xs uppercase text-amber-900">At Risk</p>
          <p className="mt-1 text-2xl font-bold text-amber-950">{atRisk}</p>
        </Card>
        <Card className="border-orange-100 bg-gradient-to-br from-orange-50 to-white">
          <p className="text-xs uppercase text-orange-900">High Risk</p>
          <p className="mt-1 text-2xl font-bold text-orange-950">{highRisk}</p>
        </Card>
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <p className="text-xs uppercase text-red-800">Expiring Soon (&lt;4d)</p>
          <p className="mt-1 text-2xl font-bold text-red-900 animate-pulse-critical">{expSoon}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Product name or code..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value as typeof risk)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Normal</option>
            <option>Risk</option>
            <option>High risk</option>
          </select>
          <select
            value={ptype}
            onChange={(e) => setPtype(e.target.value as typeof ptype)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Raw Material</option>
            <option>Finished Product</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Expiry</th>
                <th className="px-3 py-2">Days Left</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const critical = r.daysLeft < 4;
                const rowBg = critical ? 'bg-red-50' : '';
                return (
                  <tr key={r.id} className={`hover:bg-slate-50/80 ${rowBg}`}>
                    <td className="px-3 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {critical ? (
                          <AlertTriangle className="h-4 w-4 animate-pulse-critical text-red-600" />
                        ) : null}
                        {r.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-3 py-2">{r.productType}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.expiryDate}</td>
                    <td
                      className={`px-3 py-2 tabular-nums ${critical ? 'font-bold text-red-700' : ''}`}
                    >
                      {critical ? '⚠️ ' : ''}
                      {r.daysLeft}d
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          r.risk === 'Normal' ? 'success' : r.risk === 'Risk' ? 'warn' : 'danger'
                        }
                      >
                        {r.risk}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{r.location}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <IconButton title="Edit" onClick={() => void editInventory(r)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton title="Delete" onClick={() => void deleteInventory(r)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
