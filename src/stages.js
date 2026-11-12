// ステージの地図。1文字が8×8ドットのマス1つ。
// . 空  # 地面（上が草・屋根）  = ブロック  - 乗れる板（下からすり抜け）
// H はしご  T はしごの一番上（乗れる）  ^ トゲ
// P スタート  G ゴール  C 旗（ここから再開）  o 星のかけら  e 歩く敵  f 浮かぶ敵

export const STANDABLE = "#=-T";

function builder(w, h) {
  const grid = Array.from({ length: h }, () => Array(w).fill("."));
  const api = {
    fill(x0, x1, y0, y1, ch) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch;
      return api;
    },
    ground(x0, x1, top) {
      return api.fill(x0, x1, top, h - 1, "#");
    },
    plat(x, y, len) {
      return api.fill(x, x + len - 1, y, y, "-");
    },
    ladder(x, top, bottom) {
      grid[top][x] = "T";
      for (let y = top + 1; y <= bottom; y++) grid[y][x] = "H";
      return api;
    },
    put(x, y, ch) {
      grid[y][x] = ch;
      return api;
    },
    gems(list) {
      list.forEach(([x, y]) => (grid[y][x] = "o"));
      return api;
    },
    rows() {
      return grid.map((r) => r.join(""));
    },
  };
  return api;
}

function meadow() {
  const s = builder(112, 20);
  s.ground(0, 20, 16).ground(23, 44, 16).ground(48, 70, 16).ground(73, 111, 16);
  s.put(3, 15, "P");
  s.gems([[8, 15], [10, 15], [12, 15]]);
  s.fill(16, 17, 14, 15, "=").gems([[16, 13], [17, 13]]);
  s.gems([[21, 13], [22, 13]]);
  s.plat(26, 12, 6).ladder(30, 12, 15).gems([[27, 11], [28, 11]]);
  s.plat(33, 9, 5).gems([[34, 8], [36, 8]]);
  s.put(38, 15, "e");
  s.gems([[46, 12]]);
  s.put(52, 15, "C");
  s.fill(57, 57, 15, 15, "=").fill(58, 58, 14, 15, "=").fill(59, 60, 13, 15, "=");
  s.gems([[59, 12], [60, 12]]);
  s.put(65, 15, "e");
  s.plat(66, 11, 5).ladder(67, 11, 15).gems([[68, 10], [70, 10]]);
  s.put(80, 15, "e").put(86, 11, "f");
  s.fill(90, 91, 15, 15, "^").gems([[90, 12], [91, 12]]);
  s.plat(94, 12, 4).gems([[95, 11], [96, 11]]);
  s.put(100, 15, "e");
  s.put(106, 15, "G");
  return s.rows();
}

function town() {
  const s = builder(120, 22);
  s.ground(0, 14, 15).put(2, 14, "P");
  s.gems([[5, 14], [7, 14], [9, 14]]);
  s.gems([[15, 12], [16, 12]]);
  s.ground(17, 26, 13).put(21, 12, "e").gems([[23, 12], [25, 12]]);
  s.ground(27, 33, 15);
  s.gems([[35, 11], [36, 11]]);
  s.ground(37, 46, 13).put(41, 12, "e");
  s.ground(47, 54, 8).ladder(46, 8, 12).gems([[50, 7], [52, 7]]);
  s.plat(56, 10, 3).gems([[57, 9]]).put(57, 5, "f");
  s.ground(60, 70, 12).put(62, 11, "C").put(66, 11, "e");
  s.gems([[72, 9], [73, 9]]);
  s.ground(74, 84, 12).put(76, 11, "e");
  s.fill(80, 81, 11, 11, "^").gems([[80, 8], [81, 8]]);
  s.ground(85, 90, 15).plat(88, 13, 3).gems([[89, 12]]).put(87, 9, "f");
  s.ground(91, 100, 11).put(97, 10, "e").gems([[93, 10], [95, 10]]);
  s.ground(101, 119, 13).put(108, 9, "f");
  s.gems([[104, 12], [106, 12], [110, 12]]);
  s.put(114, 12, "G");
  return s.rows();
}

