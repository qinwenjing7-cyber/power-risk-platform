import type { ReactNode } from 'react';

interface Props {
  title?: string;
  children: ReactNode;
  style?: React.CSSProperties;
  accent?: 'amber' | 'cyan' | 'blue' | 'none';
}

const accentMap: Record<string, { color: string }> = {
  amber: { color: '#f0a500' },
  cyan:  { color: '#0ef6be' },
  blue:  { color: '#3b82f6' },
  none:  { color: 'transparent' },
};

const ARM = 16;
const THICK = 1;

function CornerHUD({ color, top, bottom, left, right, hDir, vDir }: {
  color: string;
  top?: number; bottom?: number; left?: number; right?: number;
  hDir: 1 | -1; vDir: 1 | -1;
}) {
  if (color === 'transparent') return null;
  const GAP = 2;
  return (
    <>
      <span style={{ position: 'absolute', pointerEvents: 'none',
        [top !== undefined ? 'top' : 'bottom']: (top ?? bottom)!,
        [left !== undefined ? 'left' : 'right']: (left ?? right)!,
        width: ARM, height: THICK, background: color,
        transform: `translate(${hDir === 1 ? GAP : -(GAP + ARM)}px, ${vDir === 1 ? GAP : -GAP}px)`,
      }} />
      <span style={{ position: 'absolute', pointerEvents: 'none',
        [top !== undefined ? 'top' : 'bottom']: (top ?? bottom)!,
        [left !== undefined ? 'left' : 'right']: (left ?? right)!,
        width: THICK, height: ARM, background: color,
        transform: `translate(${hDir === 1 ? GAP : -GAP}px, ${vDir === 1 ? GAP : -(GAP + ARM)}px)`,
      }} />
    </>
  );
}

export default function DataPanel({ title, children, style, accent = 'none' }: Props) {
  const { color } = accentMap[accent];

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'relative',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--panel-radius)',
        padding: '18px 22px',
        ...style,
      }}
    >
      {/* Top glow bar — stronger */}
      {accent !== 'none' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, ${color}, ${color}88 30%, transparent 70%)`,
          opacity: 0.6,
        }} />
      )}

      {/* HUD corners */}
      <CornerHUD color={color} top={0} left={0}   hDir={1}  vDir={1} />
      <CornerHUD color={color} top={0} right={0}  hDir={-1} vDir={1} />
      <CornerHUD color={color} bottom={0} left={0}  hDir={1}  vDir={-1} />
      <CornerHUD color={color} bottom={0} right={0} hDir={-1} vDir={-1} />

      {/* Title bar */}
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14, paddingBottom: 10,
          borderBottom: '1px solid var(--border-color)',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: 1.5,
          }}>{title}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 1, background: color, opacity: 0.5 }} />
            <span style={{ width: 4, height: 4, background: color, opacity: 0.8, boxShadow: `0 0 6px ${color}` }} />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
