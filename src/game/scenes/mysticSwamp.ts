import type { Platform } from '../types';
import type { PropAnchor } from '../world';

interface GlowMushroomPlacement {
  x: number;
  y: number;
  s: number;
  ph: number;
  hue: number;
}

// Exact cap glow spot coordinates from user-provided Glow Mushrooms code
const GLOW_MUSHROOM_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-38, -205, 9],
  [-8, -232, 6],
  [30, -215, 10],
  [52, -175, 6],
  [-58, -168, 6],
  [8, -190, 5],
];

// Grounded small, medium & large glowing mushrooms placed ONLY in Swamp Forest (back-to-front per cluster)
const SWAMP_FOREST_MUSHROOMS: readonly GlowMushroomPlacement[] = [
  // Stilt Village Crossing — West bank entry
  { x: 118, y: 780, s: 0.19, ph: 1.7, hue: 330 },
  { x: 144, y: 780, s: 0.31, ph: 0.0, hue: 285 },
  // Stilt Village Crossing — Cluster before first marsh pond
  { x: 344, y: 780, s: 0.24, ph: 1.7, hue: 330 },
  { x: 414, y: 780, s: 0.21, ph: 3.1, hue: 200 },
  { x: 380, y: 780, s: 0.46, ph: 0.0, hue: 285 },
  // Stilt Village Crossing — East bank & stilt porch
  { x: 788, y: 780, s: 0.22, ph: 2.1, hue: 200 },
  { x: 754, y: 780, s: 0.43, ph: 0.5, hue: 285 },
  { x: 814, y: 680, s: 0.18, ph: 1.2, hue: 330 },
  { x: 1038, y: 780, s: 0.26, ph: 1.4, hue: 330 },

  // Fallen Log Span — Bridges
  { x: 1158, y: 755, s: 0.22, ph: 0.4, hue: 200 },
  { x: 1318, y: 755, s: 0.29, ph: 1.8, hue: 285 },
  { x: 1524, y: 705, s: 0.19, ph: 0.9, hue: 330 },
  { x: 1492, y: 705, s: 0.35, ph: 2.6, hue: 285 },
  { x: 1956, y: 755, s: 0.24, ph: 1.5, hue: 200 },

  // Overhanging Rootway & Canopy Stilt Shrine
  { x: 1322, y: 365, s: 0.17, ph: 2.2, hue: 200 },
  { x: 1292, y: 365, s: 0.27, ph: 0.8, hue: 285 },
  { x: 2416, y: 350, s: 0.21, ph: 2.9, hue: 330 },
  { x: 2382, y: 350, s: 0.40, ph: 1.1, hue: 285 },
  { x: 2958, y: 315, s: 0.25, ph: 0.3, hue: 200 },

  // Submerged Marsh Sluice & Bog Hollow Vault (Secret Chamber)
  { x: 1380, y: 1190, s: 0.17, ph: 0.4, hue: 285 },
  { x: 1354, y: 1190, s: 0.25, ph: 1.9, hue: 200 },
  { x: 1840, y: 1150, s: 0.29, ph: 2.7, hue: 330 },
  { x: 2592, y: 1320, s: 0.28, ph: 1.7, hue: 330 },
  { x: 2684, y: 1320, s: 0.33, ph: 3.1, hue: 200 },
  { x: 2638, y: 1320, s: 0.54, ph: 0.2, hue: 285 },

  // Misty Reed Flats
  { x: 2236, y: 780, s: 0.22, ph: 2.8, hue: 330 },
  { x: 2202, y: 780, s: 0.42, ph: 1.3, hue: 200 },
  { x: 2982, y: 780, s: 0.36, ph: 0.6, hue: 285 },
  { x: 3204, y: 780, s: 0.21, ph: 2.1, hue: 200 },

  // Twilight Fen Sanctum
  { x: 3558, y: 780, s: 0.24, ph: 1.7, hue: 330 },
  { x: 3515, y: 780, s: 0.50, ph: 0.0, hue: 285 },
  { x: 4352, y: 780, s: 0.22, ph: 0.8, hue: 285 },
  { x: 4312, y: 780, s: 0.40, ph: 2.4, hue: 200 },
];

export class MysticSwampRenderer {
  private layer1Cache: HTMLCanvasElement | null = null;
  private cacheWidth = 0;
  private cacheHeight = 0;

