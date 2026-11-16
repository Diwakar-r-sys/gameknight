import type { Platform } from '../types';
import type { PropAnchor } from '../world';

export class CrystalCavernRenderer {
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

    // Layer 1: Soft-focused background stalactites & distant cavern silhouettes
    c.save();
    c.filter = 'blur(3px)';

    // Distant hazy blue stone arches & jagged stalagmites
    const spireCount = 14;
    for (let i = 0; i < spireCount; i++) {
      const sx = (i / spireCount) * targetW;
      const spireW = 110 + ((i * 53) % 90);
      const spireH = targetH * (0.42 + ((i * 31) % 30) * 0.01);

      c.fillStyle = i % 2 === 0 ? 'rgba(26, 38, 56, 0.72)' : 'rgba(34, 52, 77, 0.58)';
      c.beginPath();
      c.moveTo(sx - spireW * 0.4, targetH);
      c.lineTo(sx + spireW * 0.25, targetH - spireH);
      c.lineTo(sx + spireW * 0.55, targetH - spireH * 0.78);
      c.lineTo(sx + spireW, targetH);
      c.closePath();
      c.fill();

      // Ceiling stalactites
      const stalH = 95 + ((i * 47) % 130);
      c.beginPath();
      c.moveTo(sx, 0);
      c.lineTo(sx + spireW * 0.35, stalH);
      c.lineTo(sx + spireW * 0.68, 0);
      c.closePath();
      c.fill();
    }

    // Distant faint glowing crystal silhouettes in background mist
    c.fillStyle = 'rgba(130, 210, 255, 0.25)';
    for (let i = 0; i < 4; i++) {
      const cx = 140 + i * 390;
      const baseY = targetH * 0.82;
      c.beginPath();
      c.moveTo(cx - 48, baseY);
      c.lineTo(cx - 12, baseY - 190);
      c.lineTo(cx + 22, baseY - 115);
      c.lineTo(cx + 55, baseY);
      c.closePath();
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
    // Cool icy slate-blue radial + linear backdrop matching Reference Image 1
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, '#182436');
    grad.addColorStop(0.45, '#345073');
    grad.addColorStop(0.82, '#5a7ea6');
    grad.addColorStop(1, '#1c293c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    // Soft upper-right skylight cavern opening glow
    const skyGlow = ctx.createRadialGradient(
      viewW * 0.82,
      viewH * 0.14,
      20,
      viewW * 0.82,
      viewH * 0.14,
      viewW * 0.55
    );
    skyGlow.addColorStop(0, 'rgba(174, 214, 248, 0.36)');
    skyGlow.addColorStop(0.5, 'rgba(98, 142, 190, 0.12)');
    skyGlow.addColorStop(1, 'rgba(24, 36, 54, 0)');
    ctx.fillStyle = skyGlow;
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
    const px = ((camX * 0.22) % cache.width + cache.width) % cache.width;
    const py = Math.max(-40, Math.min(40, -camY * 0.05));

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
          { x: 180, y: 420, scale: 0.9 },
          { x: 460, y: 1880, scale: 1.0 },
          { x: 1780, y: 620, scale: 1.0 },
        ];

