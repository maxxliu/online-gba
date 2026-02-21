'use client';

import { useEffect, useRef, useCallback } from 'react';
import { BREAKPOINTS } from '@/lib/constants';

// --- Constants ---

const TAU = Math.PI * 2;

// Brighter, warmer sky palette (deep navy → warm amber horizon)
const SKY_STOPS: [number, number, number][] = [
  [15, 27, 61],    // #0f1b3d — deep navy
  [22, 35, 85],    // #162355
  [30, 45, 107],   // #1e2d6b
  [42, 37, 112],   // #2a2570 — blue-purple
  [58, 32, 112],   // #3a2070 — purple
  [74, 29, 94],    // #4a1d5e — warm purple
  [92, 30, 74],    // #5c1e4a — magenta-purple
  [122, 40, 69],   // #7a2845 — warm rose
  [158, 48, 64],   // #9e3040 — amber-red
  [184, 64, 53],   // #b84035 — warm amber horizon glow
];

// 4x4 Bayer ordered dithering matrix
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const NEBULA_PATCHES = [
  { cx: 0.25, cy: 0.15, rx: 0.18, ry: 0.12, r: 139, g: 92, b: 246, a: 0.12 },
  { cx: 0.70, cy: 0.20, rx: 0.15, ry: 0.10, r: 74, g: 158, b: 255, a: 0.10 },
  { cx: 0.50, cy: 0.30, rx: 0.20, ry: 0.08, r: 0, g: 212, b: 170, a: 0.08 },
  { cx: 0.85, cy: 0.12, rx: 0.12, ry: 0.09, r: 139, g: 92, b: 246, a: 0.10 },
];

// --- Types ---

interface Star {
  x: number;
  y: number;
  size: number;
  period: number;
  phase: number;
  color: string;
  baseAlpha: number;
  driftSpeed: number;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  blocks: number[][]; // 0=empty, 1=body, 2=highlight, 3=shadow
  blockSize: number;
  rows: number;
  cols: number;
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  maxLife: number;
  age: number;
  color: string;
  phaseX: number;
  pulseSpeed: number;
  phase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  maxTrail: number;
  life: number;
  maxLife: number;
}

// --- Sky Gradient with Bayer Dithering ---

function drawSkyGradient(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const stops = SKY_STOPS;
  const segmentH = h / (stops.length - 1);
  const blockSize = 3;

  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      // Use center of block for gradient position
      const cy = by + blockSize / 2;
      const segIdx = Math.min(Math.floor(cy / segmentH), stops.length - 2);
      const segT = (cy - segIdx * segmentH) / segmentH;
      const colorA = stops[segIdx];
      const colorB = stops[segIdx + 1];

      // Bayer threshold for this block position
      const bayerX = Math.floor(bx / blockSize) % 4;
      const bayerY = Math.floor(by / blockSize) % 4;
      const threshold = BAYER_4X4[bayerY][bayerX] / 16;

      // Choose color A or B based on dither threshold
      const [r, g, b] = segT > threshold ? colorB : colorA;

      ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
      ctx.fillRect(bx, by, blockSize, blockSize);
    }
  }
}

// --- Nebula Patches ---

function drawNebula(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const blockSize = 4;
  for (const patch of NEBULA_PATCHES) {
    const pcx = patch.cx * w;
    const pcy = patch.cy * h;
    const prx = patch.rx * w;
    const pry = patch.ry * h;

    const startX = Math.max(0, Math.floor((pcx - prx) / blockSize) * blockSize);
    const endX = Math.min(w, Math.ceil((pcx + prx) / blockSize) * blockSize);
    const startY = Math.max(0, Math.floor((pcy - pry) / blockSize) * blockSize);
    const endY = Math.min(h, Math.ceil((pcy + pry) / blockSize) * blockSize);

    for (let bx = startX; bx < endX; bx += blockSize) {
      for (let by = startY; by < endY; by += blockSize) {
        const dx = (bx + blockSize / 2 - pcx) / prx;
        const dy = (by + blockSize / 2 - pcy) / pry;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > 1) continue;

        const falloff = (1 - dist2) * (1 - dist2);
        const blendFactor = falloff;

        // Bayer dithering on the edge
        const bayerX = Math.floor(bx / blockSize) % 4;
        const bayerY = Math.floor(by / blockSize) % 4;
        const threshold = BAYER_4X4[bayerY][bayerX] / 16;

        if (blendFactor < threshold) continue;

        const alpha = patch.a * falloff;
        if (alpha < 0.005) continue;
        ctx.fillStyle = `rgba(${patch.r},${patch.g},${patch.b},${alpha})`;
        ctx.fillRect(bx, by, blockSize, blockSize);
      }
    }
  }
}

