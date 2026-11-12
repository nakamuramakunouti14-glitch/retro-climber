// 画面下のボタンとキーボードの入力。
// 指をボタンからボタンへすべらせても効くように、指の位置からボタンを探す。

export const pad = { left: false, right: false, up: false, down: false, jump: false, jumpAt: 0 };

const KEYS = ["left", "right", "up", "down", "jump"];
const pointers = new Map(); // 指の番号 → 押しているボタン
const keyboard = new Set();
let buttons = [];

function keyAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.("[data-key]")?.dataset.key ?? null;
}

function refresh() {
  const held = new Set([...pointers.values(), ...keyboard]);
  const wasJump = pad.jump;
  KEYS.forEach((k) => (pad[k] = held.has(k)));
  if (pad.jump && !wasJump) pad.jumpAt = performance.now();
  buttons.forEach((b) => b.classList.toggle("pressed", held.has(b.dataset.key)));
}

export function resetPad() {
  pointers.clear();
  keyboard.clear();
  pad.jumpAt = 0;
  refresh();
}

export function bindControls(padEl) {
  buttons = [...padEl.querySelectorAll("[data-key]")];

  const onDown = (e) => {
    e.preventDefault();
    pointers.set(e.pointerId, keyAt(e.clientX, e.clientY));
    refresh();
  };
  const onMove = (e) => {
    if (!pointers.has(e.pointerId)) return;
    e.preventDefault();
    pointers.set(e.pointerId, keyAt(e.clientX, e.clientY));
    refresh();
  };
  const onUp = (e) => {
    pointers.delete(e.pointerId);
    refresh();
  };
  padEl.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  padEl.addEventListener("contextmenu", (e) => e.preventDefault());

  const keyMap = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    Space: "jump", KeyZ: "jump", KeyX: "jump",
  };
  window.addEventListener("keydown", (e) => {
    const k = keyMap[e.code];
    if (!k) return;
    e.preventDefault();
    keyboard.add(k);
    refresh();
  });
  window.addEventListener("keyup", (e) => {
    const k = keyMap[e.code];
    if (!k) return;
    keyboard.delete(k);
    refresh();
  });
  window.addEventListener("blur", resetPad);
}
