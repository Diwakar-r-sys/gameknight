import type { ProceduralPose } from './animation';
import { CrystalCavernRenderer } from './scenes/crystalCavern';
import { MossGrottoRenderer } from './scenes/mossGrotto';
import { MysticSwampRenderer } from './scenes/mysticSwamp';
import type {
  AfterImage,
  AirStream,
  AoeRingEffect,
  BenchCheckpoint,
  BiomePortal,
  BouncePad,
  CombatTrap,
  DialogueSpeaker,
  Enemy,
  FloatingText,
  GlowLight,
  HangingRope,
  Particle,
  PlayerNeedle,
  ReedProp,
  SceneTheme,
  SecretWall,
  Shockwave,
  SlashArc,
  SpecialWave,
  SporeProjectile,
  WaterVolume,
  WorldRelicPickup,
  XpOrb,
} from './types';
import type { WorldData } from './world';

const crystalRenderer = new CrystalCavernRenderer();
const swampRenderer = new MysticSwampRenderer();
const grottoRenderer = new MossGrottoRenderer();

export interface PlayerRenderState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  wallSliding: boolean;
  wallDir: -1 | 0 | 1;
  dashing: boolean;
  healing: boolean;
  healProgress: number;
  invulnTimer: number;
  squashX: number;
  squashY: number;
  runCycle: number;
  hitFlash: number;
  chargeProgress: number;
  chargeColor: string;
  pose: ProceduralPose;
}

export interface RenderFrameState {
  time: number;
  sceneTheme: SceneTheme;
  camX: number;
  camY: number;
  shakeX: number;
  shakeY: number;
  world: WorldData;
  player: PlayerRenderState;
  renderPlayer?: (
    ctx: CanvasRenderingContext2D,
    player: PlayerRenderState,
    time: number,
    isTitleMode: boolean
  ) => void;
  slash: SlashArc;
  playerNeedles: PlayerNeedle[];
  traps: CombatTrap[];
  afterImages: AfterImage[];
  particles: Particle[];
  projectiles: SporeProjectile[];
  specialWaves: SpecialWave[];
  aoeRings: AoeRingEffect[];
  shockwaves: Shockwave[];
  floatingTexts: FloatingText[];
  bossDefeated: boolean;
  isTitleMode: boolean;
}

export function renderGameFrame(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  state: RenderFrameState
): void {
  const { time, sceneTheme, camX, camY, shakeX, shakeY, world } = state;
  const cx = camX + shakeX;
  const cy = camY + shakeY;

  // === LAYER 0: Far Atmospheric Sky / Cavern Backdrop ===
  if (sceneTheme === 'crystal') {
    crystalRenderer.drawLayer0Backdrop(ctx, viewW, viewH);
  } else if (sceneTheme === 'swamp') {
    swampRenderer.drawLayer0Backdrop(ctx, viewW, viewH);
  } else {
    grottoRenderer.drawLayer0Backdrop(ctx, viewW, viewH);
  }

  // === LAYER 1: Distant Silhouettes & Blurred Mid-Background ===
  if (sceneTheme === 'crystal') {
    crystalRenderer.drawLayer1Silhouettes(ctx, viewW, viewH, cx, cy);
  } else if (sceneTheme === 'swamp') {
    swampRenderer.drawLayer1Silhouettes(ctx, viewW, viewH, cx, cy);
  } else {
    grottoRenderer.drawLayer1Silhouettes(ctx, viewW, viewH, cx, cy);
  }

  // === LAYER 2: Interactive Midground, Procedural Landmarks & Gameplay ===
  ctx.save();
  ctx.translate(-Math.round(cx), -Math.round(cy));

  // Procedural Scene-Specific Landmarks
  if (sceneTheme === 'crystal') {
    crystalRenderer.drawLayer2WorldProps(ctx, cx, cy, viewW, viewH, time, world.propAnchors);
  } else if (sceneTheme === 'swamp') {
    swampRenderer.drawLayer2WorldProps(ctx, cx, cy, viewW, viewH, time, world.propAnchors);
  } else {
    grottoRenderer.drawLayer2WorldProps(ctx, cx, cy, viewW, viewH, time, world.propAnchors);
  }

  // Luminous Vertical Air Streams (Azure Silk Shaft)
  for (const stream of world.airStreams) {
    if (stream.x + stream.w < cx - 80 || stream.x > cx + viewW + 80) continue;
    drawAirStream(ctx, stream, time);
  }

  // Midground Reeds, Cattails & Ring Posts
  for (const prop of world.reedProps) {
    if (prop.layer !== 'mid') continue;
    if (prop.x < cx - 80 || prop.x > cx + viewW + 80) continue;
    drawReedProp(ctx, prop, time);
  }

  // Physical Inter-Biome Passage Archways
  for (const portal of world.portals) {
    if (portal.x + portal.w < cx - 120 || portal.x > cx + viewW + 120) continue;
    drawBiomePortal(ctx, portal, time);
  }

  // Ancient Silk Altar
  drawAltar(ctx, world.altarPos.x, world.altarPos.y, state.bossDefeated, time);

  // Stone Benches (Checkpoints)
  for (const bench of world.benches) {
    drawBench(ctx, bench, time);
  }

  // NPCs & Lore Tablets (Dialogue Speakers)
  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;
  for (const speaker of world.speakers) {
    if (speaker.x < cx - 120 || speaker.x > cx + viewW + 120) continue;
    const inRange =
      !state.isTitleMode &&
      Math.abs(playerCenterX - speaker.x) < 76 &&
      Math.abs(playerCenterY - (speaker.y - 24)) < 70;
    drawSpeaker(ctx, speaker, inRange, time);
  }

  // Collectible Relic Pickups
  for (const relic of world.relics) {
    if (relic.collected) continue;
    if (relic.x < cx - 80 || relic.x > cx + viewW + 80) continue;
    drawRelicPickup(ctx, relic, time);
  }

  // Collectible XP Essence Orbs
  for (const orb of world.xpOrbs) {
    if (orb.collected) continue;
    if (orb.x < cx - 60 || orb.x > cx + viewW + 60) continue;
    drawXpOrb(ctx, orb, time);
  }

  // Interactive Swaying Hanging Ropes
  for (const rope of world.hangingRopes) {
    if (rope.x < cx - 120 || rope.x > cx + viewW + 120) continue;
    drawHangingRope(ctx, rope);
  }

  // Scene-Matched Hand-Painted Platforms
  for (const p of world.platforms) {
    if (p.x + p.w < cx - 100 || p.x > cx + viewW + 100) continue;
    if (sceneTheme === 'crystal') {
      crystalRenderer.drawPlatform(ctx, p);
    } else if (sceneTheme === 'swamp') {
      swampRenderer.drawPlatform(ctx, p);
    } else {
      grottoRenderer.drawPlatform(ctx, p);
    }
  }

  // Breakable Secret Moss Walls
  for (const sw of world.secretWalls) {
    if (sw.broken) continue;
    if (sw.x + sw.w < cx - 80 || sw.x > cx + viewW + 80) continue;
    drawSecretWall(ctx, sw, time);
  }

  // Thorn Hazards (Pogoable!)
  for (const t of world.thorns) {
    if (t.x + t.w < cx - 60 || t.x > cx + viewW + 60) continue;
    drawThorns(ctx, t);
  }

  // Springy Moss / Grass Tufts
  for (const m of world.mossTufts) {
    if (m.x + m.w < cx - 40 || m.x > cx + viewW + 40) continue;
    drawMossTuft(ctx, m, time, sceneTheme);
  }

  // Animated Glowing Mushrooms (Swamp Forest area only, background removed)
  if (sceneTheme === 'swamp') {
    swampRenderer.drawForestGlowMushrooms(ctx, cx, cy, viewW, viewH, time);
  }

  // Interactive Springy Moss Bounce Pads (Lush Green Moss Grotto)
  for (const pad of world.bouncePads) {
    if (pad.x + pad.w < cx - 60 || pad.x > cx + viewW + 60) continue;
    drawBouncePad(ctx, pad, time);
  }

  // Destructible Spore Bulbs & Pogo Pods
  for (const bulb of world.sporeBulbs) {
    if (!bulb.alive) continue;
    if (bulb.x < cx - 80 || bulb.x > cx + viewW + 80) continue;
    drawSporeBulb(ctx, bulb.x, bulb.y, bulb.radius, bulb.pogoPod, bulb.swayPhase, time);
  }

  // Spore Projectiles
  for (const proj of state.projectiles) {
    if (!proj.active) continue;
    drawProjectile(ctx, proj);
  }

  // Enemies
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    if (enemy.x + enemy.w < cx - 120 || enemy.x > cx + viewW + 120) continue;
    drawEnemy(ctx, enemy, time);
  }

  // Dash Afterimages
  for (const img of state.afterImages) {
    if (!img.active) continue;
    drawPlayerGhost(ctx, img);
  }

  // Traps (Architect Cog-Saws & Mines)
  for (const trap of state.traps) {
    if (!trap.active) continue;
    drawCombatTrap(ctx, trap, time);
  }

  // Hero Character
  if (state.renderPlayer) {
    state.renderPlayer(ctx, state.player, time, state.isTitleMode);
  } else {
    drawPlayer(ctx, state.player, time, state.isTitleMode);
  }

  // Nail / Needle 3-Frame Procedural Crescent Slash Arc
  if (state.slash.active) {
    drawSlashArc(ctx, state.slash);
  }

  // Hunter Style Projectile Needles
  for (const needle of state.playerNeedles) {
    if (!needle.active) continue;
    drawPlayerNeedle(ctx, needle);
  }

  // AoE Magic Spell & Ultimate Nova Shock Rings
  for (const ring of state.aoeRings) {
    if (!ring.active) continue;
    drawAoeRing(ctx, ring);
  }

  // Special Attack Soul Crescent & Ultimate Slash Waves
  for (const wave of state.specialWaves) {
    if (!wave.active) continue;
    drawSpecialWave(ctx, wave, time);
  }

  // Boss & Middle-Boss Ground Shockwaves
  for (const sw of state.shockwaves) {
    if (!sw.active) continue;
    drawShockwave(ctx, sw);
  }

  // Pooled Combat & Moss Particles
  drawParticles(ctx, state.particles);

  // Floating Damage & Combat Callouts
  drawFloatingTexts(ctx, state.floatingTexts);

  // Interactive Calm Reflective Pond & Marsh Water Volumes (drawn translucent over submerged player)
  for (const water of world.waterVolumes) {
    if (water.x + water.w < cx - 80 || water.x > cx + viewW + 80) continue;
    drawWaterVolume(ctx, water, time, sceneTheme);
  }

  // Dark Foreground Reeds & Silhouettes passing near lens
  for (const prop of world.reedProps) {
    if (prop.layer !== 'fore') continue;
    if (prop.x < cx - 80 || prop.x > cx + viewW + 80) continue;
    drawReedProp(ctx, prop, time);
  }

  ctx.restore();

  // === LAYER 3: Lighting, Volumetric God Rays & Bioluminescence ===
  if (sceneTheme === 'crystal') {
    crystalRenderer.drawLayer3Lighting(ctx, viewW, viewH, cx, cy, time, world.propAnchors);
  } else if (sceneTheme === 'swamp') {
    swampRenderer.drawLayer3Lighting(ctx, viewW, viewH, cx, cy, time, world.propAnchors);
  } else {
    grottoRenderer.drawLayer3Lighting(ctx, viewW, viewH, cx, cy, time, world.propAnchors);
  }

  ctx.save();
  ctx.translate(-Math.round(cx), -Math.round(cy));
  drawDynamicLights(ctx, world.glowLights, state.player, cx, cy, viewW, viewH, time);
  ctx.restore();

  // Floating Spores & Ground Mist
  drawFloatingMotes(ctx, viewW, viewH, cx, cy, world, time, sceneTheme);
  drawGroundMist(ctx, viewW, viewH, cx, time, sceneTheme);

  // === LAYER 4: Foreground Framing Silhouettes & Vignette ===
  if (sceneTheme === 'crystal') {
    crystalRenderer.drawLayer4Foreground(ctx, viewW, viewH, cx * 1.38);
  } else if (sceneTheme === 'swamp') {
    swampRenderer.drawLayer4Foreground(ctx, viewW, viewH, cx * 1.38, time);
  } else {
    grottoRenderer.drawLayer4Foreground(ctx, viewW, viewH, cx * 1.38, time);
  }
  drawVignette(ctx, viewW, viewH);
}