// --- Stars (with parallax drift) ---

function generateStars(count: number): Star[] {
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let color = '#ffffff';
    if (roll > 0.88) color = '#ffd700';
    else if (roll > 0.80) color = '#4a9eff';

    // Stars span the full canvas height
    const y = Math.pow(Math.random(), 0.7) * 0.95;
    const baseAlpha = 0.5 + (1 - y / 0.95) * 0.4;

    const sizeRoll = Math.random();
    let size: number;
    if (sizeRoll < 0.60) size = 1;
    else if (sizeRoll < 0.90) size = 2;
    else size = 3;

    // Drift speed based on depth (size as proxy)
    const driftSpeed = size === 1 ? 0.0001 : size === 2 ? 0.0003 : 0.0005;

    stars.push({
      x: Math.random(),
      y,
      size,
      period: 2000 + Math.random() * 3000,
      phase: Math.random() * TAU,
      color,
      baseAlpha,
      driftSpeed,
    });
  }

  // Star clusters: 15% placed near existing stars
  const clusterCount = Math.floor(count * 0.15);
  for (let i = 0; i < clusterCount && stars.length > 0; i++) {
    const parent = stars[Math.floor(Math.random() * stars.length)];
    const roll = Math.random();
    let color = '#ffffff';
    if (roll > 0.88) color = '#ffd700';
    else if (roll > 0.80) color = '#4a9eff';

    const y = Math.max(0, Math.min(0.95, parent.y + (Math.random() - 0.5) * 0.04));
    const baseAlpha = 0.5 + (1 - y / 0.95) * 0.4;
    const size = Math.random() < 0.7 ? 1 : 2;
    const driftSpeed = size === 1 ? 0.0001 : 0.0003;

    stars.push({
      x: Math.max(0, Math.min(1, parent.x + (Math.random() - 0.5) * 0.04)),
      y,
      size,
      period: 2000 + Math.random() * 3000,
      phase: Math.random() * TAU,
      color,
      baseAlpha,
      driftSpeed,
    });
  }

  return stars;
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], w: number, h: number, timestamp: number, dt: number, reducedMotion: boolean) {
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];

    // Parallax drift
    if (!reducedMotion) {
      star.x += star.driftSpeed * dt * 0.06;
      if (star.x > 1.02) star.x -= 1.04;
    }

    const sx = Math.floor(star.x * w);
    const sy = Math.floor(star.y * h);

    let alpha: number;
    if (reducedMotion) {
      alpha = 0.7;
    } else {
      alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(timestamp / star.period * TAU + star.phase));
      if (alpha < 0.2) alpha = 0.2;
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.color;
    ctx.fillRect(sx, sy, star.size, star.size);

    // Cross highlights for size-3 stars
    if (star.size === 3 && !reducedMotion) {
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillRect(sx - 1, sy + 1, 1, 1);
      ctx.fillRect(sx + 3, sy + 1, 1, 1);
      ctx.fillRect(sx + 1, sy - 1, 1, 1);
      ctx.fillRect(sx + 1, sy + 3, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Clouds (improved with internal texture) ---

function generateCloudBlocks(cols: number, rows: number): number[][] {
  const grid: number[][] = [];
  const cx = cols / 2;
  const cy = rows / 2;
  const rx = cols / 2;
  const ry = rows / 2;

  const highlightRow = Math.floor(rows * 0.3);
  const shadowRow = Math.floor(rows * 0.7);

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const dx = (c - cx + 0.5) / rx;
      const dy = (r - cy + 0.5) / ry;
      const inside = dx * dx + dy * dy <= 1;
      if (!inside || Math.random() < 0.10) {
        grid[r][c] = 0; // empty
      } else if (r < highlightRow) {
        grid[r][c] = 2; // highlight
      } else if (r >= shadowRow) {
        grid[r][c] = 3; // shadow
      } else {
        // Body with 15% chance of brighter texture pixel
        grid[r][c] = Math.random() < 0.15 ? 2 : 1;
      }
    }
  }
  return grid;
}

