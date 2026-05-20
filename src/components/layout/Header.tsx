import { useClock } from '../../hooks/useClock';
import StatusLight from '../common/StatusLight';
import RefreshButton from '../common/RefreshButton';

interface Props {
  lastUpdate: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function Header({ lastUpdate, refreshing, onRefresh }: Props) {
  const clockString = useClock().toLocaleTimeString('zh-CN', { hour12: false });

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-header)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Top global line */}
      <div className="top-accent-line" />

      {/* Bottom dual-tone glow */}
      <div style={{
        position: 'absolute', bottom: -1, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, var(--accent-amber) 10%, transparent 40%, var(--accent-cyan) 60%, transparent 90%, var(--accent-amber) 100%)',
        opacity: 0.4,
      }} />

      {/* === LEFT === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Logo */}
        <div style={{
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(240, 165, 0, 0.6)',
          background: 'rgba(240, 165, 0, 0.08)',
          position: 'relative',
        }}>
          <span style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 1, background: 'var(--accent-amber)' }} />
          <span style={{ position: 'absolute', top: -1, left: -1, width: 1, height: 6, background: 'var(--accent-amber)' }} />
          <span style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 1, background: 'var(--accent-amber)' }} />
          <span style={{ position: 'absolute', bottom: -1, right: -1, width: 1, height: 6, background: 'var(--accent-amber)' }} />
          <span style={{ fontSize: 20, lineHeight: 1 }}>⚡</span>
        </div>

        {/* Title */}
        <div>
          <div style={{
            fontSize: 15, fontWeight: 700,
            letterSpacing: 4,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}>
            电力系统供需风险预警平台
          </div>
          <div style={{
            fontSize: 8, color: 'var(--text-dim)',
            letterSpacing: 1.5,
            fontFamily: 'var(--font-mono)',
          }}>
            ANHUI · SUPPLY-DEMAND RISK EARLY WARNING SYSTEM
          </div>
        </div>

        {/* Province tag */}
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: '4px 12px',
          border: '1px solid rgba(240, 165, 0, 0.5)',
          background: 'rgba(240, 165, 0, 0.06)',
          color: 'var(--accent-amber)',
          letterSpacing: 3,
        }}>
          安 徽 省
        </span>
      </div>

      {/* === RIGHT === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Data feeds */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: '气象数据', color: 'var(--accent-cyan)', online: true },
            { label: '电网数据', color: 'var(--accent-amber)', online: true },
            { label: '算法引擎', color: 'var(--text-dim)', online: false },
          ].map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
              <span className={f.online ? 'status-pulse-cyan' : ''} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: f.color, display: 'inline-block',
                animationDuration: f.online ? '2s' : '4s',
              }} />
              <span style={{ color: 'var(--text-dim)', letterSpacing: 0.5 }}>{f.label}</span>
            </div>
          ))}
        </div>

        <span style={{ width: 1, height: 20, background: 'var(--border-color)' }} />

        <StatusLight status="online" />

        <span style={{
          fontSize: 15,
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-cyan)',
          letterSpacing: 1,
          fontWeight: 600,
          textShadow: '0 0 8px rgba(14, 246, 190, 0.3)',
        }}>
          {clockString}
        </span>

        <span style={{ width: 1, height: 20, background: 'var(--border-color)' }} />

        <RefreshButton onRefresh={onRefresh} refreshing={refreshing} lastUpdate={lastUpdate} />
      </div>
    </header>
  );
}
