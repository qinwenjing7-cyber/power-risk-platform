import { useState, useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import DataPanel from '../common/DataPanel';
import { useDataFetch } from '../../hooks/useDataFetch';
import type { SupplyDemandAllData, SupplyDemandCity, SupplyDemandDay, SupplyDemandHour } from '../../types';

const DATA_URL = '/data/supply-demand-all.json';

/* Generation-source color coding (matches the 24h chart) */
const SOURCE_COLORS: Record<'solar' | 'wind' | 'thermal', string> = {
  solar: '#f0a500',   // 光伏 — amber
  wind: '#0ef6be',    // 风电 — cyan
  thermal: '#f97316', // 火电 — heat orange
};
const SOURCE_LABELS: Record<'solar' | 'wind' | 'thermal', string> = {
  solar: '光伏',
  wind: '风电',
  thermal: '火电',
};
const SOURCE_KEYS: ('solar' | 'wind' | 'thermal')[] = ['solar', 'wind', 'thermal'];

const POSITIVE_COLOR = '#22c55e'; // ΔP 富余
const NEGATIVE_COLOR = '#ef4444'; // ΔP 缺口
const LOAD_COLOR = '#e2e8f0';

/* --- date/hour helpers so the view defaults to "today + current hour" --- */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nearestDay(days: SupplyDemandDay[], target: string): SupplyDemandDay {
  const t = Date.parse(target);
  let best = days[0];
  let bestDiff = Infinity;
  for (const day of days) {
    const diff = Math.abs(Date.parse(day.date) - t);
    // Strictly nearer, or equal distance that leans forward (future) when the target is missing.
    if (diff < bestDiff || (diff === bestDiff && Date.parse(day.date) >= t)) {
      bestDiff = diff;
      best = day;
    }
  }
  return best;
}

function nearestHour(day: SupplyDemandDay, target: number): SupplyDemandHour {
  let best = day.hours[0];
  let bestDiff = Infinity;
  for (const h of day.hours) {
    const diff = Math.abs(h.hour - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  }
  return best;
}

// Closest hour whose data is real (source === 'real'), for a "partial-forecast" day.
function nearestRealHour(day: SupplyDemandDay, target: number): SupplyDemandHour {
  const reals = day.hours.filter((h) => h.source === 'real');
  if (reals.length === 0) return nearestHour(day, target);
  let best = reals[0];
  let bestDiff = Infinity;
  for (const h of reals) {
    const diff = Math.abs(h.hour - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  }
  return best;
}

// Pick the default hour to view for a given day.
// - Today: keep "current hour" semantics — current hour if it is real, else nearest real hour.
// - Other days: land on the day's peak-solar hour when it has any solar, so a solar-rich day
//   shows its photovoltaic mix instead of a night/low-solar hour.
function defaultHourForDay(day: SupplyDemandDay, isToday: boolean, currentHour: number): number {
  if (isToday) {
    const current = day.hours.find((h) => h.hour === currentHour);
    return current && current.source === 'real' ? currentHour : nearestRealHour(day, currentHour).hour;
  }
  const solar = day.hours.filter((h) => h.solar > 0);
  if (solar.length > 0) {
    return solar.reduce((a, b) => (b.solar > a.solar ? b : a)).hour;
  }
  return nearestRealHour(day, currentHour).hour;
}

function isSolarAllZero(day: SupplyDemandDay): boolean {
  return day.hours.length > 0 && day.hours.every((h) => h.solar <= 0);
}

function buildChartOption(day: SupplyDemandDay) {
  const hours = [...day.hours].sort((a, b) => a.hour - b.hour);
  const labels = hours.map((h) => `${h.hour}时`);

  return {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(13, 19, 33, 0.95)',
      borderColor: '#1a2640',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    legend: {
      top: 2,
      textStyle: { color: '#8497b0', fontSize: 10 },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { top: 38, right: 18, bottom: 26, left: 52 },
    xAxis: {
      type: 'category' as const,
      data: labels,
      axisLine: { lineStyle: { color: '#1a2640' } },
      axisLabel: { color: '#506080', fontSize: 9 },
    },
    yAxis: {
      type: 'value' as const,
      name: 'MW',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1a2640', type: 'dashed' as const } },
      axisLabel: { color: '#506080', fontSize: 10 },
    },
    series: [
      {
        name: SOURCE_LABELS.solar, type: 'line' as const, smooth: true,
        showSymbol: false, data: hours.map((h) => h.solar),
        lineStyle: { color: SOURCE_COLORS.solar, width: 1.5 },
        itemStyle: { color: SOURCE_COLORS.solar },
      },
      {
        name: SOURCE_LABELS.wind, type: 'line' as const, smooth: true,
        showSymbol: false, data: hours.map((h) => h.wind),
        lineStyle: { color: SOURCE_COLORS.wind, width: 1.5 },
        itemStyle: { color: SOURCE_COLORS.wind },
      },
      {
        name: SOURCE_LABELS.thermal, type: 'line' as const, smooth: true,
        showSymbol: false, data: hours.map((h) => h.thermal),
        lineStyle: { color: SOURCE_COLORS.thermal, width: 1.5 },
        itemStyle: { color: SOURCE_COLORS.thermal },
      },
      {
        name: '负荷', type: 'line' as const, smooth: true,
        showSymbol: false, data: hours.map((h) => h.load),
        lineStyle: { color: LOAD_COLOR, width: 2 },
        itemStyle: { color: LOAD_COLOR },
      },
      {
        name: 'ΔP 缺口', type: 'bar' as const, barWidth: 8,
        data: hours.map((h) => ({
          value: h.gap,
          itemStyle: { color: h.gap >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR },
        })),
        yAxisIndex: 0,
      },
    ],
  };
}

function SnapshotMetric({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'rgba(13, 19, 33, 0.6)',
      border: '1px solid var(--border-color)',
      borderRadius: 1,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 10, color: 'var(--text-dim)',
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 6, height: 6, background: color, opacity: 0.85, boxShadow: `0 0 5px ${color}` }} />
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
        color, lineHeight: 1, letterSpacing: -0.5,
      }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{sub}</div>
    </div>
  );
}

function SourceStackRow({ hour, supply }: {
  hour: { solar: number; wind: number; thermal: number; supply: number };
  supply: number;
}) {
  return (
    <>
      {/* Segmented supply-stack bar — the signature element */}
      <div style={{ display: 'flex', height: 9, background: 'var(--border-color)', borderRadius: 1, overflow: 'hidden' }}>
        {SOURCE_KEYS.map((k) => {
          const pct = supply > 0 ? (hour[k] / supply) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div key={k} style={{ width: `${pct}%`, background: SOURCE_COLORS[k], boxShadow: `inset 0 0 6px rgba(0,0,0,0.3)` }} />
          );
        })}
      </div>

      {/* Legend with MW + % */}
      {SOURCE_KEYS.map((k) => {
        const pct = supply > 0 ? (hour[k] / supply) * 100 : 0;
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ width: 8, height: 8, background: SOURCE_COLORS[k], borderRadius: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 32, letterSpacing: 0.5 }}>{SOURCE_LABELS[k]}</span>
            <span style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 1, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: SOURCE_COLORS[k], opacity: 0.9 }} />
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: 56, textAlign: 'right' }}>
              {hour[k].toFixed(0)} MW
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', width: 40, textAlign: 'right' }}>
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </>
  );
}

