import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  CheckCircle2,
  Cloud,
  Database,
  FileSpreadsheet,
  Globe2,
  Link2,
  Upload,
  Wifi,
  XCircle,
} from 'lucide-react';
import { APP_TODAY, addDays, formatDateISO } from '../lib/calculations';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { loadInputSectionData } from '../lib/inputData';
import { forecastSeries30, products } from '../lib/mockData';
import { buildMlFeatureRows, cleanSalesRows, generateSyntheticRows, type CleanedSalesRow, type MlFeatureRow } from '../lib/mlPipeline';
import { Badge, Card } from './ui';

const tabs = ['Dashboard', 'Manual Entry', 'Excel Upload', 'API Import', 'External Factors'] as const;

function buildUploadedRecordRows(
  row: { date: string; records: number; source: string; status: string },
  branchCodes: string[],
) {
  const branches = branchCodes.length ? branchCodes : ['CPB-001', 'SPG-002', 'T21-003', 'MBK-006'];
  const products = ['PROD-001', 'PROD-002'];
  const safeCount = Math.max(0, row.records);
  return Array.from({ length: safeCount }, (_, i) => {
    const quantity = 20 + ((i * 7) % 180);
    const unitPrice = i % 2 === 0 ? 185 : 65;
    return {
      line: i + 1,
      txId: `${row.source.slice(0, 2).toUpperCase()}-${row.date.replaceAll('-', '')}-${String(i + 1).padStart(4, '0')}`,
      date: row.date,
      branchCode: branches[i % branches.length],
      productCode: products[i % products.length],
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      status: row.status === 'Success' ? 'Accepted' : i % 5 === 0 ? 'Rejected' : 'Pending review',
      changeNote: '',
    };
  });
}

