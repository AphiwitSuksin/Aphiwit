import { APP_TODAY, addDays, formatDateISO, mean, stdDev } from './calculations';

export type Branch = {
  id: string;
  name: string;
  code: string;
  address: string;
  lat: number;
  lng: number;
  manager: string;
  phone: string;
  status: 'Active' | 'Inactive';
  monthlySalesThb: number;
};

export const branches: Branch[] = [
  {
    id: '1',
    name: 'Central Plaza Bangkok',
    code: 'CPB-001',
    address: '1693 Phahon Yothin Rd, Chatuchak, Bangkok',
    lat: 13.7563,
    lng: 100.5018,
    manager: 'Somchai Prasert',
    phone: '+66 2 555 0101',
    status: 'Active',
    monthlySalesThb: 2_450_000,
  },
  {
    id: '2',
    name: 'Siam Paragon',
    code: 'SPG-002',
    address: '991/1 Rama I Rd, Pathum Wan, Bangkok',
    lat: 13.7467,
    lng: 100.5347,
    manager: 'Nattaya Srisawat',
    phone: '+66 2 555 0202',
    status: 'Active',
    monthlySalesThb: 2_180_000,
  },
  {
    id: '3',
    name: 'Terminal 21',
    code: 'T21-003',
    address: '2,88 Sukhumvit Soi 19, Watthana, Bangkok',
    lat: 13.7378,
    lng: 100.5601,
    manager: 'Pichai Wongrak',
    phone: '+66 2 555 0303',
    status: 'Active',
    monthlySalesThb: 1_920_000,
  },
  {
    id: '4',
    name: 'EmQuartier',
    code: 'EMQ-004',
    address: '693 Sukhumvit Rd, Khlong Tan Nuea, Bangkok',
    lat: 13.7312,
    lng: 100.5695,
    manager: 'Siriporn Limsila',
    phone: '+66 2 555 0404',
    status: 'Active',
    monthlySalesThb: 1_650_000,
  },
  {
    id: '5',
    name: 'ICONSIAM',
    code: 'ICS-005',
    address: '299 Charoen Nakhon Rd, Khlong San, Bangkok',
    lat: 13.7265,
    lng: 100.5099,
    manager: 'Krit Amornchai',
    phone: '+66 2 555 0505',
    status: 'Active',
    monthlySalesThb: 2_010_000,
  },
  {
    id: '6',
    name: 'MBK Center',
    code: 'MBK-006',
    address: '444 Phaya Thai Rd, Pathum Wan, Bangkok',
    lat: 13.7446,
    lng: 100.5297,
    manager: 'Wilai Chaisiri',
    phone: '+66 2 555 0606',
    status: 'Active',
    monthlySalesThb: 1_762_000,
  },
  {
    id: '7',
    name: 'Central World',
    code: 'CWD-007',
    address: '4/1-2, 4/4 Ratchadamri Rd, Pathum Wan, Bangkok',
    lat: 13.747,
    lng: 100.5395,
    manager: 'Narong S.',
    phone: '+66 2 555 0707',
    status: 'Active',
    monthlySalesThb: 2_020_000,
  },
  {
    id: '8',
    name: 'Siam Square One',
    code: 'SSO-008',
    address: '388 Rama I Rd, Pathum Wan, Bangkok',
    lat: 13.7455,
    lng: 100.5325,
    manager: 'Praewa M.',
    phone: '+66 2 555 0808',
    status: 'Active',
    monthlySalesThb: 1_580_000,
  },
];

export type ProductRow = {
  code: string;
  type: 'Raw Material' | 'Finished Product';
  supplier: string;
  name: string;
  shelfLifeMonths: number;
  priceThb: number;
  priceUsd: number;
  leadTimeDays: number;
  moq: number;
  spq: number;
  risk: 'Low' | 'Medium' | 'High';
};

