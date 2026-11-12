// ドット絵の地図（文字の並び）をキャンバスに描く道具と、小物の絵。

export const ENEMY_MAP = [
  "..OOOO..",
  ".OOOOOO.",
  "OOWKOWKO",
  "OOOOOOOO",
  "OOOOOOOO",
  ".OO..OO.",
];

// ふわふわ浮かぶ敵（くらげのような子）
export const FLYER_MAP = [
  "..PPPP..",
  ".PPPPPP.",
  "PPWKPWKP",
  "PPPPPPPP",
  ".P.P.P.P",
  "P.P.P.P.",
];

export const GEM_MAP = ["..G..", ".GLG.", "GLGGG", ".GGG.", "..G.."];

export function mapSize(map) {
  return { w: Math.max(...map.map((r) => r.length)), h: map.length };
}

export function drawMap(ctx, map, pal, ox = 0, oy = 0, scale = 1) {
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = pal[ch];
      if (ch === "." || !color) return;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    });
  });
}

// 歩くときの2コマ目：体は動かさず、一番下の足の行だけ1ドット横にずらす。
// （体ごと上下させると、小さい画面ではブルブル震えて見えるため）
export function walkFrame(map) {
  if (map.length < 2) return map;
  const last = map[map.length - 1];
  const stepped = "." + last.slice(0, -1);
  return [...map.slice(0, -1), stepped];
}
