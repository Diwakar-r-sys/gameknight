import type { Platform } from '../types';
import type { PropAnchor } from '../world';

export class MossGrottoRenderer {
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

    // Layer 1: Soft-focused background round moss blobs & distant misty canopy (Reference Image 3)
    c.save();
    c.filter = 'blur(4px)';

    // Distant rounded moss hill domes
    const domeCount = 12;
    for (let i = 0; i < domeCount; i++) {
      const dx = (i / domeCount) * targetW + ((i * 37) % 40);
      const radius = 115 + ((i * 43) % 95);
      const baseY = targetH * (0.64 + ((i * 19) % 18) * 0.01);

      const dGrad = c.createRadialGradient(dx, baseY - radius * 0.35, 16, dx, baseY, radius);
      dGrad.addColorStop(0, 'rgba(134, 214, 96, 0.42)');
      dGrad.addColorStop(0.55, 'rgba(56, 134, 62, 0.56)');
      dGrad.addColorStop(1, 'rgba(13, 46, 28, 0.78)');

      c.fillStyle = dGrad;
      c.beginPath();
      c.arc(dx, baseY, radius, Math.PI, 0);
      c.lineTo(dx + radius, targetH);
      c.lineTo(dx - radius, targetH);
      c.closePath();
      c.fill();
    }

