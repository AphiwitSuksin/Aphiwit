import { addDays, formatDateISO, mean } from './calculations';

export type RawSalesRow = {
  date: string;
  branchCode: string;
  productCode: string;
  quantity: number | string;
  unitPrice: number | string;
};

export type CleanedSalesRow = {
  date: string;
  branchCode: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
};

export type CleaningReport = {
  inputRows: number;
  cleanedRows: number;
  droppedRows: number;
  deduplicatedRows: number;
};

export type MlFeatureRow = {
  date: string;
  branchCode: string;
  productCode: string;
  quantity: number;
  revenue: number;
  lag1Qty: number;
  lag7Qty: number;
  rolling7dQtyMean: number;
  dayOfWeek: number;
  isWeekend: boolean;
};

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toDateIso(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return formatDateISO(d);
}

function toPositiveNumber(input: number | string) {
  const n = typeof input === 'number' ? input : Number(String(input).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function cleanSalesRows(rows: RawSalesRow[]) {
  const aggregated = new Map<string, CleanedSalesRow>();
  let droppedRows = 0;

  for (const row of rows) {
    const date = toDateIso(row.date);
    const branchCode = row.branchCode.trim().toUpperCase();
    const productCode = row.productCode.trim().toUpperCase();
    const quantity = toPositiveNumber(row.quantity);
    const unitPrice = toPositiveNumber(row.unitPrice);

    if (!date || !branchCode || !productCode || quantity === null || unitPrice === null) {
      droppedRows++;
      continue;
    }

    const key = `${date}|${branchCode}|${productCode}`;
    const existing = aggregated.get(key);
    if (!existing) {
      aggregated.set(key, {
        date,
        branchCode,
        productCode,
        quantity,
        unitPrice,
        revenue: quantity * unitPrice,
      });
      continue;
    }

    const mergedQty = existing.quantity + quantity;
    const mergedRevenue = existing.revenue + quantity * unitPrice;
    aggregated.set(key, {
      ...existing,
      quantity: mergedQty,
      unitPrice: mergedQty > 0 ? mergedRevenue / mergedQty : existing.unitPrice,
      revenue: mergedRevenue,
    });
  }

  const cleanedRows = [...aggregated.values()].sort((a, b) =>
    a.date === b.date ? a.branchCode.localeCompare(b.branchCode) : a.date.localeCompare(b.date),
  );
  const report: CleaningReport = {
    inputRows: rows.length,
    cleanedRows: cleanedRows.length,
    droppedRows,
    deduplicatedRows: rows.length - droppedRows - cleanedRows.length,
  };
  return { rows: cleanedRows, report };
}

export function generateSyntheticRows(seedRows: CleanedSalesRow[], minRows = 360) {
  if (seedRows.length >= minRows) return seedRows;
  const safeSeed =
    seedRows.length > 0
      ? seedRows
      : [
          {
            date: formatDateISO(new Date()),
            branchCode: 'CPB-001',
            productCode: 'PROD-001',
            quantity: 120,
            unitPrice: 185,
            revenue: 120 * 185,
          },
        ];

  const out = [...safeSeed];
  const qtyMean = mean(safeSeed.map((r) => r.quantity)) || 100;
  const priceMean = mean(safeSeed.map((r) => r.unitPrice)) || 180;
  const lastDate = new Date(safeSeed[safeSeed.length - 1].date);

  for (let i = out.length; i < minRows; i++) {
    const template = safeSeed[i % safeSeed.length];
    const date = formatDateISO(addDays(lastDate, i - safeSeed.length + 1));
    const weekly = 1 + Math.sin(i / 7) * 0.08;
    const trend = 1 + i * 0.0006;
    const qty = clampNumber(Math.round(template.quantity * weekly * trend), 10, Math.round(qtyMean * 3));
    const unitPrice = clampNumber(Number((template.unitPrice * (1 + Math.sin(i / 11) * 0.01)).toFixed(2)), 1, priceMean * 2);
    out.push({
      date,
      branchCode: template.branchCode,
      productCode: template.productCode,
      quantity: qty,
      unitPrice,
      revenue: Number((qty * unitPrice).toFixed(2)),
    });
  }
  return out;
}

export function buildMlFeatureRows(rows: CleanedSalesRow[]) {
  const bySeries = new Map<string, CleanedSalesRow[]>();
  for (const row of rows) {
    const key = `${row.branchCode}|${row.productCode}`;
    const arr = bySeries.get(key) ?? [];
    arr.push(row);
    bySeries.set(key, arr);
  }

  const features: MlFeatureRow[] = [];
  for (const seriesRows of bySeries.values()) {
    const sorted = [...seriesRows].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];
      const lag1Qty = i > 0 ? sorted[i - 1].quantity : row.quantity;
      const lag7Qty = i >= 7 ? sorted[i - 7].quantity : row.quantity;
      const window = sorted.slice(Math.max(0, i - 6), i + 1).map((x) => x.quantity);
      const d = new Date(`${row.date}T00:00:00`);
      const dayOfWeek = d.getDay();
      features.push({
        date: row.date,
        branchCode: row.branchCode,
        productCode: row.productCode,
        quantity: row.quantity,
        revenue: row.revenue,
        lag1Qty,
        lag7Qty,
        rolling7dQtyMean: Number(mean(window).toFixed(2)),
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
  }
  return features.sort((a, b) => (a.date === b.date ? a.branchCode.localeCompare(b.branchCode) : a.date.localeCompare(b.date)));
}
