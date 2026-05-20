import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { DailyWeather } from '../../services/weatherApi';

interface Props {
  data: DailyWeather[];
  height?: number;
}

function sunshineMinutes(sunrise: string, sunset: string): number {
  const [rh, rm] = sunrise.split(':').map(Number);
  const [sh, sm] = sunset.split(':').map(Number);
  return (sh * 60 + sm) - (rh * 60 + rm);
}

const gridBase = { top: 18, bottom: 22, left: 40, right: 6 };
const gridDual = { top: 18, bottom: 22, left: 40, right: 40 };

function xAxis(dates: string[]) {
  return { type: 'category' as const, data: dates, axisLabel: { color: '#8497b0', fontSize: 8, rotate: 20 }, axisLine: { lineStyle: { color: '#1a2640' } } };
}

function yAxis(name: string) {
  return { type: 'value' as const, name, nameTextStyle: { color: '#8497b0', fontSize: 9 }, axisLabel: { color: '#8497b0', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(30,45,70,0.4)' } } };
}

// Merged: temperature (lines, left y-axis) + precipitation (bars, right y-axis)
function tempPrecipChart(dates: string[], highs: number[], lows: number[], avgs: number[], precips: number[]) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: gridDual,
    xAxis: xAxis(dates),
    yAxis: [
      { ...yAxis('°C'), axisLine: { lineStyle: { color: '#ef4444' } } },
      { ...yAxis('mm'), axisLine: { lineStyle: { color: '#3b82f6' } } },
    ],
    series: [
      { name: '最高温', type: 'line', data: highs, smooth: true, lineStyle: { color: '#ef4444', width: 2 }, itemStyle: { color: '#ef4444' }, symbol: 'circle', symbolSize: 3 },
      { name: '平均温', type: 'line', data: avgs, smooth: true, lineStyle: { color: '#f0a500', width: 2 }, itemStyle: { color: '#f0a500' }, symbol: 'circle', symbolSize: 3 },
      { name: '最低温', type: 'line', data: lows, smooth: true, lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' }, symbol: 'circle', symbolSize: 3 },
      {
        name: '降水量', type: 'bar', yAxisIndex: 1, data: precips, barWidth: '40%',
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59, 130, 246, 0.6)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.08)' }]) },
      },
    ],
  };
}

function sunshineChart(dates: string[], values: number[]) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: gridBase,
    xAxis: xAxis(dates),
    yAxis: yAxis('小时'),
    series: [{
      name: '日照时长', type: 'bar', data: values,
      itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f0a500' }, { offset: 1, color: '#5c3d00' }]) },
    }],
  };
}

function windChart(dates: string[], values: number[]) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: gridBase,
    xAxis: xAxis(dates),
    yAxis: yAxis('km/h'),
    series: [{
      name: '风速', type: 'line', data: values, smooth: true, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(14, 246, 190, 0.25)' }, { offset: 1, color: 'rgba(14, 246, 190, 0.02)' }]) },
      lineStyle: { color: '#0ef6be', width: 2 }, itemStyle: { color: '#0ef6be' }, symbol: 'circle', symbolSize: 4,
    }],
  };
}

export default function TenDayWeatherPanel({ data, height = 640 }: Props) {
  const tRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<HTMLDivElement>(null);
  const wRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const dates = sorted.map((d) => d.date.slice(5));
    const highs = sorted.map((d) => d.tempMax);
    const lows = sorted.map((d) => d.tempMin);
    const avgs = sorted.map((d) => d.tempAvg);
    const precips = sorted.map((d) => d.precip);
    const sunshines = sorted.map((d) => Math.round(sunshineMinutes(d.sunrise, d.sunset) / 6) / 10);
    const winds = sorted.map((d) => d.windSpeed);

    const charts: { el: HTMLDivElement | null; option: any }[] = [
      { el: tRef.current, option: tempPrecipChart(dates, highs, lows, avgs, precips) },
      { el: sRef.current, option: sunshineChart(dates, sunshines) },
      { el: wRef.current, option: windChart(dates, winds) },
    ];

    const instances: echarts.ECharts[] = [];
    charts.forEach(({ el, option }) => {
      if (el) {
        const inst = echarts.init(el, undefined, { renderer: 'canvas' });
        inst.setOption(option);
        instances.push(inst);
      }
    });

    const handleResize = () => instances.forEach((i) => i.resize());
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      instances.forEach((i) => i.dispose());
    };
  }, [data]);

  // 3 charts instead of 4
  const labelH = 14;
  const gapH = 5;
  const dateH = 14;
  const N = 3;
  const chartH = Math.floor((height - dateH - gapH * N - labelH * N) / N);
  const mergedH = chartH + 30; // first chart taller for dual Y-axis

  const sectionStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: gapH, height }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right', flexShrink: 0, height: dateH, lineHeight: `${dateH}px` }}>
        {data.length > 0 ? `${data[0].date} ~ ${data[data.length - 1].date}` : ''}
      </div>
      <div style={{ ...sectionStyle, height: labelH + mergedH }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', height: labelH, lineHeight: `${labelH}px`, flexShrink: 0 }}>温度 & 降水</div>
        <div ref={tRef} style={{ width: '100%', height: mergedH }} />
      </div>
      <div style={{ ...sectionStyle, height: labelH + chartH }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', height: labelH, lineHeight: `${labelH}px`, flexShrink: 0 }}>日照时长 (小时)</div>
        <div ref={sRef} style={{ width: '100%', height: chartH }} />
      </div>
      <div style={{ ...sectionStyle, height: labelH + chartH }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', height: labelH, lineHeight: `${labelH}px`, flexShrink: 0 }}>平均风速 (km/h)</div>
        <div ref={wRef} style={{ width: '100%', height: chartH }} />
      </div>
    </div>
  );
}
