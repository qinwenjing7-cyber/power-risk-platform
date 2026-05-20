import ReactECharts from 'echarts-for-react';
import type { ExtremeWeather } from '../../types';
import { EXTREME_WEATHER_TYPES } from '../../utils/constants';

interface Props {
  data: ExtremeWeather[];
}

export default function FrequencyChart({ data }: Props) {
  const years = [...new Set(data.map((d) => d.year))].sort();
  const types = EXTREME_WEATHER_TYPES;

  const series = types.map((type) => ({
    name: type,
    type: 'line' as const,
    data: years.map((year) => {
      const record = data.find((d) => d.year === year && d.type === type);
      return record ? record.count : 0;
    }),
    smooth: true,
    symbol: 'circle',
    symbolSize: 4,
    lineStyle: { width: 1.5 },
  }));

  const typeColors: Record<string, string> = {
    '暴雨': '#3b82f6',
    '高温': '#f97316',
    '寒潮': '#0ef6be',
    '台风': '#f0a500',
    '暴雪': '#e2e8f0',
    '干旱': '#ef4444',
  };

  const option = {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: types,
      textStyle: { color: '#8497b0', fontSize: 10 },
      top: 0,
    },
    grid: { top: 36, right: 16, bottom: 24, left: 36 },
    xAxis: {
      type: 'category' as const,
      data: years,
      axisLine: { lineStyle: { color: '#1a2640' } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    yAxis: {
      type: 'value' as const,
      name: '次数',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1a2640', type: 'dashed' as const } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    series: series.map((s) => ({
      ...s,
      itemStyle: { color: typeColors[s.name] || '#8497b0' },
      lineStyle: { ...s.lineStyle, color: typeColors[s.name] || '#8497b0' },
    })),
  };

  return <ReactECharts option={option} style={{ height: 240 }} />;
}
