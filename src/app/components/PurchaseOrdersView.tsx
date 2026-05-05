import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FileText, Pencil, Plane, Plus, Search, Trash2, Truck } from 'lucide-react';
import { purchaseOrders, type PORow } from '../lib/mockData';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { loadPurchaseOrders } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card, IconButton } from './ui';

function shipBadge(status: (typeof purchaseOrders)[number]['shippingStatus']) {
  if (status === 'Completed') return 'success' as const;
  if (status === 'Pending confirmation') return 'warn' as const;
  if (status === 'Pending shipment') return 'info' as const;
  return 'danger' as const;
}

export function PurchaseOrdersView() {
  const { data: poRows } = useApiData(loadPurchaseOrders, purchaseOrders);
  const [mutableRows, setMutableRows] = useState<PORow[]>(poRows);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const pageSize = 3;

  useEffect(() => {
    setMutableRows(poRows);
  }, [poRows]);

  async function persist(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest<unknown>(path, { method, body });
    } catch {
      setNotice('Backend update failed — local view was updated.');
    }
  }

  const createPo = async () => {
    const productCsv = window.prompt('Product codes (comma separated)', 'RM-102,RM-101');
    if (!productCsv) return;
    const qtyInput = window.prompt('Quantity', '100');
    if (!qtyInput) return;
    const quantity = Number(qtyInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setNotice('Quantity must be greater than zero.');
      return;
    }
    const nextIdx = mutableRows.length + 1;
    const po: PORow = {
      id: `po-local-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      poNumber: `PO-LOCAL-${String(nextIdx).padStart(3, '0')}`,
      products: productCsv.split(',').map((s) => s.trim()).filter(Boolean),
      quantity,
      status: 'Normal',
      etd: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      eta: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      shippingMethod: 'Ground',
      shippingStatus: 'Pending confirmation',
    };
    setMutableRows((prev) => [po, ...prev]);
    setNotice('PO created.');
    await persist('POST', '/purchase-orders', po);
  };

  const editPo = async (row: PORow) => {
    const qtyInput = window.prompt(`Edit quantity for ${row.poNumber}`, String(row.quantity));
    if (!qtyInput) return;
    const quantity = Number(qtyInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setNotice('Quantity must be greater than zero.');
      return;
    }
    const next: PORow = { ...row, quantity };
    setMutableRows((prev) => prev.map((p) => (p.id === row.id ? next : p)));
    setNotice(`Updated ${row.poNumber}.`);
    await persist('PUT', `/purchase-orders/${row.id}`, next);
  };

  const deletePo = async (row: PORow) => {
    if (!window.confirm(`Delete ${row.poNumber}?`)) return;
    setMutableRows((prev) => prev.filter((p) => p.id !== row.id));
    setNotice(`Deleted ${row.poNumber}.`);
    await persist('DELETE', `/purchase-orders/${row.id}`);
  };

  const filtered = useMemo(() => {
    return mutableRows.filter((p) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return p.poNumber.toLowerCase().includes(s) || p.products.some((x) => x.toLowerCase().includes(s));
    });
  }, [mutableRows, q]);

  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="mt-1 text-slate-600">ติดตาม PO สถานะขนส่ง และ ETA</p>
        </div>
        <button
          type="button"
          onClick={() => void createPo()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create PO
        </button>
      </header>
      {notice ? <p className="text-sm text-blue-700">{notice}</p> : null}

      <Card>
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="PO number or product code..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/30"
          />
        </label>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">PO #</th>
                <th className="px-3 py-2">Products</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">PO Status</th>
                <th className="px-3 py-2">ETD / ETA</th>
                <th className="px-3 py-2">Shipping</th>
                <th className="px-3 py-2">Shipment Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 font-mono text-xs">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      {p.date}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold">
                      <FileText className="h-4 w-4 text-blue-600" />
                      {p.poNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <ul className="space-y-0.5 text-xs">
                      {p.products.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{p.quantity}</td>
                  <td className="px-3 py-2">
                    <Badge variant={p.status === 'Normal' ? 'success' : 'danger'}>{p.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-mono">ETD {p.etd}</div>
                    <div className="font-mono text-slate-600">ETA {p.eta}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      {p.shippingMethod === 'Air' ? (
                        <Plane className="h-4 w-4 text-sky-600" />
                      ) : (
                        <Truck className="h-4 w-4 text-amber-700" />
                      )}
                      {p.shippingMethod}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={shipBadge(p.shippingStatus)}>{p.shippingStatus}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <IconButton title="Edit" onClick={() => void editPo(p)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton title="Delete" onClick={() => void deletePo(p)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-600">
            Page {page + 1} / {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
