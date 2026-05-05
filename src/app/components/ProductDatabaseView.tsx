import { useEffect, useMemo, useState } from 'react';
import { Package, Pencil, Search, Trash2 } from 'lucide-react';
import { products, type ProductRow } from '../lib/mockData';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { loadProducts } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card, IconButton } from './ui';

export function ProductDatabaseView() {
  const { data: productData } = useApiData(loadProducts, products);
  const [mutableProducts, setMutableProducts] = useState<ProductRow[]>(productData);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'All Types' | 'Raw Material' | 'Finished Product'>('All Types');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMutableProducts(productData);
  }, [productData]);

  async function persist(method: 'PUT' | 'DELETE', path: string, body?: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest<unknown>(path, { method, body });
    } catch {
      setNotice('Backend update failed — local view was updated.');
    }
  }

  const editProduct = async (row: ProductRow) => {
    const nextPriceInput = window.prompt(`Edit THB price for ${row.code}`, String(row.priceThb));
    if (!nextPriceInput) return;
    const nextPrice = Number(nextPriceInput);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setNotice('Invalid price value.');
      return;
    }
    const next: ProductRow = { ...row, priceThb: nextPrice };
    setMutableProducts((prev) => prev.map((p) => (p.code === row.code ? next : p)));
    setNotice(`Updated ${row.code}.`);
    await persist('PUT', `/products/${row.code}`, next);
  };

  const deleteProduct = async (row: ProductRow) => {
    if (!window.confirm(`Delete ${row.code}?`)) return;
    setMutableProducts((prev) => prev.filter((p) => p.code !== row.code));
    setNotice(`Deleted ${row.code}.`);
    await persist('DELETE', `/products/${row.code}`);
  };

  const rows = useMemo(() => {
    return mutableProducts.filter((p) => {
      if (type !== 'All Types' && p.type !== type) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return p.code.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || p.supplier.toLowerCase().includes(s);
    });
  }, [mutableProducts, q, type]);

  const rmCount = mutableProducts.filter((p) => p.type === 'Raw Material').length;
  const fpCount = mutableProducts.filter((p) => p.type === 'Finished Product').length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Product Database</h1>
        <p className="mt-1 text-slate-600">รหัสเดียวต่อรายการ — RM-xxx วัตถุดิบ · PROD-xxx สำเร็จรูป</p>
        {notice ? <p className="mt-1 text-sm text-blue-700">{notice}</p> : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs uppercase text-slate-500">Raw Materials</p>
          <p className="mt-1 text-3xl font-bold text-violet-800">{rmCount}</p>
          <p className="text-xs text-slate-600">Prefix RM-</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Finished Products</p>
          <p className="mt-1 text-3xl font-bold text-blue-800">{fpCount}</p>
          <p className="text-xs text-slate-600">Prefix PROD-</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Code, name, supplier..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option>All Types</option>
            <option>Raw Material</option>
            <option>Finished Product</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Shelf Life</th>
                <th className="px-3 py-2">THB</th>
                <th className="px-3 py-2">USD</th>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">MOQ</th>
                <th className="px-3 py-2">SPQ</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => {
                const codeClass = p.code.startsWith('RM') ? 'text-violet-800' : 'text-blue-800';
                const riskVariant =
                  p.risk === 'Low' ? 'success' : p.risk === 'Medium' ? 'warn' : 'danger';
                return (
                  <tr key={p.code} className="hover:bg-slate-50/80">
                    <td className={`px-3 py-2 font-bold ${codeClass}`}>{p.code}</td>
                    <td className="px-3 py-2">
                      <Badge variant={p.type === 'Raw Material' ? 'purple' : 'info'}>{p.type}</Badge>
                    </td>
                    <td className="px-3 py-2">{p.supplier}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Package className="h-4 w-4 text-slate-500" />
                        {p.name}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {p.shelfLifeMonths ? `${p.shelfLifeMonths} mo` : `${7} days`}
                    </td>
                    <td className="px-3 py-2 tabular-nums">฿{p.priceThb.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular-nums">${p.priceUsd.toFixed(2)}</td>
                    <td className="px-3 py-2">{p.leadTimeDays}d</td>
                    <td className="px-3 py-2 tabular-nums">{p.moq}</td>
                    <td className="px-3 py-2 tabular-nums">{p.spq}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            p.risk === 'Low' ? 'bg-emerald-500' : p.risk === 'Medium' ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                        />
                        <Badge variant={riskVariant}>{p.risk}</Badge>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <IconButton title="Edit" onClick={() => void editProduct(p)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton title="Delete" onClick={() => void deleteProduct(p)}>
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
