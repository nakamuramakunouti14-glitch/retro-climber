// ホーム画面用のアイコン（PNG）を作る。ムスビを草の上に置いた絵。
// 使い方: node tools/make-icons.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { CHARACTERS } from "../src/characters.js";
import { mapSize } from "../src/pixel.js";

const OUT = new URL("../public/", import.meta.url);
const GRID = 24; // アイコンの元の大きさ（ドット）

function hex(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

function makeGrid() {
  const g = Array.from({ length: GRID }, () => Array(GRID).fill(hex("#78b8f0")));
  for (let y = 19; y < GRID; y++) for (let x = 0; x < GRID; x++) g[y][x] = hex(y < 21 ? "#48b040" : "#b8743c");
  const c = CHARACTERS[0];
  const { w, h } = mapSize(c.map);
  const ox = Math.floor((GRID - w) / 2);
  const oy = 19 - h;
  c.map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== "." && c.pal[ch]) g[oy + y][ox + x] = hex(c.pal[ch]);
  }));
  // 雲
  [[2, 3], [3, 3], [4, 3], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4]].forEach(([x, y]) => (g[y][x] = hex("#f4f8ff")));
  return g;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, grid) {
  const scale = size / GRID;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = grid[Math.floor(y / scale)][Math.floor(x / scale)];
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const grid = makeGrid();
[180, 192, 512].forEach((size) => {
  writeFileSync(new URL(`icon-${size}.png`, OUT), png(size, grid));
  console.log(`icon-${size}.png を作りました`);
});