export const products: ProductRow[] = [
  {
    code: 'RM-101',
    type: 'Raw Material',
    supplier: 'Cocoa Thai Co.',
    name: 'Premium Cocoa Powder',
    shelfLifeMonths: 24,
    priceThb: 890,
    priceUsd: 24.5,
    leadTimeDays: 5,
    moq: 50,
    spq: 10,
    risk: 'Low',
  },
  {
    code: 'RM-102',
    type: 'Raw Material',
    supplier: 'Bangkok Flour Mills',
    name: 'All-Purpose Flour',
    shelfLifeMonths: 12,
    priceThb: 42,
    priceUsd: 1.15,
    leadTimeDays: 3,
    moq: 200,
    spq: 25,
    risk: 'Low',
  },
  {
    code: 'RM-103',
    type: 'Raw Material',
    supplier: 'Vanilla Imports Ltd.',
    name: 'Pure Vanilla Extract',
    shelfLifeMonths: 36,
    priceThb: 1250,
    priceUsd: 34.2,
    leadTimeDays: 7,
    moq: 24,
    spq: 6,
    risk: 'Medium',
  },
  {
    code: 'PROD-001',
    type: 'Finished Product',
    supplier: 'Internal Production',
    name: 'Chocolate Cake',
    shelfLifeMonths: 0,
    priceThb: 185,
    priceUsd: 5.05,
    leadTimeDays: 1,
    moq: 1,
    spq: 1,
    risk: 'Medium',
  },
  {
    code: 'PROD-002',
    type: 'Finished Product',
    supplier: 'Internal Production',
    name: 'Butter Croissant',
    shelfLifeMonths: 0,
    priceThb: 65,
    priceUsd: 1.78,
    leadTimeDays: 1,
    moq: 1,
    spq: 1,
    risk: 'Low',
  },
  {
    code: 'RM-104',
    type: 'Raw Material',
    supplier: 'Thai Sugar Corp.',
    name: 'White Sugar (fine)',
    shelfLifeMonths: 18,
    priceThb: 28,
    priceUsd: 0.77,
    leadTimeDays: 4,
    moq: 500,
    spq: 50,
    risk: 'Low',
  },
  {
    code: 'RM-105',
    type: 'Raw Material',
    supplier: 'Dairy Best Co.',
    name: 'Unsalted Butter',
    shelfLifeMonths: 6,
    priceThb: 195,
    priceUsd: 5.35,
    leadTimeDays: 4,
    moq: 80,
    spq: 20,
    risk: 'Medium',
  },
];

export type BOMRow = {
  id: string;
  finishedCode: string;
  finishedName: string;
  materialCode: string;
  materialName: string;
  qtyPerUnit: number;
  uom: string;
  costPerUnitThb: number;
  leadTimeDays: number;
  supplier: string;
};

export const bomData: BOMRow[] = [
  {
    id: 'b1',
    finishedCode: 'PROD-001',
    finishedName: 'Chocolate Cake',
    materialCode: 'RM-101',
    materialName: 'Premium Cocoa Powder',
    qtyPerUnit: 0.12,
    uom: 'kg',
    costPerUnitThb: 106.8,
    leadTimeDays: 5,
    supplier: 'Cocoa Thai Co.',
  },
  {
    id: 'b2',
    finishedCode: 'PROD-001',
    finishedName: 'Chocolate Cake',
    materialCode: 'RM-102',
    materialName: 'All-Purpose Flour',
    qtyPerUnit: 0.35,
    uom: 'kg',
    costPerUnitThb: 14.7,
    leadTimeDays: 3,
    supplier: 'Bangkok Flour Mills',
  },
  {
    id: 'b3',
    finishedCode: 'PROD-001',
    finishedName: 'Chocolate Cake',
    materialCode: 'RM-103',
    materialName: 'Pure Vanilla Extract',
    qtyPerUnit: 0.02,
    uom: 'L',
    costPerUnitThb: 25,
    leadTimeDays: 7,
    supplier: 'Vanilla Imports Ltd.',
  },
  {
    id: 'b4',
    finishedCode: 'PROD-002',
    finishedName: 'Butter Croissant',
    materialCode: 'RM-102',
    materialName: 'All-Purpose Flour',
    qtyPerUnit: 0.08,
    uom: 'kg',
    costPerUnitThb: 3.36,
    leadTimeDays: 3,
    supplier: 'Bangkok Flour Mills',
  },
];

export type PORow = {
  id: string;
  date: string;
  poNumber: string;
  products: string[];
  quantity: number;
  status: 'Normal' | 'Cancelled';
  etd: string;
  eta: string;
  shippingMethod: 'Ground' | 'Air';
  shippingStatus: 'Pending confirmation' | 'Pending shipment' | 'Completed' | 'Suspended';
};

