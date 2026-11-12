// メニュー画面（タイトル・キャラ選び・ステージ選び・一時停止・クリア）と、上の帯（体力・星）。
// 日本語の文字をくっきり出すため、メニューはゲームの絵の上に HTML で重ねる。
import { CHARACTERS } from "./characters.js";
import { drawMap, mapSize } from "./pixel.js";

const overlay = () => document.getElementById("overlay");
const hud = () => document.getElementById("hud");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v == null) return;
    if (k === "onclick") node.addEventListener("click", v);
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.append(c));
  return node;
}

export function portrait(character, scale = 4) {
  const { w, h } = mapSize(character.map);
  const size = 16;
  const canvas = el("canvas", { width: size, height: size, class: "portrait", "aria-hidden": "true" });
  canvas.style.width = `${size * scale}px`;
  canvas.style.height = `${size * scale}px`;
  const ctx = canvas.getContext("2d");
  drawMap(ctx, character.map, character.pal, Math.floor((size - w) / 2), size - h);
  return canvas;
}

function show(panel) {
  const root = overlay();
  root.replaceChildren(panel);
  root.hidden = false;
}

export function hideOverlay() {
  overlay().hidden = true;
  overlay().replaceChildren();
}

export function showTitle({ onStart }) {
  hud().hidden = true;
  const cast = el("div", { class: "title-cast" }, CHARACTERS.map((c, i) => {
    const p = portrait(c, 3);
    p.style.animationDelay = `${i * 0.12}s`;
    return p;
  }));
  show(el("div", { class: "panel title", onclick: onStart }, [
    el("h1", { text: "レトロ・クライマー" }),
    el("p", { class: "sub", text: "7人のなかまと、ゴールの旗をめざそう" }),
    cast,
    el("p", { class: "blink", text: "タップしてスタート" }),
  ]));
}

export function showSelect({ current, onDecide }) {
  hud().hidden = true;
  let selected = CHARACTERS.find((c) => c.id === current) ?? CHARACTERS[0];
  const info = el("div", { class: "char-info" });
  const grid = el("div", { class: "char-grid" });
  const renderInfo = () => {
    info.replaceChildren(
      el("b", { text: `${selected.name}（${selected.look}）` }),
      el("span", { text: selected.skill }),
    );
    [...grid.children].forEach((btn) => btn.classList.toggle("selected", btn.dataset.id === selected.id));
  };
  CHARACTERS.forEach((c) => {
    grid.append(el("button", {
      class: "char", "data-id": c.id, "aria-label": c.name,
      onclick: () => {
        selected = c;
        renderInfo();
      },
    }, [portrait(c, 3), el("span", { text: c.name })]));
  });
  renderInfo();
  show(el("div", { class: "panel select" }, [
    el("h2", { text: "キャラをえらぶ" }),
    grid,
    info,
    el("button", { class: "primary", text: "このキャラで行く", onclick: () => onDecide(selected.id) }),
  ]));
}

export function showStages({ stages, save, gemTotals, onPlay, onBack }) {
  hud().hidden = true;
  const list = stages.map((stage, i) => {
    const open = save.isUnlocked(stages, i);
    const cleared = save.isCleared(stage.id);
    const best = save.data.bestGems[stage.id] ?? 0;
    const label = open
      ? `${cleared ? "クリア　" : ""}★ ${best} / ${gemTotals[i]}`
      : "前のステージをクリアすると開きます";
    return el("button", { class: `stage ${open ? "" : "locked"}`, disabled: open ? null : "", onclick: () => open && onPlay(i) }, [
      el("b", { text: `${i + 1}. ${stage.name}` }),
      el("span", { text: label }),
    ]);
  });
  show(el("div", { class: "panel stages" }, [
    el("h2", { text: "ステージをえらぶ" }),
    ...list,
    el("button", { class: "secondary", text: "キャラをえらびなおす", onclick: onBack }),
  ]));
}

export function showPause({ muted, onResume, onRetry, onQuit, onToggleSound }) {
  const sound = el("button", { class: "secondary", text: muted ? "音：オフ" : "音：オン" });
  sound.addEventListener("click", () => {
    const next = onToggleSound();
    sound.textContent = next ? "音：オフ" : "音：オン";
  });
  show(el("div", { class: "panel pause" }, [
    el("h2", { text: "ひとやすみ" }),
    el("button", { class: "primary", text: "つづける", onclick: onResume }),
    el("button", { class: "secondary", text: "はじめからやり直す", onclick: onRetry }),
    el("button", { class: "secondary", text: "ステージ選びへ", onclick: onQuit }),
    sound,
    el("p", { class: "hint", text: "はしご：▲▼　板から下りる：▼を押しながらジャンプ" }),
  ]));
}

export function showClear({ gems, total, isLast, onNext, onStages }) {
  hud().hidden = true;
  document.getElementById("toast").hidden = true;
  const buttons = isLast
    ? [el("p", { class: "sub", text: "ぜんぶのステージをクリア！ おめでとう！" })]
    : [el("button", { class: "primary", text: "つぎのステージへ", onclick: onNext })];
  show(el("div", { class: "panel clear" }, [
    el("h2", { text: "ステージクリア！" }),
    el("p", { class: "big", text: `★ ${gems} / ${total}` }),
    ...buttons,
    el("button", { class: "secondary", text: "ステージ選びへ", onclick: onStages }),
  ]));
}

export function setHud({ hearts, maxHearts, gems, total, stageName }) {
  const root = hud();
  root.hidden = false;
  if (stageName != null) root.querySelector(".stage-name").textContent = stageName;
  if (hearts != null) root.querySelector(".hearts").textContent = "♥".repeat(Math.max(0, hearts)) + "♡".repeat(Math.max(0, maxHearts - hearts));
  if (gems != null) root.querySelector(".gems").textContent = `★ ${gems}/${total}`;
}

let toastTimer = null;
export function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 1800);
}