    for (const anchor of items) {
      const baseX = anchor.x;
      const floorY = anchor.y;
      const scale = anchor.scale ?? 1.0;
      if (
        baseX + 760 < cx - 120 ||
        baseX - 140 > cx + viewW + 120 ||
        floorY + 140 < cy - 120 ||
        floorY - 520 > cy + viewH + 120
      ) {
        continue;
      }

      // Giant interlocking stone pillar & ceiling archway
      this.drawStonePillarArch(ctx, baseX, floorY);

      // Flickering iron/wood torch brazier on left side
      this.drawTorchBrazier(ctx, baseX + 125, floorY, time);

      // Large glowing cyan crystal shard cluster
      this.drawCrystalCluster(ctx, baseX + 320, floorY, scale, time);
      this.drawCrystalCluster(ctx, baseX + 540, floorY, scale * 0.72, time + 1.3);
    }
  }

  private drawStonePillarArch(
    ctx: CanvasRenderingContext2D,
    x: number,
    floorY: number
  ): void {
    const blocks = [
      { bx: 0, by: floorY - 58, bw: 92, bh: 58 },
      { bx: 8, by: floorY - 120, bw: 82, bh: 64 },
      { bx: -6, by: floorY - 186, bw: 98, bh: 68 },
      { bx: 6, by: floorY - 256, bw: 90, bh: 72 },
      { bx: -4, by: floorY - 332, bw: 112, bh: 78 },
      { bx: 18, by: floorY - 404, bw: 138, bh: 76 },
      { bx: 112, by: floorY - 432, bw: 120, bh: 68 },
      { bx: 210, by: floorY - 446, bw: 124, bh: 62 },
    ];

    for (const b of blocks) {
      this.drawFacetedStoneBlock(ctx, x + b.bx, b.by, b.bw, b.bh);
    }
  }

  private drawFacetedStoneBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#364152');
    grad.addColorStop(0.55, '#252d3b');
    grad.addColorStop(1, '#1a202b');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + w - 8, y + 3);
    ctx.lineTo(x + w, y + h * 0.45);
    ctx.lineTo(x + w - 5, y + h);
    ctx.lineTo(x + 4, y + h - 2);
    ctx.lineTo(x, y + h * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crisp top-edge stone highlight
    ctx.strokeStyle = '#5c6e8a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 4);
    ctx.lineTo(x + w - 12, y + 6);
    ctx.stroke();
  }

  public drawPlatform(
    ctx: CanvasRenderingContext2D,
    p: Platform
  ): void {
    // Faceted dark-grey/blue bedrock body with ink outline
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + Math.min(p.h, 180));
    grad.addColorStop(0, '#2c3647');
    grad.addColorStop(0.5, '#1c222d');
    grad.addColorStop(1, '#0d1118');

    ctx.fillStyle = grad;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Interlocking stone slab seams
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    if (p.w >= 90 && p.h >= 36) {
      ctx.beginPath();
      for (let bx = p.x + 68; bx < p.x + p.w - 24; bx += 74) {
        ctx.moveTo(bx, p.y + 10);
        ctx.lineTo(bx - 6, Math.min(p.y + p.h - 4, p.y + 48));
        ctx.lineTo(bx + 4, Math.min(p.y + p.h - 2, p.y + 92));
      }
      ctx.stroke();
    }

    // Dusty icy snow top crust (#8ca6c9) matching Reference Image 1
    if (p.mossTop) {
      ctx.fillStyle = '#8ca6c9';
      ctx.fillRect(p.x - 1, p.y, p.w + 2, 10);
      ctx.fillStyle = '#b4c9e4';
      ctx.fillRect(p.x - 1, p.y, p.w + 2, 3.5);
      ctx.strokeStyle = '#0a0d12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 10);
      ctx.lineTo(p.x + p.w, p.y + 10);
      ctx.stroke();
    }
  }

  private drawCrystalCluster(
    ctx: CanvasRenderingContext2D,
    x: number,
    floorY: number,
    scale: number,
    time: number
  ): void {
    const shards = [
      { dx: -44, h: 98, w: 30, tilt: -0.24 },
      { dx: -18, h: 148, w: 38, tilt: -0.09 },
      { dx: 16, h: 196, w: 46, tilt: 0.04 },
      { dx: 48, h: 128, w: 34, tilt: 0.22 },
    ];

    // Base pebble rubble
    ctx.fillStyle = '#4c6584';
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * 24 * scale, floorY + 1, 16 * scale, 7 * scale, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }

    // Translucent cyan/ice-blue crystalline shards
    for (const s of shards) {
      ctx.save();
      ctx.translate(x + s.dx * scale, floorY);
      ctx.rotate(s.tilt);
      const sw = s.w * scale;
      const sh = s.h * scale;

      const cGrad = ctx.createLinearGradient(-sw * 0.5, -sh, sw * 0.5, 0);
      cGrad.addColorStop(0, '#ffffff');
      cGrad.addColorStop(0.28, '#7ae7ff');
      cGrad.addColorStop(0.75, '#00d2ff');
      cGrad.addColorStop(1, 'rgba(0, 140, 210, 0.85)');

      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.moveTo(-sw * 0.5, 0);
      ctx.lineTo(-sw * 0.36, -sh * 0.72);
      ctx.lineTo(0, -sh);
      ctx.lineTo(sw * 0.42, -sh * 0.64);
      ctx.lineTo(sw * 0.5, 0);
      ctx.closePath();
      ctx.fill();

      // Facet highlight ridge
      const shimmer = 0.65 + Math.sin(time * 2.4 + s.dx) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${shimmer})`;
      ctx.beginPath();
      ctx.moveTo(-sw * 0.1, -sh * 0.85);
      ctx.lineTo(0, -sh);
      ctx.lineTo(sw * 0.14, -sh * 0.55);
      ctx.lineTo(-sw * 0.02, -6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(180, 245, 255, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTorchBrazier(
    ctx: CanvasRenderingContext2D,
    x: number,
    floorY: number,
    time: number
  ): void {
    // Iron/wood post
    ctx.fillStyle = '#2d1e17';
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 10, floorY);
    ctx.lineTo(x - 5, floorY - 120);
    ctx.lineTo(x + 5, floorY - 120);
    ctx.lineTo(x + 10, floorY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brazier basket bowl
    ctx.fillStyle = '#473326';
    ctx.beginPath();
    ctx.moveTo(x - 18, floorY - 142);
    ctx.lineTo(x + 18, floorY - 142);
    ctx.lineTo(x + 11, floorY - 118);
    ctx.lineTo(x - 11, floorY - 118);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Animated procedural teardrop flame
    const flicker = Math.sin(time * 18) * 3 + Math.cos(time * 27) * 2;
    const fy = floorY - 144;

    ctx.fillStyle = '#ff9d00';
    ctx.beginPath();
    ctx.moveTo(x - 14, fy);
    ctx.quadraticCurveTo(x - 18, fy - 28, x + flicker * 0.4, fy - 52 - flicker);
    ctx.quadraticCurveTo(x + 18, fy - 28, x + 14, fy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(x - 8, fy);
    ctx.quadraticCurveTo(x - 10, fy - 18, x + flicker * 0.25, fy - 34 - flicker * 0.6);
    ctx.quadraticCurveTo(x + 10, fy - 18, x + 8, fy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, fy - 10, 5, 0, Math.PI * 2);
    ctx.fill();
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

    // Volumetric diagonal light beams streaming from upper-right cavern fissures
    const rays = [
      { x: 420, w: 185 },
      { x: 1060, w: 210 },
      { x: 2040, w: 220 },
    ];
    for (const r of rays) {
      const sx = r.x - cx * 0.85;
      if (sx < -360 || sx > viewW + 360) continue;
      const shimmer = 0.8 + Math.sin(time * 0.9 + r.x) * 0.2;
      const topY = -60 - cy * 0.12;
      const botY = viewH + 80;
      const slant = -240;

      const grad = ctx.createLinearGradient(sx, topY, sx + slant * 0.6, botY);
      grad.addColorStop(0, `rgba(210, 236, 255, ${0.18 * shimmer})`);
      grad.addColorStop(0.65, `rgba(122, 231, 255, ${0.06 * shimmer})`);
      grad.addColorStop(1, 'rgba(0, 210, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx - r.w * 0.3, topY);
      ctx.lineTo(sx + r.w * 0.4, topY);
      ctx.lineTo(sx + slant + r.w * 0.9, botY);
      ctx.lineTo(sx + slant - r.w * 0.5, botY);
      ctx.closePath();
      ctx.fill();
    }

    // Additive Crystal & Torch radial blooms in world space
    ctx.translate(-Math.round(cx), -Math.round(cy));
    const items: PropAnchor[] = anchors && anchors.length > 0
      ? anchors
      : [
          { x: 180, y: 420 },
          { x: 460, y: 1880 },
          { x: 1780, y: 620 },
        ];
    for (const anchor of items) {
      const baseX = anchor.x;
      const floorY = anchor.y;
      if (
        baseX + 760 < cx ||
        baseX - 140 > cx + viewW ||
        floorY + 120 < cy ||
        floorY - 360 > cy + viewH
      ) {
        continue;
      }

      // Warm torch flicker light (#ff9d00)
      const torchR = 165 + Math.sin(time * 14) * 10;
      const tGrad = ctx.createRadialGradient(baseX + 125, floorY - 155, 6, baseX + 125, floorY - 155, torchR);
      tGrad.addColorStop(0, 'rgba(255, 185, 60, 0.45)');
      tGrad.addColorStop(0.45, 'rgba(255, 157, 0, 0.18)');
      tGrad.addColorStop(1, 'rgba(255, 157, 0, 0)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.arc(baseX + 125, floorY - 155, torchR, 0, Math.PI * 2);
      ctx.fill();

      // Cyan crystal bloom & floor mist
      const cGrad = ctx.createRadialGradient(baseX + 320, floorY - 75, 10, baseX + 320, floorY - 75, 220);
      cGrad.addColorStop(0, 'rgba(122, 231, 255, 0.34)');
      cGrad.addColorStop(0.55, 'rgba(0, 210, 255, 0.12)');
      cGrad.addColorStop(1, 'rgba(0, 210, 255, 0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(baseX + 320, floorY - 75, 220, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public drawLayer4Foreground(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    px: number
  ): void {
    // Out-of-focus dark rocky silhouettes framing bottom & top corners
    const spacing = 620;
    const startIdx = Math.floor(px / spacing) - 1;
    const count = Math.ceil(viewW / spacing) + 3;

    ctx.fillStyle = '#06080c';
    for (let i = startIdx; i < startIdx + count; i++) {
      const sx = i * spacing - px;

      // Top jagged cavern ceiling overhang
      ctx.beginPath();
      ctx.moveTo(sx - 60, -10);
      ctx.lineTo(sx + 25, 58);
      ctx.lineTo(sx + 85, 34);
      ctx.lineTo(sx + 135, 76);
      ctx.lineTo(sx + 210, -10);
      ctx.closePath();
      ctx.fill();

      // Bottom dark bedrock silhouette framing
      ctx.beginPath();
      ctx.moveTo(sx - 40, viewH + 10);
      ctx.lineTo(sx + 40, viewH - 58);
      ctx.lineTo(sx + 120, viewH - 36);
      ctx.lineTo(sx + 195, viewH - 72);
      ctx.lineTo(sx + 280, viewH + 10);
      ctx.closePath();
      ctx.fill();
    }
  }
}
