import ReactECharts from 'echarts-for-react';
import type { WeatherData, WeatherHistory } from '../../types';

interface Props {
  current: WeatherData | null;
  history: WeatherHistory | null;
}

export default function WeatherChart({ current, history }: Props) {
  const option = {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: ['平均温度(°C)', '降水量(mm)'],
      textStyle: { color: '#8497b0', fontSize: 12 },
      top: 0,
    },
    grid: { top: 40, right: 24, bottom: 30, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: history?.records.map((r) => r.date) || [],
      axisLine: { lineStyle: { color: '#1a2640' } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '°C',
        nameTextStyle: { color: '#506080', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#1a2640', type: 'dashed' as const } },
        axisLabel: { color: '#506080', fontSize: 10 },
      },
      {
        type: 'value' as const,
        name: 'mm',
        nameTextStyle: { color: '#506080', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#506080', fontSize: 10 },
      },
    ],
    series: [
      {
        name: '平均温度(°C)',
        type: 'line',
        data: history?.records.map((r) => r.avgTemp) || [],
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#f0a500', width: 2 },
        itemStyle: { color: '#f0a500' },
      },
      {
        name: '降水量(mm)',
        type: 'bar',
        yAxisIndex: 1,
        data: history?.records.map((r) => r.precipitation) || [],
        itemStyle: { color: 'rgba(59, 130, 246, 0.6)' },
      },
    ],
  };

  return (
    <div>
      {current && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginBottom: 16,
        }}>
          {[
            { label: '温度', value: `${current.temperature}°C` },
            { label: '湿度', value: `${current.humidity}%` },
            { label: '风速', value: `${current.windSpeed} m/s` },
            { label: '降水', value: `${current.precipitation} mm` },
          ].map((item) => (
            <div key={item.label} style={{
              textAlign: 'center', padding: '8px 4px',
              background: 'rgba(14, 246, 190, 0.04)',
              border: '1px solid rgba(14, 246, 190, 0.12)',
              borderRadius: 2,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{item.label}</div>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
      <ReactECharts option={option} style={{ height: 180 }} />
    </div>
  );
}
