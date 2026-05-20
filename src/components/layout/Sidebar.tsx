import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/',            label: '总览仪表盘',     marker: '01', coord: 'N31° E117°' },
  { path: '/factors',     label: '保供影响因素',   marker: '02', coord: 'FACTOR-ANALYSIS' },
  { path: '/longterm',    label: '中长期风险分析', marker: '03', coord: '2026-2035' },
  { path: '/shortterm',   label: '短期风险预警',   marker: '04', coord: 'WEEKLY-FORECAST' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100%',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Right edge accent glow */}
      <div style={{
        position: 'absolute', right: -1, top: 0, bottom: 0, width: 1,
        background: 'linear-gradient(180deg, transparent 0%, var(--accent-amber) 20%, var(--accent-amber) 80%, transparent 100%)',
        opacity: 0.25,
      }} />

      {/* === LOGO ZONE === */}
      <div style={{
        padding: '22px 20px 18px',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
      }}>
        {/* Corner accents on logo zone */}
        <span style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderTop: '1px solid rgba(240,165,0,0.3)', borderRight: '1px solid rgba(240,165,0,0.3)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo hex */}
          <div style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(240, 165, 0, 0.6)',
            background: 'rgba(240, 165, 0, 0.08)',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: -1, left: 6, right: 6, height: 1,
              background: 'var(--accent-amber)', opacity: 0.5,
            }} />
            <span style={{ fontSize: 22, lineHeight: 1 }}>⚡</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 2 }}>
              电力预警
            </div>
            <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1.5, marginTop: 1 }}>
              POWER RISK SYSTEM
            </div>
          </div>
        </div>
      </div>

      {/* === NAV === */}
      <nav style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', flex: 1 }}>
        {/* Section label */}
        <div style={{
          padding: '6px 20px 10px',
          fontSize: 8, color: 'var(--text-dim)',
          letterSpacing: 2.5,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 1, background: 'var(--border-color)' }} />
          NAVIGATION
        </div>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 16px 11px 20px',
                margin: '1px 8px',
                color: isActive ? 'var(--accent-amber)' : 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'all 0.2s',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(240,165,0,0.1) 0%, rgba(240,165,0,0.02) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-amber)' : '3px solid transparent',
                position: 'relative',
              }}
            >
              {/* Glow bar on active */}
              {isActive && (
                <div style={{
                  position: 'absolute', left: -3, top: 0, bottom: 0, width: 3,
                  background: 'var(--accent-amber)',
                  boxShadow: '0 0 10px rgba(240,165,0,0.6), 0 0 20px rgba(240,165,0,0.3)',
                }} />
              )}

              {/* Marker */}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: isActive ? 'var(--accent-amber)' : 'var(--text-dim)',
                width: 18,
                opacity: isActive ? 1 : 0.4,
              }}>
                {item.marker}
              </span>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: 0.5,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 8,
                  color: isActive ? 'rgba(240,165,0,0.5)' : 'var(--text-dim)',
                  letterSpacing: 0.5,
                  marginTop: 1,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {item.coord}
                </div>
              </div>

              {/* Active indicator chevron */}
              {isActive && (
                <span style={{ color: 'var(--accent-amber)', fontSize: 10, opacity: 0.8 }}>
                  ▶
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* === FOOTER === */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span className="status-pulse-cyan" style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--accent-cyan)',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 9, color: 'var(--accent-cyan)', letterSpacing: 1 }}>
            SYS.ONLINE
          </span>
        </div>
        <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 0.5, fontFamily: 'var(--font-mono)' }}>
          V1.0.0 · ANHUI-GRID
        </div>
      </div>
    </aside>
  );
}
