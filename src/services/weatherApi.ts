const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Dev: use Vite proxy; Prod: call API directly
const API_BASE = import.meta.env.DEV ? '/api/weather' : 'https://nq2tuphf9j.re.qweatherapi.com/v7';

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (text.startsWith('<!')) {
    throw new Error('API unavailable — got HTML response');
  }
  return JSON.parse(text) as T;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cacheKey(city: string, endpoint: string, ...params: string[]): string {
  return [city, endpoint, ...params].join('|');
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

import { CITY_ID_MAP } from '../utils/constants';

function cityId(city: string): string {
  return CITY_ID_MAP[city] || city.replace('市', '');
}

// ========== HeFeng API response types ==========

export interface CurrentWeather {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  precip: number;
  text: string;
  feelsLike: number;
  pressure: number;
  vis: number;
  updateTime: string;
}

interface HFNowResponse {
  code: string;
  now: {
    temp: string;
    feelsLike: string;
    humidity: string;
    windSpeed: string;
    windDir: string;
    precip: string;
    pressure: string;
    vis: string;
    text: string;
    obsTime: string;
  };
}

export interface HourlyWeather {
  time: string;
  temp: number;
  icon: string;
  text: string;
  precip: number;
  windDir: string;
  windScale: string;
  windSpeed: number;
  humidity: number;
  pressure: number;
}

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  tempAvg: number;
  precip: number;
  humidity: number;
  sunrise: string;
  sunset: string;
  windSpeed: number; // avg wind speed from hourly data
  hourly: HourlyWeather[];
}

interface HFHistoryResponse {
  code: string;
  weatherDaily: {
    date: string;
    sunrise: string;
    sunset: string;
    tempMax: string;
    tempMin: string;
    humidity: string;
    precip: string;
    pressure: string;
  };
  weatherHourly: Array<{
    time: string;
    temp: string;
    icon: string;
    text: string;
    precip: string;
    wind360: string;
    windDir: string;
    windScale: string;
    windSpeed: string;
    humidity: string;
    pressure: string;
  }>;
}

// ========== API functions ==========

