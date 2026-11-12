// 全体の流れ：タイトル → キャラ選び → ステージ選び → 遊ぶ → クリア
import Phaser from "phaser";
import "./style.css";
import { StageScene } from "./StageScene.js";
import { STAGES, countGems } from "./stages.js";
import { findCharacter } from "./characters.js";
import { createSave } from "./save.js";
import { bindControls, resetPad } from "./controls.js";
import * as audio from "./audio.js";
import { VIEW } from "./textures.js";
import * as ui from "./ui.js";

function safeStorage() {
  try {
    return window.localStorage;
  } catch (err) {
    console.warn("保存の場所が使えません。記録は残りません", err);
    return null;
  }
}

const save = createSave(safeStorage());
audio.setMuted(save.data.muted);
const gemTotals = STAGES.map(countGems);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: VIEW,
  height: VIEW,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#78b8f0",
  physics: { default: "arcade", arcade: { gravity: { y: 600 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  audio: { noAudio: true },
  banner: false,
  scene: [],
});
game.scene.add("stage", StageScene, false);
if (import.meta.env.DEV) window.__game = game; // 開発中の確かめ用（本番には入らない）

let current = { index: 0, playing: false, paused: false };

function stopStage() {
  audio.stopBgm();
  if (game.scene.isActive("stage") || game.scene.isPaused("stage")) game.scene.stop("stage");
  current.playing = false;
  current.paused = false;
  resetPad();
}

function goTitle() {
  stopStage();
  ui.showTitle({
    onStart: () => {
      audio.unlock();
      audio.sfx.select();
      goSelect();
    },
  });
}

function goSelect() {
  stopStage();
  ui.showSelect({
    current: save.data.character,
    onDecide: (id) => {
      audio.sfx.select();
      save.setCharacter(id);
      goStages();
    },
  });
}

function goStages() {
  stopStage();
  ui.showStages({ stages: STAGES, save, gemTotals, onPlay: (i) => play(i), onBack: goSelect });
}

function play(index) {
  stopStage();
  audio.unlock();
  ui.hideOverlay();
  const stage = STAGES[index];
  current = { index, playing: true, paused: false };
  ui.setHud({ stageName: stage.name });
  game.scene.start("stage", {
    stage,
    character: findCharacter(save.data.character),
    hooks: {
      onHud: (h) => ui.setHud(h),
      onToast: (t) => ui.toast(t),
      onClear: ({ gems, total }) => {
        save.recordClear(stage.id, gems);
        stopStage();
        ui.showClear({
          gems,
          total,
          isLast: index === STAGES.length - 1,
          onNext: () => play(index + 1),
          onStages: goStages,
        });
      },
    },
  });
  audio.playBgm(stage.theme);
}

function pause() {
  if (!current.playing || current.paused) return;
  current.paused = true;
  game.scene.pause("stage");
  audio.stopBgm();
  resetPad();
  ui.showPause({
    muted: audio.isMuted(),
    onResume: resume,
    onRetry: () => play(current.index),
    onQuit: goStages,
    onToggleSound: () => {
      const next = !audio.isMuted();
      audio.setMuted(next);
      save.setMuted(next);
      return next;
    },
  });
}

function resume() {
  if (!current.paused) return;
  audio.unlock();
  ui.hideOverlay();
  current.paused = false;
  game.scene.resume("stage");
  audio.playBgm(STAGES[current.index].theme);
}

bindControls(document.getElementById("pad"));
document.getElementById("pause").addEventListener("click", pause);

// 別のアプリに切り替えたら一時停止する
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pause();
    audio.suspend();
  }
});

// ピンチやダブルタップで画面が拡大されないようにする
["gesturestart", "gesturechange", "dblclick"].forEach((type) =>
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false }),
);

goTitle();
