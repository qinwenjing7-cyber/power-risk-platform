import ReactECharts from 'echarts-for-react';
import type { LongTermRisk } from '../../types';
import { RISK_COLORS } from '../../types';

interface Props {
  data: LongTermRisk[];
  cityName: string;
}

export default function RiskTimeline({ data, cityName }: Props) {
  const filtered = data
    .filter((d) => d.city === cityName)
    .sort((a, b) => a.forecastYear - b.forecastYear);

  const option = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(13, 19, 33, 0.95)',
      borderColor: '#1a2640',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    grid: { top: 10, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category' as const,
      data: filtered.map((d) => String(d.forecastYear)),
      axisLine: { lineStyle: { color: '#1a2640' } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    yAxis: {
      type: 'value' as const,
      name: '风险评分',
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1a2640', type: 'dashed' as const } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    visualMap: {
      show: false,
      pieces: [
        { lt: 30, color: RISK_COLORS.low },
        { lt: 50, color: RISK_COLORS.medium },
        { lt: 70, color: RISK_COLORS.high },
        { gte: 70, color: RISK_COLORS.critical },
      ],
      dimension: 1,
    },
    series: [{
      type: 'bar',
      data: filtered.map((d) => ({
        value: d.riskScore,
        itemStyle: {
          color: d.riskScore < 30 ? RISK_COLORS.low
            : d.riskScore < 50 ? RISK_COLORS.medium
            : d.riskScore < 70 ? RISK_COLORS.high
            : RISK_COLORS.critical,
        },
      })),
      barWidth: 18,
    }],
  };

  return <ReactECharts option={option} style={{ height: 220 }} />;
}