function drawGroundMist(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  cx: number,
  time: number,
  theme: SceneTheme
): void {
  const mistColor =
    theme === 'crystal'
      ? 'rgba(130, 215, 255, 0.09)'
      : theme === 'swamp'
      ? 'rgba(110, 215, 225, 0.1)'
      : 'rgba(155, 240, 145, 0.11)';
  for (let i = 0; i < 4; i++) {
    const mx = ((i * 460 - cx * 0.55 + time * 18) % (viewW + 520)) - 260;
    const my = viewH - 95 + Math.sin(time * 0.7 + i) * 14;
    const rad = ctx.createRadialGradient(mx, my, 20, mx, my, 260);
    rad.addColorStop(0, mistColor);
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(mx - 260, my - 120, 520, 240);
  }
}

function drawWaterVolume(
  ctx: CanvasRenderingContext2D,
  w: WaterVolume,
  time: number,
  theme: SceneTheme
): void {
  const isEmerald = theme === 'grotto' || (w.tint === 'emerald' && theme !== 'swamp');
  const topColor =
    theme === 'crystal'
      ? 'rgba(56, 189, 248, 0.34)'
      : isEmerald
      ? 'rgba(110, 231, 183, 0.38)'
      : 'rgba(76, 161, 175, 0.42)';
  const botColor =
    theme === 'crystal'
      ? 'rgba(12, 74, 110, 0.68)'
      : isEmerald
      ? 'rgba(12, 68, 46, 0.72)'
      : 'rgba(20, 42, 52, 0.75)';

  const grad = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, botColor);
  ctx.fillStyle = grad;
  ctx.fillRect(w.x, w.y, w.w, w.h);

  // Shimmering animated water surface line
  ctx.strokeStyle = isEmerald ? 'rgba(209, 250, 229, 0.65)' : 'rgba(186, 230, 253, 0.58)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = w.x; x <= w.x + w.w; x += 18) {
    const waveY = w.y + Math.sin(time * 3 + x * 0.05) * 2.2;
    if (x === w.x) ctx.moveTo(x, waveY);
    else ctx.lineTo(x, waveY);
  }
  ctx.stroke();

  // Floating lilypads
  for (let i = 0; i < w.lilypadXs.length; i++) {
    const lx = w.lilypadXs[i] + Math.sin(time * 1.2 + i) * 4;
    const ly = w.y + Math.sin(time * 3 + lx * 0.05) * 2;
    ctx.fillStyle = isEmerald ? '#6db349' : '#6ba368';
    ctx.strokeStyle = '#0a1f16';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 16, 4.8, 0, 0.25, Math.PI * 1.9);
    ctx.fill();
    ctx.stroke();
  }
}

function drawAirStream(ctx: CanvasRenderingContext2D, s: AirStream, time: number): void {
  const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y);
  grad.addColorStop(0, 'rgba(103, 232, 249, 0)');
  grad.addColorStop(0.5, 'rgba(103, 232, 249, 0.14)');
  grad.addColorStop(1, 'rgba(103, 232, 249, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(s.x, s.y, s.w, s.h);

  ctx.strokeStyle = 'rgba(207, 250, 254, 0.35)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const sx = s.x + 18 + i * 20;
    const offset = ((time * 180 + i * 240) % s.h);
    const sy = s.y + s.h - offset;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.sin(time * 4 + i) * 6, Math.max(s.y, sy - 65));
    ctx.stroke();
  }
}

