// ゲームの絵（キャラ・敵・マス・背景）を、その場でキャンバスに描いて Phaser に登録する。
import { CHARACTERS } from "./characters.js";
import { ENEMY_MAP, FLYER_MAP, GEM_MAP, drawMap, mapSize, walkFrame } from "./pixel.js";

export const TILE = 8;
export const VIEW = 160; // ゲーム画面の大きさ（ドット）

// マスの番号（タイル画像の並び順）
export const T = { TOP: 0, FILL: 1, BLOCK: 2, PLAT: 3, LADDER: 4, LADDER_TOP: 5, SPIKE: 6 };
export const SOLID_TILES = [T.TOP, T.FILL, T.BLOCK];
export const ONE_WAY_TILES = [T.PLAT, T.LADDER_TOP];

export const THEMES = {
  meadow: {
    sky: "#78b8f0", top: "#48b040", topDark: "#2f8a3a", fill: "#b8743c", dot: "#8a5228",
    block: "#c88840", blockLight: "#f0c070", blockDark: "#7a4a20",
    plat: "#c88840", platLight: "#f0c070", platDark: "#7a4a20",
    ladder: "#e8b060", spike: "#eeeef4", spikeDark: "#9090a8",
    enemy: "#8a7a9a", flyer: "#f080b0",
  },
  town: {
    sky: "#8cd0ff", top: "#d85a4a", topDark: "#a03a30", fill: "#f4e4cc", dot: "#d8bc98", windows: "#6a9ad8",
    block: "#e8c8a0", blockLight: "#fff0d8", blockDark: "#a8885a",
    plat: "#3a8ad8", platLight: "#8ac0f0", platDark: "#1c5aa0",
    ladder: "#f8e0a0", spike: "#eeeef4", spikeDark: "#9090a8",
    enemy: "#6a5a8a", flyer: "#f0a040",
  },
  tower: {
    sky: "#a8dcff", top: "#9a9ab8", topDark: "#6a6a88", fill: "#c8c8dc", dot: "#a8a8c0",
    block: "#b0b0c8", blockLight: "#e0e0f0", blockDark: "#70708a",
    plat: "#c88840", platLight: "#f0c070", platDark: "#7a4a20",
    ladder: "#e8b060", spike: "#eeeef4", spikeDark: "#9090a8",
    enemy: "#7a6a5a", flyer: "#80c0f0",
  },
};

function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx);
  tex.refresh();
}

const R = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

function drawTiles(ctx, th) {
  const ox = (i) => i * TILE;
  // 0 地面の上（草・屋根・石）
  R(ctx, ox(0), 0, 8, 8, th.fill);
  R(ctx, ox(0) + 2, 5, 1, 1, th.dot);
  R(ctx, ox(0) + 6, 7, 1, 1, th.dot);
  R(ctx, ox(0), 0, 8, 3, th.top);
  for (let x = 0; x < 8; x += 2) R(ctx, ox(0) + x, 3, 1, 1, th.topDark);
  R(ctx, ox(0), 0, 8, 1, th.topDark);
  // 1 地面の中
  R(ctx, ox(1), 0, 8, 8, th.fill);
  R(ctx, ox(1) + 1, 1, 1, 1, th.dot);
  R(ctx, ox(1) + 5, 3, 1, 1, th.dot);
  R(ctx, ox(1) + 2, 6, 1, 1, th.dot);
  R(ctx, ox(1) + 6, 7, 1, 1, th.dot);
  if (th.windows) {
    // 町の壁：マスごとに小さな窓
    R(ctx, ox(1), 0, 8, 8, th.fill);
    R(ctx, ox(1) + 2, 2, 4, 5, th.dot);
    R(ctx, ox(1) + 3, 3, 2, 3, th.windows);
    R(ctx, ox(1) + 3, 3, 1, 1, "#d8ecff");
    // 屋根：うろこ模様
    R(ctx, ox(0), 0, 8, 8, th.fill);
    R(ctx, ox(0), 0, 8, 5, th.top);
    R(ctx, ox(0), 0, 8, 1, th.topDark);
    R(ctx, ox(0) + 1, 2, 2, 1, th.topDark);
    R(ctx, ox(0) + 5, 2, 2, 1, th.topDark);
    R(ctx, ox(0), 4, 8, 1, th.topDark);
  }
  // 2 ブロック
  R(ctx, ox(2), 0, 8, 8, th.blockDark);
  R(ctx, ox(2) + 1, 1, 6, 6, th.block);
  R(ctx, ox(2) + 1, 1, 6, 1, th.blockLight);
  R(ctx, ox(2) + 1, 1, 1, 6, th.blockLight);
  // 3 乗れる板
  R(ctx, ox(3), 0, 8, 4, th.plat);
  R(ctx, ox(3), 0, 8, 1, th.platLight);
  R(ctx, ox(3), 3, 8, 1, th.platDark);
  R(ctx, ox(3) + 3, 1, 1, 2, th.platDark);
  // 4 はしご
  R(ctx, ox(4) + 1, 0, 1, 8, th.ladder);
  R(ctx, ox(4) + 6, 0, 1, 8, th.ladder);
  R(ctx, ox(4) + 1, 2, 6, 1, th.ladder);
  R(ctx, ox(4) + 1, 6, 6, 1, th.ladder);
  // 5 はしごの一番上（板つき）
  R(ctx, ox(5) + 1, 0, 1, 8, th.ladder);
  R(ctx, ox(5) + 6, 0, 1, 8, th.ladder);
  R(ctx, ox(5) + 1, 6, 6, 1, th.ladder);
  R(ctx, ox(5), 0, 8, 3, th.plat);
  R(ctx, ox(5), 0, 8, 1, th.platLight);
  // 6 トゲ
  for (let k = 0; k < 2; k++) {
    const x0 = ox(6) + k * 4;
    for (let y = 2; y < 8; y++) {
      const half = Math.floor((y - 2) / 3);
      R(ctx, x0 + 2 - half - 1, y, 2 + half * 2, 1, y > 5 ? th.spikeDark : th.spike);
    }
  }
}

