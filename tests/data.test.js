import { describe, expect, it } from "vitest";
import { CHARACTERS, findCharacter } from "../src/characters.js";
import { STAGES, countGems, validateStage } from "../src/stages.js";
import { createSave } from "../src/save.js";

function fakeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = v;
    },
    store,
  };
}

describe("キャラクター", () => {
  it("7体いるとき、名前と得意技と絵がそろっている", () => {
    expect(CHARACTERS).toHaveLength(7);
    for (const c of CHARACTERS) {
      expect(c.name).toBeTruthy();
      expect(c.skill).toBeTruthy();
      expect(c.map.length).toBeGreaterThanOrEqual(10);
      const used = new Set(c.map.join("").replace(/\./g, ""));
      used.forEach((ch) => expect(c.pal[ch], `${c.name} の色 ${ch}`).toBeTruthy());
    }
  });

  it("id がそろわないとき、ムスビを返す", () => {
    expect(findCharacter("none").id).toBe("musubi");
  });

  it("得意技を比べると、それぞれ普通より強い点がある", () => {
    const byId = Object.fromEntries(CHARACTERS.map((c) => [c.id, c.stats]));
    expect(byId.pyoko.jump).toBeGreaterThan(byId.musubi.jump);
    expect(byId.piko.speed).toBeGreaterThan(byId.musubi.speed);
    expect(byId.poruchi.glide).toBe(true);
    expect(byId.koron.roll).toBe(true);
    expect(byId.proro.airJumps).toBe(1);
    expect(byId.nana.hearts).toBe(4);
  });
});

describe("ステージ", () => {
  it.each(STAGES.map((s) => [s.name, s]))("%s の地図が決まりを守っている", (_name, stage) => {
    expect(validateStage(stage)).toEqual([]);
  });

  it("ステージが3つあり、どれにも星のかけらがある", () => {
    expect(STAGES).toHaveLength(3);
    STAGES.forEach((s) => expect(countGems(s)).toBeGreaterThanOrEqual(5));
  });
});

describe("セーブ", () => {
  it("何も保存されていないとき、最初のステージだけ開いている", () => {
    const save = createSave(fakeStorage());
    expect(save.isUnlocked(STAGES, 0)).toBe(true);
    expect(save.isUnlocked(STAGES, 1)).toBe(false);
  });

  it("ステージ1をクリアすると、ステージ2が開き、閉じても残る", () => {
    const storage = fakeStorage();
    createSave(storage).recordClear("1", 7);
    const again = createSave(storage);
    expect(again.isUnlocked(STAGES, 1)).toBe(true);
    expect(again.data.bestGems["1"]).toBe(7);
  });

  it("前より少ない星でクリアしても、いちばん多い記録が残る", () => {
    const save = createSave(fakeStorage());
    save.recordClear("1", 9);
    save.recordClear("1", 3);
    expect(save.data.bestGems["1"]).toBe(9);
  });

  it("保存の中身がこわれているとき、新しく始められる", () => {
    const save = createSave(fakeStorage({ "retro-climber-save-v1": "{こわれた" }));
    expect(save.data.cleared).toEqual({});
  });

  it("保存の場所が使えないとき、エラーにならずに遊べる", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const save = createSave(broken);
    expect(() => save.recordClear("1", 1)).not.toThrow();
  });
});

describe("歩きの絵", async () => {
  const { walkFrame } = await import("../src/pixel.js");
  it.each(CHARACTERS.map((c) => [c.name, c]))("%s の2コマ目は、足の行以外が1コマ目と同じ（体が上下しない）", (_n, c) => {
    const f = walkFrame(c.map);
    expect(f).toHaveLength(c.map.length);
    expect(f.slice(0, -1)).toEqual(c.map.slice(0, -1));
    expect(f[f.length - 1]).not.toEqual(c.map[c.map.length - 1]);
  });
});