export const purchaseOrders: PORow[] = [
  {
    id: 'po1',
    date: '2026-05-02',
    poNumber: 'PO-2026-001',
    products: ['RM-101', 'RM-102'],
    quantity: 480,
    status: 'Normal',
    etd: '2026-05-06',
    eta: '2026-05-08',
    shippingMethod: 'Ground',
    shippingStatus: 'Pending shipment',
  },
  {
    id: 'po2',
    date: '2026-04-28',
    poNumber: 'PO-2026-002',
    products: ['RM-103', 'PROD-001'],
    quantity: 1200,
    status: 'Normal',
    etd: '2026-04-30',
    eta: '2026-05-03',
    shippingMethod: 'Air',
    shippingStatus: 'Completed',
  },
  {
    id: 'po3',
    date: '2026-05-01',
    poNumber: 'PO-2026-003',
    products: ['RM-102'],
    quantity: 2000,
    status: 'Normal',
    etd: '2026-05-04',
    eta: '2026-05-05',
    shippingMethod: 'Ground',
    shippingStatus: 'Pending confirmation',
  },
  {
    id: 'po4',
    date: '2026-04-20',
    poNumber: 'PO-2026-004',
    products: ['RM-101'],
    quantity: 100,
    status: 'Cancelled',
    etd: '2026-04-22',
    eta: '2026-04-25',
    shippingMethod: 'Ground',
    shippingStatus: 'Suspended',
  },
  {
    id: 'po5',
    date: '2026-05-03',
    poNumber: 'PO-2026-005',
    products: ['RM-104', 'RM-105'],
    quantity: 620,
    status: 'Normal',
    etd: '2026-05-07',
    eta: '2026-05-09',
    shippingMethod: 'Ground',
    shippingStatus: 'Pending shipment',
  },
  {
    id: 'po6',
    date: '2026-05-04',
    poNumber: 'PO-2026-006',
    products: ['PROD-001', 'PROD-002'],
    quantity: 540,
    status: 'Normal',
    etd: '2026-05-08',
    eta: '2026-05-11',
    shippingMethod: 'Air',
    shippingStatus: 'Pending confirmation',
  },
];

export type GRRow = {
  id: string;
  grNumber: string;
  receiptDate: string;
  poRef: string;
  supplier: string;
  products: string[];
  quantity: number;
  qc: 'Pass' | 'Pending' | 'Fail';
  inspector: string;
  notes: string;
};

export const goodsReceipts: GRRow[] = [
  {
    id: 'gr1',
    grNumber: 'GR-2026-001',
    receiptDate: '2026-05-03',
    poRef: 'PO-2026-002',
    supplier: 'Vanilla Imports Ltd.',
    products: ['RM-103'],
    quantity: 240,
    qc: 'Pass',
    inspector: 'Anan S.',
    notes: 'Lot VN-4482 — temp log OK',
  },
  {
    id: 'gr2',
    grNumber: 'GR-2026-002',
    receiptDate: '2026-05-04',
    poRef: 'PO-2026-001',
    supplier: 'Cocoa Thai Co.',
    products: ['RM-101'],
    quantity: 150,
    qc: 'Pending',
    inspector: 'Mali P.',
    notes: 'Awaiting lab moisture test',
  },
];

export type InventoryRow = {
  id: string;
  name: string;
  code: string;
  productType: 'Raw Material' | 'Finished Product';
  expiryDate: string;
  risk: 'Normal' | 'Risk' | 'High risk';
  location: 'Warehouse' | 'Cold Storage';
  quantity: number;
  unit: string;
};

export const inventoryRows: InventoryRow[] = [
  {
    id: 'inv1',
    name: 'Premium Cocoa Powder',
    code: 'RM-101',
    productType: 'Raw Material',
    expiryDate: '2026-05-08',
    risk: 'High risk',
    location: 'Warehouse',
    quantity: 420,
    unit: 'kg',
  },
  {
    id: 'inv2',
    name: 'All-Purpose Flour',
    code: 'RM-102',
    productType: 'Raw Material',
    expiryDate: '2026-08-15',
    risk: 'Normal',
    location: 'Warehouse',
    quantity: 3200,
    unit: 'kg',
  },
  {
    id: 'inv3',
    name: 'Chocolate Cake',
    code: 'PROD-001',
    productType: 'Finished Product',
    expiryDate: '2026-05-07',
    risk: 'Risk',
    location: 'Cold Storage',
    quantity: 88,
    unit: 'pcs',
  },
  {
    id: 'inv4',
    name: 'Pure Vanilla Extract',
    code: 'RM-103',
    productType: 'Raw Material',
    expiryDate: '2027-01-10',
    risk: 'Normal',
    location: 'Cold Storage',
    quantity: 96,
    unit: 'L',
  },
];

