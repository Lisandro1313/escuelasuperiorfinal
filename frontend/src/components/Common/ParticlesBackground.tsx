import React, { useEffect, useRef } from 'react';

// Fondo de partículas suaves para secciones oscuras. Liviano (canvas, sin
// librerías), con glow tenue en la paleta de la marca. Respeta
// prefers-reduced-motion y se pausa cuando la pestaña no está visible.

interface Particle {
  x: number; y: number; r: number; vx: number; vy: number; baseA: number; phase: number; color: string;
}

// rgb de: esmeralda, teal, celeste, blanco
const COLORS = ['16,185,129', '45,212,191', '125,211,252', '255,255,255'];

const ParticlesBackground: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement || canvas;
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
    let raf = 0;
    let running = true;

    const build = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.max(45, Math.round(width / 12)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        baseA: 0.12 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -5) p.x = width + 5; else if (p.x > width + 5) p.x = -5;
          if (p.y < -5) p.y = height + 5; else if (p.y > height + 5) p.y = -5;
        }
        const a = reduce ? p.baseA : p.baseA * (0.6 + 0.4 * Math.sin(t / 1400 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${a.toFixed(3)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${p.color},${(a * 0.7).toFixed(3)})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    const loop = (t: number) => {
      if (!running) return;
      drawFrame(t);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduce) { drawFrame(0); return; }
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const onVisibility = () => { if (document.hidden) stop(); else start(); };

    let ro: ResizeObserver | null = null;
    const onResize = () => { build(); if (reduce || document.hidden) drawFrame(0); };

    build();
    start();

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      ro.observe(parent);
    } else {
      window.addEventListener('resize', onResize);
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
};

export default ParticlesBackground;
