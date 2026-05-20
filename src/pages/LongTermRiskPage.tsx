import { useState, useMemo } from 'react';
import DataPanel from '../components/common/DataPanel';
import AnhuiRiskMap from '../components/map/AnhuiRiskMap';
import MapLegend from '../components/map/MapLegend';
import RiskTimeline from '../components/charts/RiskTimeline';
import StatCard from '../components/common/StatCard';
import type { LongTermRisk, RiskLevel } from '../types';
import { RISK_COLORS, RISK_LABELS } from '../types';
import { ANHUI_CITIES } from '../utils/constants';

function generateMockLongTerm(): LongTermRisk[] {
  const result: LongTermRisk[] = [];
  ANHUI_CITIES.forEach((city) => {
    for (let year = 2026; year <= 2035; year++) {
      const baseScore = 20 + (city.charCodeAt(1) % 35) + (year - 2026) * 2.5;
      const score = Math.min(95, Math.max(5, baseScore + (Math.random() - 0.5) * 15));
      let riskLevel: RiskLevel = 'low';
      if (score >= 80) riskLevel = 'critical';
      else if (score >= 60) riskLevel = 'high';
      else if (score >= 40) riskLevel = 'medium';
      else if (score >= 20) riskLevel = 'moderate';
      result.push({
        city,
        forecastYear: year,
        riskLevel,
        riskScore: Math.round(score * 10) / 10,
        supplyDemandGap: Math.round((score - 30) * 18 * (0.8 + Math.random() * 0.4)),
        confidence: Math.round((70 + Math.random() * 25) * 10) / 10,
      });
    }
  });
  return result;
}

const rightPanelAccent = 'rgba(240, 165, 0, 0.5)';

export default function LongTermRiskPage() {
  const mockData = useMemo(() => generateMockLongTerm(), []);
  const [selectedYear, setSelectedYear] = useState(2030);
  const [selectedCity, setSelectedCity] = useState('合肥市');

  const yearData = useMemo(() =>
    mockData.filter((d) => d.forecastYear === selectedYear).map((d) => ({
      name: d.city,
      riskScore: d.riskScore,
      riskLevel: d.riskLevel,
    })),
  [mockData, selectedYear]);

  const cityData = useMemo(() =>
    mockData.filter((d) => d.city === selectedCity).sort((a, b) => a.forecastYear - b.forecastYear),
  [mockData, selectedCity]);

  const cityRanking = useMemo(() =>
    [...yearData].sort((a, b) => b.riskScore - a.riskScore),
  [yearData]);

  const selectedCityYearData = mockData.find((d) => d.city === selectedCity && d.forecastYear === selectedYear);

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Left: Map */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <DataPanel title="安徽省中长期供需风险地图" accent="cyan" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
            <MapLegend />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.5 }}>预测年份</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-amber)',
                  padding: '4px 28px 4px 10px',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  outline: 'none',
                  borderRadius: 1,
                }}
              >
                {Array.from({ length: 10 }, (_, i) => 2026 + i).map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>
          </div>
          <AnhuiRiskMap
            data={yearData}
            onCityClick={(city) => setSelectedCity(city.name)}
          />
        </DataPanel>
      </div>

      {/* Right: Details */}
      <div style={{
        width: 520, height: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        position: 'relative',
      }}>
        {/* Corners */}
        <span style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: `2px solid ${rightPanelAccent}`, borderLeft: `2px solid ${rightPanelAccent}`, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: `2px solid ${rightPanelAccent}`, borderRight: `2px solid ${rightPanelAccent}`, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: `2px solid ${rightPanelAccent}`, borderLeft: `2px solid ${rightPanelAccent}`, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: `2px solid ${rightPanelAccent}`, borderRight: `2px solid ${rightPanelAccent}`, pointerEvents: 'none' }} />
        {/* Top glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${rightPanelAccent}, transparent)`,
          opacity: 0.5,
        }} />

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20, padding: 16 }}>
          <DataPanel title={`${selectedCity} · 风险详情 (${selectedYear}年)`} accent="amber">
            {selectedCityYearData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <StatCard
                  label="风险评分"
                  value={selectedCityYearData.riskScore.toFixed(1)}
                  unit="分"
                  alert={selectedCityYearData.riskLevel === 'critical' || selectedCityYearData.riskLevel === 'high'}
                />
                <div style={{
                  textAlign: 'center', padding: '6px 10px',
                  background: `${RISK_COLORS[selectedCityYearData.riskLevel]}10`,
                  border: `1px solid ${RISK_COLORS[selectedCityYearData.riskLevel]}40`,
                  color: RISK_COLORS[selectedCityYearData.riskLevel],
                  fontSize: 14, fontWeight: 700, letterSpacing: 2,
                }}>
                  {RISK_LABELS[selectedCityYearData.riskLevel]}
                </div>
                <StatCard label="供需缺口" value={selectedCityYearData.supplyDemandGap} unit="MW" />
                <StatCard label="预测置信度" value={selectedCityYearData.confidence} unit="%" />
              </div>
            )}
          </DataPanel>

          <DataPanel title="城市风险排名" accent="amber">
            <div style={{ maxHeight: 180, overflow: 'auto' }}>
              {cityRanking.map((c, i) => (
                <div
                  key={c.name}
                  onClick={() => setSelectedCity(c.name)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', cursor: 'pointer',
                    background: c.name === selectedCity ? 'rgba(240, 165, 0, 0.06)' : 'transparent',
                    borderLeft: c.name === selectedCity ? '2px solid var(--accent-amber)' : '2px solid transparent',
                    marginBottom: 2, transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-dim)', marginRight: 8, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: RISK_COLORS[c.riskLevel], fontWeight: 600 }}>
                    {c.riskScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </DataPanel>

          <DataPanel title={`${selectedCity} 风险趋势`} accent="blue">
            <RiskTimeline data={cityData} cityName={selectedCity} />
          </DataPanel>
        </div>
      </div>
    </div>
  );
}
