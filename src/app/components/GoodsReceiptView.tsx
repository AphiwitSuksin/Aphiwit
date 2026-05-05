import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { goodsReceipts, type GRRow } from '../lib/mockData';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { loadGoodsReceipts } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card, IconButton } from './ui';

export function GoodsReceiptView() {
  const { data: grRows } = useApiData(loadGoodsReceipts, goodsReceipts);
  const [mutableRows, setMutableRows] = useState<GRRow[]>(grRows);
  const [q, setQ] = useState('');
  const [qc, setQc] = useState<'All' | 'Pass' | 'Pending' | 'Fail'>('All');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMutableRows(grRows);
  }, [grRows]);

  async function persist(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest<unknown>(path, { method, body });
    } catch {
      setNotice('Backend update failed — local view was updated.');
    }
  }

  const recordReceipt = async () => {
    const poRef = window.prompt('PO reference', 'PO-2026-001');
    if (!poRef) return;
    const supplier = window.prompt('Supplier', 'New Supplier Co.');
    if (!supplier) return;
    const qtyInput = window.prompt('Quantity', '100');
    if (!qtyInput) return;
    const quantity = Number(qtyInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setNotice('Quantity must be greater than zero.');
      return;
    }
    const row: GRRow = {
      id: `gr-local-${Date.now()}`,
      grNumber: `GR-LOCAL-${String(mutableRows.length + 1).padStart(3, '0')}`,
      receiptDate: new Date().toISOString().slice(0, 10),
      poRef,
      supplier,
      products: ['RM-102'],
      quantity,
      qc: 'Pending',
      inspector: 'Pending',
      notes: 'Created from UI',
    };
    setMutableRows((prev) => [row, ...prev]);
    setNotice('Goods receipt recorded.');
    await persist('POST', '/goods-receipts', row);
  };

  const editReceipt = async (row: GRRow) => {
    const qcInput = window.prompt(`QC status for ${row.grNumber}: Pass / Pending / Fail`, row.qc);
    if (!qcInput) return;
    if (!['Pass', 'Pending', 'Fail'].includes(qcInput)) {
      setNotice('Invalid QC value.');
      return;
    }
    const next: GRRow = { ...row, qc: qcInput as GRRow['qc'] };
    setMutableRows((prev) => prev.map((r) => (r.id === row.id ? next : r)));
    setNotice(`Updated ${row.grNumber}.`);
    await persist('PUT', `/goods-receipts/${row.id}`, next);
  };

  const deleteReceipt = async (row: GRRow) => {
    if (!window.confirm(`Delete ${row.grNumber}?`)) return;
    setMutableRows((prev) => prev.filter((r) => r.id !== row.id));
    setNotice(`Deleted ${row.grNumber}.`);
    await persist('DELETE', `/goods-receipts/${row.id}`);
  };

  const rows = useMemo(() => {
    return mutableRows.filter((r) => {
      if (qc !== 'All' && r.qc !== qc) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        r.grNumber.toLowerCase().includes(s) ||
        r.poRef.toLowerCase().includes(s) ||
        r.supplier.toLowerCase().includes(s)
      );
    });
  }, [mutableRows, q, qc]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goods Receipt</h1>
          <p className="mt-1 text-slate-600">บันทึกการรับสินค้าและสถานะ QC เชื่อมโยง PO</p>
        </div>
        <button
          type="button"
          onClick={() => void recordReceipt()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Record Receipt
        </button>
      </header>
      {notice ? <p className="text-sm text-blue-700">{notice}</p> : null}

      <Card>
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="GR, PO, supplier..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <select
            value={qc}
            onChange={(e) => setQc(e.target.value as typeof qc)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Pass</option>
            <option>Pending</option>
            <option>Fail</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">GR #</th>
                <th className="px-3 py-2">Receipt Date</th>
                <th className="px-3 py-2">PO Ref</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Products</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">QC</th>
                <th className="px-3 py-2">Inspector</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{r.grNumber}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.receiptDate}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.poRef}</td>
                  <td className="px-3 py-2">{r.supplier}</td>
                  <td className="px-3 py-2">
                    <ul className="text-xs">
                      {r.products.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.quantity}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={r.qc === 'Pass' ? 'success' : r.qc === 'Pending' ? 'warn' : 'danger'}
                    >
                      {r.qc}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{r.inspector}</td>
                  <td className="max-w-xs px-3 py-2 text-xs text-slate-600">{r.notes}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <IconButton title="Edit" onClick={() => void editReceipt(r)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton title="Delete" onClick={() => void deleteReceipt(r)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
