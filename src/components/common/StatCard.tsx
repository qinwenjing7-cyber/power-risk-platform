interface Props {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  alert?: boolean;
}

const trendColors: Record<string, string> = {
  up: 'var(--accent-red)',
  down: 'var(--accent-cyan)',
  stable: 'var(--text-secondary)',
};
const trendArrows: Record<string, string> = {
  up: '↑', down: '↓', stable: '—',
};
const trendLabels: Record<string, string> = {
  up: '上升', down: '下降', stable: '平稳',
};

export default function StatCard({ label, value, unit, trend, alert }: Props) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '18px 22px',
      background: alert ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
      border: alert ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
      borderRadius: 2,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Alert corner flag */}
      {alert && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          borderStyle: 'solid',
          borderWidth: '0 20px 20px 0',
          borderColor: `transparent rgba(239, 68, 68, 0.4) transparent transparent`,
        }} />
      )}

      {/* Label row */}
      <div style={{
        fontSize: 10,
        color: 'var(--text-dim)',
        marginBottom: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        <span style={{
          width: 8, height: 1,
          background: alert ? 'var(--accent-red)' : 'var(--border-color)',
          display: 'inline-block',
        }} />
        {label}
        <span style={{
          width: 8, height: 1,
          background: alert ? 'var(--accent-red)' : 'var(--border-color)',
          display: 'inline-block',
        }} />
      </div>

      {/* Value — instrument readout style */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 34,
        fontWeight: 700,
        color: alert ? 'var(--accent-red)' : 'var(--text-primary)',
        lineHeight: 1,
        letterSpacing: -1,
        textShadow: alert
          ? '0 0 24px rgba(239, 68, 68, 0.35)'
          : '0 0 8px rgba(226, 232, 240, 0.1)',
        position: 'relative',
      }}>
        {/* Subtle background glow behind number */}
        <span style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 80, height: 50,
          background: alert
            ? 'radial-gradient(ellipse, rgba(239,68,68,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(226,232,240,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <span style={{ position: 'relative' }}>
          {value}
          {unit && (
            <span style={{
              fontSize: 13,
              marginLeft: 3,
              fontWeight: 400,
              color: 'var(--text-secondary)',
              letterSpacing: 1,
            }}>
              {unit}
            </span>
          )}
        </span>
      </div>

      {/* Trend indicator */}
      {trend && (
        <div style={{
          fontSize: 11,
          color: trendColors[trend],
          marginTop: 8,
          fontWeight: 500,
          letterSpacing: 0.5,
        }}>
          {trendArrows[trend]} {trendLabels[trend]}
        </div>
      )}
    </div>
  );
}
