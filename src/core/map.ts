// Bản đồ chuẩn Ticket-02 (Phần 2). Góc đo từ +X, ngược chiều kim đồng hồ nhìn từ trên: (r·cosθ, y, r·sinθ).
import type { Vec3 } from './types.ts';

export type Floor =
  | { kind: 'disc'; cx: number; cz: number; r: number; h: number }
  | { kind: 'halfAnnulus'; rMin: number; rMax: number; h: number } // z > 0
  | { kind: 'rect'; x0: number; x1: number; z0: number; z1: number; h: number }
  | { kind: 'ramp'; deg: number; width: number; rLow: number; rHigh: number; hLow: number; hHigh: number };

export interface Pad { x: number; y: number; z: number; r: number; vy: number; vh: number; tx: number; tz: number }

export interface NightMap {
  night: number;
  name: string;
  floors: Floor[];
  start: Vec3;
  lanterns: Vec3[];
  moteSpawns: Vec3[];
  shadeSpawns: Vec3[];
  shadeInterval: number; // tick
  shadeMax: number;
  shadeSpeed: number | null; // null = tuning.shade_speed
  pads: Pad[];
  charms: Vec3[];
  drifters: boolean;
  wind: boolean;
  tower: { r: number } | null;
}

const D = Math.PI / 180;
/** Sai số hình học: điểm nằm đúng trên biên tính là thuộc ô sàn (tránh lỗi cộng dồn 0.1). */
const GEPS = 1e-9;
const ring = (n: number, r: number, startDeg: number, stepDeg: number, y = 0, cx = 0, cz = 0): Vec3[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (startDeg + i * stepDeg) * D;
    return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)] as Vec3;
  });

const night1: NightMap = {
  night: 1, name: 'Đảo Bến',
  floors: [{ kind: 'disc', cx: 0, cz: 0, r: 40, h: 0 }],
  start: [0, 0, 0],
  lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
  moteSpawns: [...ring(8, 12, 0, 45), ...ring(16, 33, 0, 22.5)],
  shadeSpawns: ring(12, 37, 15, 30),
  shadeInterval: 480, shadeMax: 6, shadeSpeed: null,
  pads: [], charms: [], drifters: false, wind: false, tower: null,
};

const night2: NightMap = {
  night: 2, name: 'Đảo Cau',
  floors: [
    { kind: 'disc', cx: 0, cz: 0, r: 28, h: 0 },
    { kind: 'disc', cx: 70, cz: 0, r: 28, h: 0 },
    { kind: 'rect', x0: 26, x1: 44, z0: -2, z1: 2, h: 0 },
  ],
  start: [0, 0, 0],
  lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
  moteSpawns: [...ring(4, 10, 0, 90), ...ring(8, 22, 0, 45), ...ring(4, 10, 0, 90, 0, 70), ...ring(8, 22, 0, 45, 0, 70)],
  shadeSpawns: [...ring(8, 26, 22.5, 45), ...ring(8, 26, 22.5, 45, 0, 70)],
  shadeInterval: 420, shadeMax: 8, shadeSpeed: null,
  pads: [
    { x: 20, y: 0, z: 18, r: 1, vy: 14, vh: 24, tx: 70, tz: 0 },
    { x: 50, y: 0, z: -18, r: 1, vy: 14, vh: 24, tx: 0, tz: 0 },
  ],
  charms: [[35, 0, 0]], drifters: true, wind: false, tower: null,
};

const night3: NightMap = {
  night: 3, name: 'Đảo Chuông',
  floors: [
    { kind: 'disc', cx: 0, cz: 0, r: 45, h: 0 },
    { kind: 'halfAnnulus', rMin: 12, rMax: 24, h: 3 },
    { kind: 'disc', cx: 0, cz: 0, r: 8, h: 6 },
    { kind: 'disc', cx: 0, cz: 0, r: 2, h: 14 }, // tháp chuông (cao 8 m trên tầng 2) — khối đặc, không leo được
    { kind: 'ramp', deg: 30, width: 3, rLow: 30, rHigh: 24, hLow: 0, hHigh: 3 },
    { kind: 'ramp', deg: 150, width: 3, rLow: 30, rHigh: 24, hLow: 0, hHigh: 3 },
  ],
  start: [0, 0, -30], // tâm đảo là tháp chuông nên không thể xuất phát ở (0,0,0) — giả định §2.23
  lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
  moteSpawns: [...ring(18, 34, 0, 20), ...ring(8, 18, 20, 20, 3), ...ring(4, 5, 45, 90, 6)],
  shadeSpawns: ring(16, 43, 0, 22.5),
  shadeInterval: 360, shadeMax: 10, shadeSpeed: 4.5,
  pads: [{ x: 0, y: 3, z: 13, r: 1, vy: 12, vh: 8, tx: 0, tz: -1e9 }],
  charms: [[30, 0, 25], [-30, 0, 25]], drifters: true, wind: true, tower: { r: 2 },
};

export function getMap(night: number): NightMap {
  const m = [night1, night2, night3][night - 1];
  if (!m) throw new Error(`night ${night} không tồn tại`);
  return m;
}

/** Độ cao mặt sàn của một ô sàn tại (x,z), hoặc null nếu điểm không thuộc ô đó. */
function floorHeight(f: Floor, x: number, z: number): number | null {
  switch (f.kind) {
    case 'disc': return Math.hypot(x - f.cx, z - f.cz) <= f.r + GEPS ? f.h : null;
    case 'halfAnnulus': { const r = Math.hypot(x, z); return z > 0 && r >= f.rMin - GEPS && r <= f.rMax + GEPS ? f.h : null; }
    case 'rect': return x >= f.x0 - GEPS && x <= f.x1 + GEPS && z >= f.z0 - GEPS && z <= f.z1 + GEPS ? f.h : null;
    case 'ramp': {
      const ux = Math.cos(f.deg * D), uz = Math.sin(f.deg * D);
      const s = x * ux + z * uz, lat = Math.abs(-x * uz + z * ux);
      const lo = Math.min(f.rLow, f.rHigh), hi = Math.max(f.rLow, f.rHigh);
      if (lat > f.width / 2 + GEPS || s < lo - GEPS || s > hi + GEPS) return null;
      return f.hLow + ((f.rLow - s) / (f.rLow - f.rHigh)) * (f.hHigh - f.hLow);
    }
  }
}

/** Mặt sàn cao nhất tại (x,z); -Infinity nếu là biển mây. */
export function groundTop(m: NightMap, x: number, z: number): number {
  let best = -Infinity;
  for (const f of m.floors) { const h = floorHeight(f, x, z); if (h !== null && h > best) best = h; }
  return best;
}