function tower() {
  const W = 60;
  const H = 62;
  const s = builder(W, H);
  s.fill(0, 1, 0, H - 1, "=").fill(W - 2, W - 1, 0, H - 1, "=");
  s.ground(2, W - 3, 58);
  s.put(5, 57, "P");
  const levels = [53, 48, 43, 38, 33, 28, 23, 18, 13];
  levels.forEach((y, i) => {
    if (i % 2 === 0) s.plat(2, y, 43);
    else s.plat(15, y, 43);
  });
  s.ladder(20, levels[0], 57);
  for (let i = 0; i < levels.length - 1; i++) {
    const col = i % 2 === 0 ? 40 : 18;
    s.ladder(col, levels[i + 1], levels[i] - 1);
  }
  // てっぺん
  s.plat(28, 8, 30).ladder(40, 8, 12).put(53, 7, "G");
  // 板のすき間（落ちると1つ下の階へ）
  s.fill(26, 27, 43, 43, ".").fill(33, 34, 28, 28, ".").fill(30, 31, 18, 18, ".");
  // トゲ
  s.fill(28, 29, 32, 32, "^");
  // 敵
  s.put(30, 47, "e").put(25, 37, "e").put(10, 32, "e").put(30, 22, "e").put(10, 12, "e");
  s.put(28, 40, "f").put(45, 25, "f").put(22, 15, "f");
  // 旗
  s.put(44, 37, "C").put(14, 22, "C");
  // 星のかけら
  s.gems([[10, 57], [14, 57], [30, 52], [34, 52], [25, 47], [50, 47], [8, 42], [12, 42], [26, 41], [27, 41]]);
  s.gems([[30, 37], [54, 37], [20, 32], [34, 31], [24, 27], [50, 27], [6, 22], [36, 22], [33, 17], [52, 17]]);
  s.gems([[6, 12], [30, 12], [32, 7], [36, 7], [44, 7]]);
  return s.rows();
}

export const STAGES = [
  { id: "1", name: "そよかぜの草原", theme: "meadow", rows: meadow() },
  { id: "2", name: "あかね屋根の港町", theme: "town", rows: town() },
  { id: "3", name: "くものうえの塔", theme: "tower", rows: tower() },
];

export function countGems(stage) {
  return stage.rows.join("").split("o").length - 1;
}

export function findAll(stage, ch) {
  const out = [];
  stage.rows.forEach((row, y) => [...row].forEach((c, x) => c === ch && out.push({ x, y })));
  return out;
}

// 地図の決まりが守られているかを調べる。問題の一覧を返す（空なら合格）。
export function validateStage(stage) {
  const problems = [];
  const { rows } = stage;
  const width = rows[0].length;
  const at = (x, y) => (rows[y] ? rows[y][x] : undefined);
  rows.forEach((r, y) => r.length !== width && problems.push(`${y}行目の長さが違う`));
  ["P", "G"].forEach((ch) => {
    const n = findAll(stage, ch).length;
    if (n !== 1) problems.push(`${ch} が ${n} 個ある`);
  });
  ["P", "G", "C", "e"].forEach((ch) => {
    findAll(stage, ch).forEach(({ x, y }) => {
      if (!STANDABLE.includes(at(x, y + 1) ?? "")) problems.push(`${ch}(${x},${y}) の下に足場がない`);
    });
  });
  findAll(stage, "T").forEach(({ x, y }) => {
    let yy = y + 1;
    if (at(x, yy) !== "H") problems.push(`はしご(${x},${y}) の下が続いていない`);
    while (at(x, yy) === "H") yy++;
    if (!STANDABLE.includes(at(x, yy) ?? "")) problems.push(`はしご(${x},${y}) の下の端に足場がない`);
  });
  findAll(stage, "H").forEach(({ x, y }) => {
    if (!"HT".includes(at(x, y - 1) ?? "")) problems.push(`はしご(${x},${y}) の上に T がない`);
  });
  if (countGems(stage) < 5) problems.push("星のかけらが少ない");
  return problems;
}