function generateClouds(canvasW: number, canvasH: number): Cloud[] {
  const count = 6 + Math.floor(Math.random() * 5);
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const cols = 12 + Math.floor(Math.random() * 10);
    const rows = 5 + Math.floor(Math.random() * 4);
    const blockSize = 5 + Math.floor(Math.random() * 4); // 5-8px
    clouds.push({
      x: Math.random() * canvasW,
      y: canvasH * (0.15 + Math.random() * 0.40),
      speed: 0.15 + Math.random() * 0.20,
      opacity: 0.35 + Math.random() * 0.20, // 0.35-0.55 (higher than before)
      blocks: generateCloudBlocks(cols, rows),
      blockSize,
      rows,
      cols,
    });
  }
  return clouds;
}

function drawClouds(ctx: CanvasRenderingContext2D, clouds: Cloud[], w: number) {
  for (let c = 0; c < clouds.length; c++) {
    const cloud = clouds[c];
    cloud.x += cloud.speed;
    const cloudW = cloud.cols * cloud.blockSize;
    if (cloud.x > w + cloudW) {
      cloud.x = -cloudW;
    }

    for (let r = 0; r < cloud.rows; r++) {
      for (let col = 0; col < cloud.cols; col++) {
        const blockType = cloud.blocks[r]?.[col];
        if (!blockType) continue;

        let baseR: number, baseG: number, baseB: number;
        let alpha: number;

        switch (blockType) {
          case 2: // highlight
            baseR = 50; baseG = 50; baseB = 100;
            alpha = cloud.opacity * 0.75;
            break;
          case 3: // shadow
            baseR = 15; baseG = 15; baseB = 42;
            alpha = cloud.opacity * 0.5;
            break;
          default: // body
            baseR = 30; baseG = 30; baseB = 68;
            alpha = cloud.opacity;
            break;
        }

        ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${alpha})`;
        ctx.fillRect(
          Math.floor(cloud.x + col * cloud.blockSize),
          Math.floor(cloud.y + r * cloud.blockSize),
          cloud.blockSize,
          cloud.blockSize,
        );
      }
    }
  }
}

// --- Aurora (desktop only) ---

function drawAuroraShimmer(ctx: CanvasRenderingContext2D, w: number, h: number, timestamp: number) {
  const t = timestamp * 0.0001;
  const step = 4;

  // Band 1: purple at y=20%
  for (let x = 0; x < w; x += step) {
    const wave = Math.sin(x * 0.008 + t) * h * 0.03;
    const y = h * 0.20 + wave;
    ctx.fillStyle = 'rgba(139, 92, 246, 0.025)';
    ctx.fillRect(x, Math.floor(y), step, 6);
  }

  // Band 2: teal at y=35%
  for (let x = 0; x < w; x += step) {
    const wave = Math.sin(x * 0.006 + t * 1.3 + 1.5) * h * 0.025;
    const y = h * 0.35 + wave;
    ctx.fillStyle = 'rgba(0, 212, 170, 0.025)';
    ctx.fillRect(x, Math.floor(y), step, 6);
  }
}

// --- Particles (fireflies) ---

function spawnParticle(w: number, h: number): Particle {
  const color = Math.random() > 0.4 ? '#00d4aa' : '#ffd700';
  return {
    x: Math.random() * w,
    y: h * (0.3 + Math.random() * 0.7),
    vy: -(0.1 + Math.random() * 0.2),
    maxLife: 5000 + Math.random() * 5000,
    age: 0,
    color,
    phaseX: Math.random() * TAU,
    pulseSpeed: 1.5 + Math.random() * 2,
    phase: Math.random() * TAU,
  };
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number, dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }

    const lifeRatio = p.age / p.maxLife;
    let fadeAlpha: number;
    if (lifeRatio < 0.1) fadeAlpha = lifeRatio / 0.1;
    else if (lifeRatio > 0.7) fadeAlpha = (1 - lifeRatio) / 0.3;
    else fadeAlpha = 1;

    const pulse = 0.6 + 0.4 * Math.sin(p.phase + p.age * 0.001 * p.pulseSpeed);
    const alpha = fadeAlpha * pulse;

    p.y += p.vy;
    p.x += Math.sin(p.phaseX + p.age * 0.0015) * 0.3;

    const px = Math.floor(p.x);
    const py = Math.floor(p.y);

    // 4x4 glow halo
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha * 0.20;
    ctx.fillRect(px - 1, py - 1, 4, 4);

    // 2x2 core
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.globalAlpha = 1;

  if (Math.random() < 0.05 && particles.length < 50) {
    particles.push(spawnParticle(w, h));
  }
}

// --- Shooting Stars ---

function trySpawnShootingStar(): ShootingStar | null {
  if (Math.random() > 0.001) return null;

  const angle = (200 + Math.random() * 50) * (Math.PI / 180);
  const speed = 3 + Math.random() * 3;

  return {
    x: 0.3 + Math.random() * 0.7,
    y: Math.random() * 0.3,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    trail: [],
    maxTrail: 8 + Math.floor(Math.random() * 5),
    life: 0,
    maxLife: 500 + Math.random() * 700,
  };
}

function drawShootingStar(ctx: CanvasRenderingContext2D, star: ShootingStar, w: number, h: number, dt: number): boolean {
  star.life += dt;
  if (star.life >= star.maxLife) return false;

  star.x += star.vx / w;
  star.y += star.vy / h;

  star.trail.unshift({ x: star.x, y: star.y });
  if (star.trail.length > star.maxTrail) star.trail.pop();

  for (let i = 0; i < star.trail.length; i++) {
    const t = star.trail[i];
    const px = Math.floor(t.x * w);
    const py = Math.floor(t.y * h);
    const trailAlpha = (1 - i / star.trail.length) * (1 - star.life / star.maxLife);

    if (i === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = trailAlpha;
      ctx.fillRect(px, py, 2, 2);
    } else {
      ctx.fillStyle = '#4a9eff';
      ctx.globalAlpha = trailAlpha * 0.7;
      ctx.fillRect(px, py, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  if (star.x < -0.1 || star.x > 1.1 || star.y < -0.1 || star.y > 1.1) return false;
  return true;
}

// --- Scanline Overlay (desktop only) ---

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
}

// --- Component ---

export function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const frameToggleRef = useRef(false);
  const lastFrameTimeRef = useRef(0);

  const starsRef = useRef<Star[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shootingStarRef = useRef<ShootingStar | null>(null);
  const reducedMotionRef = useRef(false);
  const visibleRef = useRef(true);
  const isMobileRef = useRef(false);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    isMobileRef.current = w < BREAKPOINTS.mobile;

    // Rebuild offscreen canvas (sky + nebula)
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      drawSkyGradient(offCtx, w, h);
      drawNebula(offCtx, w, h);
    }
    offscreenCanvasRef.current = offscreen;

    cloudsRef.current = generateClouds(w, h);
  }, []);

  const animate = useCallback((timestamp: number) => {
    if (!visibleRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ~30fps frame skip
    frameToggleRef.current = !frameToggleRef.current;
    if (frameToggleRef.current) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const isMobile = isMobileRef.current;
    const reducedMotion = reducedMotionRef.current;

    const dt = Math.min(timestamp - (lastFrameTimeRef.current || timestamp), 100);
    lastFrameTimeRef.current = timestamp;

    // --- Layer 1: Offscreen canvas (sky + nebula) ---
    const offscreen = offscreenCanvasRef.current;
    if (offscreen) {
      ctx.drawImage(offscreen, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0f1b3d';
      ctx.fillRect(0, 0, w, h);
    }

    // --- Layer 2: Stars (with drift) ---
    drawStars(ctx, starsRef.current, w, h, timestamp, dt, reducedMotion);

    if (reducedMotion) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    // --- Layer 3: Aurora shimmer (desktop only) ---
    if (!isMobile) {
      drawAuroraShimmer(ctx, w, h, timestamp);
    }

    // --- Layer 4: Clouds ---
    drawClouds(ctx, cloudsRef.current, w);

    // --- Layer 5: Particles (fireflies) ---
    drawParticles(ctx, particlesRef.current, w, h, dt);

    // --- Layer 6: Shooting stars ---
    const ss = shootingStarRef.current;
    if (ss) {
      const alive = drawShootingStar(ctx, ss, w, h, dt);
      if (!alive) shootingStarRef.current = null;
    } else {
      shootingStarRef.current = trySpawnShootingStar();
    }

    // --- Layer 7: Scanline overlay (desktop only) ---
    if (!isMobile) {
      drawScanlines(ctx, w, h);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < BREAKPOINTS.mobile;
    isMobileRef.current = isMobile;

    starsRef.current = generateStars(isMobile ? 120 : 300);

    const motionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = motionMQ.matches;

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      cancelAnimationFrame(rafRef.current);
      lastFrameTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(animate);
    };
    motionMQ.addEventListener('change', onMotionChange);

    resize();

    lastFrameTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resize);

    const onVisibility = () => {
      if (document.hidden) {
        visibleRef.current = false;
        cancelAnimationFrame(rafRef.current);
      } else {
        visibleRef.current = true;
        lastFrameTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      motionMQ.removeEventListener('change', onMotionChange);
    };
  }, [animate, resize]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      aria-hidden="true"
    />
  );
}
