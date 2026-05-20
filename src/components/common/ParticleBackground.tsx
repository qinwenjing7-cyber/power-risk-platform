import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 60;
const CONNECT_DIST = 150;
const COLORS = ['#0ef6be', '#3b82f6', '#f0a500'];

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    let animId = 0;

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }

    function initDots() {
      dots = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.15 - Math.random() * 0.35,
          size: 2.5 + Math.random() * 3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      // Draw lines between nearby dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.12;
            ctx!.beginPath();
            ctx!.moveTo(dots[i].x, dots[i].y);
            ctx!.lineTo(dots[j].x, dots[j].y);
            ctx!.strokeStyle = `rgba(100, 160, 220, ${alpha * 2.5})`;
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }
      }

      // Draw dots
      for (const dot of dots) {
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx!.fillStyle = dot.color;
        ctx!.globalAlpha = 0.35;
        ctx!.fill();
        // Glow
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, dot.size * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = dot.color;
        ctx!.globalAlpha = 0.08;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }
    }

    function update() {
      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Wrap around edges
        if (dot.x < -10) dot.x = w + 10;
        if (dot.x > w + 10) dot.x = -10;
        if (dot.y < -10) dot.y = h + 10;
        if (dot.y > h + 10) dot.y = -10;
      }
    }

    function loop() {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    resize();
    initDots();
    loop();

    window.addEventListener('resize', () => {
      resize();
      initDots();
    });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