    // Soft-focused canopy moss clusters & hanging silhouettes from ceiling
    for (let i = 0; i < 16; i++) {
      const cx = (i / 16) * targetW + ((i * 29) % 45);
      const r = 60 + ((i * 23) % 55);
      c.fillStyle = i % 2 === 0 ? 'rgba(26, 78, 43, 0.72)' : 'rgba(42, 108, 56, 0.56)';
      c.beginPath();
      c.arc(cx, 35 + ((i * 17) % 45), r, 0, Math.PI * 2);
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
    // Soft atmospheric lush moss green cavern gradients matching Reference Image 3
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, '#071b14');
    grad.addColorStop(0.38, '#13422b');
    grad.addColorStop(0.75, '#256c3f');
    grad.addColorStop(1, '#0b2a1c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    // Sunlit lime-emerald cavern clearing mist glow
    const sunMist = ctx.createRadialGradient(
      viewW * 0.54,
      viewH * 0.48,
      30,
      viewW * 0.54,
      viewH * 0.48,
      viewW * 0.58
    );
    sunMist.addColorStop(0, 'rgba(178, 242, 140, 0.28)');
    sunMist.addColorStop(0.45, 'rgba(88, 184, 112, 0.14)');
    sunMist.addColorStop(1, 'rgba(10, 38, 24, 0)');
    ctx.fillStyle = sunMist;
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
          { x: 160, y: 880, scale: 1.0 },
          { x: 1120, y: 1120, scale: 0.95 },
          { x: 2820, y: 620, scale: 1.05 },
        ];
    for (const anchor of items) {
      const baseX = anchor.x;
      const floorY = anchor.y;
      const scale = anchor.scale ?? 1.0;
      if (
        baseX + 760 < cx - 120 ||
        baseX - 160 > cx + viewW + 120 ||
        floorY + 140 < cy - 120 ||
        floorY - 460 > cy + viewH + 120
      ) {
        continue;
      }

      // Round layered moss cushions along cavern floor edges
      this.drawMossBlobCluster(ctx, baseX + 80, floorY, scale);
      this.drawMossBlobCluster(ctx, baseX + 420, floorY, scale * 0.85);

      // Detailed dangling leafy vines descending from upper canopy
      this.drawDanglingVines(ctx, baseX + 180, floorY - 380, 145, time, baseX * 0.01 + 0.2);
      this.drawDanglingVines(ctx, baseX + 490, floorY - 410, 165, time, baseX * 0.01 + 1.7);
    }
  }

  private drawMossBlobCluster(
    ctx: CanvasRenderingContext2D,
    x: number,
    floorY: number,
    scale: number
  ): void {
    const blobs = [
      { dx: -28, r: 22, col: '#2d5a27' },
      { dx: 18, r: 26, col: '#3a6f2e' },
      { dx: -4, r: 30, col: '#5a9436' },
    ];
    for (const b of blobs) {
      const bx = x + b.dx * scale;
      const br = b.r * scale;
      ctx.fillStyle = b.col;
      ctx.strokeStyle = '#09150e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, floorY + 2, br, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(182, 240, 124, 0.45)';
      ctx.beginPath();
      ctx.arc(bx - br * 0.2, floorY - br * 0.52, br * 0.4, Math.PI, 0);
      ctx.fill();
    }
  }

  private drawDanglingVines(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    length: number,
    time: number,
    phase: number
  ): void {
    for (let v = 0; v < 3; v++) {
      const vx = x + (v - 1) * 26;
      const vLen = length * (0.72 + (v % 2) * 0.28);
      const sway = Math.sin(time * 1.45 + phase + v * 0.9) * 11;

      ctx.strokeStyle = v === 1 ? '#3b7334' : '#254e25';
      ctx.lineWidth = v === 1 ? 3 : 2.2;
      ctx.beginPath();
      ctx.moveTo(vx, topY);
      ctx.quadraticCurveTo(vx + sway * 0.5, topY + vLen * 0.5, vx + sway, topY + vLen);
      ctx.stroke();

      // Delicate mossy leaves along vine strand
      ctx.fillStyle = v === 1 ? '#6db349' : '#4a8535';
      for (let s = 0.25; s <= 0.92; s += 0.22) {
        const lx = vx + sway * s;
        const ly = topY + vLen * s;
        const side = Math.round(s * 10) % 2 === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(lx + side * 6, ly, 6.5, 3, side * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  public drawPlatform(
    ctx: CanvasRenderingContext2D,
    p: Platform
  ): void {
    // Carved dark slate-moss rock body matching floating mossy islands in Reference Image 3
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + Math.min(p.h, 180));
    grad.addColorStop(0, '#2a3330');
    grad.addColorStop(0.5, '#19211f');
    grad.addColorStop(1, '#0c1210');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, p.kind === 'floatingIsland' ? 10 : 4);
    ctx.fill();

    ctx.strokeStyle = '#070c0a';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Ribbed underside stone crevices (Signature Silksong floating rock island texture)
    if (p.kind === 'floatingIsland' || p.h <= 45) {
      ctx.strokeStyle = '#0d1513';
      ctx.lineWidth = 2;
      for (let rx = p.x + 14; rx < p.x + p.w - 10; rx += 16) {
        ctx.beginPath();
        ctx.moveTo(rx, p.y + p.h - 10);
        ctx.lineTo(rx, p.y + p.h - 2);
        ctx.stroke();
      }
    }

    // Lush layered bright green moss blanket on top
    if (p.mossTop) {
      ctx.fillStyle = '#4a7c2c';
      ctx.beginPath();
      ctx.roundRect(p.x - 1, p.y - 2, p.w + 2, 11, 5);
      ctx.fill();

      ctx.fillStyle = '#78b842';
      ctx.beginPath();
      ctx.roundRect(p.x + 2, p.y - 2, p.w - 4, 5, 3);
      ctx.fill();

      // Delicate leafy sprout stem rising from mossy island
      if (p.hasSprout) {
        const sx = p.x + p.w * 0.34;
        ctx.strokeStyle = '#6db349';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, p.y);
        ctx.quadraticCurveTo(sx - 4, p.y - 22, sx + 5, p.y - 38);
        ctx.stroke();

        ctx.fillStyle = '#8ad158';
        ctx.beginPath();
        ctx.ellipse(sx - 5, p.y - 24, 7, 3.2, -0.5, 0, Math.PI * 2);
        ctx.ellipse(sx + 9, p.y - 34, 8, 3.5, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
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
    void cy;
    void anchors;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Bright vertical green/sunlit God rays streaming from canopy openings
    const shafts = [280, 740, 1460, 2120, 2760, 3580, 4080];
    for (const sxWorld of shafts) {
      const sx = sxWorld - cx * 0.82;
      if (sx < -280 || sx > viewW + 280) continue;
      const pulse = 0.78 + Math.sin(time * 0.95 + sxWorld * 0.01) * 0.22;

      const grad = ctx.createLinearGradient(sx, 0, sx, viewH);
      grad.addColorStop(0, `rgba(210, 255, 168, ${0.22 * pulse})`);
      grad.addColorStop(0.65, `rgba(140, 240, 150, ${0.09 * pulse})`);
      grad.addColorStop(1, 'rgba(82, 183, 136, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx - 38, -20);
      ctx.lineTo(sx + 48, -20);
      ctx.lineTo(sx + 92, viewH + 20);
      ctx.lineTo(sx - 68, viewH + 20);
      ctx.closePath();
      ctx.fill();
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
    const spacing = 580;
    const startIdx = Math.floor(px / spacing) - 1;
    const count = Math.ceil(viewW / spacing) + 3;

    for (let i = startIdx; i < startIdx + count; i++) {
      const sx = i * spacing - px;
      const sway = Math.sin(time * 1.5 + i) * 5;

      // Dark out-of-focus foreground hanging moss & fern silhouettes at top corners
      ctx.fillStyle = '#040d08';
      ctx.beginPath();
      ctx.moveTo(sx - 30, -10);
      ctx.lineTo(sx + 10 + sway * 0.3, 86);
      ctx.lineTo(sx + 44, 48);
      ctx.lineTo(sx + 78 + sway * 0.4, 118);
      ctx.lineTo(sx + 115, 44);
      ctx.lineTo(sx + 165, -10);
      ctx.closePath();
      ctx.fill();

      // Dark mushroom cap & tall lily stem silhouette along bottom foreground (Reference Image 3)
      ctx.fillStyle = '#050c08';
      ctx.fillRect(sx + 146, viewH - 70, 8, 75);
      ctx.beginPath();
      ctx.arc(sx + 150, viewH - 66, 46, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#050c08';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx + 235, viewH + 5);
      ctx.quadraticCurveTo(sx + 230 + sway, viewH - 72, sx + 225 + sway, viewH - 120);
      ctx.stroke();
      ctx.fillStyle = '#050c08';
      ctx.beginPath();
      ctx.ellipse(sx + 225 + sway, viewH - 122, 18, 6, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
