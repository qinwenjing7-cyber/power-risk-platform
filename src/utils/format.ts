import dayjs from 'dayjs';

export function formatDateTime(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function formatDate(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: decimals });
}

export function formatPercent(n: number, decimals = 1): string {
  return (n * 100).toFixed(decimals) + '%';
}

export function formatCapacity(mw: number): string {
  if (mw >= 1000) return (mw / 1000).toFixed(1) + ' GW';
  return mw.toFixed(0) + ' MW';
}

export function formatGap(mw: number): string {
  const sign = mw >= 0 ? '+' : '';
  return sign + formatCapacity(mw);
}
