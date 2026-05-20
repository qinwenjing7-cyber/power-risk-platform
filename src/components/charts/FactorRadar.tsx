import ReactECharts from 'echarts-for-react';
import type { FactorAnalysis } from '../../types';

interface Props {
  factors: FactorAnalysis[];
}

export default function FactorRadar({ factors }: Props) {
  const option = {
    tooltip: {},
    radar: {
      center: ['50%', '52%'],
      radius: '65%',
      indicator: factors.map((f) => ({
        name: f.factor,
        max: 1,
      })),
      axisName: { color: '#8497b0', fontSize: 10 },
      splitArea: {
        areaStyle: {
          color: ['rgba(14, 246, 190, 0.02)', 'rgba(14, 246, 190, 0.02)',
                 'rgba(14, 246, 190, 0.02)', 'rgba(14, 246, 190, 0.02)'],
        },
      },
      splitLine: { lineStyle: { color: '#1a2640' } },
      axisLine: { lineStyle: { color: '#1a2640' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: factors.map((f) => f.weight),
        name: '影响权重',
        areaStyle: { color: 'rgba(240, 165, 0, 0.15)' },
        lineStyle: { color: '#f0a500', width: 2 },
        itemStyle: { color: '#f0a500' },
        symbol: 'circle',
        symbolSize: 4,
      }],
    }],
  };

  return (
    <div>
      <ReactECharts option={option} style={{ height: 220 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {factors.map((f) => (
          <span key={f.factor} style={{
            fontSize: 10,
            padding: '2px 8px',
            background: 'rgba(240, 165, 0, 0.08)',
            border: '1px solid rgba(240, 165, 0, 0.2)',
            borderRadius: 2,
            color: 'var(--text-secondary)',
          }}>
            {f.factor}: {(f.weight * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
