import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { bomData, type BOMRow } from '../lib/mockData';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { loadBomData } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card, IconButton } from './ui';

export function BOMView() {
  const { data: bomRows } = useApiData(loadBomData, bomData);
  const [rowsData, setRowsData] = useState<BOMRow[]>(bomRows);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setRowsData(bomRows);
  }, [bomRows]);

  async function persist(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest(path, { method, body });
    } catch {
      setNotice('Backend update failed — local view was updated.');
    }
  }

  const addBom = async () => {
    const finishedCode = window.prompt('Finished product code', 'PROD-001');
    if (!finishedCode) return;
    const materialCode = window.prompt('Material code', 'RM-101');
    if (!materialCode) return;
    const next: BOMRow = {
      id: `bom-local-${Date.now()}`,
      finishedCode,
      finishedName: finishedCode,
      materialCode,
      materialName: materialCode,
      qtyPerUnit: 1,
      uom: 'kg',
      costPerUnitThb: 100,
      leadTimeDays: 3,
      supplier: 'New Supplier',
    };
    setRowsData((prev) => [next, ...prev]);
    setNotice(`Added BOM row ${next.id}.`);
    await persist('POST', '/bom', next);
  };

  const editBom = async (row: BOMRow) => {
    const qtyInput = window.prompt(`Edit qty for ${row.materialCode}`, String(row.qtyPerUnit));
    if (!qtyInput) return;
    const qty = Number(qtyInput);
    if (!Number.isFinite(qty) || qty <= 0) {
      setNotice('Qty must be greater than zero.');
      return;
    }
    const next = { ...row, qtyPerUnit: qty };
    setRowsData((prev) => prev.map((r) => (r.id === row.id ? next : r)));
    setNotice(`Updated ${row.materialCode}.`);
    await persist('PUT', `/bom/${row.id}`, next);
  };

  const deleteBom = async (row: BOMRow) => {
    if (!window.confirm(`Delete BOM row ${row.id}?`)) return;
    setRowsData((prev) => prev.filter((r) => r.id !== row.id));
    setNotice(`Deleted ${row.id}.`);
    await persist('DELETE', `/bom/${row.id}`);
  };

  const grouped = useMemo(() => {
    const g: Record<string, typeof bomData> = {};
    rowsData.forEach((row) => {
      g[row.finishedCode] = g[row.finishedCode] ?? [];
      g[row.finishedCode].push(row);
    });
    return g;
  }, [rowsData]);

  const codes = Object.keys(grouped).filter((c) => {
    if (!q) return true;
    const rows = grouped[c];
    return (
      c.toLowerCase().includes(q.toLowerCase()) ||
      rows.some((r) => r.materialName.toLowerCase().includes(q.toLowerCase()))
    );
  });

  const toggle = (code: string) => setOpen((o) => ({ ...o, [code]: !o[code] }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bill of Materials</h1>
          <p className="mt-1 text-slate-600">โครงสร้าง BOM ต่อผลิตภัณฑ์สำเร็จรูป</p>
        </div>
        <button
          type="button"
          onClick={() => void addBom()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add BOM Entry
        </button>
      </header>
      {notice ? <p className="text-sm text-blue-700">{notice}</p> : null}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search finished product or material..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2" />
                <th className="px-3 py-2">Finished Product</th>
                <th className="px-3 py-2">Raw Material</th>
                <th className="px-3 py-2">Qty / Unit</th>
                <th className="px-3 py-2">UOM</th>
                <th className="px-3 py-2">Cost / Unit</th>
                <th className="px-3 py-2">Total Cost</th>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.map((code) => {
                const rows = grouped[code];
                const expanded = open[code] !== false;
                return (
                  <Fragment key={code}>
                    <tr className="bg-slate-50/80">
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => toggle(code)} className="text-slate-600 hover:text-slate-900">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td colSpan={9} className="px-3 py-2 font-semibold text-slate-900">
                        {rows[0].finishedName}{' '}
                        <span className="ml-2 inline-block align-middle">
                          <Badge variant="info">{code}</Badge>
                        </span>
                      </td>
                    </tr>
                    {expanded &&
                      rows.map((r) => {
                        const total = r.qtyPerUnit * r.costPerUnitThb;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2 text-slate-400">—</td>
                            <td className="px-3 py-2">
                              {r.materialName}{' '}
                              <span className="font-mono text-xs text-violet-700">{r.materialCode}</span>
                            </td>
                            <td className="px-3 py-2 tabular-nums">{r.qtyPerUnit}</td>
                            <td className="px-3 py-2">{r.uom}</td>
                            <td className="px-3 py-2 tabular-nums">฿{r.costPerUnitThb.toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums font-medium">฿{total.toFixed(2)}</td>
                            <td className="px-3 py-2">{r.leadTimeDays}d</td>
                            <td className="px-3 py-2">{r.supplier}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <IconButton title="Edit" onClick={() => void editBom(r)}>
                                  <Pencil className="h-4 w-4" />
                                </IconButton>
                                <IconButton title="Delete" onClick={() => void deleteBom(r)}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
