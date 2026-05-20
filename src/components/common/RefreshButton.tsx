interface Props {
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdate: Date | null;
}

export default function RefreshButton({ onRefresh, refreshing, lastUpdate }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {lastUpdate && (
        <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 0.5 }}>
          更新: {lastUpdate.toLocaleString('zh-CN')}
        </span>
      )}
      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 14px',
          background: refreshing ? 'rgba(240, 165, 0, 0.1)' : 'transparent',
          border: `1px solid ${refreshing ? 'rgba(240, 165, 0, 0.5)' : 'var(--border-color)'}`,
          borderRadius: 1,
          color: refreshing ? 'var(--accent-amber)' : 'var(--text-secondary)',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: refreshing ? 'default' : 'pointer',
          transition: 'all 0.25s',
          letterSpacing: 0.5,
        }}
        onClick={onRefresh}
        disabled={refreshing}
        onMouseEnter={(e) => {
          if (!refreshing) {
            e.currentTarget.style.borderColor = 'var(--accent-amber)';
            e.currentTarget.style.color = 'var(--accent-amber)';
          }
        }}
        onMouseLeave={(e) => {
          if (!refreshing) {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <span style={{
          fontSize: 14,
          transform: refreshing ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.4s',
          display: 'inline-block',
        }}>
          ⟳
        </span>
        {refreshing ? '刷新中' : '刷新数据'}
      </button>
    </div>
  );
}
