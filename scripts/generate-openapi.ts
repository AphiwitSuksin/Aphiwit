import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { apiContracts } from '../src/app/lib/apiContract';

const schemaNameByPath: Record<string, string> = {
  '/branches': 'Branch',
  '/imports/logs': 'ImportLogRow',
  '/integrations/branches': 'ApiBranchIntegration',
  '/dashboard/kpis': 'DashboardKpis',
  '/dashboard/branch-performance': 'DashboardBranchPerformance',
  '/dashboard/inventory-alerts': 'InventoryAlert',
  '/dashboard/po-recommendations': 'PoRecommendation',
  '/dashboard/external-factors': 'ExternalFactor',
  '/dashboard/recent-activity': 'RecentActivity',
  '/external/fuel-prices': 'FuelPricePoint',
  '/external/holidays': 'Holiday',
  '/external/weather-forecast': 'WeatherForecastPoint',
  '/analytics/delay-summary': 'DelaySummary',
  '/analytics/delay-rows': 'DelayRow',
  '/forecast/series/30': 'ForecastPoint',
  '/forecast/method-recommendations': 'MethodRecommendation',
  '/products': 'Product',
  '/bom': 'BomRow',
  '/purchase-orders': 'PurchaseOrder',
  '/goods-receipts': 'GoodsReceipt',
  '/inventory': 'InventoryRow',
};

const components: Record<string, unknown> = {};
const paths: Record<string, unknown> = {};

function unwrapSchema(schemaName: string, jsonSchema: Record<string, unknown>) {
  const defs = (jsonSchema.definitions ?? jsonSchema.$defs) as Record<string, unknown> | undefined;
  if (defs?.[schemaName]) return defs[schemaName];
  return jsonSchema;
}

for (const [path, schema] of Object.entries(apiContracts)) {
  const schemaName = schemaNameByPath[path] ?? path.replace(/[\/-]/g, '_');
  const generated = zodToJsonSchema(schema, schemaName, { target: 'openApi3' }) as Record<string, unknown>;
  components[schemaName] = unwrapSchema(schemaName, generated);
  const responseSchema = { $ref: `#/components/schemas/${schemaName}` };

  paths[path] = {
    get: {
      summary: `GET ${path}`,
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: responseSchema,
            },
          },
        },
      },
    },
  };
}

const doc = {
  openapi: '3.1.0',
  info: {
    title: 'Supply Chain Planning API',
    version: '1.0.0',
    description: 'Auto-generated from src/app/lib/apiContract.ts',
  },
  servers: [
    {
      url: 'https://api.example.com',
      description: 'Replace with VITE_API_BASE_URL',
    },
  ],
  paths,
  components: {
    schemas: components,
  },
};

const outputPath = resolve(process.cwd(), 'docs', 'openapi.json');
writeFileSync(outputPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');

console.log(`OpenAPI generated at ${outputPath}`);
