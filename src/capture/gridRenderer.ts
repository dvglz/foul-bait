import { formatTime } from '../share/share';

export type GridTile = {
  id: string;
  label: string;
  targetSrc: string;
  playerSrc: string | null;
  missed: boolean;
};

export type GridInput = {
  tiles: GridTile[];
  timeMs: number;
  cleanCount: number;
  totalCount: number;
};

export async function renderGrid(input: GridInput): Promise<Blob> {
  const { tiles, timeMs, cleanCount, totalCount } = input;
  const cols = 2;
  const rows = Math.ceil(tiles.length / cols);
  const W = 1080;
  const cellGap = 16;
  const headerH = 200;
  const footerH = 90;
  const cellW = (W - cellGap * (cols + 1)) / cols;
  const cellH = cellW; // each tile is square; target on top half, player on bottom
  const gridH = headerH + rows * (cellH + cellGap) + cellGap + footerH;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, gridH);
  bg.addColorStop(0, '#15151a');
  bg.addColorStop(1, '#0a0a0c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, gridH);

  // header
  ctx.fillStyle = '#ff6b35';
  ctx.font = '700 64px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FOUL BAIT', W / 2, 80);
  ctx.fillStyle = '#f5f5f7';
  ctx.font = '700 96px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(formatTime(timeMs), W / 2, 170);
  ctx.fillStyle = '#a0a0aa';
  ctx.font = '500 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${cleanCount}/${totalCount} clean`, W / 2, 200 - 8);

  // tiles
  const imgs = await Promise.all(
    tiles.flatMap((t) => [
      loadImage(t.targetSrc),
      t.playerSrc ? loadImage(t.playerSrc) : Promise.resolve(null),
    ]),
  );
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = cellGap + col * (cellW + cellGap);
    const y = headerH + cellGap + row * (cellH + cellGap);
    drawTile(
      ctx,
      x,
      y,
      cellW,
      cellH,
      imgs[i * 2] as HTMLImageElement,
      imgs[i * 2 + 1] as HTMLImageElement | null,
      t.missed,
    );
  }

  // footer
  ctx.fillStyle = '#8a8a95';
  ctx.font = '500 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('foul-bait.com', W / 2, gridH - 30);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      'image/png',
    ),
  );
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  target: HTMLImageElement,
  player: HTMLImageElement | null,
  missed: boolean,
) {
  const halfH = h / 2;
  const r = 16;
  // clip rounded
  ctx.save();
  roundedPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(x, y, w, h);
  drawCover(ctx, target, x, y, w, halfH);
  if (player) {
    ctx.save();
    ctx.translate(x + w, y + halfH);
    ctx.scale(-1, 1);
    drawCover(ctx, player, 0, 0, w, halfH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(x, y + halfH, w, halfH);
  }
  if (missed) {
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + halfH + 24);
    ctx.lineTo(x + w - 24, y + h - 24);
    ctx.moveTo(x + w - 24, y + halfH + 24);
    ctx.lineTo(x + 24, y + h - 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const ar = img.width / img.height;
  const dar = dw / dh;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (ar > dar) {
    sw = img.height * dar;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dar;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function roundedPath(
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}
