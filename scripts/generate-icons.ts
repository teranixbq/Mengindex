import zlib from 'zlib';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function pointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * Pure-Node RGBA PNG generator (RFC 2083) producing geometric Mengindex cat icons
 * (16x16, 48x48, 128x128) with zero native image dependencies.
 */
export function generateMengindexCatPng(size: number): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1));

  const bg = [11, 15, 23, 255];
  const border = [30, 41, 59, 255];
  const catFill = [56, 189, 248, 255];
  const catInnerEar = [14, 116, 144, 255];
  const eyeColor = [11, 15, 23, 255];
  const noseColor = [248, 250, 252, 255];
  const radius = size * 0.22;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;

    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      const dist = Math.hypot(dx, dy);

      if (dist > radius) {
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
        continue;
      }

      let color = dist > radius - Math.max(1, size * 0.045) ? border : bg;
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;

      const hx = (u - 0.5) / 0.32;
      const hy = (v - 0.59) / 0.25;
      const inHead = hx * hx + hy * hy <= 1.0;

      const inLeftEar = pointInTriangle(u, v, 0.21, 0.52, 0.24, 0.18, 0.45, 0.4);
      const inRightEar = pointInTriangle(u, v, 0.79, 0.52, 0.76, 0.18, 0.55, 0.4);
      const inLeftInner = pointInTriangle(u, v, 0.26, 0.46, 0.275, 0.27, 0.39, 0.39);
      const inRightInner = pointInTriangle(u, v, 0.74, 0.46, 0.725, 0.27, 0.61, 0.39);

      if (inHead || inLeftEar || inRightEar) {
        color = (inLeftInner || inRightInner) && !inHead ? catInnerEar : catFill;
      }

      const leX = (u - 0.385) / 0.052;
      const leY = (v - 0.57) / 0.072;
      const reX = (u - 0.615) / 0.052;
      const reY = (v - 0.57) / 0.072;
      if (leX * leX + leY * leY <= 1.0 || reX * reX + reY * reY <= 1.0) {
        color = eyeColor;
      }

      if (pointInTriangle(u, v, 0.465, 0.665, 0.535, 0.665, 0.5, 0.715)) {
        color = noseColor;
      }

      raw[px] = color[0];
      raw[px + 1] = color[1];
      raw[px + 2] = color[2];
      raw[px + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