export function InputSection() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Dashboard');
  const [rangeEnd, setRangeEnd] = useState(formatDateISO(APP_TODAY));
  const [rangeStart, setRangeStart] = useState(formatDateISO(addDays(APP_TODAY, -6)));
  const [data, setData] = useState<Awaited<ReturnType<typeof loadInputSectionData>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);
    loadInputSectionData(controller.signal)
      .then((res) => setData(res))
      .catch(() => setLoadError('Unable to load data from API.'))
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const branchRows = data?.branches ?? [];
  const importRows = data?.importLog ?? [];
  const apiBranchRows = data?.apiBranches ?? [];

  const [manual, setManual] = useState({
    date: formatDateISO(APP_TODAY),
    branch: '',
    product: 'PROD-001',
    quantity: '120',
    price: '185',
    notes: '',
  });
  const [manualErr, setManualErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cleanedRows, setCleanedRows] = useState<CleanedSalesRow[]>([]);
  const [mlRows, setMlRows] = useState<MlFeatureRow[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<string | null>(null);
  const [selectedImportRow, setSelectedImportRow] = useState<(typeof importRows)[number] | null>(null);
  const [editableImportRows, setEditableImportRows] = useState<ReturnType<typeof buildUploadedRecordRows>>([]);

  useEffect(() => {
    if (!manual.branch && branchRows.length > 0) {
      setManual((current) => ({ ...current, branch: branchRows[0].code }));
    }
  }, [branchRows, manual.branch]);

  const summary = useMemo(() => {
    const slice = importRows.filter((r) => r.date >= rangeStart && r.date <= rangeEnd);
    const bySource = slice.reduce<Record<string, number>>((acc, r) => {
      acc[r.source] = (acc[r.source] ?? 0) + r.records;
      return acc;
    }, {});
    return { slice, bySource };
  }, [importRows, rangeEnd, rangeStart]);
  const uploadedRecordRows = useMemo(
    () => editableImportRows,
    [editableImportRows],
  );
  const productCodeOptions = useMemo(() => [...new Set(products.map((p) => p.code))], []);

  useEffect(() => {
    if (!selectedImportRow) {
      setEditableImportRows([]);
      return;
    }
    setEditableImportRows(buildUploadedRecordRows(selectedImportRow, branchRows.map((b) => b.code)));
  }, [selectedImportRow, branchRows]);

  const updateUploadedRow = (
    txId: string,
    patch: Partial<{
      date: string;
      productCode: string;
      quantity: number;
      changeNote: string;
    }>,
  ) => {
    setEditableImportRows((prev) =>
      prev.map((row) => {
        if (row.txId !== txId) return row;
        const nextQuantity = patch.quantity ?? row.quantity;
        return {
          ...row,
          ...patch,
          quantity: nextQuantity,
          total: nextQuantity * row.unitPrice,
        };
      }),
    );
  };

  async function persist(path: string, body?: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest(path, { method: 'POST', body });
    } catch {
      setNotice('Backend update failed — local action completed.');
    }
  }

  const sampleRawRows = useMemo(
    () =>
      forecastSeries30.map((row, i) => ({
        date: row.date,
        branchCode: row.branchCode,
        productCode: row.product,
        quantity: i % 10 === 0 ? `${row.actual}` : row.actual,
        unitPrice: row.product === 'PROD-001' ? 185 : 65,
      })),
    [],
  );

  const runCleaning = () => {
    const result = cleanSalesRows(sampleRawRows);
    setCleanedRows(result.rows);
    setPipelineSummary(
      `Cleaned ${result.report.cleanedRows}/${result.report.inputRows} rows · dropped ${result.report.droppedRows} · merged duplicates ${result.report.deduplicatedRows}.`,
    );
    setNotice('Data cleaning completed.');
    void persist('/inputs/clean', result.report);
  };

  const runSyntheticBootstrap = () => {
    const base = cleanedRows.length ? cleanedRows : cleanSalesRows(sampleRawRows).rows;
    const bootstrapped = generateSyntheticRows(base, 1000);
    setCleanedRows(bootstrapped);
    setPipelineSummary(`Synthetic bootstrap generated ${bootstrapped.length.toLocaleString()} cleaned rows for ML testing.`);
    setNotice('Synthetic import generated: 1,000 rows.');
    void persist('/ml/bootstrap', { rows: bootstrapped.length });
  };

  const runFeatureEngineering = () => {
    const base = cleanedRows.length ? cleanedRows : cleanSalesRows(sampleRawRows).rows;
    const features = buildMlFeatureRows(base);
    setMlRows(features);
    setPipelineSummary(`ML dataset ready: ${features.length.toLocaleString()} feature rows (${base.length.toLocaleString()} cleaned input rows).`);
    setNotice('ML feature dataset created.');
    void persist('/ml/features', { rows: features.length });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Data Input</h1>
        <p className="mt-1 text-slate-600">Import sales data, adjust manually, and manage external data connections.</p>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Badge variant={data?.source === 'api' ? 'success' : 'neutral'}>
            {data?.source === 'api' ? 'Live API data' : 'Fallback dataset'}
          </Badge>
          {isLoading ? <span className="text-slate-500">Loading...</span> : null}
          {loadError ? <span className="text-red-600">{loadError}</span> : null}
        </div>
        {notice ? <p className="mt-1 text-sm text-blue-700">{notice}</p> : null}
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Dashboard' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <CalendarRange className="h-4 w-4" /> Start
                </span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-slate-700">End</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
              <p className="text-xs text-slate-500">Default view shows the latest 7 days.</p>
            </div>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(summary.bySource).map(([src, n]) => (
              <Card key={src}>
                <p className="text-xs uppercase text-slate-500">Imports · {src}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{n.toLocaleString()}</p>
                <p className="text-xs text-slate-600">records in range</p>
              </Card>
            ))}
          </div>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Imported Data</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Records</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.slice.map((row) => (
                    <tr key={row.date + row.source} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2 font-mono text-xs">{row.date}</td>
                      <td className="px-3 py-2">{row.source}</td>
                      <td className="px-3 py-2 tabular-nums">{row.records}</td>
                      <td className="px-3 py-2">
                        <Badge variant={row.status === 'Success' ? 'success' : 'danger'}>{row.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImportRow(row);
                            setNotice(`Opened ${row.source} import on ${row.date}.`);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedImportRow ? (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Import Detail</h3>
                    <p className="mt-1 text-xs text-slate-600">Selected log entry for inspection before ML processing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedImportRow(null)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-100 bg-white p-2">
                    <p className="text-[11px] uppercase text-slate-500">Date</p>
                    <p className="mt-1 font-mono text-xs text-slate-900">{selectedImportRow.date}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-2">
                    <p className="text-[11px] uppercase text-slate-500">Source</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedImportRow.source}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-2">
                    <p className="text-[11px] uppercase text-slate-500">Records</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                      {selectedImportRow.records.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-2">
                    <p className="text-[11px] uppercase text-slate-500">Status</p>
                    <div className="mt-1">
                      <Badge variant={selectedImportRow.status === 'Success' ? 'success' : 'danger'}>
                        {selectedImportRow.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-700">
                    Uploaded records ({uploadedRecordRows.length.toLocaleString()} rows)
                  </p>
                  <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">TX ID</th>
                          <th className="px-2 py-2">Date</th>
                          <th className="px-2 py-2">Branch</th>
                          <th className="px-2 py-2">Product Code</th>
                          <th className="px-2 py-2">Qty</th>
                          <th className="px-2 py-2">Price</th>
                          <th className="px-2 py-2">Total</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Change Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {uploadedRecordRows.map((r) => (
                          <tr key={r.txId} className="hover:bg-slate-50/80">
                            <td className="px-2 py-1.5 tabular-nums text-slate-500">{r.line}</td>
                            <td className="px-2 py-1.5 font-mono text-[11px] text-slate-700">{r.txId}</td>
                            <td className="px-2 py-1.5">
                              <input
                                type="date"
                                value={r.date}
                                onChange={(e) => updateUploadedRow(r.txId, { date: e.target.value })}
                                className="w-32 rounded border border-slate-200 px-1.5 py-1 text-[11px]"
                              />
                            </td>
                            <td className="px-2 py-1.5">{r.branchCode}</td>
                            <td className="px-2 py-1.5">
                              <select
                                value={r.productCode}
                                onChange={(e) => updateUploadedRow(r.txId, { productCode: e.target.value })}
                                className="w-36 rounded border border-slate-200 px-1.5 py-1 text-[11px]"
                              >
                                {productCodeOptions.map((code) => (
                                  <option key={code} value={code}>
                                    {code}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={r.quantity}
                                onChange={(e) => {
                                  const digitsOnly = e.target.value.replace(/[^\d]/g, '');
                                  const normalizedRaw = digitsOnly.replace(/^0+(?=\d)/, '');
                                  const parsed = normalizedRaw === '' ? 0 : Number(normalizedRaw);
                                  updateUploadedRow(r.txId, {
                                    quantity: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                                  });
                                }}
                                className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-[11px]"
                              />
                            </td>
                            <td className="px-2 py-1.5 tabular-nums">฿{r.unitPrice.toLocaleString()}</td>
                            <td className="px-2 py-1.5 tabular-nums">฿{r.total.toLocaleString()}</td>
                            <td className="px-2 py-1.5">
                              <Badge variant={r.status === 'Accepted' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warn'}>
                                {r.status}
                              </Badge>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={r.changeNote}
                                onChange={(e) => updateUploadedRow(r.txId, { changeNote: e.target.value })}
                                placeholder="Reason for change"
                                className="w-52 rounded border border-slate-200 px-2 py-1 text-[11px]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {tab === 'Manual Entry' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Manual Entry</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!manual.quantity || Number(manual.quantity) <= 0) {
                setManualErr('Quantity must be positive');
                return;
              }
              setManualErr(null);
              setNotice('Manual entry submitted.');
              void persist('/inputs/manual', manual);
            }}
          >
            {(['date', 'branch', 'product', 'quantity', 'price', 'notes'] as const).map((field) => (
              <label key={field} className="text-sm">
                <span className="font-medium capitalize text-slate-700">{field}</span>
                {field === 'branch' ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={manual.branch}
                    onChange={(e) => setManual((m) => ({ ...m, branch: e.target.value }))}
                  >
                    {branchRows.map((b) => (
                      <option key={b.id} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                ) : field === 'product' ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={manual.product}
                    onChange={(e) => setManual((m) => ({ ...m, product: e.target.value }))}
                  >
                    <option value="PROD-001">PROD-001 Chocolate Cake</option>
                    <option value="PROD-002">PROD-002 Butter Croissant</option>
                  </select>
                ) : field === 'notes' ? (
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2"
                    rows={3}
                    value={manual.notes}
                    onChange={(e) => setManual((m) => ({ ...m, notes: e.target.value }))}
                  />
                ) : (
                  <input
                    type={field === 'date' ? 'date' : 'text'}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={manual[field]}
                    onChange={(e) => setManual((m) => ({ ...m, [field]: e.target.value }))}
                  />
                )}
              </label>
            ))}
            {manualErr ? <p className="text-sm text-red-600 sm:col-span-2">{manualErr}</p> : null}
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'Excel Upload' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Excel Upload</h2>
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
            <Upload className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-2 font-medium text-slate-800">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
            <p className="text-sm text-slate-600">รองรับ .xlsx — ตรวจสอบคอลัมน์ก่อนนำเข้า</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setNotice('Template download started.')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Template
              </button>
              <Badge variant="info">Template validation enabled</Badge>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">ML Readiness Pipeline</h3>
            <p className="mt-1 text-xs text-slate-600">
              Process order: Clean data → Generate synthetic rows when data is insufficient → Build ML features.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runCleaning}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                1) Clean Data
              </button>
              <button
                type="button"
                onClick={runSyntheticBootstrap}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                2) Bootstrap Synthetic
              </button>
              <button
                type="button"
                onClick={runFeatureEngineering}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                3) Build ML Features
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Cleaned rows</p>
                <p className="text-lg font-semibold text-slate-900">{cleanedRows.length.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <p className="text-xs text-slate-500">ML feature rows</p>
                <p className="text-lg font-semibold text-slate-900">{mlRows.length.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Cold-start status</p>
                <p className="text-lg font-semibold text-slate-900">{cleanedRows.length >= 180 ? 'Ready' : 'Need bootstrap'}</p>
              </div>
            </div>
            {pipelineSummary ? <p className="mt-2 text-xs text-blue-700">{pipelineSummary}</p> : null}
          </div>
        </Card>
      )}

      {tab === 'API Import' && (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Globe2 className="h-5 w-5 text-blue-600" />
            API Import
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">Endpoint</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last Sync</th>
                  <th className="px-3 py-2">Points</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apiBranchRows.map((r) => (
                  <tr key={r.branchName} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-medium">{r.branchName}</td>
                    <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-slate-600">{r.endpoint}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        {r.status === 'Connected' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Badge
                          variant={
                            r.status === 'Connected' ? 'success' : r.status === 'Error' ? 'danger' : 'neutral'
                          }
                        >
                          {r.status}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.lastSync}</td>
                    <td className="px-3 py-2 tabular-nums">{r.dataPoints.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(`Validation requested for ${r.branchName}.`);
                            void persist('/integrations/validate', { branchName: r.branchName, endpoint: r.endpoint });
                          }}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Validate
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotice(`Configure requested for ${r.branchName}.`)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Configure
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'External Factors' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <Cloud className="h-5 w-5 text-sky-600" />
              Weather API
            </h3>
            <p className="mt-2 text-sm text-slate-600">Endpoint: https://api.weather.example/bkk</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="success">Connected</Badge>
              <span className="text-xs text-slate-600">Data points: 1,247</span>
            </div>
          </Card>
          <Card>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <CalendarRange className="h-5 w-5 text-violet-600" />
              Holidays
            </h3>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              <li>Songkran, King&apos;s Birthday, New Year</li>
              <li>Local holidays by region — date picker for custom</li>
            </ul>
            <input type="date" className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-900">Fuel Prices</h3>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded border-slate-300" />
              Enable real-time sync
            </label>
            <p className="mt-1 text-xs text-slate-600">Historical points: 365 days</p>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-900">Population Data</h3>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded border-slate-300" />
              Enable regional breakdown
            </label>
            <ul className="mt-2 text-xs text-slate-600">
              <li>Bangkok Metro · North · Northeast · Central · South</li>
            </ul>
          </Card>
          <Card>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <Wifi className="h-5 w-5 text-amber-600" />
              Traffic Data
            </h3>
            <p className="text-sm text-slate-600">API integration — monitoring points connected</p>
            <div className="mt-2">
              <Badge variant="success">Connected</Badge>
            </div>
          </Card>
          <Card>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <Database className="h-5 w-5 text-slate-700" />
              Custom Factors
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li className="flex justify-between">
                <span>Competitor Promotions</span>
                <span className="font-mono text-xs">14 entries</span>
              </li>
              <li className="flex justify-between">
                <span>Marketing Campaigns</span>
                <span className="font-mono text-xs">9 entries</span>
              </li>
              <li className="flex justify-between">
                <span>Special Events</span>
                <span className="font-mono text-xs">6 entries</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setNotice('Custom factor mapping manager opened.')}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              <Link2 className="h-4 w-4" />
              Manage mappings
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}
