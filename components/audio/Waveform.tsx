"use client";

import { useEffect, useRef } from "react";

export function Waveform({
  analyser,
  active,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const bars = 56;
    const dataArray = new Uint8Array(bars);

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (analyser && active) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // gentle idle bobbing
        for (let i = 0; i < bars; i++) {
          dataArray[i] = 30 + Math.round(20 * Math.sin(Date.now() / 400 + i / 4));
        }
      }

      const isDark = document.documentElement.classList.contains("dark");
      const gap = 3;
      const barWidth = (w - gap * (bars - 1)) / bars;
      if (barWidth > 0 && h > 0) {
        for (let i = 0; i < bars; i++) {
          const v = dataArray[i] / 255;
          const barHeight = Math.max(4, v * h * 0.95);
          const x = i * (barWidth + gap);
          const y = (h - barHeight) / 2;
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          if (active) {
            // Brand blue, slightly lifted in dark.
            grad.addColorStop(0, isDark ? "#4dabf7" : "#228be6");
            grad.addColorStop(1, isDark ? "#1c7ed6" : "#1864ab");
          } else if (isDark) {
            grad.addColorStop(0, "#495057"); // ink-700
            grad.addColorStop(1, "#343a40"); // ink-800
          } else {
            grad.addColorStop(0, "#cbd5e1");
            grad.addColorStop(1, "#94a3b8");
          }
          ctx.fillStyle = grad;
          const radius = Math.max(0, Math.min(3, barWidth / 2));
          roundRect(ctx, x, y, barWidth, barHeight, radius);
          ctx.fill();
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, active]);

  return (
    <canvas
      ref={canvasRef}
      className="h-24 w-full rounded-2xl bg-slate-50 dark:bg-ink-950/60"
      aria-hidden="true"
    />
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
