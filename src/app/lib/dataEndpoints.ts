import {
  bomData,
  branches,
  dashboardBranchPerformance,
  dashboardKpis,
  delayAnalysisRows,
  delayAnalysisSummary,
  externalFactors,
  fuelPriceHistory,
  goodsReceipts,
  holidaysTh,
  importLog,
  inventoryAlerts,
  inventoryRows,
  methodRecommendations,
  poRecommendations,
  products,
  purchaseOrders,
  recentActivity,
  weatherForecast7,
  forecastSeries30,
} from './mockData';
import { z } from 'zod';
import { apiRequest, getApiBaseUrl } from './api';
import { apiContracts } from './apiContract';

function hasApiBase() {
  return Boolean(getApiBaseUrl().trim());
}

const THAI_OIL_API_URL = import.meta.env.VITE_THAI_OIL_API_URL ?? 'https://api.chnwt.dev/thai-oil-api/latest';
const OPEN_METEO_API_URL =
  import.meta.env.VITE_OPEN_METEO_API_URL ??
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FBangkok&forecast_days=7';

type ThaiOilStation = Record<string, { name?: string; price?: string }>;
type ThaiOilResponse = {
  response?: {
    stations?: Record<string, ThaiOilStation>;
  };
};
type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function weatherCodeToLabel(code: number) {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Partly cloudy';
}

function weatherToSalesImpact(label: string) {
  if (label === 'Clear sky' || label === 'Mainly clear') return '+2%';
  if (label === 'Partly cloudy' || label === 'Overcast') return '+0%';
  if (label === 'Thunderstorms') return '-5%';
  if (label === 'Rain' || label === 'Drizzle') return '-3%';
  return '-1%';
}

type LiveWeather = {
  currentTemp: number;
  currentHumidity: number;
  currentCondition: string;
  forecast: Array<{
    date: string;
    temp: number;
    condition: string;
    humidity: number;
    salesImpact: string;
  }>;
};

async function loadLiveBangkokWeather(signal?: AbortSignal): Promise<LiveWeather | null> {
  try {
    const response = await fetch(OPEN_METEO_API_URL, { signal });
    if (!response.ok) return null;
    const payload = (await response.json()) as OpenMeteoResponse;
    const daily = payload.daily;
    const current = payload.current;
    if (!daily?.time?.length || !daily.temperature_2m_max?.length || !daily.weather_code?.length) return null;
    const currentTemp = current?.temperature_2m ?? daily.temperature_2m_max[0] ?? 32;
    const currentHumidity = current?.relative_humidity_2m ?? 65;
    const currentCondition = weatherCodeToLabel(current?.weather_code ?? daily.weather_code[0] ?? 2);
    const forecast = daily.time.map((date, i) => {
      const max = daily.temperature_2m_max?.[i] ?? currentTemp;
      const min = daily.temperature_2m_min?.[i] ?? max - 4;
      const temp = round2((max + min) / 2);
      const condition = weatherCodeToLabel(daily.weather_code?.[i] ?? 2);
      const humidity = Math.max(40, Math.min(95, Math.round(currentHumidity + (i % 3) * 3 - 3)));
      return { date, temp, condition, humidity, salesImpact: weatherToSalesImpact(condition) };
    });
    if (forecast.length) {
      forecast[0] = {
        ...forecast[0],
        temp: round2(currentTemp),
        humidity: Math.round(currentHumidity),
        condition: currentCondition,
        salesImpact: weatherToSalesImpact(currentCondition),
      };
    }
    return { currentTemp: round2(currentTemp), currentHumidity: Math.round(currentHumidity), currentCondition, forecast };
  } catch {
    return null;
  }
}

async function loadLiveThaiDieselPrice(signal?: AbortSignal): Promise<number | null> {
  try {
    const response = await fetch(THAI_OIL_API_URL, { signal });
    if (!response.ok) return null;
    const payload = (await response.json()) as ThaiOilResponse;
    const stations = payload.response?.stations ?? {};

    const values: number[] = [];
    for (const station of Object.values(stations)) {
      for (const [key, fuel] of Object.entries(station)) {
        const isDieselKey = key.toLowerCase().includes('diesel') || key.toLowerCase().includes('disel');
        if (!isDieselKey) continue;
        const parsed = Number(fuel.price);
        if (Number.isFinite(parsed) && parsed > 0) values.push(parsed);
      }
    }
    if (!values.length) return null;
    const avg = values.reduce((sum, n) => sum + n, 0) / values.length;
    return round2(avg);
  } catch {
    return null;
  }
}

async function withFallback<T>(
  path: string,
  schema: z.ZodType<T>,
  fallback: T,
  signal?: AbortSignal,
) {
  if (!hasApiBase()) return fallback;
  try {
    const raw = await apiRequest<unknown>(path, { signal });
    return schema.parse(raw);
  } catch {
    return fallback;
  }
}

export const loadDashboardKpis = (signal?: AbortSignal) =>
  withFallback('/dashboard/kpis', apiContracts['/dashboard/kpis'], dashboardKpis, signal);
export const loadDashboardBranchPerformance = (signal?: AbortSignal) =>
  withFallback(
    '/dashboard/branch-performance',
    apiContracts['/dashboard/branch-performance'],
    [...dashboardBranchPerformance],
    signal,
  );