export default function SupplyDemandPanel({ cityName }: { cityName: string }) {
  const { data, loading, error } = useDataFetch<SupplyDemandAllData>(DATA_URL);

  const city = useMemo<SupplyDemandCity | null>(
    () => data?.cities.find((c) => c.city === cityName) ?? null,
    [data, cityName],
  );

  const days = useMemo(
    () => (city?.days ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)),
    [city],
  );

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState(() => Math.min(23, Math.max(0, new Date().getHours())));
  const lastCityRef = useRef<string>('');

  // Default to "today" (or nearest day) + current hour, and re-align when the city changes.
  // The `lastCityRef` guard keeps the user's chosen date/hour across hourly auto-refreshes.
  useEffect(() => {
    if (days.length === 0) return;
    if (lastCityRef.current === cityName && selectedDate) return;
    lastCityRef.current = cityName;
    const todayKey = toDateKey(new Date());
    const day = nearestDay(days, todayKey);
    setSelectedDate(day.date);
    setSelectedHour(defaultHourForDay(day, day.date === todayKey, new Date().getHours()));
  }, [days, cityName, selectedDate]);

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate],
  );

  const hour = useMemo(() => {
    if (!selectedDay) return null;
    return selectedDay.hours.find((h) => h.hour === selectedHour) ?? selectedDay.hours[0] ?? null;
  }, [selectedDay, selectedHour]);

  // When the day changes, re-align the selected hour so the snapshot lands on a
  // representative (solar-bearing, when present) hour instead of a stale/no-solar one.
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const day = days.find((d) => d.date === date);
    if (day) setSelectedHour(defaultHourForDay(day, date === toDateKey(new Date()), new Date().getHours()));
  };

  const panelTitle = `${cityName} · 供需快照`;

  if (loading) {
    return (
      <DataPanel title={panelTitle} accent="amber">
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 26 }}>加载中...</div>
      </DataPanel>
    );
  }

  if (error) {
    return (
      <DataPanel title={panelTitle} accent="amber">
        <div style={{ fontSize: 12, color: 'var(--accent-red)', textAlign: 'center', padding: 26 }}>
          供需数据加载失败：{error}
        </div>
      </DataPanel>
    );
  }

  // City missing from the dataset (or no days) — friendly degrade, no blank/error.
  if (!data || !city || days.length === 0) {
    return (
      <DataPanel title={panelTitle} accent="amber">
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 26 }}>
          该市暂无供需数据
        </div>
      </DataPanel>
    );
  }

  // Transient: the default-selection effect will populate these right after this render.
  if (!selectedDay || !hour) {
    return (
      <DataPanel title={panelTitle} accent="amber">
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 26 }}>加载中...</div>
      </DataPanel>
    );
  }

  const supply = hour.supply;
  const gap = hour.gap;
  const gapPositive = gap >= 0;
  const generatedAt = data.generatedAt ? data.generatedAt.slice(0, 16) : '—';

  const todayKey = toDateKey(new Date());
  const isToday = selectedDay.date === todayKey;
  const periodLabel = isToday ? '今日' : (selectedDay.source === 'past' ? '过去日' : '未来日');

  // Data-availability note shown below the source-mix bar.
  let sourceNote = '';
  if (isToday && hour.source === 'placeholder') {
    sourceNote = '今日凌晨 = 预测前无数据'; // today's pre-forecast placeholder span
  } else if (selectedDay.source === 'past') {
    sourceNote = '过去日辐照为占位数据';
  } else if (selectedDay.source === 'real' && isSolarAllZero(selectedDay)) {
    sourceNote = '辐照数据不足（超出预报范围）';
  }

  return (
    <DataPanel title={panelTitle} accent="amber">
      {/* Time-of-interest selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1.5 }}>数据时点 · 选择日期 / 时刻</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, background: '#8497b0' }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>过去</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, background: 'var(--accent-amber)' }} />
              <span style={{ fontSize: 10, color: 'var(--accent-amber)', letterSpacing: 0.5 }}>未来</span>
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              flex: 2,
              background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
              color: 'var(--accent-amber)', padding: '5px 24px 5px 10px',
              fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', outline: 'none', borderRadius: 1,
            }}
          >
            {days.map((d) => (
              <option
                key={d.date}
                value={d.date}
                style={{ color: d.source === 'past' ? '#8497b0' : 'var(--accent-amber)' }}
              >
                {d.date.slice(5)}
              </option>
            ))}
          </select>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(Number(e.target.value))}
            style={{
              flex: 1,
              background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)', padding: '5px 24px 5px 10px',
              fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', outline: 'none', borderRadius: 1,
            }}
          >
            {Array.from({ length: 24 }, (_, h) => h).map((h) => (
              <option key={h} value={h}>{h}时</option>
            ))}
          </select>
        </div>
      </div>

      {/* Snapshot hero: ΔP gap first, then load & supply */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        <SnapshotMetric
          label="供需缺口 ΔP"
          value={`${gapPositive ? '+' : ''}${gap.toFixed(1)}`}
          sub={gapPositive ? '富余 · MW' : '缺口 · MW'}
          color={gapPositive ? POSITIVE_COLOR : NEGATIVE_COLOR}
        />
        <SnapshotMetric label="负荷" value={hour.load.toFixed(1)} sub="MW" color="var(--text-primary)" />
        <SnapshotMetric label="总供应" value={supply.toFixed(1)} sub="MW" color="var(--accent-cyan)" />
      </div>

      {/* Generation source mix */}
      <div style={{ marginBottom: 4 }}>
        <div style={{
          fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1.5, textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          电源结构占比 <span style={{ color: 'var(--text-secondary)', letterSpacing: 0.5, textTransform: 'none' }}>· 相对总供应</span>
        </div>
        <SourceStackRow hour={hour} supply={supply} />
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
          {periodLabel} · {generatedAt} 生成
          {sourceNote ? ` · ${sourceNote}` : ''}
        </div>
      </div>

      {/* 24h curve */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
        <div style={{
          fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1.5, textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          24h 供需曲线 <span style={{ color: 'var(--text-secondary)', letterSpacing: 0.5, textTransform: 'none' }}>· {selectedDay.date}</span>
        </div>
        <ReactECharts option={buildChartOption(selectedDay)} style={{ height: 240 }} />
      </div>
    </DataPanel>
  );
}