  private ensureLayer1Cache(viewW: number, viewH: number): HTMLCanvasElement {
    const targetW = Math.max(1600, Math.ceil(viewW * 1.4));
    const targetH = Math.max(760, viewH);

    if (
      this.layer1Cache &&
      this.cacheWidth === targetW &&
      this.cacheHeight === targetH
    ) {
      return this.layer1Cache;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const c = canvas.getContext('2d');
    if (!c) return canvas;

    this.cacheWidth = targetW;
    this.cacheHeight = targetH;

    // Layer 1: Soft-focused background swamp tree trunks + autumn canopy silhouettes
    c.save();
    c.filter = 'blur(3px)';

    const trunkCount = 18;
    for (let i = 0; i < trunkCount; i++) {
      const tx = (i / trunkCount) * targetW + ((i * 23) % 35);
      const trunkW = 14 + ((i * 7) % 14);
      const canopyY = 95 + ((i * 41) % 120);

      // Vertical slender tree trunk fading into swamp mist
      const tGrad = c.createLinearGradient(tx, canopyY, tx, targetH);
      tGrad.addColorStop(0, '#2a222b');
      tGrad.addColorStop(0.7, '#344954');
      tGrad.addColorStop(1, 'rgba(65, 110, 122, 0.25)');
      c.fillStyle = tGrad;
      c.fillRect(tx, canopyY, trunkW, targetH - canopyY);

      // Autumn orange/brown foliage canopies (#6e473b)
      c.fillStyle = i % 2 === 0 ? 'rgba(110, 71, 59, 0.78)' : 'rgba(92, 62, 54, 0.72)';
      c.beginPath();
      c.arc(tx + trunkW * 0.5, canopyY, 54 + ((i * 19) % 28), 0, Math.PI * 2);
      c.arc(tx - 24, canopyY + 18, 38, 0, Math.PI * 2);
      c.arc(tx + 34, canopyY + 16, 42, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
    this.layer1Cache = canvas;
    return canvas;
  }

  public drawLayer0Backdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number
  ): void {
    // Misty twilight purples, muted slate-teal, and atmospheric swamp glow
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, '#242c3b');
    grad.addColorStop(0.42, '#3d515e');
    grad.addColorStop(0.75, '#577c86');
    grad.addColorStop(1, '#264450');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    // Subtle misty twilight glow behind canopy
    const mist = ctx.createRadialGradient(
      viewW * 0.52,
      viewH * 0.35,
      30,
      viewW * 0.52,
      viewH * 0.35,
      viewW * 0.6
    );
    mist.addColorStop(0, 'rgba(164, 212, 218, 0.24)');
    mist.addColorStop(1, 'rgba(38, 68, 80, 0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  public drawLayer1Silhouettes(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    camX: number,
    camY: number
  ): void {
    const cache = this.ensureLayer1Cache(viewW, viewH);
    const px = ((camX * 0.24) % cache.width + cache.width) % cache.width;
    const py = Math.max(-35, Math.min(35, -camY * 0.04));

    ctx.drawImage(cache, -px, py);
    if (cache.width - px < viewW) {
      ctx.drawImage(cache, cache.width - px, py);
    }
  }

  public drawLayer2WorldProps(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    viewW: number,
    viewH: number,
    time: number,
    anchors?: PropAnchor[]
  ): void {
    const items: PropAnchor[] = anchors && anchors.length > 0
      ? anchors
      : [
          { x: 180, y: 780 },
          { x: 1160, y: 780 },
          { x: 2220, y: 780 },
          { x: 3440, y: 780 },
        ];
    for (const anchor of items) {
      const baseX = anchor.x;
      const floorY = anchor.y;
      if (
        baseX + 980 < cx - 120 ||
        baseX - 160 > cx + viewW + 120 ||
        floorY + 260 < cy - 120 ||
        floorY - 360 > cy + viewH + 120
      ) {
        continue;
      }

      // Calm reflective teal-mist swamp water below elevated banks
      this.drawSwampWater(ctx, baseX + 260, floorY + 62, 580, 140, time);

      // Woven thatched dome hut on wooden stilts on the left bank
      this.drawThatchedHut(ctx, baseX + 120, floorY);

      // Three glowing cyan/blue spore mushroom stalks near the bridge
      this.drawSporePillars(ctx, baseX + 340, floorY, time);

      // Massive curved mossy purple-brown fallen log bridge
      this.drawFallenLogBridge(ctx, baseX + 280, floorY + 8, baseX + 760, floorY + 12);
    }
  }

  private drawSwampWater(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    time: number
  ): void {
    const wGrad = ctx.createLinearGradient(x, y, x, y + h);
    wGrad.addColorStop(0, '#4ca1af');
    wGrad.addColorStop(0.45, '#2c5364');
    wGrad.addColorStop(1, '#142a34');
    ctx.fillStyle = wGrad;
    ctx.fillRect(x, y, w, h);

    // Subtle animated ripples & floating lily pads
    ctx.strokeStyle = 'rgba(205, 245, 250, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const rx = x + 60 + i * 92 + Math.sin(time * 0.9 + i) * 8;
      const ry = y + 26 + (i % 3) * 28;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 28 + (i % 2) * 10, 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Floating lily pad
      if (i % 2 === 0) {
        ctx.fillStyle = '#6ba368';
        ctx.beginPath();
        ctx.ellipse(rx + 18, ry + 12, 16, 5, 0, 0.2, Math.PI * 1.9);
        ctx.fill();
      }
    }
  }

  private drawThatchedHut(
    ctx: CanvasRenderingContext2D,
    cx: number,
    floorY: number
  ): void {
    // Wooden support stilts
    ctx.strokeStyle = '#2d232c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 56, floorY);
    ctx.lineTo(cx - 44, floorY - 56);
    ctx.moveTo(cx + 56, floorY);
    ctx.lineTo(cx + 44, floorY - 56);
    ctx.moveTo(cx - 18, floorY);
    ctx.lineTo(cx - 18, floorY - 46);
    ctx.moveTo(cx + 18, floorY);
    ctx.lineTo(cx + 18, floorY - 46);
    ctx.stroke();

    // Round wooden cabin base
    const baseY = floorY - 72;
    ctx.fillStyle = '#473c4a';
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 72, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Warm dark interior doorway
    ctx.fillStyle = '#18141c';
    ctx.beginPath();
    ctx.ellipse(cx + 26, baseY + 4, 20, 26, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Woven thatched dome roof (layered overlapping jagged pale grey-green strokes)
    const roofTop = baseY - 118;
    const roofGrad = ctx.createLinearGradient(cx, roofTop, cx, baseY + 10);
    roofGrad.addColorStop(0, '#4a5661');
    roofGrad.addColorStop(0.55, '#7e8e98');
    roofGrad.addColorStop(1, '#9aa8b0');

    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 88, baseY - 2);
    ctx.quadraticCurveTo(cx - 72, roofTop + 14, cx, roofTop);
    ctx.quadraticCurveTo(cx + 72, roofTop + 14, cx + 88, baseY - 2);
    ctx.quadraticCurveTo(cx, baseY + 14, cx - 88, baseY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Jagged thatched fringe strokes
    ctx.strokeStyle = '#3b444d';
    ctx.lineWidth = 2;
    for (let i = -72; i <= 72; i += 14) {
      ctx.beginPath();
      ctx.moveTo(cx + i, baseY - 26);
      ctx.lineTo(cx + i - 4, baseY + 4);
      ctx.stroke();
    }

    // Tied top branches & hanging rope
    ctx.strokeStyle = '#382b33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 16, roofTop - 22);
    ctx.lineTo(cx + 4, roofTop + 10);
    ctx.moveTo(cx + 16, roofTop - 20);
    ctx.lineTo(cx - 4, roofTop + 10);
    ctx.stroke();
  }

  private drawSporePillars(
    ctx: CanvasRenderingContext2D,
    x: number,
    floorY: number,
    time: number
  ): void {
    const stalks = [
      { dx: 0, h: 68, w: 18 },
      { dx: 26, h: 98, w: 22 },
      { dx: 54, h: 74, w: 18 },
    ];
    for (const s of stalks) {
      const sx = x + s.dx;
      const grad = ctx.createLinearGradient(sx, floorY - s.h, sx, floorY);
      grad.addColorStop(0, '#7ae7ff');
      grad.addColorStop(0.4, '#00f2fe');
      grad.addColorStop(1, 'rgba(30, 120, 145, 0.45)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx - s.w * 0.5, floorY);
      ctx.lineTo(sx - s.w * 0.35, floorY - s.h);
      ctx.quadraticCurveTo(sx, floorY - s.h - 10, sx + s.w * 0.35, floorY - s.h);
      ctx.lineTo(sx + s.w * 0.5, floorY);
      ctx.closePath();
      ctx.fill();

      // Delicate glowing electric tendrils sprouting from top
      ctx.strokeStyle = '#7ae7ff';
      ctx.lineWidth = 1.4;
      const sway = Math.sin(time * 2.5 + s.dx) * 4;
      ctx.beginPath();
      ctx.moveTo(sx, floorY - s.h - 4);
      ctx.quadraticCurveTo(sx - 8 + sway, floorY - s.h - 20, sx - 14 + sway, floorY - s.h - 26);
      ctx.moveTo(sx, floorY - s.h - 4);
      ctx.quadraticCurveTo(sx + 8 + sway, floorY - s.h - 22, sx + 12 + sway, floorY - s.h - 28);
      ctx.stroke();
    }
  }

  private drawFallenLogBridge(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const midX = (x1 + x2) * 0.5;
    const archY = Math.min(y1, y2) - 86;

    const logGrad = ctx.createLinearGradient(x1, archY, x2, y2);
    logGrad.addColorStop(0, '#5a486b');
    logGrad.addColorStop(0.5, '#735c87');
    logGrad.addColorStop(1, '#4a3b59');

    ctx.fillStyle = logGrad;
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, archY - 34, x2, y2);
    ctx.lineTo(x2, y2 + 34);
    ctx.quadraticCurveTo(midX, archY + 14, x1, y1 + 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wooden planks nailed across the left slope
    ctx.fillStyle = '#3c3044';
    for (let i = 0; i < 4; i++) {
      const px = x1 + 42 + i * 26;
      const py = y1 - 12 - i * 11;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.36);
      ctx.fillRect(-10, -4, 22, 9);
      ctx.strokeRect(-10, -4, 22, 9);
      ctx.restore();
    }
  }

  public drawPlatform(
    ctx: CanvasRenderingContext2D,
    p: Platform
  ): void {
    // Mossy purple-brown elevated bank & cliff sides matching Reference Image 2
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + Math.min(p.h, 180));
    grad.addColorStop(0, '#584166');
    grad.addColorStop(0.45, '#3b2b47');
    grad.addColorStop(1, '#1b1322');

    ctx.fillStyle = grad;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    if (p.mossTop) {
      ctx.fillStyle = '#8b729c';
      ctx.fillRect(p.x - 1, p.y, p.w + 2, 9);
      ctx.fillStyle = '#b49ec7';
      ctx.fillRect(p.x - 1, p.y, p.w + 2, 3);
    }
  }

  public drawLayer3Lighting(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    cx: number,
    cy: number,
    time: number,
    anchors?: PropAnchor[]
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Soft swamp canopy light shafts
    const shafts = [340, 1480, 2680, 3840];
    for (const sxWorld of shafts) {
      const sx = sxWorld - cx * 0.8;
      if (sx < -320 || sx > viewW + 320) continue;
      const pulse = 0.75 + Math.sin(time * 0.8 + sxWorld) * 0.25;
      const grad = ctx.createLinearGradient(sx, -40, sx + 160, viewH);
      grad.addColorStop(0, `rgba(170, 225, 225, ${0.14 * pulse})`);
      grad.addColorStop(1, 'rgba(0, 242, 254, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx - 60, -40);
      ctx.lineTo(sx + 70, -40);
      ctx.lineTo(sx + 240, viewH + 40);
      ctx.lineTo(sx + 40, viewH + 40);
      ctx.closePath();
      ctx.fill();
    }

    // Bioluminescent cyan/blue spore & root-light halos in world space
    ctx.translate(-Math.round(cx), -Math.round(cy));
    const items: PropAnchor[] = anchors && anchors.length > 0
      ? anchors
      : [
          { x: 180, y: 780 },
          { x: 1160, y: 780 },
          { x: 2220, y: 780 },
          { x: 3440, y: 780 },
        ];
    for (const anchor of items) {
      const baseX = anchor.x;
      const floorY = anchor.y;
      if (
        baseX + 980 < cx ||
        baseX - 100 > cx + viewW ||
        floorY + 120 < cy ||
        floorY - 260 > cy + viewH
      ) {
        continue;
      }

      const glowPoints = [
        { gx: baseX + 160, gy: floorY - 12, r: 95 },
        { gx: baseX + 365, gy: floorY - 58, r: 155 },
      ];
      for (const gp of glowPoints) {
        const rad = ctx.createRadialGradient(gp.gx, gp.gy, 6, gp.gx, gp.gy, gp.r);
        rad.addColorStop(0, 'rgba(0, 242, 254, 0.36)');
        rad.addColorStop(0.55, 'rgba(0, 200, 220, 0.12)');
        rad.addColorStop(1, 'rgba(0, 242, 254, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(gp.gx, gp.gy, gp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  public drawLayer4Foreground(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    px: number,
    time: number
  ): void {
    const spacing = 560;
    const startIdx = Math.floor(px / spacing) - 1;
    const count = Math.ceil(viewW / spacing) + 3;

    for (let i = startIdx; i < startIdx + count; i++) {
      const sx = i * spacing - px;

      // Dark out-of-focus foreground rocks framing bottom edge
      ctx.fillStyle = '#0c0910';
      ctx.beginPath();
      ctx.moveTo(sx - 40, viewH + 10);
      ctx.lineTo(sx + 30, viewH - 64);
      ctx.lineTo(sx + 135, viewH - 48);
      ctx.lineTo(sx + 210, viewH - 86);
      ctx.lineTo(sx + 290, viewH + 10);
      ctx.closePath();
      ctx.fill();

      // Glowing cyan reeds sprouting in foreground corners
      const sway = Math.sin(time * 1.8 + i) * 5;
      ctx.strokeStyle = '#4de8ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + 65, viewH - 18);
      ctx.quadraticCurveTo(sx + 58 + sway, viewH - 72, sx + 54 + sway, viewH - 110);
      ctx.moveTo(sx + 84, viewH - 12);
      ctx.quadraticCurveTo(sx + 92 + sway, viewH - 62, sx + 96 + sway, viewH - 94);
      ctx.stroke();
    }
  }

  public drawForestGlowMushrooms(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    viewW: number,
    viewH: number,
    time: number
  ): void {
    for (const m of SWAMP_FOREST_MUSHROOMS) {
      const reach = 190 * m.s + 60;
      if (
        m.x + reach < cx ||
        m.x - reach > cx + viewW ||
        m.y + 40 < cy ||
        m.y - 320 * m.s > cy + viewH
      ) {
        continue;
      }

      // Subtle grounded shadow right at stem base (transparent background preserved)
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + 1, 95 * m.s, Math.max(2.5, 8.5 * m.s), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.drawSingleGlowMushroom(ctx, m.x, m.y, m.s, time, m.ph, m.hue);
    }
  }

  // User-provided Glow Mushroom geometry & pulsing bioluminescence (background removed)
  private drawSingleGlowMushroom(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    t: number,
    ph: number,
    hue: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    // Glow halo
    const g = ctx.createRadialGradient(0, -190, 10, 0, -190, 170);
    g.addColorStop(0, `hsla(${hue},90%,60%,${0.22 + 0.06 * Math.sin(t * 2 + ph)})`);
    g.addColorStop(1, `hsla(${hue},90%,60%,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-200, -380, 400, 400);

    // Gentle sway
    ctx.rotate(Math.sin(t * 1.1 + ph) * 0.035);

    // Stem
    const sg = ctx.createLinearGradient(-18, 0, 18, 0);
    sg.addColorStop(0, '#8b8576');
    sg.addColorStop(0.45, '#d6cfbf');
    sg.addColorStop(1, '#6f6a5e');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.bezierCurveTo(-13, -60, -10, -100, -13, -140);
    ctx.lineTo(13, -140);
    ctx.bezierCurveTo(10, -100, 13, -60, 20, 0);
    ctx.quadraticCurveTo(0, 9, -20, 0);
    ctx.fill();

    // Gills (underside of the cap)
    ctx.fillStyle = `hsl(${hue},40%,12%)`;
    ctx.beginPath();
    ctx.ellipse(0, -140, 82, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${hue},50%,60%,0.35)`;
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10, -142);
      ctx.lineTo(i * 11, -128);
      ctx.stroke();
    }

    // Cap
    const cg = ctx.createRadialGradient(-20, -235, 10, 0, -190, 110);
    cg.addColorStop(0, `hsl(${hue},55%,42%)`);
    cg.addColorStop(1, `hsl(${hue},60%,16%)`);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-88, -140);
    ctx.bezierCurveTo(-92, -230, -42, -264, 0, -264);
    ctx.bezierCurveTo(42, -264, 92, -230, 88, -140);
    ctx.quadraticCurveTo(0, -152, -88, -140);
    ctx.fill();

    // Highlight on the cap
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-66, -200);
    ctx.bezierCurveTo(-60, -235, -35, -252, -10, -256);
    ctx.stroke();

    // Pulsing glow spots
    for (let i = 0; i < GLOW_MUSHROOM_SPOTS.length; i++) {
      const [sx, sy, r] = GLOW_MUSHROOM_SPOTS[i];
      const a = 0.55 + 0.45 * Math.sin(t * 2.2 + ph + i);
      const sg2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3.2);
      sg2.addColorStop(0, `hsla(${hue + 110},100%,78%,${a})`);
      sg2.addColorStop(1, `hsla(${hue + 110},100%,70%,0)`);
      ctx.fillStyle = sg2;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${hue + 110},100%,85%,${0.6 + 0.4 * a})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
