import type { RiskLevel } from '../../types';
import { RISK_COLORS, RISK_LABELS } from '../../types';

const levels: RiskLevel[] = ['low', 'moderate', 'medium', 'high', 'critical'];

export default function MapLegend() {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginRight: 2 }}>
        风险等级
      </span>
      {levels.map((level) => (
        <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 10, height: 10,
            background: RISK_COLORS[level],
            display: 'inline-block',
            border: `1px solid ${RISK_COLORS[level]}40`,
            boxShadow: `0 0 4px ${RISK_COLORS[level]}40`,
          }} />
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>
            {RISK_LABELS[level]}
          </span>
        </div>
      ))}
    </div>
  );
}