function drawCloud(ctx, x, y, w) {
  R(ctx, x + 3, y, w - 6, 3, "#f4f8ff");
  R(ctx, x, y + 3, w, 4, "#f4f8ff");
  R(ctx, x + 1, y + 7, w - 2, 1, "#d8e8f8");
}

function drawBackground(ctx, theme, th) {
  const W = VIEW;
  R(ctx, 0, 0, W, VIEW, th.sky);
  if (theme === "meadow") {
    drawCloud(ctx, 12, 18, 20);
    drawCloud(ctx, 96, 34, 26);
    for (let x = 0; x < W; x++) {
      const far = 100 + Math.round(Math.sin((x / W) * Math.PI * 2) * 10);
      R(ctx, x, far, 1, VIEW - far, "#8cc8a0");
      const near = 118 + Math.round(Math.sin((x / W) * Math.PI * 4 + 1) * 6);
      R(ctx, x, near, 1, VIEW - near, "#6aae78");
    }
  } else if (theme === "town") {
    drawCloud(ctx, 20, 14, 22);
    drawCloud(ctx, 110, 26, 18);
    R(ctx, 0, 150, W, 10, "#5a8ad0");
    const houses = [[0, 96, 22], [24, 84, 18], [44, 104, 26], [72, 90, 20], [94, 78, 22], [118, 100, 24], [144, 88, 16]];
    houses.forEach(([x, top, w], i) => {
      R(ctx, x, top, w, 150 - top, i % 2 ? "#f2d6c4" : "#e8c4b8");
      R(ctx, x - 1, top - 3, w + 2, 3, i % 2 ? "#e89a8a" : "#c88ab0");
      for (let wy = top + 6; wy < 140; wy += 10) for (let wx = x + 4; wx < x + w - 4; wx += 7) R(ctx, wx, wy, 3, 4, "#b8c8e8");
    });
  } else {
    // 塔：上下につながる雲の空
    for (let y = 0; y < VIEW; y += 40) R(ctx, 0, y, W, 20, "#b4e2ff");
    [[10, 12, 24], [90, 40, 30], [40, 80, 22], [120, 110, 26], [6, 140, 18]].forEach(([x, y, w]) => drawCloud(ctx, x, y, w));
    for (let y = 0; y < VIEW; y += 8) for (let x = (y / 8) % 2 ? 0 : 6; x < W; x += 24) R(ctx, x, y, 1, 1, "#d8f0ff");
  }
}

function charFrames(scene) {
  CHARACTERS.forEach((c) => {
    const { w, h } = mapSize(c.map);
    canvasTexture(scene, `${c.id}_0`, w, h, (ctx) => drawMap(ctx, c.map, c.pal));
    canvasTexture(scene, `${c.id}_1`, w, h, (ctx) => drawMap(ctx, walkFrame(c.map), c.pal));
  });
}

export function ensureTextures(scene, theme) {
  const th = THEMES[theme];
  charFrames(scene);
  canvasTexture(scene, `tiles-${theme}`, TILE * 7, TILE, (ctx) => drawTiles(ctx, th));
  canvasTexture(scene, `bg-${theme}`, VIEW, VIEW, (ctx) => drawBackground(ctx, theme, th));
  canvasTexture(scene, `walker-${theme}`, 8, 6, (ctx) => drawMap(ctx, ENEMY_MAP, { O: th.enemy, W: "#ffffff", K: "#222222" }));
  canvasTexture(scene, `flyer-${theme}`, 8, 6, (ctx) => drawMap(ctx, FLYER_MAP, { P: th.flyer, W: "#ffffff", K: "#222222" }));
  canvasTexture(scene, "gem", 5, 5, (ctx) => drawMap(ctx, GEM_MAP, { G: "#f0d020", L: "#fff8c0" }));
  canvasTexture(scene, "flag-off", 8, 16, (ctx) => {
    R(ctx, 1, 0, 1, 16, "#f4f4f4");
    R(ctx, 2, 1, 6, 5, "#c8c8d0");
  });
  canvasTexture(scene, "flag-on", 8, 16, (ctx) => {
    R(ctx, 1, 0, 1, 16, "#f4f4f4");
    R(ctx, 2, 1, 6, 5, "#40c060");
    R(ctx, 3, 2, 2, 2, "#ffffff");
  });
  canvasTexture(scene, "goal", 12, 32, (ctx) => {
    R(ctx, 3, 0, 3, 3, "#ffd56a");
    R(ctx, 4, 3, 1, 27, "#f4f4f4");
    R(ctx, 5, 4, 7, 6, "#d8483a");
    R(ctx, 7, 6, 2, 2, "#ffd56a");
    R(ctx, 1, 29, 7, 3, "#7a4a20");
  });
}
