// セーブ。iPhone の中（ブラウザの保存領域）に置く。
// 保存できない環境（プライベートブラウズなど）でも、遊ぶことはできるようにする。

export const SAVE_KEY = "retro-climber-save-v1";

const EMPTY = () => ({ v: 1, cleared: {}, bestGems: {}, character: "musubi", muted: false });

export function createSave(storage) {
  let data = EMPTY();
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (raw) data = { ...EMPTY(), ...JSON.parse(raw) };
  } catch (err) {
    console.warn("セーブを読めなかったため、新しく始めます", err);
  }

  const write = () => {
    try {
      storage?.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("セーブを書けませんでした", err);
    }
  };

  return {
    get data() {
      return data;
    },
    isCleared(stageId) {
      return Boolean(data.cleared[stageId]);
    },
    isUnlocked(stages, index) {
      return index === 0 || Boolean(data.cleared[stages[index - 1]?.id]);
    },
    recordClear(stageId, gems) {
      data.cleared[stageId] = true;
      data.bestGems[stageId] = Math.max(data.bestGems[stageId] ?? 0, gems);
      write();
    },
    setCharacter(id) {
      data.character = id;
      write();
    },
    setMuted(muted) {
      data.muted = muted;
      write();
    },
  };
}