export async function fetchCurrentWeather(
  city: string,
  force = false,
): Promise<CurrentWeather> {
  const key = cacheKey(city, 'now');
  if (!force) {
    const cached = getCached<CurrentWeather>(key);
    if (cached) return cached;
  }

  const url = `${API_BASE}/weather/now?location=${encodeURIComponent(cityId(city))}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const json: HFNowResponse = await safeJson(res);
  if (json.code !== '200') throw new Error(`Weather API code: ${json.code}`);

  const data: CurrentWeather = {
    temp: parseFloat(json.now.temp),
    humidity: parseFloat(json.now.humidity),
    windSpeed: parseFloat(json.now.windSpeed),
    windDir: json.now.windDir,
    precip: parseFloat(json.now.precip),
    text: json.now.text,
    feelsLike: parseFloat(json.now.feelsLike),
    pressure: parseFloat(json.now.pressure),
    vis: parseFloat(json.now.vis),
    updateTime: json.now.obsTime,
  };

  setCache(key, data);
  return data;
}

export async function fetchHistoricalDaily(
  city: string,
  date: string,
  force = false,
): Promise<DailyWeather> {
  const key = cacheKey(city, 'hist', date);
  if (!force) {
    const cached = getCached<DailyWeather>(key);
    if (cached) return cached;
  }

  const url = `${API_BASE}/historical/weather?location=${encodeURIComponent(cityId(city))}&date=${date}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[weatherApi] Historical fetch failed: ${res.status} for ${city} ${date}`);
    throw new Error(`Historical API error: ${res.status}`);
  }
  const json: HFHistoryResponse = await safeJson(res);
  if (json.code !== '200') {
    console.error(`[weatherApi] Historical API code: ${json.code} for ${city} ${date}`);
    throw new Error(`Historical API code: ${json.code}`);
  }

  const d = json.weatherDaily;
  const hourly: HourlyWeather[] = (json.weatherHourly || []).map((h) => ({
    time: h.time,
    temp: parseFloat(h.temp),
    icon: h.icon,
    text: h.text,
    precip: parseFloat(h.precip),
    windDir: h.windDir,
    windScale: h.windScale,
    windSpeed: parseFloat(h.windSpeed),
    humidity: parseFloat(h.humidity),
    pressure: parseFloat(h.pressure),
  }));

  const avgWindSpeed = hourly.length > 0
    ? Math.round((hourly.reduce((s, h) => s + h.windSpeed, 0) / hourly.length) * 10) / 10
    : 0;

  const data: DailyWeather = {
    date: d.date,
    tempMax: parseFloat(d.tempMax),
    tempMin: parseFloat(d.tempMin),
    tempAvg: Math.round(((parseFloat(d.tempMax) + parseFloat(d.tempMin)) / 2) * 10) / 10,
    precip: parseFloat(d.precip),
    humidity: parseFloat(d.humidity),
    sunrise: d.sunrise,
    sunset: d.sunset,
    windSpeed: avgWindSpeed,
    hourly,
  };

  setCache(key, data);
  return data;
}

export async function fetchHistoricalMonth(
  city: string,
  year: number,
  month: number,
  force = false,
): Promise<DailyWeather[]> {
  const monthKey = cacheKey(city, 'hist-month', `${year}-${month}`);
  if (!force) {
    const cached = getCached<DailyWeather[]>(monthKey);
    if (cached) return cached;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const results: DailyWeather[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    try {
      const daily = await fetchHistoricalDaily(city, dateStr, force);
      results.push(daily);
    } catch {
      // Skip failed days
    }
  }

  setCache(monthKey, results);
  return results;
}

export async function fetchRecentDays(
  city: string,
  days: number,
  force = false,
): Promise<DailyWeather[]> {
  const key = cacheKey(city, 'recent', String(days));
  if (!force) {
    const cached = getCached<DailyWeather[]>(key);
    if (cached) return cached;
  }

  const results: DailyWeather[] = [];
  const today = new Date();
  const batchSize = 5;

  const dates: string[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    dates.push(dateStr);
  }

  for (let i = 0; i < dates.length; i += batchSize) {
    const batch = dates.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((date) => fetchHistoricalDaily(city, date, force)),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
  }

  results.sort((a, b) => a.date.localeCompare(b.date));
  setCache(key, results);
  return results;
}

export interface ExtremeDay {
  date: string;
  type: string;
  severity: number;
}

export function analyzeExtremeEvents(dailyData: DailyWeather[]): ExtremeDay[] {
  const extremes: ExtremeDay[] = [];

  for (let i = 0; i < dailyData.length; i++) {
    const d = dailyData[i];

    // 暴雨: daily precipitation >= 50mm
    if (d.precip >= 50) {
      extremes.push({ date: d.date, type: '暴雨', severity: Math.min(10, d.precip / 20) });
    }
    // 高温: max temp >= 35°C
    if (d.tempMax >= 35) {
      extremes.push({ date: d.date, type: '高温', severity: Math.min(10, (d.tempMax - 30) / 1.5) });
    }
    // 寒潮: temp drop >= 8°C vs previous day
    if (i > 0) {
      const drop = dailyData[i - 1].tempAvg - d.tempAvg;
      if (drop >= 8) {
        extremes.push({ date: d.date, type: '寒潮', severity: Math.min(10, drop) });
      }
    }
    // 暴雪: precipitation >= 10mm AND avg temp <= 0°C
    if (d.precip >= 10 && d.tempAvg <= 0) {
      extremes.push({ date: d.date, type: '暴雪', severity: Math.min(10, d.precip / 5) });
    }
  }

  return extremes;
}

export function clearWeatherCache(): void {
  cache.clear();
}

export function getWeatherCacheSize(): number {
  return cache.size;
}
