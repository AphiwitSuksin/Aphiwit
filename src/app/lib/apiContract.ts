import { z } from 'zod';

const branchSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  manager: z.string(),
  phone: z.string(),
  status: z.union([z.literal('Active'), z.literal('Inactive')]),
  monthlySalesThb: z.number(),
});

const importLogSchema = z.object({
  date: z.string(),
  source: z.string(),
  records: z.number(),
  status: z.string(),
});

const apiBranchIntegrationSchema = z.object({
  branchName: z.string(),
  endpoint: z.string(),
  status: z.union([z.literal('Connected'), z.literal('Error'), z.literal('Disconnected')]),
  lastSync: z.string(),
  dataPoints: z.number(),
});

const dashboardKpiSchema = z.object({
  activeBranches: z.number(),
  productsCount: z.number(),
  rawMaterialsCount: z.number(),
  activePos: z.number(),
  inventoryCriticalCount: z.number(),
  forecastAccuracyPct: z.number(),
});

const dashboardBranchPerformanceSchema = z.object({
  name: z.string(),
  code: z.string(),
  amountLabel: z.string(),
  progressPct: z.number(),
  barClass: z.string(),
});

const inventoryAlertSchema = z.object({
  material: z.string(),
  branch: z.string(),
  daysLeft: z.number(),
  severity: z.union([z.literal('Critical'), z.literal('High'), z.literal('Monitor')]),
});

const poRecommendationSchema = z.object({
  material: z.string(),
  materialCode: z.string(),
  qty: z.number(),
  delivery: z.string(),
  priority: z.union([z.literal('high'), z.literal('medium')]),
});

const externalFactorSchema = z.object({
  name: z.string(),
  value: z.string(),
  impact: z.string(),
  trend: z.union([z.literal('up'), z.literal('down'), z.literal('neutral')]),
});

const recentActivitySchema = z.object({
  timeLabel: z.string(),
  text: z.string(),
  type: z.union([z.literal('po'), z.literal('alert'), z.literal('forecast'), z.literal('gr')]),
});

const fuelHistoryPointSchema = z.object({
  day: z.number(),
  price: z.number(),
});

const holidaySchema = z.object({
  name: z.string(),
  date: z.string(),
  type: z.union([z.literal('National'), z.literal('Local')]),
  impact: z.string(),
});

const weatherForecastPointSchema = z.object({
  date: z.string(),
  temp: z.number(),
  condition: z.string(),
  humidity: z.number(),
  salesImpact: z.string(),
});

const delaySummarySchema = z.object({
  avgDelayDays: z.number(),
  lateShipmentPct: z.number(),
  onTimePct: z.number(),
  openExceptions: z.number(),
});

const delayRowSchema = z.object({
  po: z.string(),
  branch: z.string(),
  supplier: z.string(),
  eta: z.string(),
  delivered: z.string(),
  delayDays: z.number(),
  status: z.union([z.literal('Late'), z.literal('Pending'), z.literal('On time')]),
});

const forecastPointSchema = z.object({
  date: z.string(),
  actual: z.number(),
  forecast: z.number(),
  branchCode: z.string(),
  product: z.string(),
});

const methodRecommendationSchema = z.object({
  branch: z.string(),
  code: z.string(),
  method: z.string(),
  reason: z.string(),
  accuracy: z.number(),
  features: z.string(),
  trainDays: z.number(),
});

const productSchema = z.object({
  code: z.string(),
  type: z.union([z.literal('Raw Material'), z.literal('Finished Product')]),
  supplier: z.string(),
  name: z.string(),
  shelfLifeMonths: z.number(),
  priceThb: z.number(),
  priceUsd: z.number(),
  leadTimeDays: z.number(),
  moq: z.number(),
  spq: z.number(),
  risk: z.union([z.literal('Low'), z.literal('Medium'), z.literal('High')]),
});

const bomRowSchema = z.object({
  id: z.string(),
  finishedCode: z.string(),
  finishedName: z.string(),
  materialCode: z.string(),
  materialName: z.string(),
  qtyPerUnit: z.number(),
  uom: z.string(),
  costPerUnitThb: z.number(),
  leadTimeDays: z.number(),
  supplier: z.string(),
});

const purchaseOrderSchema = z.object({
  id: z.string(),
  date: z.string(),
  poNumber: z.string(),
  products: z.array(z.string()),
  quantity: z.number(),
  status: z.union([z.literal('Normal'), z.literal('Cancelled')]),
  etd: z.string(),
  eta: z.string(),
  shippingMethod: z.union([z.literal('Ground'), z.literal('Air')]),
  shippingStatus: z.union([
    z.literal('Pending confirmation'),
    z.literal('Pending shipment'),
    z.literal('Completed'),
    z.literal('Suspended'),
  ]),
});

const goodsReceiptSchema = z.object({
  id: z.string(),
  grNumber: z.string(),
  receiptDate: z.string(),
  poRef: z.string(),
  supplier: z.string(),
  products: z.array(z.string()),
  quantity: z.number(),
  qc: z.union([z.literal('Pass'), z.literal('Pending'), z.literal('Fail')]),
  inspector: z.string(),
  notes: z.string(),
});

const inventoryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  productType: z.union([z.literal('Raw Material'), z.literal('Finished Product')]),
  expiryDate: z.string(),
  risk: z.union([z.literal('Normal'), z.literal('Risk'), z.literal('High risk')]),
  location: z.union([z.literal('Warehouse'), z.literal('Cold Storage')]),
  quantity: z.number(),
  unit: z.string(),
});

export const apiContracts = {
  '/branches': z.array(branchSchema),
  '/imports/logs': z.array(importLogSchema),
  '/integrations/branches': z.array(apiBranchIntegrationSchema),
  '/dashboard/kpis': dashboardKpiSchema,
  '/dashboard/branch-performance': z.array(dashboardBranchPerformanceSchema),
  '/dashboard/inventory-alerts': z.array(inventoryAlertSchema),
  '/dashboard/po-recommendations': z.array(poRecommendationSchema),
  '/dashboard/external-factors': z.array(externalFactorSchema),
  '/dashboard/recent-activity': z.array(recentActivitySchema),
  '/external/fuel-prices': z.array(fuelHistoryPointSchema),
  '/external/holidays': z.array(holidaySchema),
  '/external/weather-forecast': z.array(weatherForecastPointSchema),
  '/analytics/delay-summary': delaySummarySchema,
  '/analytics/delay-rows': z.array(delayRowSchema),
  '/forecast/series/30': z.array(forecastPointSchema),
  '/forecast/method-recommendations': z.array(methodRecommendationSchema),
  '/products': z.array(productSchema),
  '/bom': z.array(bomRowSchema),
  '/purchase-orders': z.array(purchaseOrderSchema),
  '/goods-receipts': z.array(goodsReceiptSchema),
  '/inventory': z.array(inventoryRowSchema),
} as const;

export type ApiContracts = typeof apiContracts;