/** Generate daily series for forecasting demos */
export function generateForecastSeries(days: number, seed: number): {
  date: string;
  actual: number;
  forecast: number;
  branchCode: string;
  product: string;
}[] {
  const out: { date: string; actual: number; forecast: number; branchCode: string; product: string }[] = [];
  const start = addDays(APP_TODAY, -(days - 1));
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const dow = d.getDay();
    const holiday = dow === 0 ? 1 : 0;
    const base = 120 + seed * 3 + Math.sin(i / 4) * 15 + holiday * 40;
    const noise = ((i * 17 + seed * 31) % 23) - 11;
    const actual = Math.max(40, Math.round(base + noise));
    const forecast = Math.round(actual * (1 + ((i + seed) % 7 - 3) / 100));
    out.push({
      date: formatDateISO(d),
      actual,
      forecast,
      branchCode: branches[i % branches.length].code,
      product: i % 2 === 0 ? 'PROD-001' : 'PROD-002',
    });
  }
  return out;
}

export const forecastSeries30 = generateForecastSeries(30, 3);
export const forecastSeries90 = generateForecastSeries(90, 5);

export type ForecastRowInput = { date: string; actual: number; forecast: number; branchCode: string; product: string };

export function enrichForecastRows(rows: ForecastRowInput[]) {
  return rows.map((row, i) => {
    const lag1 = i > 0 ? rows[i - 1].actual : row.actual;
    const lag7 = i >= 7 ? rows[i - 7].actual : row.actual;
    const window = rows.slice(Math.max(0, i - 6), i + 1).map((r) => r.actual);
    const rollMean = mean(window);
    const rollStd = stdDev(window.length > 1 ? window : [...window, row.actual]);
    const err = row.actual - row.forecast;
    const pctErr = row.actual ? (err / row.actual) * 100 : 0;
    const d = new Date(row.date + 'T12:00:00');
    return {
      ...row,
      lag1,
      lag7,
      rollMean,
      rollStd,
      error: err,
      pctErr,
      dow: d.toLocaleDateString('en-US', { weekday: 'long' }),
      holiday: d.getDay() === 0 || d.getDay() === 6,
    };
  });
}

/** KPI numbers aligned with Supply Chain Planning Web App (Figma Make) reference */
export const dashboardKpis = {
  activeBranches: 8,
  productsCount: 7,
  rawMaterialsCount: 5,
  activePos: 4,
  /** Shown on KPI card — count of critical inventory situations */
  inventoryCriticalCount: 2,
  /** Model accuracy % (higher is better) */
  forecastAccuracyPct: 93.8,
};

/** Top branches row — progress bar colors match design (green → amber → orange) */
export const dashboardBranchPerformance = [
  {
    name: 'Central Plaza Bangkok',
    code: 'CPB-001',
    amountLabel: '฿245.6K',
    progressPct: 92,
    barClass: 'bg-emerald-500',
  },
  {
    name: 'Siam Paragon',
    code: 'SPG-002',
    amountLabel: '฿232.1K',
    progressPct: 88,
    barClass: 'bg-emerald-500',
  },
  {
    name: 'Terminal 21',
    code: 'T21-003',
    amountLabel: '฿198.4K',
    progressPct: 72,
    barClass: 'bg-amber-400',
  },
  {
    name: 'MBK Center',
    code: 'MBK-006',
    amountLabel: '฿176.2K',
    progressPct: 65,
    barClass: 'bg-orange-400',
  },
] as const;

export const inventoryAlerts: {
  material: string;
  branch: string;
  daysLeft: number;
  severity: 'Critical' | 'High' | 'Monitor';
}[] = [
  { material: 'Fresh Cream', branch: 'SPG-002', daysLeft: 1, severity: 'Critical' },
  { material: 'Strawberry Tart (finished)', branch: 'MBK-006', daysLeft: 1, severity: 'Critical' },
  { material: 'Butter', branch: 'CPB-001', daysLeft: 4, severity: 'High' },
  { material: 'Vanilla Extract', branch: 'T21-003', daysLeft: 12, severity: 'Monitor' },
];

export const poRecommendations = [
  {
    material: 'All-Purpose Flour',
    materialCode: 'RM-102',
    qty: 800,
    delivery: '2026-05-08',
    priority: 'high' as const,
  },
  {
    material: 'Premium Cocoa Powder',
    materialCode: 'RM-101',
    qty: 120,
    delivery: '2026-05-10',
    priority: 'medium' as const,
  },
];

export const externalFactors: {
  name: string;
  value: string;
  impact: string;
  trend: 'up' | 'down' | 'neutral';
}[] = [
  { name: 'Weather', value: '32°C · Sunny', impact: 'Stable foot traffic expected', trend: 'neutral' },
  {
    name: 'Holidays',
    value: 'May 5 · Coronation Day (obs.)',
    impact: 'Higher demand in central Bangkok',
    trend: 'up',
  },
  { name: 'Fuel Price', value: '฿36.20/L', impact: 'Transport cost +1.1% vs last week', trend: 'up' },
];

