import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Package, Pencil, Search, Trash2, X } from 'lucide-react';
import { products, type ProductRow } from '../lib/mockData';
import { productCatalogService } from '../lib/productCatalogService';
import { Badge, Card, IconButton } from './ui';

const productTypeOptions: ProductRow['type'][] = [
  'Product',
  'วัตถุดิบ',
  'วัตถุดิบสิ้นเปลือง',
  'อุปกรณ์',
  'เครื่องใช้',
  'อื่นๆ',
  'Raw Material',
  'Finished Product',
];
const unitOptions = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'box', 'set', 'tray', 'bag'] as const;

export function ProductDatabaseView() {
  const [mutableProducts, setMutableProducts] = useState<ProductRow[]>(products);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'local'>('local');
  const [q, setQ] = useState('');
  const [type, setType] = useState<'All Types' | ProductRow['type']>('All Types');
  const [notice, setNotice] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    code: string;
    type: ProductRow['type'];
    supplier: string;
    detail: string;
    unit: string;
    currency: NonNullable<ProductRow['currency']>;
    price: string;
    leadTimeDays: string;
    moq: string;
    spq: string;
    risk: ProductRow['risk'];
  } | null>(null);
  const [newProduct, setNewProduct] = useState({
    code: '',
    type: 'Product' as ProductRow['type'],
    supplier: '',
    detail: '',
    unit: 'pcs',
    currency: 'THB' as NonNullable<ProductRow['currency']>,
    priceThb: '',
    moq: '',
    spq: '',
    leadTimeDays: '',
  });

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    const source = productCatalogService.getDataSourceLabel();
    productCatalogService
      .listProducts(controller.signal)
      .then((rows) => {
        setMutableProducts(rows);
        setConnectionStatus(source === 'fallback' ? 'local' : 'connected');
      })
      .catch(() => {
        setMutableProducts(products);
        setConnectionStatus(source === 'fallback' ? 'local' : 'disconnected');
        setNotice('Unable to load remote products. Showing fallback dataset.');
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const startEditProduct = (row: ProductRow) => {
    setEditingCode(row.code);
    setEditDraft({
      code: row.code,
      type: row.type,
      supplier: row.supplier,
      detail: row.detail ?? '',
      unit: row.unit ?? 'pcs',
      currency: row.currency ?? 'THB',
      price: String((row.currency ?? 'THB') === 'USD' ? row.priceUsd : row.priceThb),
      leadTimeDays: String(row.leadTimeDays),
      moq: String(row.moq),
      spq: String(row.spq),
      risk: row.risk,
    });
  };

  const cancelEditProduct = () => {
    setEditingCode(null);
    setEditDraft(null);
  };

  const saveEditProduct = async (row: ProductRow) => {
    if (!editDraft) return;
    const code = editDraft.code.trim().toUpperCase();
    const supplier = editDraft.supplier.trim();
    const detail = editDraft.detail.trim();
    const unit = editDraft.unit.trim();
    const price = Number(editDraft.price);
    const leadTimeDays = Number(editDraft.leadTimeDays);
    const moq = Number(editDraft.moq);
    const spq = Number(editDraft.spq);

    if (!code) {
      setNotice('Code is required.');
      return;
    }
    if (mutableProducts.some((p) => p.code === code && p.code !== row.code)) {
      setNotice(`Code ${code} already exists.`);
      return;
    }
    if (!supplier || !unit) {
      setNotice('Supplier and Unit are required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setNotice('Price must be 0 or greater.');
      return;
    }
    if (![leadTimeDays, moq, spq].every((n) => Number.isFinite(n) && n >= 0 && Number.isInteger(n))) {
      setNotice('Lead time, MOQ and SPQ must be whole numbers (0 or greater).');
      return;
    }

    const usdRate = 36;
    const normalizedPriceThb = editDraft.currency === 'USD' ? price * usdRate : price;
    const normalizedPriceUsd = editDraft.currency === 'USD' ? price : price / usdRate;
    const next: ProductRow = {
      ...row,
      code,
      type: editDraft.type,
      supplier,
      detail,
      unit,
      currency: editDraft.currency,
      priceThb: Number(normalizedPriceThb.toFixed(2)),
      priceUsd: Number(normalizedPriceUsd.toFixed(2)),
      leadTimeDays,
      moq,
      spq,
      risk: editDraft.risk,
      name: code,
    };

    setMutableProducts((prev) => prev.map((p) => (p.code === row.code ? next : p)));
    setNotice(`Updated ${code}.`);
    cancelEditProduct();
    try {
      await productCatalogService.updateProduct(row.code, next);
    } catch {
      setNotice('Remote update failed — local view was updated.');
    }
  };

  const addProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = newProduct.code.trim().toUpperCase();
    const supplier = newProduct.supplier.trim();
    const detail = newProduct.detail.trim();
    const unit = newProduct.unit.trim();
    const priceThb = Number(newProduct.priceThb);
    const moq = Number(newProduct.moq);
    const spq = Number(newProduct.spq);
    const leadTimeDays = Number(newProduct.leadTimeDays);

    if (!code) {
      setNotice('Code is required.');
      return;
    }
    if (mutableProducts.some((p) => p.code.toUpperCase() === code)) {
      setNotice(`Code ${code} already exists.`);
      return;
    }
    if (!supplier) {
      setNotice('Supplier is required.');
      return;
    }
    if (!unit) {
      setNotice('Unit is required.');
      return;
    }
    if (!Number.isFinite(priceThb) || priceThb < 0) {
      setNotice('Price must be 0 or greater.');
      return;
    }
    if (!Number.isFinite(moq) || moq < 0 || !Number.isInteger(moq)) {
      setNotice('MOQ must be a whole number (0 or greater).');
      return;
    }
    if (!Number.isFinite(spq) || spq < 0 || !Number.isInteger(spq)) {
      setNotice('SPQ must be a whole number (0 or greater).');
      return;
    }
    if (!Number.isFinite(leadTimeDays) || leadTimeDays < 0 || !Number.isInteger(leadTimeDays)) {
      setNotice('Lead time must be a whole number of days (0 or greater).');
      return;
    }

    const usdRate = 36;
    const inputPrice = priceThb;
    const normalizedPriceThb = newProduct.currency === 'USD' ? inputPrice * usdRate : inputPrice;
    const normalizedPriceUsd = newProduct.currency === 'USD' ? inputPrice : inputPrice / usdRate;
    const row: ProductRow = {
      code,
      type: newProduct.type,
      supplier,
      detail,
      unit,
      currency: newProduct.currency,
      name: code,
      shelfLifeMonths: 0,
      priceThb: Number(normalizedPriceThb.toFixed(2)),
      priceUsd: Number(normalizedPriceUsd.toFixed(2)),
      leadTimeDays,
      moq,
      spq,
      risk: 'Medium',
    };

    setMutableProducts((prev) => [row, ...prev]);
    setNewProduct({
      code: '',
      type: 'Product',
      supplier: '',
      detail: '',
      unit: 'pcs',
      currency: 'THB',
      priceThb: '',
      moq: '',
      spq: '',
      leadTimeDays: '',
    });
    setNotice(`Added ${code}.`);
    try {
      await productCatalogService.createProduct(row);
    } catch {
      setNotice('Remote create failed — local view was updated.');
    }
  };

  const deleteProduct = async (row: ProductRow) => {
    if (!window.confirm(`Delete ${row.code}?`)) return;
    setMutableProducts((prev) => prev.filter((p) => p.code !== row.code));
    setNotice(`Deleted ${row.code}.`);
    try {
      await productCatalogService.deleteProduct(row.code);
    } catch {
      setNotice('Remote delete failed — local view was updated.');
    }
  };

  const rows = useMemo(() => {
    return mutableProducts.filter((p) => {
      if (type !== 'All Types' && p.type !== type) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return p.code.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || p.supplier.toLowerCase().includes(s);
    });
  }, [mutableProducts, q, type]);

  const detailSuggestions = useMemo(() => {
    const fromExisting = mutableProducts
      .flatMap((p) => [p.detail, p.name])
      .filter((v): v is string => Boolean(v && v.trim()))
      .map((v) => v.trim());
    const fromType: Record<ProductRow['type'], string[]> = {
      Product: ['สินค้าสำเร็จรูปพร้อมขายหน้าร้าน', 'สินค้าโปรโมชั่นประจำสัปดาห์'],
      วัตถุดิบ: ['วัตถุดิบหลักสำหรับการผลิต', 'วัตถุดิบแห้งเก็บในคลัง'],
      วัตถุดิบสิ้นเปลือง: ['วัสดุสิ้นเปลืองใช้ในกระบวนการผลิต', 'ใช้แล้วหมดภายในรอบสัปดาห์'],
      อุปกรณ์: ['อุปกรณ์งานครัว/งานผลิต', 'อุปกรณ์สำหรับควบคุมคุณภาพ'],
      เครื่องใช้: ['เครื่องใช้สำนักงานและหน้าร้าน', 'เครื่องใช้ไฟฟ้าสำหรับปฏิบัติงาน'],
      อื่นๆ: ['รายการอื่นๆ นอกหมวดมาตรฐาน'],
      'Raw Material': ['Core production raw material', 'Dry stock ingredient'],
      'Finished Product': ['Ready-to-sell finished item', 'Front-of-house product item'],
    };
    return [...new Set([...fromType[newProduct.type], ...fromExisting])].slice(0, 20);
  }, [mutableProducts, newProduct.type]);

  const sourceLabel = productCatalogService.getDataSourceLabel();
  const connectionDisplay =
    connectionStatus === 'connected'
      ? { label: 'Connected', dot: 'bg-emerald-500', text: 'text-emerald-700' }
      : connectionStatus === 'disconnected'
        ? { label: 'Disconnected', dot: 'bg-red-500', text: 'text-red-700' }
        : { label: 'Local mode', dot: 'bg-amber-500', text: 'text-amber-700' };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Product Database</h1>
        <p className="mt-1 text-slate-600">รหัสเดียวต่อรายการ — RM-xxx วัตถุดิบ · PROD-xxx สำเร็จรูป</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
          <p className="text-slate-500">
            Source: {sourceLabel}
            {isLoading ? ' · loading...' : ''}
          </p>
          <p className={`inline-flex items-center gap-1.5 font-medium ${connectionDisplay.text}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${connectionDisplay.dot}`} />
            Database: {connectionDisplay.label}
          </p>
        </div>
        {notice ? <p className="mt-1 text-sm text-blue-700">{notice}</p> : null}
      </header>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Add Product Item</h2>
          <button
            type="button"
            onClick={() => setIsAddFormOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            aria-expanded={isAddFormOpen}
            aria-controls="add-product-form"
          >
            {isAddFormOpen ? 'Collapse' : 'Expand'}
            {isAddFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        {isAddFormOpen ? (
          <form id="add-product-form" className="mt-3 grid gap-3 md:grid-cols-4" onSubmit={addProduct}>
            <label className="text-sm">
              <span className="font-medium text-slate-700">Code</span>
              <input
                value={newProduct.code}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="e.g. RM-201"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">Type</span>
              <select
                value={newProduct.type}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, type: e.target.value as ProductRow['type'] }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {productTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Supplier Company</span>
              <input
                value={newProduct.supplier}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, supplier: e.target.value }))}
                placeholder="Company name"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="font-medium text-slate-700">รายละเอียด</span>
              <input
                value={newProduct.detail}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, detail: e.target.value }))}
                placeholder="รายละเอียดสินค้า/วัตถุดิบ"
                list="product-detail-suggestions"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <datalist id="product-detail-suggestions">
                {detailSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">หน่วย</span>
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, unit: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">สกุลเงิน</span>
              <select
                value={newProduct.currency}
                onChange={(e) =>
                  setNewProduct((prev) => ({
                    ...prev,
                    currency: e.target.value as NonNullable<ProductRow['currency']>,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="THB">THB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">Price ({newProduct.currency})</span>
              <input
                type="number"
                min={0}
                value={newProduct.priceThb}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, priceThb: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">MOQ</span>
              <input
                type="number"
                min={0}
                value={newProduct.moq}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, moq: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">SPQ</span>
              <input
                type="number"
                min={0}
                value={newProduct.spq}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, spq: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">Lead Time (days)</span>
              <input
                type="number"
                min={0}
                value={newProduct.leadTimeDays}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, leadTimeDays: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-4">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add item
              </button>
            </div>
          </form>
        ) : null}
      </Card>

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
            {productTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
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
                <th className="px-3 py-2">Detail</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Currency</th>
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
                const riskVariant = p.risk === 'Low' ? 'success' : p.risk === 'Medium' ? 'warn' : 'danger';
                const typeVariant =
                  p.type === 'Raw Material' || p.type === 'วัตถุดิบ'
                    ? 'purple'
                    : p.type === 'Finished Product' || p.type === 'Product'
                      ? 'info'
                      : 'neutral';
                const isEditing = editingCode === p.code && editDraft !== null;
                return (
                  <tr key={p.code} className="hover:bg-slate-50/80">
                    <td className={`px-3 py-2 font-bold ${codeClass}`}>
                      {isEditing ? (
                        <input
                          value={editDraft.code}
                          onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, code: e.target.value } : prev))}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : (
                        p.code
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={editDraft.type}
                          onChange={(e) =>
                            setEditDraft((prev) => (prev ? { ...prev, type: e.target.value as ProductRow['type'] } : prev))
                          }
                          className="w-36 rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          {productTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={typeVariant}>{p.type}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          value={editDraft.supplier}
                          onChange={(e) =>
                            setEditDraft((prev) => (prev ? { ...prev, supplier: e.target.value } : prev))
                          }
                          className="w-32 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : (
                        p.supplier
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Package className="h-4 w-4 text-slate-500" />
                        {isEditing ? editDraft.code || p.name : p.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {isEditing ? (
                        <input
                          value={editDraft.detail}
                          onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, detail: e.target.value } : prev))}
                          className="w-32 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : (
                        p.detail || '-'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={editDraft.unit}
                          onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, unit: e.target.value } : prev))}
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          {unitOptions.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      ) : (
                        p.unit || '-'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={editDraft.currency}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, currency: e.target.value as NonNullable<ProductRow['currency']> } : prev,
                            )
                          }
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="THB">THB</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="JPY">JPY</option>
                          <option value="CNY">CNY</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      ) : (
                        p.currency || 'THB'
                      )}
                    </td>
                    <td className="px-3 py-2">{p.shelfLifeMonths ? `${p.shelfLifeMonths} mo` : `${7} days`}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editDraft.price}
                          onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : (
                        `฿${p.priceThb.toFixed(2)}`
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">${p.priceUsd.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editDraft.leadTimeDays}
                          onChange={(e) =>
                            setEditDraft((prev) => (prev ? { ...prev, leadTimeDays: e.target.value } : prev))
                          }
                          className="w-14 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : (
                        `${p.leadTimeDays}d`
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editDraft.moq}
                          onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, moq: e.target.value } : prev))}
                          className="w-14 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : (
                        p.moq
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editDraft.spq}
                          onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, spq: e.target.value } : prev))}
                          className="w-14 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : (
                        p.spq
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={editDraft.risk}
                          onChange={(e) =>
                            setEditDraft((prev) => (prev ? { ...prev, risk: e.target.value as ProductRow['risk'] } : prev))
                          }
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              p.risk === 'Low' ? 'bg-emerald-500' : p.risk === 'Medium' ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          />
                          <Badge variant={riskVariant}>{p.risk}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <IconButton title="Save" onClick={() => void saveEditProduct(p)}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </IconButton>
                            <IconButton title="Cancel" onClick={cancelEditProduct}>
                              <X className="h-4 w-4 text-slate-600" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton title="Edit" onClick={() => startEditProduct(p)}>
                              <Pencil className="h-4 w-4" />
                            </IconButton>
                            <IconButton title="Delete" onClick={() => void deleteProduct(p)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </IconButton>
                          </>
                        )}
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
