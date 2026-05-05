import { apiRequest, getApiBaseUrl } from './api';
import { products, type ProductRow } from './mockData';

type ProductCatalogAdapter = {
  list: (signal?: AbortSignal) => Promise<ProductRow[]>;
  create: (row: ProductRow) => Promise<void>;
  update: (oldCode: string, row: ProductRow) => Promise<void>;
  remove: (code: string) => Promise<void>;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const SUPABASE_PRODUCTS_TABLE = import.meta.env.VITE_SUPABASE_PRODUCTS_TABLE ?? 'products';

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL.trim() && SUPABASE_KEY.trim());
}

type SupabaseProductRow = {
  code?: string;
  type?: ProductRow['type'];
  supplier?: string;
  name?: string;
  detail?: string;
  measure_kind?: ProductRow['measureKind'];
  measure_value?: number;
  unit?: string;
  currency?: NonNullable<ProductRow['currency']>;
  shelf_life_months?: number;
  price_thb?: number;
  price_usd?: number;
  lead_time_days?: number;
  moq?: number;
  spq?: number;
  risk?: ProductRow['risk'];
};

function normalizeRow(raw: Partial<ProductRow> | SupabaseProductRow): ProductRow {
  const shelfLifeMonths =
    typeof raw.shelfLifeMonths === 'number' ? raw.shelfLifeMonths : Number(raw.shelf_life_months ?? 0);
  const priceThb = typeof raw.priceThb === 'number' ? raw.priceThb : Number(raw.price_thb ?? 0);
  const priceUsd = typeof raw.priceUsd === 'number' ? raw.priceUsd : Number(raw.price_usd ?? 0);
  const leadTimeDays =
    typeof raw.leadTimeDays === 'number' ? raw.leadTimeDays : Number(raw.lead_time_days ?? 0);
  const measureValue =
    typeof raw.measureValue === 'number'
      ? raw.measureValue
      : typeof raw.measure_value === 'number'
        ? raw.measure_value
        : 0;
  const measureKind =
    raw.measureKind === 'ปริมาตร' || raw.measureKind === 'น้ำหนัก'
      ? raw.measureKind
      : raw.measure_kind === 'ปริมาตร' || raw.measure_kind === 'น้ำหนัก'
        ? raw.measure_kind
        : 'น้ำหนัก';
  return {
    code: String(raw.code ?? '').toUpperCase(),
    type: (raw.type ?? 'Product') as ProductRow['type'],
    supplier: String(raw.supplier ?? ''),
    name: String(raw.name ?? raw.code ?? ''),
    detail: raw.detail ? String(raw.detail) : '',
    measureKind,
    measureValue,
    unit: raw.unit ? String(raw.unit) : '',
    currency: (raw.currency ?? 'THB') as NonNullable<ProductRow['currency']>,
    shelfLifeMonths,
    priceThb,
    priceUsd,
    leadTimeDays,
    moq: Number(raw.moq ?? 0),
    spq: Number(raw.spq ?? 0),
    risk: (raw.risk ?? 'Medium') as ProductRow['risk'],
  };
}

function toSupabaseRow(row: ProductRow): SupabaseProductRow {
  return {
    code: row.code,
    type: row.type,
    supplier: row.supplier,
    name: row.name,
    detail: row.detail ?? '',
    measure_kind: row.measureKind ?? 'น้ำหนัก',
    measure_value: row.measureValue ?? 0,
    unit: row.unit ?? '',
    currency: row.currency ?? 'THB',
    shelf_life_months: row.shelfLifeMonths,
    price_thb: row.priceThb,
    price_usd: row.priceUsd,
    lead_time_days: row.leadTimeDays,
    moq: row.moq,
    spq: row.spq,
    risk: row.risk,
  };
}

async function supabaseRequest<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    signal,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase ${init.method ?? 'GET'} ${path} failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const supabaseAdapter: ProductCatalogAdapter = {
  async list(signal) {
    const rows = await supabaseRequest<SupabaseProductRow[]>(
      `${SUPABASE_PRODUCTS_TABLE}?select=*`,
      { method: 'GET' },
      signal,
    );
    return rows.map((row) => normalizeRow(row));
  },
  async create(row) {
    await supabaseRequest(
      `${SUPABASE_PRODUCTS_TABLE}`,
      {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(toSupabaseRow(row)),
      },
    );
  },
  async update(oldCode, row) {
    await supabaseRequest(
      `${SUPABASE_PRODUCTS_TABLE}?code=eq.${encodeURIComponent(oldCode)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(toSupabaseRow(row)),
      },
    );
  },
  async remove(code) {
    await supabaseRequest(
      `${SUPABASE_PRODUCTS_TABLE}?code=eq.${encodeURIComponent(code)}`,
      {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      },
    );
  },
};

const apiAdapter: ProductCatalogAdapter = {
  async list(signal) {
    return await apiRequest<ProductRow[]>('/products', { signal });
  },
  async create(row) {
    await apiRequest('/products', { method: 'POST', body: row });
  },
  async update(oldCode, row) {
    await apiRequest(`/products/${oldCode}`, { method: 'PUT', body: row });
  },
  async remove(code) {
    await apiRequest(`/products/${code}`, { method: 'DELETE' });
  },
};

const localAdapter: ProductCatalogAdapter = {
  async list() {
    return products;
  },
  async create() {},
  async update() {},
  async remove() {},
};

function getAdapter(): ProductCatalogAdapter {
  if (hasSupabaseConfig()) return supabaseAdapter;
  if (getApiBaseUrl().trim()) return apiAdapter;
  return localAdapter;
}

export const productCatalogService = {
  async listProducts(signal?: AbortSignal) {
    return await getAdapter().list(signal);
  },
  async createProduct(row: ProductRow) {
    await getAdapter().create(row);
  },
  async updateProduct(oldCode: string, row: ProductRow) {
    await getAdapter().update(oldCode, row);
  },
  async deleteProduct(code: string) {
    await getAdapter().remove(code);
  },
  getDataSourceLabel() {
    if (hasSupabaseConfig()) return 'supabase';
    if (getApiBaseUrl().trim()) return 'api';
    return 'fallback';
  },
};
