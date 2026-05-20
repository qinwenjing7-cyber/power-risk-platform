import { useState, useEffect, useCallback, useRef } from 'react';
import type { CurrentWeather, DailyWeather, ExtremeDay } from '../services/weatherApi';
import {
  fetchCurrentWeather, analyzeExtremeEvents, clearWeatherCache, fetchRecentDays,
} from '../services/weatherApi';

interface UseWeatherResult {
  current: CurrentWeather | null;
  history: DailyWeather[] | null;
  extremes: ExtremeDay[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWeather(city: string): UseWeatherResult {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [history, setHistory] = useState<DailyWeather[] | null>(null);
  const [extremes, setExtremes] = useState<ExtremeDay[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cityRef = useRef(city);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const [weather, daily] = await Promise.all([
        fetchCurrentWeather(city, force),
        fetchRecentDays(city, 10, force).catch((e) => {
          console.error('Historical weather fetch failed:', e);
          return [];
        }),
      ]);
      if (cityRef.current !== city) return;
      setCurrent(weather);
      setHistory(daily);
      setExtremes(analyzeExtremeEvents(daily));
    } catch (err) {
      if (cityRef.current === city) {
        setError(err instanceof Error ? err.message : '获取天气失败');
      }
    } finally {
      if (cityRef.current === city) {
        setLoading(false);
      }
    }
  }, [city]);

  useEffect(() => {
    const handler = () => {
      clearWeatherCache();
      load(true);
    };
    window.addEventListener('dashboard-refresh', handler);
    return () => window.removeEventListener('dashboard-refresh', handler);
  }, [load]);

  useEffect(() => {
    cityRef.current = city;
    load(false);
  }, [city, load]);

  const refresh = useCallback(() => {
    clearWeatherCache();
    load(true);
  }, [load]);

  return { current, history, extremes, loading, error, refresh };
}
