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

// 9:16 share card matching Figma node 69:1169
const W = 1080;
const H = 1920;
const BG = '#141414';
const ORANGE = '#f4900c';
const WHITE = '#ffffff';
const EMPTY_BG = 'rgba(255,255,255,0.06)';
const FONT_EXPANDED = "'Special Gothic Expanded One', 'Special Gothic', system-ui, sans-serif";
const FONT_GOTHIC = "'Special Gothic', system-ui, sans-serif";

// Grid metrics (scaled directly from Figma 1080-wide frame)
const TILE = 220;
const PAIR_GAP = 13; // gap between caricature and player within a pair
const COL_GAP = 21; // gap between pair-columns
const ROW_GAP = 21; // gap between rows
const TILE_RADIUS = 51;

export async function renderGrid(input: GridInput): Promise<Blob> {
  const { tiles, timeMs, cleanCount, totalCount } = input;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  // background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Header: "CAN YOU SELL IT / LIKE AN MVP?"
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `400 41px ${FONT_EXPANDED}`;
  ctx.fillText('CAN YOU SELL IT', W / 2, 92);
  ctx.fillText('LIKE AN MVP?', W / 2, 92 + 48);

  // "Run completed in X:XX.XXX" (orange)
  ctx.fillStyle = ORANGE;
  ctx.font = `600 46px ${FONT_GOTHIC}`;
  ctx.fillText(`Run completed in ${formatTime(timeMs)}`, W / 2, 307);

  // "Cleared X/Y!" (white, expanded)
  ctx.fillStyle = WHITE;
  ctx.font = `400 82px ${FONT_EXPANDED}`;
  ctx.fillText(`Cleared ${cleanCount}/${totalCount}!`, W / 2, 386);

  // Grid: pairs in 2 columns × N rows. Each pair = caricature + player.
  const pairW = TILE * 2 + PAIR_GAP;
  const gridW = pairW * 2 + COL_GAP;
  const gridX = (W - gridW) / 2;
  const gridY = 550;

  const imgs = await Promise.all(
    tiles.flatMap((t) => [
      loadImage(t.targetSrc),
      t.playerSrc ? loadImage(t.playerSrc) : Promise.resolve(null),
    ]),
  );

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const pairCol = i % 2;
    const row = Math.floor(i / 2);
    const pairX = gridX + pairCol * (pairW + COL_GAP);
    const pairY = gridY + row * (TILE + ROW_GAP);

    drawTile(
      ctx,
      pairX,
      pairY,
      TILE,
      imgs[i * 2] as HTMLImageElement,
      false,
      false,
    );
    drawTile(
      ctx,
      pairX + TILE + PAIR_GAP,
      pairY,
      TILE,
      imgs[i * 2 + 1] as HTMLImageElement | null,
      true,
      t.missed,
    );
  }

  // Footer tagline
  ctx.fillStyle = WHITE;
  ctx.font = `500 39px ${FONT_GOTHIC}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tagline1 = "The whistle won't blow itself. Earn it";
  const tagline2 = `${totalCount} times. Certified MVP face by the end.`;
  const lineH = 51;
  ctx.fillText(tagline1, W / 2, 1701);
  ctx.fillText(tagline2, W / 2, 1701 + lineH);

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
  size: number,
  img: HTMLImageElement | null,
  mirror: boolean,
  missed: boolean,
) {
  ctx.save();
  roundedPath(ctx, x, y, size, size, TILE_RADIUS);
  ctx.clip();

  ctx.fillStyle = EMPTY_BG;
  ctx.fillRect(x, y, size, size);

  if (img) {
    if (mirror) {
      ctx.save();
      ctx.translate(x + size, y);
      ctx.scale(-1, 1);
      drawCover(ctx, img, 0, 0, size, size);
      ctx.restore();
    } else {
      drawCover(ctx, img, x, y, size, size);
    }
  }

  if (missed) {
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 14;
    const pad = 48;
    ctx.beginPath();
    ctx.moveTo(x + pad, y + pad);
    ctx.lineTo(x + size - pad, y + size - pad);
    ctx.moveTo(x + size - pad, y + pad);
    ctx.lineTo(x + pad, y + size - pad);
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
