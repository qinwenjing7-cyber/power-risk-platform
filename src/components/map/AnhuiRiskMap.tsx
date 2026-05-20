import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { RiskLevel, NewEnergyCapacity } from '../../types';
import { RISK_COLORS } from '../../types';
import { ANHUI_CENTER } from '../../utils/constants';

interface CityRisk {
  name: string;
  riskScore: number;
  riskLevel: RiskLevel;
}

interface Props {
  data: CityRisk[];
  onCityClick?: (city: CityRisk) => void;
  height?: number;
  neutral?: boolean;
  pieData?: NewEnergyCapacity[] | null;
}

export default function AnhuiRiskMap({ data, onCityClick, height, neutral = false, pieData = null }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const loadMap = async () => {
      try {
        const geoJson = await fetch('/data/anhui-geo.json').then((r) => r.json());
        echarts.registerMap('anhui', geoJson);

        if (!chartRef.current) return;
        if (!instanceRef.current) {
          instanceRef.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
        }

        if (onCityClick) {
          instanceRef.current.off('click');
          instanceRef.current.on('click', (params: any) => {
            if (params.componentType === 'series' && params.name) {
              const city = data.find((d) => d.name === params.name);
              if (city) onCityClick(city);
            }
          });
        }

        const mapData = data.map((d) => ({
          name: d.name,
          value: neutral ? 0 : d.riskScore,
        }));

        const option: any = {
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(13, 19, 33, 0.95)',
            borderColor: '#1a2640',
            textStyle: { color: '#e2e8f0', fontSize: 12 },
            formatter: (params: any) => {
              if (!params.name) return '';
              const city = data.find((d) => d.name === params.name);
              if (!city) return params.name;
              if (neutral) return `<strong>${city.name}</strong>`;
              return `<strong>${city.name}</strong><br/>
                风险评分: <span style="color:${RISK_COLORS[city.riskLevel]}">${city.riskScore.toFixed(1)}</span><br/>
                风险等级: <span style="color:${RISK_COLORS[city.riskLevel]}">${city.riskLevel}</span>`;
            },
          },
          geo: {
            map: 'anhui',
            roam: false,
            center: ANHUI_CENTER,
            zoom: 1.15,
            label: {
              show: true,
              color: neutral ? '#c8d6e5' : '#1a1a2e',
              fontSize: 11,
              fontWeight: neutral ? 500 : 600,
            },
            itemStyle: {
              areaColor: neutral ? '#0d1321' : 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              borderWidth: 1.5,
            },
            emphasis: { disabled: true },
          },
          series: [{
            type: 'map',
            map: 'anhui',
            geoIndex: 0,
            roam: false,
            data: mapData,
            itemStyle: {
              areaColor: neutral ? '#0d1321' : undefined,
              borderColor: 'rgba(255, 255, 255, 0.5)',
              borderWidth: 1.5,
            },
            emphasis: neutral ? {
              itemStyle: { areaColor: '#1a2640', borderColor: 'var(--accent-cyan)', borderWidth: 2 },
              label: { color: 'var(--accent-cyan)', fontSize: 13, fontWeight: 700 },
            } : {
              itemStyle: { borderColor: '#f0a500', borderWidth: 2 },
              label: { color: '#f0a500', fontSize: 13, fontWeight: 700 },
            },
            label: {
              show: true,
              color: neutral ? '#c8d6e5' : '#1a1a2e',
              fontSize: 11,
              fontWeight: neutral ? 500 : 600,
            },
          }],
        };

        if (!neutral) {
          option.visualMap = {
            type: 'piecewise',
            pieces: [
              { gte: 80, color: '#ef4444' },
              { gte: 60, lt: 80, color: '#f97316' },
              { gte: 40, lt: 60, color: '#f0a500' },
              { gte: 20, lt: 40, color: '#84cc16' },
              { lt: 20, color: '#22c55e' },
            ],
            show: false,
          };
        }

        // Add pie chart overlay for new energy capacity
        if (pieData && pieData.length > 0) {
          const centerMap = new Map<string, [number, number]>();
          for (const feature of geoJson.features) {
            const c = feature.properties?.center;
            if (c && feature.properties?.name) {
              centerMap.set(feature.properties.name, c);
            }
          }

          // Build raw data: [lng, lat, existing, underConstruction, cityName]
          const raw: Array<{ name: string; lng: number; lat: number; existing: number; underConst: number }> = [];
          for (const item of pieData) {
            const center = centerMap.get(item.city);
            if (center) {
              raw.push({ name: item.city, lng: center[0], lat: center[1], existing: item.existing, underConst: item.underConstruction });
            }
          }

          const maxTotal = Math.max(...raw.map((d) => d.existing + d.underConst), 1);

          // Split into left/right groups, assign evenly-spaced label target coordinates
          const leftGroup = raw.filter((d) => d.lng < ANHUI_CENTER[0]).sort((a, b) => b.lat - a.lat);
          const rightGroup = raw.filter((d) => d.lng >= ANHUI_CENTER[0]).sort((a, b) => b.lat - a.lat);

          const TARGET_LNG_LEFT = 114.7;
          const TARGET_LNG_RIGHT = 119.5;
          const LABEL_LAT_MIN = 29.6;
          const LABEL_LAT_MAX = 34.2;

          function assignTargets(group: typeof raw, targetLng: number) {
            const n = group.length;
            group.forEach((d, i) => {
              const frac = n <= 1 ? 0.5 : i / (n - 1);
              (d as any).tLng = targetLng;
              (d as any).tLat = LABEL_LAT_MAX - frac * (LABEL_LAT_MAX - LABEL_LAT_MIN);
            });
          }

          assignTargets(leftGroup, TARGET_LNG_LEFT);
          assignTargets(rightGroup, TARGET_LNG_RIGHT);

          const allData = [...leftGroup, ...rightGroup];

          option.series.push({
            type: 'custom',
            coordinateSystem: 'geo',
            geoIndex: 0,
            z: 10,
            silent: true,
            data: allData.map((d) => ({
              name: d.name,
              value: [d.lng, d.lat, d.existing, d.underConst, (d as any).tLng, (d as any).tLat],
            })),
            renderItem: function (_params: any, api: any) {
              const lng = api.value(0) as number;
              const lat = api.value(1) as number;
              const existing = api.value(2) as number;
              const underConstruction = api.value(3) as number;
              const total = existing + underConstruction;
              if (total <= 0) return null;

              const tLng = api.value(4) as number;
              const tLat = api.value(5) as number;

              const pos = api.coord([lng, lat]) as [number, number];
              const target = api.coord([tLng, tLat]) as [number, number];

              const r = 7 + (total / maxTotal) * 18;
              const existingRatio = existing / total;
              const startAngle = -Math.PI / 2;

              // Direction from city to label target
              const tdx = target[0] - pos[0];
              const tdy = target[1] - pos[1];
              const td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
              const dirX = tdx / td;
              const dirY = tdy / td;

              // Pie at city center
              const pieOX = -dirX * (r * 0.15);
              const pieOY = -dirY * (r * 0.15);

              const lineEnd = td - 10; // reach close to the label

              const children: any[] = [
                {
                  type: 'sector',
                  shape: { cx: pieOX, cy: pieOY, r, r0: 0,
                    startAngle, endAngle: startAngle + existingRatio * Math.PI * 2, clockwise: true },
                  style: { fill: '#0ef6be' },
                },
                {
                  type: 'sector',
                  shape: { cx: pieOX, cy: pieOY, r, r0: 0,
                    startAngle: startAngle + existingRatio * Math.PI * 2,
                    endAngle: startAngle + Math.PI * 2, clockwise: true },
                  style: { fill: '#f0a500' },
                },
                {
                  type: 'circle',
                  shape: { cx: pieOX, cy: pieOY, r },
                  style: { stroke: 'rgba(255,255,255,0.35)', lineWidth: 1, fill: null },
                },
                {
                  type: 'line',
                  shape: {
                    x1: pieOX + dirX * (r + 2),
                    y1: pieOY + dirY * (r + 2),
                    x2: target[0] - pos[0],
                    y2: target[1] - pos[1],
                  },
                  style: { stroke: 'rgba(240,165,0,0.5)', lineWidth: 1.5 },
                },
                {
                  type: 'text',
                  style: {
                    text: `已有装机: ${Math.round(existing)}MW\n在建装机: ${Math.round(underConstruction)}MW`,
                    x: target[0] - pos[0],
                    y: target[1] - pos[1],
                    textAlign: tLng < ANHUI_CENTER[0] ? 'right' : 'left',
                    textVerticalAlign: 'middle',
                    fill: '#e2e8f0',
                    font: 'bold 16px monospace',
                  },
                },
              ];

              return {
                type: 'group',
                x: pos[0],
                y: pos[1],
                children,
              };
            },
          });
        }

        instanceRef.current.setOption(option, true);
      } catch (err) {
        console.error('Map load error:', err);
      }
    };

    loadMap();

    return () => {
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, [data, onCityClick, neutral, pieData]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    // Block ECharts wheel zoom at the DOM level
    const el = containerRef.current;
    const blockWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (el) {
      el.addEventListener('wheel', blockWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (el) {
        el.removeEventListener('wheel', blockWheel);
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: height || '100%', flex: height ? undefined : 1, minHeight: height ? undefined : 0 }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