function drawReedProp(ctx: CanvasRenderingContext2D, prop: ReedProp, time: number): void {
  const isFore = prop.layer === 'fore';
  const sway = Math.sin(time * 1.6 + prop.phase) * (isFore ? 8 : 5);
  ctx.save();
  ctx.strokeStyle = isFore ? '#050b0c' : '#2f5e4e';
  ctx.lineWidth = isFore ? 5 : 3;
  ctx.beginPath();
  ctx.moveTo(prop.x, prop.y);
  ctx.quadraticCurveTo(prop.x + sway * 0.5, prop.y - prop.height * 0.5, prop.x + sway, prop.y - prop.height);
  ctx.stroke();

  if (prop.kind === 'lilyStem') {
    ctx.fillStyle = isFore ? '#050b0c' : '#52b788';
    ctx.beginPath();
    ctx.ellipse(prop.x + sway, prop.y - prop.height, isFore ? 18 : 13, isFore ? 6 : 4.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.kind === 'cattail') {
    ctx.fillStyle = isFore ? '#050b0c' : '#5c4033';
    ctx.beginPath();
    ctx.ellipse(prop.x + sway * 0.9, prop.y - prop.height * 0.82, isFore ? 6 : 4.5, isFore ? 16 : 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = isFore ? '#050b0c' : '#7ae7ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(prop.x + sway, prop.y - prop.height, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSecretWall(ctx: CanvasRenderingContext2D, sw: SecretWall, time: number): void {
  const flash = sw.hitFlash > 0;
  ctx.fillStyle = flash ? '#ecfdf5' : '#182432';
  ctx.strokeStyle = '#0a0d12';
  ctx.lineWidth = 2;
  ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
  ctx.strokeRect(sw.x, sw.y, sw.w, sw.h);

  const pulse = 0.4 + Math.sin(time * 3.1) * 0.25;
  ctx.strokeStyle = flash ? '#ffffff' : `rgba(122, 231, 255, ${pulse})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(sw.x + 6, sw.y + 14);
  ctx.lineTo(sw.x + sw.w * 0.55, sw.y + sw.h * 0.35);
  ctx.lineTo(sw.x + sw.w * 0.3, sw.y + sw.h * 0.65);
  ctx.lineTo(sw.x + sw.w - 6, sw.y + sw.h - 16);
  ctx.stroke();
}

function drawHangingRope(ctx: CanvasRenderingContext2D, rope: HangingRope): void {
  const endX = rope.x + Math.sin(rope.angle) * rope.length;
  const endY = rope.y + Math.cos(rope.angle) * rope.length;
  const midX = rope.x + Math.sin(rope.angle * 0.7) * (rope.length * 0.52);
  const midY = rope.y + Math.cos(rope.angle * 0.7) * (rope.length * 0.52);

  ctx.strokeStyle = 'rgba(130, 195, 210, 0.55)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(rope.x, rope.y);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  ctx.fillStyle = '#7ae7ff';
  ctx.beginPath();
  ctx.arc(endX, endY, 3.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawMossTuft(
  ctx: CanvasRenderingContext2D,
  m: { x: number; y: number; w: number; compression: number; hueShift: number },
  time: number,
  theme: SceneTheme
): void {
  const sway = Math.sin(time * 2.1 + m.x * 0.05) * 2.2;
  const h = Math.max(4, 11 * (1 - m.compression * 0.65));
  const spread = m.compression * 4;

  ctx.fillStyle =
    theme === 'crystal'
      ? m.hueShift > 0
        ? '#7794b8'
        : '#5e7899'
      : theme === 'swamp'
      ? m.hueShift > 0
        ? '#7c6294'
        : '#5d4770'
      : m.hueShift > 0
      ? '#6db349'
      : '#4a8535';

  ctx.beginPath();
  ctx.moveTo(m.x - spread, m.y + 1);
  ctx.quadraticCurveTo(m.x + m.w * 0.25 + sway, m.y - h * 1.15, m.x + m.w * 0.5 + sway, m.y - h);
  ctx.quadraticCurveTo(m.x + m.w * 0.75 + sway, m.y - h * 1.15, m.x + m.w + spread, m.y + 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = theme === 'crystal' ? '#b8d7f5' : theme === 'swamp' ? '#00f2fe' : '#bef264';
  ctx.beginPath();
  ctx.arc(m.x + m.w * 0.5 + sway, m.y - h * 0.75, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawThorns(ctx: CanvasRenderingContext2D, t: { x: number; y: number; w: number; h: number }): void {
  const spikeW = 18;
  const count = Math.floor(t.w / spikeW);
  ctx.fillStyle = '#1b1118';
  ctx.lineWidth = 1.2;

  for (let i = 0; i < count; i++) {
    const sx = t.x + i * spikeW;
    ctx.beginPath();
    ctx.moveTo(sx, t.y + t.h);
    ctx.lineTo(sx + spikeW * 0.5, t.y + 2);
    ctx.lineTo(sx + spikeW, t.y + t.h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(204, 169, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(sx + 2, t.y + t.h - 2);
    ctx.lineTo(sx + spikeW * 0.5, t.y + 3);
    ctx.stroke();
  }
}

function drawSporeBulb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  pogoPod: boolean,
  phase: number,
  time: number
): void {
  const bobY = y + Math.sin(time * 2.2 + phase) * 3.5;

  ctx.strokeStyle = 'rgba(122, 231, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, bobY - radius);
  ctx.lineTo(x, bobY - radius - 26);
  ctx.stroke();

  const glowColor = pogoPod ? 'rgba(122, 231, 255, 0.34)' : 'rgba(103, 232, 249, 0.24)';
  const rad = ctx.createRadialGradient(x, bobY, radius * 0.3, x, bobY, radius * 2.2);
  rad.addColorStop(0, glowColor);
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(x, bobY, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pogoPod ? '#38bdf8' : '#00f2fe';
  ctx.beginPath();
  ctx.arc(x, bobY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ecfeff';
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, bobY - radius * 0.25, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();

  if (pogoPod) {
    ctx.strokeStyle = 'rgba(236, 254, 255, 0.78)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, bobY, radius + 4 + Math.sin(time * 4 + phase) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBench(ctx: CanvasRenderingContext2D, bench: BenchCheckpoint, time: number): void {
  const bx = bench.x;
  const by = bench.y;

  if (bench.activated) {
    const pulse = 0.85 + Math.sin(time * 3) * 0.15;
    const rad = ctx.createRadialGradient(bx, by - 26, 6, bx, by - 26, 85 * pulse);
    rad.addColorStop(0, 'rgba(122, 231, 255, 0.34)');
    rad.addColorStop(1, 'rgba(122, 231, 255, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(bx, by - 26, 85 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#222b38';
  ctx.fillRect(bx - 28, by - 16, 56, 6);
  ctx.fillRect(bx - 24, by - 10, 6, 10);
  ctx.fillRect(bx + 18, by - 10, 6, 10);

  ctx.strokeStyle = bench.activated ? '#7ae7ff' : '#4f6278';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx - 24, by - 16);
  ctx.quadraticCurveTo(bx - 26, by - 36, bx, by - 36);
  ctx.quadraticCurveTo(bx + 26, by - 36, bx + 24, by - 16);
  ctx.stroke();

  ctx.fillStyle = '#222b38';
  ctx.fillRect(bx + 34, by - 58, 4, 58);
  ctx.fillStyle = bench.activated ? '#e0f7ff' : '#53677d';
  ctx.beginPath();
  ctx.arc(bx + 36, by - 60, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawAltar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  unlocked: boolean,
  time: number
): void {
  const glowAlpha = unlocked ? 0.45 + Math.sin(time * 3.5) * 0.12 : 0.12;
  const rad = ctx.createRadialGradient(x, y - 55, 8, x, y - 55, 130);
  rad.addColorStop(0, `rgba(122, 231, 255, ${glowAlpha})`);
  rad.addColorStop(1, 'rgba(0, 210, 255, 0)');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(x, y - 55, 130, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x - 36, y - 14, 72, 14);
  ctx.fillRect(x - 24, y - 28, 48, 14);

  const hover = Math.sin(time * 2.4) * 5;
  ctx.save();
  ctx.translate(x, y - 68 + hover);
  ctx.strokeStyle = unlocked ? '#ecfeff' : '#4a6078';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(15, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(-15, 0);
  ctx.closePath();
  ctx.stroke();

  if (unlocked) {
    ctx.fillStyle = '#7ae7ff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpeaker(
  ctx: CanvasRenderingContext2D,
  speaker: DialogueSpeaker,
  inRange: boolean,
  time: number
): void {
  const sx = speaker.x;
  const sy = speaker.y;
  const isTablet = speaker.id.includes('tablet');

  ctx.save();
  if (isTablet) {
    const pulse = 0.55 + Math.sin(time * 2.5) * 0.25;
    const rad = ctx.createRadialGradient(sx, sy - 32, 4, sx, sy - 32, 64);
    rad.addColorStop(0, `rgba(116, 198, 157, ${0.26 * pulse})`);
    rad.addColorStop(1, 'rgba(116, 198, 157, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(sx, sy - 32, 64, 0, Math.PI * 2);
    ctx.fill();

    // Engraved Stone Tablet
    ctx.fillStyle = '#18262b';
    ctx.strokeStyle = '#335952';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 18, sy);
    ctx.lineTo(sx - 16, sy - 48);
    ctx.quadraticCurveTo(sx, sy - 64, sx + 16, sy - 48);
    ctx.lineTo(sx + 18, sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = `rgba(167, 243, 208, ${pulse})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 38);
    ctx.lineTo(sx + 8, sy - 38);
    ctx.moveTo(sx - 10, sy - 28);
    ctx.lineTo(sx + 6, sy - 28);
    ctx.moveTo(sx - 6, sy - 18);
    ctx.lineTo(sx + 9, sy - 18);
    ctx.stroke();
  } else {
    const bob = Math.sin(time * 2.1 + sx * 0.02) * 1.6;
    const rad = ctx.createRadialGradient(sx, sy - 28, 4, sx, sy - 28, 70);
    rad.addColorStop(0, 'rgba(122, 231, 255, 0.22)');
    rad.addColorStop(1, 'rgba(122, 231, 255, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(sx, sy - 28, 70, 0, Math.PI * 2);
    ctx.fill();

    // Cloaked Pilgrim Silhouette
    ctx.fillStyle = '#1a3335';
    ctx.beginPath();
    ctx.moveTo(sx - 16, sy);
    ctx.lineTo(sx - 11, sy - 34 + bob);
    ctx.lineTo(sx + 11, sy - 34 + bob);
    ctx.lineTo(sx + 16, sy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2d5350';
    ctx.beginPath();
    ctx.moveTo(sx - 12, sy - 26 + bob);
    ctx.lineTo(sx + 12, sy - 26 + bob);
    ctx.lineTo(sx + 9, sy - 10 + bob);
    ctx.lineTo(sx - 10, sy - 10 + bob);
    ctx.closePath();
    ctx.fill();

    // Pale Mask & Moth Crest
    ctx.fillStyle = '#e6f4ee';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 40 + bob, 9.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#95d5b2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy - 50 + bob);
    ctx.quadraticCurveTo(sx - 11, sy - 60 + bob, sx - 13, sy - 54 + bob);
    ctx.moveTo(sx + 4, sy - 50 + bob);
    ctx.quadraticCurveTo(sx + 11, sy - 60 + bob, sx + 13, sy - 54 + bob);
    ctx.stroke();

    ctx.fillStyle = '#071315';
    ctx.beginPath();
    ctx.arc(sx - 3.5, sy - 40 + bob, 1.9, 0, Math.PI * 2);
    ctx.arc(sx + 3.5, sy - 40 + bob, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  if (inRange) {
    const promptY = sy - 76 + Math.sin(time * 4) * 2.5;
    ctx.fillStyle = 'rgba(8, 22, 24, 0.92)';
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(sx - 38, promptY - 13, 76, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ecfdf5';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isTablet ? '[E] Read' : '[E] Speak', sx, promptY - 2);
  }
  ctx.restore();
}

function drawRelicPickup(ctx: CanvasRenderingContext2D, relic: WorldRelicPickup, time: number): void {
  const bobY = relic.y + Math.sin(time * 3.1 + relic.x * 0.03) * 5;
  ctx.save();
  const rad = ctx.createRadialGradient(relic.x, bobY, 3, relic.x, bobY, 36);
  rad.addColorStop(0, 'rgba(167, 243, 208, 0.5)');
  rad.addColorStop(1, 'rgba(167, 243, 208, 0)');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(relic.x, bobY, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(relic.x, bobY);
  ctx.fillStyle = relic.color;
  ctx.strokeStyle = '#ecfdf5';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 13);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawXpOrb(ctx: CanvasRenderingContext2D, orb: XpOrb, time: number): void {
  const bobY = orb.y + Math.sin(time * 3.6 + orb.phase) * 4.5;
  ctx.save();
  const rad = ctx.createRadialGradient(orb.x, bobY, 2, orb.x, bobY, 24);
  rad.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
  rad.addColorStop(0.55, 'rgba(110, 231, 183, 0.25)');
  rad.addColorStop(1, 'rgba(110, 231, 183, 0)');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(orb.x, bobY, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = '#fef9c3';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(orb.x, bobY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(orb.x - 2, bobY - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const flash = e.hitFlash > 0;

  ctx.save();
  ctx.translate(cx, cy);

  if (e.kind === 'crawler') {
    const scuttle = Math.sin(time * 12 + e.animPhase) * 2;
    ctx.fillStyle = flash ? '#ffffff' : '#1f3a32';
    ctx.beginPath();
    ctx.ellipse(0, 2, e.w * 0.5, e.h * 0.42, 0, Math.PI, 0);
    ctx.lineTo(e.w * 0.5, e.h * 0.45);
    ctx.lineTo(-e.w * 0.5, e.h * 0.45);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.ellipse(-2 * e.facing, -6, e.w * 0.34, 6, 0, Math.PI, 0);
      ctx.fill();
    }

    ctx.strokeStyle = flash ? '#ffffff' : '#0b1615';
    ctx.lineWidth = 2.5;
    for (let l = -1; l <= 1; l++) {
      const lx = l * 10;
      ctx.beginPath();
      ctx.moveTo(lx, 10);
      ctx.lineTo(lx + scuttle * (l === 0 ? -1 : 1), 16);
      ctx.stroke();
    }

    ctx.fillStyle = flash ? '#ffffff' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(e.facing * 10, 2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'flyer') {
    const wingFlap = Math.sin(time * (e.aiState === 'ATTACK' ? 28 : 16) + e.animPhase) * 10;
    const isTelegraph = e.aiState === 'WINDUP';

    ctx.fillStyle = flash
      ? '#ffffff'
      : isTelegraph
      ? 'rgba(251, 146, 60, 0.72)'
      : 'rgba(122, 231, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-10, -8 + wingFlap * 0.4, 15, 7, -0.4, 0, Math.PI * 2);
    ctx.ellipse(10, -8 + wingFlap * 0.4, 15, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? '#ffffff' : '#1b312f';
    ctx.beginPath();
    ctx.ellipse(0, 2, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isTelegraph) {
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = flash ? '#ffffff' : isTelegraph ? '#f97316' : '#7ae7ff';
    ctx.beginPath();
    ctx.arc(e.facing * 5, -2, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'shieldbearer') {
    const isWindup = e.aiState === 'WINDUP';
    const isSlam = e.aiState === 'SLAM';
    const stride = Math.sin(time * 7 + e.animPhase) * (Math.abs(e.vx) > 5 ? 3 : 0.6);

    if (isWindup || isSlam) {
      const warnRad = ctx.createRadialGradient(0, 0, 8, 0, 0, 48);
      warnRad.addColorStop(0, 'rgba(245, 158, 11, 0.42)');
      warnRad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = warnRad;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy Coleoptera Legs
    ctx.strokeStyle = flash ? '#ffffff' : '#091115';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-14, 16);
    ctx.lineTo(-18 + stride, 30);
    ctx.moveTo(0, 18);
    ctx.lineTo(0 - stride * 0.6, 31);
    ctx.moveTo(14, 16);
    ctx.lineTo(18 + stride, 30);
    ctx.stroke();

    // Armored Beetle Carapace
    ctx.fillStyle = flash ? '#ffffff' : isWindup ? '#78350f' : '#1b2b34';
    ctx.beginPath();
    ctx.ellipse(0, 2, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!flash) {
      ctx.fillStyle = '#2d4b58';
      ctx.beginPath();
      ctx.ellipse(-e.facing * 4, -4, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horned Helmet Crest
    ctx.fillStyle = flash ? '#ffffff' : '#dbeafe';
    ctx.beginPath();
    ctx.moveTo(-11, -18);
    ctx.lineTo(e.facing * 15, -34);
    ctx.lineTo(10, -16);
    ctx.closePath();
    ctx.fill();

    // Glowing Eye
    ctx.fillStyle = flash ? '#ffffff' : isWindup || isSlam ? '#fbbf24' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(e.facing * 9, -8, 3.6, 0, Math.PI * 2);
    ctx.fill();

    // Front Pale Shield Plate (blocks frontal horizontal slashes)
    if (e.shielded) {
      const sx = e.facing * 21;
      ctx.fillStyle = flash ? '#ffffff' : '#cbd5e1';
      ctx.strokeStyle = flash ? '#ffffff' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sx - 6, -24, 12, 48, 5);
      ctx.fill();
      ctx.stroke();

      if (!flash) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sx, -14);
        ctx.lineTo(sx, 14);
        ctx.stroke();
      }
    } else if (isWindup) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    const isPhase2 = e.phase === 2;
    const isDash = e.aiState === 'DASH';
    const isSlam = e.aiState === 'SLAM';
    const wingSpan = Math.sin(time * (e.aiState === 'ATTACK' || isDash ? 24 : isPhase2 ? 13 : 9)) * 12;
    const telegraph = e.aiState === 'WINDUP';

    const rad = ctx.createRadialGradient(0, 0, 10, 0, 0, isPhase2 ? 88 : 74);
    rad.addColorStop(
      0,
      telegraph || isSlam
        ? 'rgba(251, 146, 60, 0.42)'
        : isPhase2
        ? 'rgba(244, 63, 94, 0.34)'
        : 'rgba(122, 231, 255, 0.25)'
    );
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(0, 0, isPhase2 ? 88 : 74, 0, Math.PI * 2);
    ctx.fill();

    if (isDash) {
      ctx.strokeStyle = isPhase2 ? 'rgba(251, 146, 60, 0.75)' : 'rgba(122, 231, 255, 0.7)';
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-e.facing * 20, i * 14);
        ctx.lineTo(-e.facing * 68, i * 14);
        ctx.stroke();
      }
    }

    ctx.fillStyle = flash
      ? '#ffffff'
      : telegraph
      ? '#7c2d12'
      : isPhase2
      ? '#4c1d2e'
      : '#1e3a4c';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(-48, -36 + wingSpan, -54, 12 + wingSpan * 0.5);
    ctx.quadraticCurveTo(-24, 24, 0, 10);
    ctx.quadraticCurveTo(24, 24, 54, 12 + wingSpan * 0.5);
    ctx.quadraticCurveTo(48, -36 + wingSpan, 0, -10);
    ctx.fill();

    ctx.fillStyle = flash ? '#ffffff' : isPhase2 ? '#1a0f18' : '#0f202b';
    ctx.beginPath();
    ctx.ellipse(0, 4, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? '#ffffff' : '#e2ece9';
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.lineTo(-20, -40);
    ctx.lineTo(-6, -24);
    ctx.lineTo(6, -24);
    ctx.lineTo(20, -40);
    ctx.lineTo(14, -18);
    ctx.arc(0, -10, 15, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash
      ? '#ffffff'
      : telegraph || isSlam
      ? '#fb923c'
      : isPhase2
      ? '#f43f5e'
      : '#00f2fe';
    ctx.beginPath();
    ctx.ellipse(-6, -10, 3.2, 4.8, -0.2, 0, Math.PI * 2);
    ctx.ellipse(6, -10, 3.2, 4.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Overhead Health Bar for regular enemies (when damaged) & middle bosses (always)
  if (e.kind !== 'warden' && (e.kind === 'shieldbearer' || e.hp < e.maxHp)) {
    const barW = e.kind === 'shieldbearer' ? 54 : 38;
    const barH = e.kind === 'shieldbearer' ? 5 : 4;
    const barY = -e.h * 0.5 - (e.kind === 'shieldbearer' ? 18 : 12);
    const ratio = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));

    ctx.fillStyle = 'rgba(6, 17, 19, 0.85)';
    ctx.fillRect(-barW * 0.5 - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = e.kind === 'shieldbearer' ? '#f59e0b' : '#52b788';
    ctx.fillRect(-barW * 0.5, barY, barW * ratio, barH);
  }

  ctx.restore();
}

function drawShockwave(ctx: CanvasRenderingContext2D, sw: Shockwave): void {
  const alpha = Math.max(0, sw.life / sw.maxLife);
  const dir = sw.vx >= 0 ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sw.x + sw.w * 0.5, sw.y + sw.h);

  const grad = ctx.createLinearGradient(0, -sw.h, 0, 0);
  grad.addColorStop(0, '#fef3c7');
  grad.addColorStop(0.45, sw.color);
  grad.addColorStop(1, 'rgba(124, 45, 18, 0.2)');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(-sw.w * 0.5, 0);
  ctx.quadraticCurveTo(dir * 4, -sw.h * 1.15, sw.w * 0.5, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#fffbeb';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
  ctx.save();
  ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const ft of texts) {
    if (!ft.active) continue;
    const alpha = Math.max(0, Math.min(1, (ft.life / ft.maxLife) * 1.4));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#050b0c';
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: SporeProjectile): void {
  const rad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 2.2);
  rad.addColorStop(0, 'rgba(251, 146, 60, 0.8)');
  rad.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerGhost(ctx: CanvasRenderingContext2D, img: AfterImage): void {
  ctx.save();
  ctx.globalAlpha = img.alpha * 0.48;
  ctx.translate(img.x + 14, img.y + 46);
  ctx.scale(img.facing * 0.48, 0.48);
  ctx.translate(0, -68);

  // Ghost cloak silhouette
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(-15, 12);
  ctx.quadraticCurveTo(0, 18, 15, 12);
  ctx.lineTo(22, 46);
  ctx.lineTo(12, 40);
  ctx.lineTo(2, 48);
  ctx.lineTo(-8, 40);
  ctx.lineTo(-22, 46);
  ctx.closePath();
  ctx.fill();

  // Ghost horned mask silhouette
  ctx.fillStyle = '#a3f7ff';
  ctx.beginPath();
  ctx.moveTo(-16, -12);
  ctx.bezierCurveTo(-26, -30, -24, -48, -10, -56);
  ctx.bezierCurveTo(-15, -42, -14, -28, -8, -22);
  ctx.quadraticCurveTo(0, -24, 8, -22);
  ctx.bezierCurveTo(14, -28, 15, -42, 10, -56);
  ctx.bezierCurveTo(24, -48, 26, -30, 16, -12);
  ctx.bezierCurveTo(22, 6, 14, 18, 0, 18);
  ctx.bezierCurveTo(-14, 18, -22, 6, -16, -12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: PlayerRenderState,
  time: number,
  isTitleMode: boolean
): void {
  const pose = p.pose;
  const st = isTitleMode ? 'idle' : pose.state;

  if (
    st !== 'death' &&
    st !== 'hurt' &&
    p.invulnTimer > 0 &&
    Math.floor(p.invulnTimer * 18) % 2 === 0 &&
    !p.dashing
  ) {
    return;
  }

  const cx = p.x + p.w * 0.5;
  const bottomY = p.y + p.h;
  const flash = p.hitFlash > 0 || st === 'hurt';

  ctx.save();
  ctx.translate(cx, bottomY);
  ctx.globalAlpha = pose.dissolveAlpha;
  ctx.scale(p.facing * p.squashX, p.squashY);

  // Rotate around center of character for jumps/spins/dashes/hurt/death
  ctx.translate(0, -22 + pose.offsetY);
  ctx.rotate(pose.tiltAngle + (st === 'doubleJump' ? pose.spinAngle * 0.35 : 0));
  ctx.translate(0, 22);

  // Healing Aura & Converging Soul Rings
  if (p.healing || st === 'healing') {
    const auraR = 26 + Math.sin(time * 24) * 4;
    const grad = ctx.createRadialGradient(0, -24, 4, 0, -24, auraR * 1.45);
    grad.addColorStop(0, 'rgba(236, 253, 245, 0.65)');
    grad.addColorStop(0.55, 'rgba(110, 231, 183, 0.25)');
    grad.addColorStop(1, 'rgba(122, 231, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -24, auraR * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(167, 243, 208, 0.8)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -22, 16 + Math.sin(time * 18) * 4, 24, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Double Jump Spectral Moth Wings
  if (pose.wingSpread > 0.05) {
    const span = 26 * pose.wingSpread;
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = st === 'specialAttack' ? 'rgba(103, 232, 249, 0.45)' : 'rgba(167, 243, 208, 0.55)';
    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.quadraticCurveTo(-span - 8, -42, -span - 4, -14);
    ctx.quadraticCurveTo(-14, -12, -4, -18);
    ctx.moveTo(4, -22);
    ctx.quadraticCurveTo(span + 8, -42, span + 4, -14);
    ctx.quadraticCurveTo(14, -12, 4, -18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Special Attack 360-degree Silk Cyclone Nova Ring
  if (st === 'specialAttack') {
    const novaR = 22 + pose.progress * 74;
    const novaAlpha = Math.max(0, 1 - pose.progress * 0.85);
    ctx.save();
    ctx.globalAlpha = novaAlpha;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 4 * (1 - pose.progress * 0.5);
    ctx.beginPath();
    ctx.arc(0, -22, novaR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -22, novaR * 0.72, pose.spinAngle, pose.spinAngle + Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
  }

  // Hurt / Death Ring Feedback
  if (st === 'hurt') {
    ctx.strokeStyle = 'rgba(252, 165, 165, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -24, 20 + pose.progress * 18, 0, Math.PI * 2);
    ctx.stroke();
  } else if (st === 'death') {
    const shatterR = 14 + pose.progress * 54;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - pose.progress);
    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -26, shatterR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a7f3d0';
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + pose.progress * 2.2;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * shatterR * 0.7, -26 + Math.sin(ang) * shatterR * 0.7, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // === Warrior Character (Scaled from user's canvas design to 28x46 hitbox) ===
  const frameTime = time * 60;
  const breatheY = st === 'idle' ? Math.sin(frameTime * 0.08) * 3 : st === 'landing' ? 4 : 0;
  const cloakTrail = Math.min(14, Math.abs(p.vx) * 0.03 + pose.cloakLift * 0.7);
  const wave = Math.sin(frameTime * 0.1) * 3 - cloakTrail;
  const stride = pose.legStride * 1.85;
  const isAirborne = st === 'jumping' || st === 'doubleJump' || st === 'wallJump' || st === 'falling';

  ctx.save();
  ctx.scale(0.48, 0.48);
  ctx.translate(0, -68 + breatheY);

  // 1. Dark Silhouetted Legs
  ctx.fillStyle = st === 'hurt' ? '#fca5a5' : flash ? '#ffffff' : '#0f131a';
  if (st === 'wallSlide') {
    ctx.beginPath();
    ctx.moveTo(-10, 42);
    ctx.lineTo(-4, 42);
    ctx.lineTo(2, 62);
    ctx.lineTo(-5, 64);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(4, 42);
    ctx.lineTo(12, 42);
    ctx.lineTo(15, 65);
    ctx.lineTo(8, 66);
    ctx.closePath();
    ctx.fill();
  } else {
    const legDrop = isAirborne ? -6 : 0;
    ctx.beginPath();
    ctx.moveTo(-10, 42);
    ctx.lineTo(-4, 42);
    ctx.lineTo(-8 + stride, 68 + legDrop);
    ctx.lineTo(-14 + stride, 65 + legDrop);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(4, 42);
    ctx.lineTo(12, 42);
    ctx.lineTo(16 - stride, 68 + legDrop);
    ctx.lineTo(9 - stride, 68 + legDrop);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Layered Dark Blue Cloak (Back & Front with Folds)
  ctx.fillStyle =
    st === 'hurt'
      ? '#fca5a5'
      : flash
      ? '#ffffff'
      : p.dashing || st === 'dash'
      ? '#0ea5e9'
      : '#1e2b3c';
  ctx.beginPath();
  ctx.moveTo(-14, 14);
  ctx.lineTo(14, 14);
  ctx.lineTo(24 + wave, 52);
  ctx.lineTo(8 + wave * 0.4, 46);
  ctx.lineTo(0 + wave * 0.3, 54);
  ctx.lineTo(-10 + wave * 0.4, 46);
  ctx.lineTo(-26 + wave, 52);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle =
    st === 'hurt'
      ? '#fecaca'
      : flash
      ? '#ffffff'
      : p.dashing || st === 'dash'
      ? '#38bdf8'
      : st === 'specialAttack'
      ? '#3b82f6'
      : '#2c3e55';
  ctx.strokeStyle = flash ? '#ffffff' : '#090c12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-15, 12);
  ctx.quadraticCurveTo(0, 18, 15, 12);
  ctx.lineTo(22 + wave, 46);
  ctx.lineTo(12 + wave * 0.35, 40);
  ctx.lineTo(2 + wave * 0.25, 48);
  ctx.lineTo(-8 + wave * 0.35, 40);
  ctx.lineTo(-22 + wave, 46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Glowing Cyan Needle Sword
  if (!p.wallSliding && st !== 'wallSlide' && st !== 'death') {
    ctx.save();
    if (st === 'attack' || st === 'specialAttack') {
      ctx.translate(10, 26);
      ctx.rotate(Math.PI - 0.85 + pose.progress * 1.65);
    } else if (st === 'dash' || p.dashing) {
      ctx.translate(6, 28);
      ctx.rotate(Math.PI);
    } else {
      ctx.translate(-8, 30);
      ctx.rotate(-Math.PI / 6 + Math.sin(frameTime * 0.08) * 0.04);
    }

    // Sword handle & crossguard
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, -3, 12, 6);
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(-2, -8, 4, 16);

    // Glowing cyan blade & aura
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#a3f7ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.lineTo(-65, 0);
    ctx.lineTo(-2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner bright core edge
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-55, 0);
    ctx.stroke();
    ctx.restore();
  }

  // 4. White Mask & Curved Horns
  ctx.fillStyle = st === 'hurt' ? '#fee2e2' : flash ? '#ffffff' : '#f4f6f8';
  ctx.strokeStyle = flash && st !== 'hurt' ? '#ffffff' : '#090c12';
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  // Left curved horn
  ctx.moveTo(-16, -12);
  ctx.bezierCurveTo(-26, -30, -24, -48, -10, -56);
  ctx.bezierCurveTo(-15, -42, -14, -28, -8, -22);

  // Top of head
  ctx.quadraticCurveTo(0, -24, 8, -22);

  // Right curved horn
  ctx.bezierCurveTo(14, -28, 15, -42, 10, -56);
  ctx.bezierCurveTo(24, -48, 26, -30, 16, -12);

  // Rounded lower face
  ctx.bezierCurveTo(22, 6, 14, 18, 0, 18);
  ctx.bezierCurveTo(-14, 18, -22, 6, -16, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. Hollow Knight Style Deep Black Eyes
  if (!flash || st === 'hurt') {
    ctx.fillStyle = st === 'hurt' ? '#ef4444' : st === 'specialAttack' ? '#0891b2' : '#090c12';
    const eyeScaleY = st === 'healing' || st === 'hurt' ? 0.55 : 1;
    ctx.beginPath();
    ctx.ellipse(-6, -1, 4.5, 7.5 * eyeScaleY, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(9, -1, 4, 7 * eyeScaleY, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

function drawAoeRing(ctx: CanvasRenderingContext2D, ring: AoeRingEffect): void {
  const progress = 1 - Math.max(0, ring.life / ring.maxLife);
  const alpha = Math.max(0, 1 - progress * 0.9);

  ctx.save();
  ctx.translate(ring.x, ring.y);
  ctx.globalAlpha = alpha;

  const grad = ctx.createRadialGradient(0, 0, ring.radius * 0.25, 0, 0, ring.radius);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.68, ring.isUltimate ? 'rgba(253, 224, 71, 0.24)' : 'rgba(56, 189, 248, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
  ctx.fill();

  // Primary expanding shock ring
  ctx.strokeStyle = ring.color;
  ctx.lineWidth = (ring.isUltimate ? 7 : 4.5) * (1 - progress * 0.65);
  ctx.beginPath();
  ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner sharp white ring + radial burst rays
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, ring.radius * 0.82, progress * 2.5, progress * 2.5 + Math.PI * 1.45);
  ctx.stroke();

  const rayCount = ring.isUltimate ? 12 : 8;
  for (let i = 0; i < rayCount; i++) {
    const ang = (i / rayCount) * Math.PI * 2 + progress * 0.8;
    const innerR = ring.radius * 0.65;
    const outerR = ring.radius * 1.06;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * innerR, Math.sin(ang) * innerR);
    ctx.lineTo(Math.cos(ang) * outerR, Math.sin(ang) * outerR);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSpecialWave(ctx: CanvasRenderingContext2D, wave: SpecialWave, time: number): void {
  const alpha = Math.max(0, Math.min(1, (wave.life / wave.maxLife) * 1.35));
  ctx.save();
  ctx.translate(wave.x, wave.y);
  ctx.scale(wave.facing, 1);
  ctx.globalAlpha = alpha;

  if (wave.isUltimate) {
    // Level 10 Ultimate Screen-Wiping Radiant Slash Wave
    const h = wave.halfH;
    const rad = ctx.createRadialGradient(0, 0, 12, 0, 0, h * 1.25);
    rad.addColorStop(0, 'rgba(254, 240, 138, 0.72)');
    rad.addColorStop(0.5, 'rgba(103, 232, 249, 0.34)');
    rad.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(0, 0, h * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Giant tapered crescent blade
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-26, 0, h, -1.15, 1.15);
    ctx.arc(-48, 0, h * 0.92, 1.1, -1.1, true);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-18, 0, h * 0.96, -1.05, 1.05);
    ctx.stroke();

    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-34, 0, h * 0.78, -0.95, 0.95);
    ctx.stroke();

    // Speed trail streaks behind wave
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      const sy = i * (h * 0.24) + Math.sin(time * 24 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(-18, sy);
      ctx.lineTo(-76 - Math.abs(i) * 10, sy);
      ctx.stroke();
    }
  } else {
    // Level 6+ Soul Energy Crescent Projectile
    const rad = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    rad.addColorStop(0, 'rgba(167, 243, 208, 0.7)');
    rad.addColorStop(0.55, 'rgba(103, 232, 249, 0.32)');
    rad.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ecfeff';
    ctx.beginPath();
    ctx.arc(-6, 0, 30, -1.05, 1.05);
    ctx.arc(-18, 0, 26, 0.98, -0.98, true);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-12, 0, 23, -0.92, 0.92);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerNeedle(ctx: CanvasRenderingContext2D, n: PlayerNeedle): void {
  const alpha = Math.max(0.25, Math.min(1, n.life / n.maxLife * 1.4));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(n.x, n.y);
  ctx.rotate(Math.atan2(n.vy, n.vx));

  // Glow trail
  ctx.strokeStyle = n.color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(14, 0);
  ctx.stroke();

  // Sharp cyan needle spearhead
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCombatTrap(ctx: CanvasRenderingContext2D, trap: CombatTrap, time: number): void {
  const alpha = trap.life < 0.5 ? Math.max(0.2, trap.life * 2) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(trap.x, trap.y);

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, trap.radius * 1.8);
  glow.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, trap.radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(trap.spin);
  const teeth = trap.kind === 'cog' ? 8 : 6;
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = trap.color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? trap.radius : trap.radius * 0.68;
    const ang = (i / (teeth * 2)) * Math.PI * 2;
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = Math.sin(time * 16) > 0 ? '#fef08a' : '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSlashArc(ctx: CanvasRenderingContext2D, slash: SlashArc): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.timer / Math.max(0.001, slash.duration)));
  const frame = slash.frame;

  // Color palette driven by active Silksong Style & Attack Kind
  let outerColor = slash.styleColor || '#7ae7ff';
  let coreColor = '#ffffff';
  let glowColor = 'rgba(122, 231, 255, 0.34)';

  if (slash.styleId === 'reaper') {
    outerColor = '#a78bfa';
    coreColor = '#f5f3ff';
    glowColor = 'rgba(167, 139, 250, 0.42)';
  } else if (slash.styleId === 'wanderer') {
    outerColor = '#bef264';
    coreColor = '#f7fee7';
    glowColor = 'rgba(190, 242, 100, 0.36)';
  } else if (slash.styleId === 'beast') {
    outerColor = '#fb7185';
    coreColor = '#fff1f2';
    glowColor = 'rgba(251, 113, 133, 0.44)';
  } else if (slash.styleId === 'witch') {
    outerColor = '#34d399';
    coreColor = '#ecfdf5';
    glowColor = 'rgba(52, 211, 153, 0.4)';
  } else if (slash.styleId === 'architect') {
    outerColor = '#fbbf24';
    coreColor = '#fef3c7';
    glowColor = 'rgba(251, 191, 36, 0.42)';
  } else if (slash.styleId === 'shaman') {
    outerColor = '#f472b6';
    coreColor = '#fef08a';
    glowColor = 'rgba(244, 114, 182, 0.44)';
  } else if (slash.kind === 'basicHorizontal') {
    outerColor = '#67e8f9';
    coreColor = '#ffffff';
  }

  if (slash.kind === 'comboFinisher') {
    outerColor = '#f59e0b';
    coreColor = '#fef9c3';
    glowColor = 'rgba(251, 191, 36, 0.48)';
  }

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Full 360-degree Cyclone Flurry (Wanderer Hold) or Silk Thread Web (Witch Hold)
  if (slash.isHoldAttack && (slash.styleId === 'wanderer' || slash.styleId === 'witch')) {
    const r = slash.radius;
    ctx.globalAlpha = Math.max(0.2, 1 - progress * 0.75);
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = slash.styleId === 'witch' ? 5 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.78 + progress * 0.25), progress * Math.PI * 3, progress * Math.PI * 3 + Math.PI * 1.65);
    ctx.stroke();

    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, -progress * Math.PI * 3, -progress * Math.PI * 3 + Math.PI * 1.45);
    ctx.stroke();

    if (slash.styleId === 'witch') {
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.65)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + progress * 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  let rot = 0;
  if (slash.dir === 'left') rot = Math.PI;
  else if (slash.dir === 'up') rot = -Math.PI * 0.5;
  else if (slash.dir === 'down') rot = Math.PI * 0.5;

  ctx.rotate(rot);

  // Flip sweep direction on combo hit 2 for crisp visual cross-slash cadence
  if (slash.kind === 'comboHit2') {
    ctx.scale(1, -1);
  }

  const r = slash.radius;

  // Frame 0: Razor-sharp leading wind-up arc
  // Frame 1: Full-bloom glowing crescent arc with tapered blade silhouette
  // Frame 2: Dissipating after-arc with fading alpha & trailing slash lines
  const alpha = frame === 0 ? 0.96 : frame === 1 ? 1.0 : Math.max(0.15, 1 - (progress - 0.68) * 2.9);
  ctx.globalAlpha = alpha;

  // Subtle crescent aura bloom on Frame 1
  if (frame === 1) {
    const aura = ctx.createRadialGradient(8, 0, r * 0.35, 8, 0, r * 1.35);
    aura.addColorStop(0, 'rgba(0, 0, 0, 0)');
    aura.addColorStop(0.65, glowColor);
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(8, 0, r * 1.35, -1.25, 1.25);
    ctx.fill();
  }

  // Tapered Crescent Fill (built with two offset ctx.arc curves)
  const startAngle = frame === 0 ? -1.15 : frame === 1 ? -1.08 : -0.92;
  const endAngle = frame === 0 ? 0.45 : frame === 1 ? 1.08 : 1.05;
  const crescentRadius = frame === 0 ? r * 0.92 : frame === 1 ? r * 1.06 : r * 1.1;
  const innerOffset = frame === 0 ? -4 : frame === 1 ? -10 : -4;
  const innerRadius = frame === 0 ? r * 0.78 : frame === 1 ? r * 0.78 : r * 0.96;

  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(8, 0, crescentRadius, startAngle, endAngle);
  ctx.arc(8 + innerOffset, 0, innerRadius, endAngle, startAngle, true);
  ctx.closePath();
  ctx.fill();

  // Outer luminous edge arc
  ctx.strokeStyle = outerColor;
  ctx.lineWidth = frame === 1 ? 4.5 : frame === 0 ? 3.2 : 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(10, 0, crescentRadius + 2, startAngle * 0.94, endAngle * 0.96);
  ctx.stroke();

  // Secondary inner speed arc & distinct 7-style combo VFX
  if (slash.isHoldAttack) {
    if (slash.styleId === 'beast') {
      // Triple Jagged Crimson Claw Slash Marks
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.2;
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(-6, c * 16 - 10);
        ctx.lineTo(r * 0.95, c * 16 + 12);
        ctx.stroke();
      }
    } else if (slash.styleId === 'architect') {
      // Rotating Corkscrew Drill Spiral
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(r * 0.92, 0);
      ctx.lineTo(0, 14);
      ctx.stroke();
    } else if (slash.styleId === 'reaper') {
      // Heavy Double Scythe Crescent
      ctx.strokeStyle = '#ede9fe';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(-6, 0, r * 0.72, startAngle * 1.05, endAngle * 1.05);
      ctx.stroke();
    } else if (slash.styleId === 'hunter') {
      // Piercing Lance Thrust Streaks
      ctx.strokeStyle = '#ecfeff';
      ctx.lineWidth = 2.8;
      for (const yOff of [-12, 0, 12]) {
        ctx.beginPath();
        ctx.moveTo(4, yOff);
        ctx.lineTo(r * 1.15, yOff);
        ctx.stroke();
      }
    } else if (slash.styleId === 'shaman') {
      // Arcane Golden Rune Halo Arc
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(4, 0, r * 0.75, startAngle * 0.9, endAngle * 0.9);
      ctx.stroke();
    }
  } else if (
    slash.kind === 'dashSlash' ||
    slash.kind === 'shadowDashAttack' ||
    slash.kind === 'comboFinisher'
  ) {
    ctx.strokeStyle = slash.kind === 'comboFinisher' ? '#ffffff' : outerColor;
    ctx.lineWidth = frame === 1 ? 3 : 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, startAngle * 0.85, endAngle * 0.85);
    ctx.stroke();
  }

  // Combo Finisher extra cross-crescent on Frame 1-2
  if (slash.kind === 'comboFinisher' && frame >= 1) {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(14, 0, r * 1.18, -0.82, 0.82);
    ctx.stroke();
  }

  // Frame 2: crisp outward speed-streak shards at arc tips
  if (frame === 2) {
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 1.8;
    for (const tipAng of [-0.75, 0, 0.75]) {
      const sx = 8 + Math.cos(tipAng) * (r * 0.98);
      const sy = Math.sin(tipAng) * (r * 0.98);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(tipAng) * 14, sy + Math.sin(tipAng) * 14);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const pt of particles) {
    if (!pt.active) continue;
    const alpha = Math.max(0, pt.life / pt.maxLife);
    const radius = Math.max(0.6, pt.size * (0.25 + 0.75 * alpha));
    if (pt.glow) {
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.glow && alpha > 0.65 ? '#ffffff' : pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDynamicLights(
  ctx: CanvasRenderingContext2D,
  lights: GlowLight[],
  player: PlayerRenderState,
  cx: number,
  cy: number,
  viewW: number,
  viewH: number,
  time: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const pcx = player.x + player.w * 0.5;
  const pcy = player.y + player.h * 0.4;
  const playerGrad = ctx.createRadialGradient(pcx, pcy, 8, pcx, pcy, 155);
  playerGrad.addColorStop(0, 'rgba(180, 235, 255, 0.16)');
  playerGrad.addColorStop(1, 'rgba(122, 231, 255, 0)');
  ctx.fillStyle = playerGrad;
  ctx.beginPath();
  ctx.arc(pcx, pcy, 155, 0, Math.PI * 2);
  ctx.fill();

  for (const l of lights) {
    const drift = l.driftRadius ?? 0;
    const lx = l.x + (l.isFirefly ? Math.sin(time * 1.1 + l.phase) * drift : 0);
    const ly = l.y + (l.isFirefly ? Math.cos(time * 1.45 + l.phase * 1.3) * drift * 0.65 : 0);

    if (lx + l.radius < cx || lx - l.radius > cx + viewW || ly + l.radius < cy || ly - l.radius > cy + viewH) {
      continue;
    }

    const pulse = 0.85 + Math.sin(time * (l.isFirefly ? 4.2 : 1.9) + l.phase) * 0.15;
    const r = l.radius * pulse;
    const grad = ctx.createRadialGradient(lx, ly, 2, lx, ly, r);

    if (l.color === 'amber') {
      grad.addColorStop(0, 'rgba(253, 224, 71, 0.34)');
      grad.addColorStop(0.45, 'rgba(245, 158, 11, 0.12)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    } else {
      grad.addColorStop(0, 'rgba(122, 231, 255, 0.24)');
      grad.addColorStop(0.5, 'rgba(0, 210, 255, 0.08)');
      grad.addColorStop(1, 'rgba(0, 210, 255, 0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();

    if (l.isFirefly) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(lx, ly, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawFloatingMotes(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  cx: number,
  cy: number,
  world: WorldData,
  time: number,
  theme: SceneTheme
): void {
  const color =
    theme === 'crystal'
      ? 'rgba(195, 240, 255,'
      : theme === 'swamp'
      ? 'rgba(145, 245, 255,'
      : 'rgba(217, 249, 157,';
  for (const m of world.motes) {
    const rawX = m.x + Math.sin(time * 0.7 + m.phase) * m.driftX - cx * m.depth;
    const rawY = m.y - ((time * m.speedY) % 400) - cy * m.depth;
    const sx = ((rawX % viewW) + viewW) % viewW;
    const sy = ((rawY % viewH) + viewH) % viewH;
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2.2 + m.phase));

    ctx.fillStyle = `${color} ${0.46 * pulse})`;
    ctx.beginPath();
    ctx.arc(sx, sy, m.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBouncePad(
  ctx: CanvasRenderingContext2D,
  pad: BouncePad,
  time: number
): void {
  const pulse = 0.75 + Math.sin(time * 4.2 + pad.x * 0.02) * 0.25;
  const springPhase = pad.bounceTimer > 0 ? Math.sin((pad.bounceTimer / 0.25) * Math.PI) : 0;
  const squashY = 1 - springPhase * 0.38;
  const cx = pad.x + pad.w * 0.5;
  const baseBottom = pad.y + pad.h;

  ctx.save();
  ctx.translate(cx, baseBottom);
  ctx.scale(1 + springPhase * 0.16, squashY);

  // Soft bioluminescent aura
  const aura = ctx.createRadialGradient(0, -pad.h * 0.8, 4, 0, -pad.h * 0.8, pad.w * 0.8);
  aura.addColorStop(0, `rgba(190, 242, 100, ${0.32 * pulse})`);
  aura.addColorStop(1, 'rgba(74, 222, 128, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -pad.h * 0.8, pad.w * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Cushion dome
  const hw = pad.w * 0.5;
  const grad = ctx.createLinearGradient(0, -pad.h * 1.4, 0, 0);
  grad.addColorStop(0, '#bef264');
  grad.addColorStop(0.45, '#4ade80');
  grad.addColorStop(1, '#166534');

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#07140e';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.quadraticCurveTo(-hw, -pad.h * 1.55, 0, -pad.h * 1.55);
  ctx.quadraticCurveTo(hw, -pad.h * 1.55, hw, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Upward chevron spring cue
  ctx.strokeStyle = 'rgba(236, 253, 245, 0.85)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const arrowY = -pad.h * 0.9 - Math.sin(time * 5) * 3;
  ctx.beginPath();
  ctx.moveTo(-8, arrowY + 4);
  ctx.lineTo(0, arrowY - 4);
  ctx.lineTo(8, arrowY + 4);
  ctx.stroke();

  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
  const rad = ctx.createRadialGradient(
    viewW * 0.5,
    viewH * 0.5,
    Math.min(viewW, viewH) * 0.36,
    viewW * 0.5,
    viewH * 0.5,
    Math.max(viewW, viewH) * 0.8
  );
  rad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  rad.addColorStop(1, 'rgba(2, 6, 10, 0.58)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, viewW, viewH);
}

function drawBiomePortal(
  ctx: CanvasRenderingContext2D,
  portal: BiomePortal,
  time: number
): void {
  const palette =
    portal.targetTheme === 'crystal'
      ? { glow: 'rgba(103, 232, 249,', stroke: '#67e8f9', core: '#cffafe' }
      : portal.targetTheme === 'swamp'
        ? { glow: 'rgba(192, 132, 252,', stroke: '#c084fc', core: '#f3e8ff' }
        : { glow: 'rgba(110, 231, 183,', stroke: '#6ee7b7', core: '#ecfdf5' };

  const pcx = portal.x + portal.w * 0.5;
  const pcy = portal.y + portal.h * 0.5;
  const pulse = 0.72 + Math.sin(time * 3.1 + portal.x * 0.01) * 0.28;

  ctx.save();

  // Outer aura
  const aura = ctx.createRadialGradient(pcx, pcy, 8, pcx, pcy, portal.h * 0.8);
  aura.addColorStop(0, `${palette.glow} ${0.42 * pulse})`);
  aura.addColorStop(0.55, `${palette.glow} ${0.14 * pulse})`);
  aura.addColorStop(1, `${palette.glow} 0)`);
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(pcx, pcy, portal.h * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Carved archway frame
  const archX = portal.x + 6;
  const archW = portal.w - 12;
  const archBottom = portal.y + portal.h;
  const archTop = portal.y + 10;

  ctx.fillStyle = 'rgba(4, 11, 14, 0.85)';
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(archX, archBottom);
  ctx.lineTo(archX, archTop + archW * 0.45);
  ctx.quadraticCurveTo(pcx, archTop - 10, archX + archW, archTop + archW * 0.45);
  ctx.lineTo(archX + archW, archBottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shimmering doorway veil
  const veil = ctx.createLinearGradient(0, archTop, 0, archBottom);
  veil.addColorStop(0, `${palette.glow} ${0.5 * pulse})`);
  veil.addColorStop(1, `${palette.glow} ${0.15 * pulse})`);
  ctx.fillStyle = veil;
  ctx.fill();

  // Rising motes inside portal
  for (let i = 0; i < 4; i++) {
    const phase = (time * 0.65 + i * 0.25) % 1;
    const mx = pcx + Math.sin(time * 2.4 + i * 1.9) * (archW * 0.28);
    const my = archBottom - 10 - phase * (portal.h - 30);
    ctx.fillStyle = palette.core;
    ctx.globalAlpha = (1 - phase) * 0.85;
    ctx.beginPath();
    ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating destination banner above archway
  const label = portal.shortLabel;
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  const tw = ctx.measureText(label).width;
  const boxW = tw + 18;
  const boxH = 22;
  const boxX = pcx - boxW * 0.5;
  const boxY = portal.y - 28 + Math.sin(time * 2.3) * 2.5;

  ctx.fillStyle = 'rgba(5, 16, 19, 0.9)';
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.core;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pcx, boxY + boxH * 0.5 + 0.5);

  ctx.restore();
}
