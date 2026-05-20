type Status = 'online' | 'warning' | 'offline';

const statusMap: Record<Status, { color: string; label: string; className: string }> = {
  online:  { color: '#0ef6be', label: '运行中', className: 'status-pulse-cyan' },
  warning: { color: '#f0a500', label: '预警',   className: 'status-pulse-amber' },
  offline: { color: '#ef4444', label: '离线',   className: 'status-pulse-red' },
};

export default function StatusLight({ status }: { status: Status }) {
  const s = statusMap[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span
        className={s.className}
        style={{
          display: 'inline-block',
          width: 6, height: 6,
          borderRadius: '50%',
          background: s.color,
        }}
      />
      <span style={{ color: s.color, fontWeight: 500, letterSpacing: 0.5 }}>
        {s.label}
      </span>
    </span>
  );
}
