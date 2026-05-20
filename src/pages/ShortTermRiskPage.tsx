import { useState, useMemo } from 'react';
import DataPanel from '../components/common/DataPanel';
import AnhuiRiskMap from '../components/map/AnhuiRiskMap';
import MapLegend from '../components/map/MapLegend';
import StatCard from '../components/common/StatCard';
import type { ShortTermRisk, RiskLevel } from '../types';
import { RISK_COLORS, RISK_LABELS } from '../types';
import { ANHUI_CITIES } from '../utils/constants';

function generateMockShortTerm(): ShortTermRisk[] {
  const result: ShortTermRisk[] = [];
  const weeks = ['2026-05-05', '2026-05-12', '2026-05-19', '2026-05-26'];
  ANHUI_CITIES.forEach((city) => {
    weeks.forEach((weekStart, wi) => {
      const baseScore = 25 + (city.charCodeAt(2) % 40) + wi * 3;
      const score = Math.min(95, Math.max(5, baseScore + (Math.random() - 0.5) * 20));
      let riskLevel: RiskLevel = 'low';
      if (score >= 80) riskLevel = 'critical';
      else if (score >= 60) riskLevel = 'high';
      else if (score >= 40) riskLevel = 'medium';
      else if (score >= 20) riskLevel = 'moderate';
      result.push({
        city,
        weekStart,
        riskLevel,
        riskScore: Math.round(score * 10) / 10,
        supplyDemandGap: Math.round((score - 35) * 22 * (0.7 + Math.random() * 0.6)),
        warningLabel: score >= 80 ? '红色预警' : score >= 60 ? '橙色预警' : score >= 40 ? '黄色预警' : score >= 20 ? '蓝色预警' : '无预警',
      });
    });
  });
  return result;
}

const rightPanelAccent = 'rgba(240, 165, 0, 0.5)';

export default function ShortTermRiskPage() {
  const mockData = useMemo(() => generateMockShortTerm(), []);
  const weeks = useMemo(() => [...new Set(mockData.map((d) => d.weekStart))].sort(), [mockData]);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]);
  const [selectedCity, setSelectedCity] = useState('合肥市');

  const weekData = useMemo(() =>
    mockData.filter((d) => d.weekStart === selectedWeek).map((d) => ({
      name: d.city,
      riskScore: d.riskScore,
      riskLevel: d.riskLevel,
    })),
  [mockData, selectedWeek]);

  const selectedEntry = useMemo(() =>
    mockData.find((d) => d.city === selectedCity && d.weekStart === selectedWeek),
  [mockData, selectedCity, selectedWeek]);

  const alerts = useMemo(() =>
    mockData
      .filter((d) => d.weekStart === selectedWeek && (d.riskLevel === 'critical' || d.riskLevel === 'high'))
      .sort((a, b) => b.riskScore - a.riskScore),
  [mockData, selectedWeek]);

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Left: Map */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <DataPanel title="安徽省短期供需风险预警地图" accent="amber" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
            <MapLegend />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.5 }}>预警周</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
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
                {weeks.map((w) => (
                  <option key={w} value={w}>周 {w}</option>
                ))}
              </select>
            </div>
          </div>
          <AnhuiRiskMap
            data={weekData}
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
          <DataPanel title={`${selectedCity} · 预警详情`} accent="amber">
            {selectedEntry && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <StatCard
                  label="风险评分"
                  value={selectedEntry.riskScore.toFixed(1)}
                  unit="分"
                  alert={selectedEntry.riskLevel === 'critical' || selectedEntry.riskLevel === 'high'}
                />
                <div style={{
                  textAlign: 'center', padding: '6px 10px',
                  background: `${RISK_COLORS[selectedEntry.riskLevel]}10`,
                  border: `1px solid ${RISK_COLORS[selectedEntry.riskLevel]}40`,
                  color: RISK_COLORS[selectedEntry.riskLevel],
                  fontSize: 14, fontWeight: 700, letterSpacing: 2,
                }}>
                  {selectedEntry.warningLabel}
                </div>
                <StatCard label="供需缺口" value={selectedEntry.supplyDemandGap} unit="MW" alert={selectedEntry.supplyDemandGap > 200} />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                  预警周期: {selectedEntry.weekStart} 起
                </div>
              </div>
            )}
          </DataPanel>

          <DataPanel title="⚠ 高风险预警列表" accent="amber">
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--accent-cyan)', textAlign: 'center', padding: 20 }}>
                  本周无高风险预警
                </div>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.city}
                    onClick={() => setSelectedCity(a.city)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', cursor: 'pointer',
                      background: a.city === selectedCity ? 'rgba(240, 165, 0, 0.06)' : 'transparent',
                      borderLeft: a.city === selectedCity ? '2px solid var(--accent-amber)' : '2px solid transparent',
                      marginBottom: 4, transition: 'background 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{a.city}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{a.weekStart}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: RISK_COLORS[a.riskLevel],
                    }}>
                      {RISK_LABELS[a.riskLevel]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </DataPanel>
        </div>
      </div>
    </div>
  );
}