export const recentActivity = [
  { timeLabel: '1 hour ago', text: 'PO #PO-2026-001 created by Procurement', type: 'po' as const },
  { timeLabel: '3 hours ago', text: 'Inventory alert: Fresh Cream low stock (MBK-006)', type: 'alert' as const },
  { timeLabel: '5 hours ago', text: 'Weekly forecast model refresh completed', type: 'forecast' as const },
  { timeLabel: 'Yesterday', text: 'Goods receipt GR-2026-001 passed QC', type: 'gr' as const },
];

export const delayAnalysisSummary = {
  avgDelayDays: 1.4,
  lateShipmentPct: 6.2,
  onTimePct: 93.8,
  openExceptions: 5,
};

export const delayAnalysisRows = [
  {
    po: 'PO-2026-001',
    branch: 'MBK Center',
    supplier: 'Bangkok Flour Mills',
    eta: '2026-05-04',
    delivered: '2026-05-05',
    delayDays: 1,
    status: 'Late' as const,
  },
  {
    po: 'PO-2026-003',
    branch: 'Siam Paragon',
    supplier: 'Cocoa Thai Co.',
    eta: '2026-05-05',
    delivered: '—',
    delayDays: 0,
    status: 'Pending' as const,
  },
  {
    po: 'PO-2026-005',
    branch: 'Central Plaza Bangkok',
    supplier: 'Thai Sugar Corp.',
    eta: '2026-05-09',
    delivered: '2026-05-09',
    delayDays: 0,
    status: 'On time' as const,
  },
  {
    po: 'PO-2026-002',
    branch: 'Terminal 21',
    supplier: 'Vanilla Imports Ltd.',
    eta: '2026-05-03',
    delivered: '2026-05-03',
    delayDays: 0,
    status: 'On time' as const,
  },
];

export const holidaysTh = [
  { name: 'Songkran', date: '2026-04-13', type: 'National' as const, impact: 'สูง — ดีมานด์ของหวานพุ่ง' },
  { name: "King's Birthday", date: '2026-07-28', type: 'National' as const, impact: 'ปานกลาง' },
  { name: "New Year's Day", date: '2026-01-01', type: 'National' as const, impact: 'สูง' },
  { name: 'Bangkok Local Fair', date: '2026-05-20', type: 'Local' as const, impact: 'ท้องถิ่น — โซนรามคำแหง' },
];

export const fuelPriceHistory = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  price: 35.2 + Math.sin(i / 5) * 0.8 + (i % 3) * 0.05,
}));

export const weatherForecast7 = Array.from({ length: 7 }, (_, i) => ({
  date: formatDateISO(addDays(APP_TODAY, i)),
  temp: 31 + (i % 3),
  condition: i % 2 ? 'Thunderstorms' : 'Partly cloudy',
  humidity: 68 + i,
  salesImpact: i % 2 ? '-3%' : '+1%',
}));

export const methodRecommendations = [
  {
    branch: 'Central Plaza Bangkok',
    code: 'CPB-001',
    method: 'ARIMA (2,1,2)',
    reason: 'แพทเทิร์นเสถียร ฤดูกาลชัด',
    accuracy: 94.2,
    features: 'Lag-1, Lag-7, day-of-week, holidays',
    trainDays: 365,
  },
  {
    branch: 'Siam Paragon',
    code: 'SPG-002',
    method: 'ML Ensemble',
    reason: 'ความผันผวนสูง ช่วงโปรโมชัน',
    accuracy: 91.5,
    features: 'Lag variables, traffic index, weather',
    trainDays: 365,
  },
  {
    branch: 'Terminal 21',
    code: 'T21-003',
    method: 'Interpretable Model',
    reason: 'ต้องอธิบาย stakeholder',
    accuracy: 89.8,
    features: 'Calendar, events, rolling stats',
    trainDays: 365,
  },
];

export const apiBranches = branches.slice(0, 4).map((b, i) => ({
  branchName: b.name,
  endpoint: `https://api.example.com/sales/${b.code.toLowerCase()}`,
  status: (i === 1 ? 'Error' : i === 3 ? 'Disconnected' : 'Connected') as 'Connected' | 'Error' | 'Disconnected',
  lastSync: formatDateISO(addDays(APP_TODAY, -i)),
  dataPoints: 1200 + i * 340,
}));

export const importLog = Array.from({ length: 7 }, (_, i) => ({
  date: formatDateISO(addDays(APP_TODAY, -i)),
  source: ['Excel', 'API', 'Manual', 'External'][i % 4],
  records: 200 + i * 45,
  status: i === 2 ? 'Failed' : 'Success',
}));
