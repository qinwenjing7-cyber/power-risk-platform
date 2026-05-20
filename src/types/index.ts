/* ===== Power supply & weather types ===== */

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  updateTime: string;
}

export interface WeatherHistory {
  city: string;
  records: {
    date: string;
    avgTemp: number;
    maxTemp: number;
    minTemp: number;
    precipitation: number;
  }[];
}

export interface PowerStructure {
  city: string;
  thermal: number;
  hydro: number;
  wind: number;
  solar: number;
  nuclear: number;
  total: number;
}

export interface LoadStructure {
  city: string;
  industrial: number;
  residential: number;
  commercial: number;
  agricultural: number;
  total: number;
}

export interface ExtremeWeather {
  type: string;
  city: string;
  year: number;
  count: number;
  severity: number;
}

export interface FactorAnalysis {
  factor: string;
  weight: number;
  description: string;
  trend: 'up' | 'down' | 'stable';
}

export interface RiskDataPoint {
  city: string;
  period: string;
  riskLevel: RiskLevel;
  riskScore: number;
  supplyDemandGap: number;
  supplyCapacity: number;
  demandForecast: number;
}

export interface LongTermRisk {
  city: string;
  forecastYear: number;
  riskLevel: RiskLevel;
  riskScore: number;
  supplyDemandGap: number;
  confidence: number;
}

export interface ShortTermRisk {
  city: string;
  weekStart: string;
  riskLevel: RiskLevel;
  riskScore: number;
  supplyDemandGap: number;
  warningLabel: string;
}

export interface AnhuiGeoJSON {
  type: string;
  features: {
    type: string;
    properties: {
      name: string;
      center: [number, number];
    };
    geometry: {
      type: string;
      coordinates: number[][][];
    };
  }[];
}

export interface NewEnergyCapacity {
  city: string;
  existing: number;          // 已有新能源装机容量 (MW)
  underConstruction: number;  // 在建新能源装机容量 (MW)
}

export type RiskLevel = 'low' | 'moderate' | 'medium' | 'high' | 'critical';

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#84cc16',
  medium: '#f0a500',
  high: '#f97316',
  critical: '#ef4444',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  moderate: '较低风险',
  medium: '中等风险',
  high: '高风险',
  critical: '极高风险',
};
