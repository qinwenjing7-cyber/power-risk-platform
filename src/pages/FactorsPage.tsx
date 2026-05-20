import { useState, useMemo } from 'react';
import type { WeatherData, ExtremeWeather, NewEnergyCapacity } from '../types';
import type { ExtremeDay } from '../services/weatherApi';
import DataPanel from '../components/common/DataPanel';
import AnhuiRiskMap from '../components/map/AnhuiRiskMap';
import StructureChart from '../components/charts/StructureChart';
import FrequencyChart from '../components/charts/FrequencyChart';
import FactorRadar from '../components/charts/FactorRadar';
import TenDayWeatherPanel from '../components/charts/TenDayWeatherPanel';
import { ANHUI_CITIES } from '../utils/constants';
import {
  generatePowerStructure, generateLoadStructure,
  generateFactorAnalysis, getCityFactorScore, getCityFactorLevel,
  generateNewEnergyCapacity,
} from '../utils/mockData';
import { useWeather } from '../hooks/useWeather';

function toWeatherData(city: string, curr: NonNullable<ReturnType<typeof useWeather>['current']>): WeatherData {
  return {
    city,
    temperature: curr.temp,
    humidity: curr.humidity,
    windSpeed: curr.windSpeed,
    precipitation: curr.precip,
    condition: curr.text,
    updateTime: curr.updateTime,
  };
}

function extremesToFrequency(city: string, extremes: ExtremeDay[]): ExtremeWeather[] {
  const byType = new Map<string, { count: number; totalSeverity: number }>();
  for (const e of extremes) {
    const entry = byType.get(e.type) || { count: 0, totalSeverity: 0 };
    entry.count++;
    entry.totalSeverity += e.severity;
    byType.set(e.type, entry);
  }
  return Array.from(byType.entries()).map(([type, v]) => ({
    type,
    city,
    year: new Date().getFullYear(),
    count: v.count,
    severity: Math.round((v.totalSeverity / v.count) * 10) / 10,
  }));
}

// Corner decor for plain containers
const cornerStyle: React.CSSProperties = {
  position: 'absolute', width: 12, height: 12, pointerEvents: 'none',
};
function renderCorners(c: string) {
  return <>
    <span style={{ ...cornerStyle, top: -1, left: -1, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` }} />
    <span style={{ ...cornerStyle, top: -1, right: -1, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` }} />
    <span style={{ ...cornerStyle, bottom: -1, left: -1, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` }} />
    <span style={{ ...cornerStyle, bottom: -1, right: -1, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` }} />
  </>;
}

