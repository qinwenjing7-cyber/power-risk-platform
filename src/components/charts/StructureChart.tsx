import ReactECharts from 'echarts-for-react';
import type { PowerStructure, LoadStructure } from '../../types';
import { POWER_SOURCE_TYPES, LOAD_TYPES } from '../../utils/constants';

const POWER_KEY_MAP: Record<string, keyof PowerStructure> = {
  '火电': 'thermal', '水电': 'hydro', '风电': 'wind', '光电': 'solar', '核电': 'nuclear',
};
const LOAD_KEY_MAP: Record<string, keyof LoadStructure> = {
  '工业用电': 'industrial', '居民用电': 'residential', '商业用电': 'commercial', '农业用电': 'agricultural',
};

interface Props {
  power?: PowerStructure | null;
  load?: LoadStructure | null;
}

export default function StructureChart({ power = null, load = null }: Props) {
  const pieOption = {
    tooltip: { trigger: 'item' as const },
    legend: {
      orient: 'vertical' as const,
      right: 0,
      top: 'center',
      textStyle: { color: '#8497b0', fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: {
        label: { show: true, color: '#e2e8f0' },
      },
      data: power
        ? POWER_SOURCE_TYPES.map((name) => ({
            name,
            value: power[POWER_KEY_MAP[name]] || 0,
          }))
        : [],
      itemStyle: {
        borderColor: '#0d1321',
        borderWidth: 2,
      },
      color: ['#f0a500', '#3b82f6', '#0ef6be', '#eab308', '#f97316'],
    }],
  };

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { top: 10, right: 10, bottom: 20, left: 10 },
    xAxis: {
      type: 'category' as const,
      data: load ? LOAD_TYPES : [],
      axisLine: { lineStyle: { color: '#1a2640' } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    yAxis: {
      type: 'value' as const,
      name: 'MW',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1a2640', type: 'dashed' as const } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: load
        ? LOAD_TYPES.map((name) => ({
            value: load[LOAD_KEY_MAP[name]] || 0,
            itemStyle: {
              color: name === '工业用电' ? '#f0a500'
                : name === '居民用电' ? '#3b82f6'
                : name === '商业用电' ? '#0ef6be'
                : '#f97316',
            },
          }))
        : [],
      barWidth: 20,
    }],
  };

  const showPower = power !== null;
  const showLoad = load !== null;
  const cols = showPower && showLoad ? '1fr 1fr' : '1fr';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
      {showPower && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: 0.5 }}>
            电源结构占比
          </div>
          <ReactECharts option={pieOption} style={{ height: 200 }} />
        </div>
      )}
      {showLoad && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: 0.5 }}>
            负荷结构分布 (MW)
          </div>
          <ReactECharts option={barOption} style={{ height: 200 }} />
        </div>
      )}
    </div>
  );
}
