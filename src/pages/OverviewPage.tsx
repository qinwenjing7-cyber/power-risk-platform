import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataPanel from '../components/common/DataPanel';
import StatCard from '../components/common/StatCard';
import type { RiskLevel } from '../types';
import { RISK_COLORS, RISK_LABELS } from '../types';
import { ANHUI_CITIES } from '../utils/constants';

const quickNavItems = [
  { path: '/factors', icon: '◉', title: '保供影响因素', desc: '天气 · 电源 · 负荷 · 因素分析', accent: 'cyan' as const },
  { path: '/longterm', icon: '◬', title: '中长期风险分析', desc: '10年预测 · 趋势评估', accent: 'amber' as const },
  { path: '/shortterm', icon: '⚠', title: '短期风险预警', desc: '周度预警 · 供需缺口', accent: 'amber' as const },
];

export default function OverviewPage() {
  const navigate = useNavigate();

  const longTermSummary = useMemo(() => {
    const cityScores = ANHUI_CITIES.map((city) => {
      let total = 0;
      for (let year = 2026; year <= 2035; year++) {
        const baseScore = 20 + (city.charCodeAt(1) % 35) + (year - 2026) * 2.5;
        const score = Math.min(95, Math.max(5, baseScore + (Math.random() - 0.5) * 15));
        total += score;
      }
      return { city, score: Math.round((total / 10) * 10) / 10 };
    });
    const avgScore = cityScores.reduce((s, c) => s + c.score, 0) / cityScores.length;
    const criticalCities = cityScores.filter((c) => c.score >= 80).length;
    const highCities = cityScores.filter((c) => c.score >= 60 && c.score < 80).length;
    return { avgScore: Math.round(avgScore * 10) / 10, criticalCities, highCities, cityScores };
  }, []);

  const shortTermSummary = useMemo(() => {
    const cityAlerts = ANHUI_CITIES.map((city) => {
      const score = Math.min(95, Math.max(5, 25 + (city.charCodeAt(2) % 40) + (Math.random() - 0.5) * 20));
      let level: RiskLevel = 'low';
      if (score >= 80) level = 'critical';
      else if (score >= 60) level = 'high';
      else if (score >= 40) level = 'medium';
      else if (score >= 20) level = 'moderate';
      return { city, score: Math.round(score * 10) / 10, level };
    });
    const alertCount = cityAlerts.filter((c) => c.level === 'critical' || c.level === 'high').length;
    return { alertCount, cityAlerts };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top stat cards — staggered entry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="stagger-1"><DataPanel accent="cyan">
          <StatCard label="全省平均风险指数" value={longTermSummary.avgScore} unit="分" trend="down" />
        </DataPanel></div>
        <div className="stagger-2"><DataPanel accent="amber">
          <StatCard label="短期预警城市数" value={shortTermSummary.alertCount} unit="个" alert={shortTermSummary.alertCount > 3} />
        </DataPanel></div>
        <div className="stagger-2"><DataPanel accent="amber">
          <StatCard label="高/极高风险城市" value={longTermSummary.criticalCities + longTermSummary.highCities} unit="个" alert />
        </DataPanel></div>
        <div className="stagger-3"><DataPanel accent="cyan">
          <StatCard label="数据覆盖城市" value="16/16" unit="全覆盖" trend="stable" />
        </DataPanel></div>
      </div>

      {/* Main panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Quick nav */}
        <DataPanel title="平台概览" accent="cyan" style={{ minHeight: 280 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 2.1 }}>
            <p>
              本平台面向 <strong style={{ color: 'var(--accent-amber)' }}>安徽省</strong>，
              整合气象数据、电源结构、负荷数据等多维信息，对全省16个地级市进行电力供需风险的评估与预警。
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
            {quickNavItems.map((item) => (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '18px 14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.25s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-amber)';
                  e.currentTarget.style.background = 'rgba(240,165,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Corner accent on hover */}
                <div style={{ fontSize: 26, marginBottom: 8, filter: 'grayscale(0.3)' }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </DataPanel>

        {/* Right: Status + ranking */}
        <DataPanel title="城市风险概览" accent="amber" style={{ minHeight: 280 }}>
          {/* Status grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px',
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2.2,
            marginBottom: 16, padding: '12px',
            background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>系统运行</span><span style={{ color: 'var(--accent-cyan)' }}>● 正常</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>天气数据</span><span style={{ color: 'var(--accent-cyan)' }}>● 已连接</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>算法模型</span><span style={{ color: 'var(--accent-amber)' }}>● 待接入</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>刷新间隔</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>60 min</span>
            </div>
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
            城市风险排名 · 十年平均
          </div>
          <div style={{ maxHeight: 240, overflow: 'auto' }}>
            {longTermSummary.cityScores
              .sort((a, b) => b.score - a.score)
              .map((c, i) => {
                const level: RiskLevel = c.score >= 80 ? 'critical' : c.score >= 60 ? 'high' : c.score >= 40 ? 'medium' : c.score >= 20 ? 'moderate' : 'low';
                return (
                  <div key={c.city} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '5px 10px', marginBottom: 2,
                    borderLeft: `2px solid ${i < 3 ? RISK_COLORS[level] : 'transparent'}`,
                  }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-dim)', width: 20, display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
                      {c.city}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: RISK_COLORS[level], fontSize: 11, fontWeight: 600 }}>
                      {c.score.toFixed(1)} · {RISK_LABELS[level]}
                    </span>
                  </div>
                );
              })}
          </div>
        </DataPanel>
      </div>
    </div>
  );
}
