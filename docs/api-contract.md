# API Contract (Frontend Integration)

This document describes the API routes consumed by the frontend.  
All responses are validated at runtime by `src/app/lib/apiContract.ts` using `zod`.

## Base URL

- Configure `VITE_API_BASE_URL` in frontend runtime env.
- All paths below are relative to that base URL.

## General Notes

- Method: all routes currently use `GET`.
- Date format: ISO date string (`YYYY-MM-DD`) unless noted.
- If an API call fails or schema validation fails, UI falls back to local dataset.

## Routes

### `GET /branches`

Array of branch records:

```json
[
  {
    "id": "1",
    "name": "Central Plaza Bangkok",
    "code": "CPB-001",
    "address": "1693 Phahon Yothin Rd, Chatuchak, Bangkok",
    "lat": 13.7563,
    "lng": 100.5018,
    "manager": "Somchai Prasert",
    "phone": "+66 2 555 0101",
    "status": "Active",
    "monthlySalesThb": 2450000
  }
]
```

### `GET /imports/logs`

```json
[
  {
    "date": "2026-05-05",
    "source": "API",
    "records": 320,
    "status": "Success"
  }
]
```

### `GET /integrations/branches`

```json
[
  {
    "branchName": "Central Plaza Bangkok",
    "endpoint": "https://api.example.com/sales/cpb-001",
    "status": "Connected",
    "lastSync": "2026-05-05",
    "dataPoints": 1200
  }
]
```

### `GET /dashboard/kpis`

```json
{
  "activeBranches": 8,
  "productsCount": 7,
  "rawMaterialsCount": 5,
  "activePos": 4,
  "inventoryCriticalCount": 2,
  "forecastAccuracyPct": 93.8
}
```

### `GET /dashboard/branch-performance`

```json
[
  {
    "name": "Central Plaza Bangkok",
    "code": "CPB-001",
    "amountLabel": "฿245.6K",
    "progressPct": 92,
    "barClass": "bg-emerald-500"
  }
]
```

### `GET /dashboard/inventory-alerts`

```json
[
  {
    "material": "Fresh Cream",
    "branch": "SPG-002",
    "daysLeft": 1,
    "severity": "Critical"
  }
]
```

### `GET /dashboard/po-recommendations`

```json
[
  {
    "material": "All-Purpose Flour",
    "materialCode": "RM-102",
    "qty": 800,
    "delivery": "2026-05-08",
    "priority": "high"
  }
]
```

### `GET /dashboard/external-factors`

```json
[
  {
    "name": "Fuel Price",
    "value": "฿36.20/L",
    "impact": "Transport cost +1.1% vs last week",
    "trend": "up"
  }
]
```

### `GET /dashboard/recent-activity`

```json
[
  {
    "timeLabel": "1 hour ago",
    "text": "PO #PO-2026-001 created by Procurement",
    "type": "po"
  }
]
```

### `GET /external/fuel-prices`

```json
[
  {
    "day": 1,
    "price": 35.8
  }
]
```

### `GET /external/holidays`

```json
[
  {
    "name": "Songkran",
    "date": "2026-04-13",
    "type": "National",
    "impact": "High demand impact"
  }
]
```

### `GET /external/weather-forecast`

```json
[
  {
    "date": "2026-05-05",
    "temp": 32,
    "condition": "Partly cloudy",
    "humidity": 70,
    "salesImpact": "+1%"
  }
]
```

### `GET /analytics/delay-summary`

```json
{
  "avgDelayDays": 1.4,
  "lateShipmentPct": 6.2,
  "onTimePct": 93.8,
  "openExceptions": 5
}
```

### `GET /analytics/delay-rows`

```json
[
  {
    "po": "PO-2026-001",
    "branch": "MBK Center",
    "supplier": "Bangkok Flour Mills",
    "eta": "2026-05-04",
    "delivered": "2026-05-05",
    "delayDays": 1,
    "status": "Late"
  }
]
```

### `GET /forecast/series/30`

```json
[
  {
    "date": "2026-05-05",
    "actual": 128,
    "forecast": 125,
    "branchCode": "CPB-001",
    "product": "PROD-001"
  }
]
```

### `GET /forecast/method-recommendations`

```json
[
  {
    "branch": "Central Plaza Bangkok",
    "code": "CPB-001",
    "method": "ARIMA (2,1,2)",
    "reason": "Stable seasonality",
    "accuracy": 94.2,
    "features": "Lag-1, Lag-7, day-of-week, holidays",
    "trainDays": 365
  }
]
```

### `GET /products`

```json
[
  {
    "code": "RM-101",
    "type": "Raw Material",
    "supplier": "Cocoa Thai Co.",
    "name": "Premium Cocoa Powder",
    "shelfLifeMonths": 24,
    "priceThb": 890,
    "priceUsd": 24.5,
    "leadTimeDays": 5,
    "moq": 50,
    "spq": 10,
    "risk": "Low"
  }
]
```

### `GET /bom`

```json
[
  {
    "id": "b1",
    "finishedCode": "PROD-001",
    "finishedName": "Chocolate Cake",
    "materialCode": "RM-101",
    "materialName": "Premium Cocoa Powder",
    "qtyPerUnit": 0.12,
    "uom": "kg",
    "costPerUnitThb": 106.8,
    "leadTimeDays": 5,
    "supplier": "Cocoa Thai Co."
  }
]
```

### `GET /purchase-orders`

```json
[
  {
    "id": "po1",
    "date": "2026-05-02",
    "poNumber": "PO-2026-001",
    "products": ["RM-101", "RM-102"],
    "quantity": 480,
    "status": "Normal",
    "etd": "2026-05-06",
    "eta": "2026-05-08",
    "shippingMethod": "Ground",
    "shippingStatus": "Pending shipment"
  }
]
```

### `GET /goods-receipts`

```json
[
  {
    "id": "gr1",
    "grNumber": "GR-2026-001",
    "receiptDate": "2026-05-03",
    "poRef": "PO-2026-002",
    "supplier": "Vanilla Imports Ltd.",
    "products": ["RM-103"],
    "quantity": 240,
    "qc": "Pass",
    "inspector": "Anan S.",
    "notes": "Lot VN-4482 — temp log OK"
  }
]
```

### `GET /inventory`

```json
[
  {
    "id": "inv1",
    "name": "Premium Cocoa Powder",
    "code": "RM-101",
    "productType": "Raw Material",
    "expiryDate": "2026-05-08",
    "risk": "High risk",
    "location": "Warehouse",
    "quantity": 420,
    "unit": "kg"
  }
]
```

## Source of Truth

- Runtime schema and parsing: `src/app/lib/apiContract.ts`
- Endpoint fetch + fallback logic: `src/app/lib/dataEndpoints.ts`