export default function FactorsPage() {
  const [selectedCity, setSelectedCity] = useState('合肥市');
  const [tab, setTab] = useState<'weather' | 'power'>('weather');
  const {
    current: realWeather,
    history: realHistory,
    extremes: realExtremes,
    loading: weatherLoading,
    error: weatherError,
  } = useWeather(selectedCity);

  const mapData = useMemo(() =>
    ANHUI_CITIES.map((city) => ({
      name: city,
      riskScore: getCityFactorScore(city),
      riskLevel: getCityFactorLevel(city),
    })),
  []);

  const pieData = useMemo<NewEnergyCapacity[]>(() =>
    ANHUI_CITIES.map((city) => generateNewEnergyCapacity(city)),
  []);

  const weatherCurrent = useMemo<WeatherData | null>(() => {
    if (realWeather) return toWeatherData(selectedCity, realWeather);
    return null;
  }, [realWeather, selectedCity]);

  const extremeWeather = useMemo<ExtremeWeather[]>(() => {
    const types = ['暴雨', '高温', '寒潮', '台风', '暴雪', '干旱'];
    const result: ExtremeWeather[] = [];
    for (let year = 2016; year <= 2025; year++) {
      for (const type of types) {
        result.push({ type, city: selectedCity, year, count: 0, severity: 0 });
      }
    }
    if (realExtremes && realExtremes.length > 0) {
      const fromApi = extremesToFrequency(selectedCity, realExtremes);
      for (const item of result) {
        const match = fromApi.find((f) => f.type === item.type);
        if (match) {
          item.count = match.count;
          item.severity = match.severity;
        }
      }
    }
    return result;
  }, [realExtremes, selectedCity]);

  const powerStructure = useMemo(() => generatePowerStructure(selectedCity), [selectedCity]);
  const loadStructure = useMemo(() => generateLoadStructure(selectedCity), [selectedCity]);
  const factorAnalysis = useMemo(() => generateFactorAnalysis(selectedCity), [selectedCity]);

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Left: Map */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <DataPanel title="安徽省保供影响因素分布" accent="cyan" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AnhuiRiskMap
            data={mapData}
            onCityClick={(city) => setSelectedCity(city.name)}
            neutral
            pieData={pieData}
          />
        </DataPanel>
      </div>

      {/* Right: City detail */}
      <div style={{
        width: 520, height: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        position: 'relative',
      }}>
        {renderCorners('rgba(240, 165, 0, 0.5)')}
        {/* Top glow bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(240, 165, 0, 0.5), transparent)',
          opacity: 0.5,
        }} />

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
          {/* City header */}
          <div style={{
            padding: '8px 0',
            borderBottom: '2px solid var(--border-color)',
            display: 'flex', alignItems: 'baseline', gap: 10,
          }}>
            <span style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--accent-amber)',
              letterSpacing: 1,
              textShadow: '0 0 12px rgba(240, 165, 0, 0.2)',
            }}>
              {selectedCity}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>保供影响因素分析</span>
          </div>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)' }}>
            {(['weather', 'power'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '8px 0', cursor: 'pointer',
                  fontSize: 13, fontWeight: tab === t ? 700 : 400,
                  background: tab === t ? 'rgba(240,165,0,0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid var(--accent-amber)' : '2px solid transparent',
                  color: tab === t ? 'var(--accent-amber)' : 'var(--text-dim)',
                  transition: 'all 0.25s',
                  letterSpacing: 1,
                  fontFamily: 'inherit',
                }}
              >
                {t === 'weather' ? '☀ 天气数据' : '⚡ 电源与负荷结构'}
              </button>
            ))}
          </div>

          {tab === 'weather' && (
            <>
              {/* Current weather */}
              <DataPanel title="当前天气数据" accent="cyan">
                {weatherLoading && !weatherCurrent && (
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                    正在获取天气数据...
                  </div>
                )}
                {weatherError && (
                  <div style={{ color: 'var(--accent-red)', fontSize: 11, textAlign: 'center', padding: 20 }}>
                    {weatherError}
                  </div>
                )}
                {weatherCurrent && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div>温度<span style={{ float: 'right', color: 'var(--accent-amber)', fontWeight: 600 }}>{weatherCurrent.temperature}°C</span></div>
                    <div>湿度<span style={{ float: 'right', color: '#3b82f6', fontWeight: 600 }}>{weatherCurrent.humidity}%</span></div>
                    <div>风速<span style={{ float: 'right', color: '#0ef6be', fontWeight: 600 }}>{weatherCurrent.windSpeed} km/h</span></div>
                    <div>降水<span style={{ float: 'right', color: '#3b82f6', fontWeight: 600 }}>{weatherCurrent.precipitation} mm</span></div>
                    <div style={{ gridColumn: '1 / -1', color: 'var(--text-dim)', fontSize: 10, textAlign: 'right', marginTop: 4 }}>
                      {weatherCurrent.condition} · 更新于 {weatherCurrent.updateTime}
                    </div>
                  </div>
                )}
              </DataPanel>

              {/* 10-day weather detail */}
              {realHistory && realHistory.length > 0 && (
                <DataPanel title={`过去${realHistory.length}天天气详情 · ${selectedCity}`} accent="cyan">
                  <TenDayWeatherPanel data={realHistory} height={660} />
                </DataPanel>
              )}

              {/* Historical weather placeholder */}
              <DataPanel title={`历史天气趋势 · ${selectedCity}`} accent="blue">
                <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: 30 }}>
                  暂无历史月度数据
                </div>
              </DataPanel>

              {/* Extreme weather frequency */}
              <DataPanel title="极端天气事件统计" accent="amber">
                <FrequencyChart data={extremeWeather} />
              </DataPanel>

              {/* Factor radar */}
              <DataPanel title="影响因素权重分析" accent="cyan">
                <FactorRadar factors={factorAnalysis} />
              </DataPanel>
            </>
          )}

          {tab === 'power' && (
            <>
              <DataPanel title="电源结构占比" accent="amber">
                <StructureChart power={powerStructure} />
              </DataPanel>
              <DataPanel title="负荷结构分布" accent="amber">
                <StructureChart load={loadStructure} />
              </DataPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