export const loadInventoryAlerts = (signal?: AbortSignal) =>
  withFallback('/dashboard/inventory-alerts', apiContracts['/dashboard/inventory-alerts'], inventoryAlerts, signal);
export const loadPoRecommendations = (signal?: AbortSignal) =>
  withFallback('/dashboard/po-recommendations', apiContracts['/dashboard/po-recommendations'], poRecommendations, signal);
export const loadExternalFactors = async (signal?: AbortSignal) => {
  if (hasApiBase()) {
    return withFallback('/dashboard/external-factors', apiContracts['/dashboard/external-factors'], externalFactors, signal);
  }
  const [liveDiesel, liveWeather] = await Promise.all([
    loadLiveThaiDieselPrice(signal),
    loadLiveBangkokWeather(signal),
  ]);
  return externalFactors.map((factor) => {
    if (factor.name === 'Fuel Price' && liveDiesel !== null) {
      const previous = externalFactors.find((f) => f.name === 'Fuel Price');
      const previousValue = previous ? Number(previous.value.replace(/[^\d.]/g, '')) : liveDiesel;
      const deltaPct = previousValue > 0 ? ((liveDiesel - previousValue) / previousValue) * 100 : 0;
      const direction: 'up' | 'down' | 'neutral' = deltaPct > 0.05 ? 'up' : deltaPct < -0.05 ? 'down' : 'neutral';
      const impactDirection = deltaPct >= 0 ? '+' : '';
      const impact = `Transport cost ${impactDirection}${deltaPct.toFixed(1)}% vs baseline`;
      return { ...factor, value: `฿${liveDiesel.toFixed(2)}/L`, impact, trend: direction };
    }
    if (factor.name === 'Weather' && liveWeather) {
      const conditionShort = liveWeather.currentCondition.replace('Mainly clear', 'Clear');
      const impact =
        liveWeather.currentCondition === 'Thunderstorms'
          ? 'Lower walk-in demand expected in rain period'
          : 'Stable foot traffic expected';
      return {
        ...factor,
        value: `${liveWeather.currentTemp.toFixed(1)}°C · ${conditionShort}`,
        impact,
        trend: liveWeather.currentCondition === 'Thunderstorms' ? 'down' : 'neutral',
      };
    }
    return factor;
  });
};
export const loadRecentActivity = (signal?: AbortSignal) =>
  withFallback('/dashboard/recent-activity', apiContracts['/dashboard/recent-activity'], recentActivity, signal);

export const loadFuelPriceHistory = async (signal?: AbortSignal) => {
  if (hasApiBase()) {
    return withFallback('/external/fuel-prices', apiContracts['/external/fuel-prices'], fuelPriceHistory, signal);
  }
  const liveDiesel = await loadLiveThaiDieselPrice(signal);
  if (liveDiesel === null) return fuelPriceHistory;
  const baseline = fuelPriceHistory[fuelPriceHistory.length - 1]?.price ?? liveDiesel;
  const shift = liveDiesel - baseline;
  return fuelPriceHistory.map((point) => ({
    ...point,
    price: round2(Math.max(0, point.price + shift)),
  }));
};
export const loadHolidays = (signal?: AbortSignal) =>
  withFallback('/external/holidays', apiContracts['/external/holidays'], holidaysTh, signal);
export const loadWeatherForecast = async (signal?: AbortSignal) => {
  if (hasApiBase()) {
    return withFallback('/external/weather-forecast', apiContracts['/external/weather-forecast'], weatherForecast7, signal);
  }
  const liveWeather = await loadLiveBangkokWeather(signal);
  if (!liveWeather || !liveWeather.forecast.length) return weatherForecast7;
  return liveWeather.forecast;
};

export const loadBranches = (signal?: AbortSignal) =>
  withFallback('/branches', apiContracts['/branches'], branches, signal);
export const loadDelayAnalysisRows = (signal?: AbortSignal) =>
  withFallback('/analytics/delay-rows', apiContracts['/analytics/delay-rows'], delayAnalysisRows, signal);
export const loadDelayAnalysisSummary = (signal?: AbortSignal) =>
  withFallback('/analytics/delay-summary', apiContracts['/analytics/delay-summary'], delayAnalysisSummary, signal);

export const loadForecastSeries30 = (signal?: AbortSignal) =>
  withFallback('/forecast/series/30', apiContracts['/forecast/series/30'], forecastSeries30, signal);
export const loadMethodRecommendations = (signal?: AbortSignal) =>
  withFallback(
    '/forecast/method-recommendations',
    apiContracts['/forecast/method-recommendations'],
    methodRecommendations,
    signal,
  );

export const loadProducts = (signal?: AbortSignal) =>
  withFallback('/products', apiContracts['/products'], products, signal);
export const loadBomData = (signal?: AbortSignal) => withFallback('/bom', apiContracts['/bom'], bomData, signal);
export const loadPurchaseOrders = (signal?: AbortSignal) =>
  withFallback('/purchase-orders', apiContracts['/purchase-orders'], purchaseOrders, signal);
export const loadGoodsReceipts = (signal?: AbortSignal) =>
  withFallback('/goods-receipts', apiContracts['/goods-receipts'], goodsReceipts, signal);
export const loadInventoryRows = (signal?: AbortSignal) =>
  withFallback('/inventory', apiContracts['/inventory'], inventoryRows, signal);
export const loadImportLog = (signal?: AbortSignal) =>
  withFallback('/imports/logs', apiContracts['/imports/logs'], importLog, signal);
