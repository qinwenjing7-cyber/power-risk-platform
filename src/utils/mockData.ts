import type {
  WeatherData, WeatherHistory, PowerStructure,
  LoadStructure, ExtremeWeather, FactorAnalysis, RiskLevel,
  NewEnergyCapacity,
} from '../types';
import { ANHUI_CITIES } from './constants';

// Deterministic pseudo-random based on city name
function citySeed(city: string): number {
  let h = 0;
  for (let i = 0; i < city.length; i++) {
    h = ((h << 5) - h) + city.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) / 2147483647;
}

function rand(seed: number, offset: number, min: number, max: number): number {
  const s = (seed * (offset + 1) * 16807) % 2147483647;
  return min + (s / 2147483647) * (max - min);
}

export function generateWeatherCurrent(city: string): WeatherData {
  const s = citySeed(city);
  return {
    city,
    temperature: Math.round(rand(s, 1, 14, 33) * 10) / 10,
    humidity: Math.round(rand(s, 2, 50, 95)),
    windSpeed: Math.round(rand(s, 3, 1.5, 8.5) * 10) / 10,
    precipitation: Math.round(rand(s, 4, 0, 12) * 10) / 10,
    condition: ['晴', '多云', '阴', '小雨', '雷阵雨'][Math.floor(rand(s, 5, 0, 5))],
    updateTime: '2026-05-05 14:00',
  };
}

export function generateWeatherHistory(city: string): WeatherHistory {
  const s = citySeed(city);
  const baseTemp = rand(s, 10, 13, 18);
  const tempRange = rand(s, 11, 20, 30);
  return {
    city,
    records: Array.from({ length: 12 }, (_, i) => {
      const seasonal = Math.sin((i - 2) * Math.PI / 6) * tempRange / 2;
      const avg = baseTemp + seasonal;
      return {
        date: `2025-${String(i + 1).padStart(2, '0')}`,
        avgTemp: Math.round((avg + rand(s, 20 + i, -2, 2)) * 10) / 10,
        maxTemp: Math.round((avg + 5 + rand(s, 30 + i, -1.5, 1.5)) * 10) / 10,
        minTemp: Math.round((avg - 5 + rand(s, 40 + i, -1.5, 1.5)) * 10) / 10,
        precipitation: Math.round(Math.max(5, 80 * Math.abs(Math.sin(i / 2)) + rand(s, 50 + i, -20, 20))),
      };
    }),
  };
}

export function generatePowerStructure(city: string): PowerStructure {
  const s = citySeed(city);
  const thermal = Math.round(rand(s, 60, 2000, 6500));
  const hydro = Math.round(rand(s, 61, 100, 2000));
  const wind = Math.round(rand(s, 62, 200, 2000));
  const solar = Math.round(rand(s, 63, 200, 1500));
  const nuclear = city === '合肥市' ? 1200 : Math.round(rand(s, 64, 0, 500));
  return {
    city,
    thermal,
    hydro,
    wind,
    solar,
    nuclear,
    total: thermal + hydro + wind + solar + nuclear,
  };
}

export function generateLoadStructure(city: string): LoadStructure {
  const s = citySeed(city);
  const industrial = Math.round(rand(s, 70, 800, 4000));
  const residential = Math.round(rand(s, 71, 500, 2500));
  const commercial = Math.round(rand(s, 72, 300, 2000));
  const agricultural = Math.round(rand(s, 73, 50, 600));
  return {
    city,
    industrial,
    residential,
    commercial,
    agricultural,
    total: industrial + residential + commercial + agricultural,
  };
}

export function generateExtremeWeather(city: string): ExtremeWeather[] {
  const s = citySeed(city);
  const types = ['暴雨', '高温', '寒潮', '台风', '暴雪', '干旱'];
  const result: ExtremeWeather[] = [];
  for (let year = 2016; year <= 2025; year++) {
    types.forEach((type) => {
      const baseCount =
        type === '暴雨' ? 3 : type === '高温' ? 4 : type === '干旱' ? 1.5 :
        type === '寒潮' ? 1.5 : type === '台风' ? 0.5 : 1;
      const trend = (year - 2016) * (
        type === '高温' ? 0.2 + s * 0.1 :
        type === '暴雨' ? 0.15 + s * 0.08 :
        0.05 + s * 0.03
      );
      result.push({
        type,
        city,
        year,
        count: Math.max(0, Math.round(baseCount + trend + rand(s, year * 10 + types.indexOf(type), -1.5, 1.5))),
        severity: Math.round((baseCount + trend + rand(s, year * 10 + types.indexOf(type) + 100, -0.5, 0.5)) * 10) / 10,
      });
    });
  }
  return result;
}

export function generateNewEnergyCapacity(city: string): NewEnergyCapacity {
  const s = citySeed(city);
  const idx = ANHUI_CITIES.indexOf(city);
  const base = 400 + idx * 380;
  const existing = Math.round(base + rand(s, 100, -200, 500));
  // Spread ratio from 0.12 to 1.65 based on city index, so pie proportions differ clearly
  const ratio = 0.12 + (idx / 15) * 1.53 + rand(s, 300, -0.1, 0.1);
  const underConstruction = Math.round(existing * Math.max(0.05, ratio));
  return { city, existing, underConstruction };
}

export function generateFactorAnalysis(city: string): FactorAnalysis[] {
  const s = citySeed(city);
  const baseWeights: FactorAnalysis[] = [
    { factor: '极端天气频率', weight: 0.78, description: '', trend: 'up' },
    { factor: '电源结构脆弱性', weight: 0.62, description: '', trend: 'stable' },
    { factor: '负荷峰值压力', weight: 0.85, description: '', trend: 'up' },
    { factor: '跨区调度能力', weight: 0.45, description: '', trend: 'down' },
    { factor: '备用容量水平', weight: 0.53, description: '', trend: 'down' },
    { factor: '线路重载程度', weight: 0.71, description: '', trend: 'up' },
  ];
  return baseWeights.map((f, i) => ({
    ...f,
    weight: Math.round(Math.min(0.95, Math.max(0.15, f.weight + rand(s, 80 + i, -0.15, 0.15))) * 100) / 100,
    trend: rand(s, 90 + i, 0, 1) > 0.33 ? f.trend : (['up', 'down', 'stable'][Math.floor(rand(s, 95 + i, 0, 3))] as 'up' | 'down' | 'stable'),
  }));
}

export function getCityFactorScore(city: string): number {
  const idx = ANHUI_CITIES.indexOf(city);
  // Distribute 16 cities evenly from ~8 to ~92 across 5 color levels
  const base = 8 + (idx / 15) * 84;
  const s = citySeed(city);
  return Math.round((base + (s - 0.5) * 10) * 10) / 10;
}

export function getCityFactorLevel(city: string): RiskLevel {
  const score = getCityFactorScore(city);
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'moderate';
  return 'low';
}
