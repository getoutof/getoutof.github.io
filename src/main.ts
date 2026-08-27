import "./style.css";
import { createAudio } from "./game/audio.ts";
import {
  createGame,
  currentLevel,
  layoutCamera,
  LEVELS,
  MAX_PULL,
  nextLevel,
  pointerDownStick,
  pointerMoveStick,
  pointerUp,
  resetLevel,
  tick,
  attemptsFraction,
  type Camera,
  type GameState,
} from "./game/game.ts";
import { firstOpenLevel, loadBestStars, rememberStars, starsFromShots } from "./game/progress.ts";
import { draw, resizeCanvas } from "./game/render.ts";
import { haptic, lockPageChrome, safeAreaBottom } from "./platform.ts";
import { WORDMARK_SVG } from "./wordmark.ts";

function required<T>(value: T | null, message: string): T {
  if (!value) throw new Error(message);
  return value;
}

const canvas = required(document.querySelector<HTMLCanvasElement>("#game"), "Нет canvas");
const overlay = required(document.querySelector<HTMLDivElement>("#overlay"), "Нет overlay");
const hud = required(document.querySelector<HTMLDivElement>("#hud"), "Нет hud");
const play = required(document.querySelector<HTMLButtonElement>("#play"), "Нет кнопки");
const restart = required(document.querySelector<HTMLButtonElement>("#restart"), "Нет restart");
const levelsBtn = required(document.querySelector<HTMLButtonElement>("#levels"), "Нет levels");
const levelLabel = required(document.querySelector<HTMLSpanElement>("#level-label"), "Нет level");
const shotLabel = required(document.querySelector<HTMLSpanElement>("#shot-label"), "Нет shots");
const toast = required(document.querySelector<HTMLDivElement>("#toast"), "Нет toast");
const banner = required(document.querySelector<HTMLDivElement>("#banner"), "Нет banner");
const bannerKicker = required(banner.querySelector<HTMLParagraphElement>(".banner-kicker"), "Нет banner kicker");
const bannerTitle = required(banner.querySelector<HTMLParagraphElement>(".banner-title"), "Нет banner title");
const ctx = required(canvas.getContext("2d"), "Canvas 2D недоступен");

lockPageChrome();

const sfx = createAudio();
let state: GameState = createGame();
let view = resizeCanvas(canvas, ctx);
let camera: Camera = layoutCamera(view.w, view.h);
let last = performance.now();
let overlayMode: "title" | "win" | "fail" | "levels" | "hidden" = "title";

function starsMarkup(count: number, empty = false): string {
  const n = Math.max(0, Math.min(3, count));
  return `<span class="stars${empty || n === 0 ? " empty" : ""}">${"★".repeat(n)}${"☆".repeat(3 - n)}</span>`;
}

function starLine(stars: number): string {
  if (stars >= 3) return "С первой попытки";
  if (stars === 2) return "Со второй попытки";
  return "С третьей попытки";
}

function levelListMarkup(): string {
  const best = loadBestStars();
  return `<ol class="levels">${LEVELS.map(
    (level, i) => `
    <li>
      <button type="button" class="level-btn" data-level="${i}">
        <span class="level-index">${i + 1}</span>
        <span class="level-meta">
          <span class="level-name">${level.name}</span>
          ${best[i] ? starsMarkup(best[i]) : starsMarkup(0, true)}
        </span>
      </button>
    </li>`,
  ).join("")}</ol>`;
}

function bindOverlay(): void {
  overlay.querySelector("#play")?.addEventListener("click", onPlay);
  overlay.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => startLevel(Number(btn.dataset.level)));
  });
}

function showOverlay(title: string, lead: string, action: string, extra = ""): void {
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="panel">
      <p class="eyebrow">${currentLevel(state).name}</p>
      <h1>${title}</h1>
      ${extra}
      <p class="lead">${lead}</p>
      ${levelListMarkup()}
      <button id="play" type="button" class="primary">${action}</button>
    </div>
  `;
  bindOverlay();
}

function showTitle(): void {
  overlayMode = "title";
  overlay.hidden = false;
  hud.hidden = true;
  overlay.innerHTML = `
    <div class="panel">
      <p class="eyebrow">слэнгшот</p>
      ${WORDMARK_SVG}
      <p class="lead">Оттяни нижний шар и отпусти — попади во все маяки.</p>
      ${levelListMarkup()}
      <button id="play" type="button" class="primary">Играть</button>
    </div>
  `;
  bindOverlay();
}

function showLevels(): void {
  overlayMode = "levels";
  state.paused = true;
  state.aim = null;
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="panel">
      <p class="eyebrow">прогресс</p>
      <h1>Уровни</h1>
      <p class="lead">Лучший результат по звёздам.</p>
      ${levelListMarkup()}
      <button id="play" type="button" class="primary">Назад</button>
    </div>
  `;
  bindOverlay();
}

function startLevel(index: number): void {
  void sfx.resume();
  state = resetLevel(index);
  overlayMode = "hidden";
  overlay.hidden = true;
  hud.hidden = false;
  syncHud();
}

function onPlay(): void {
  void sfx.resume();
  if (overlayMode === "levels") {
    overlayMode = "hidden";
    overlay.hidden = true;
    hud.hidden = false;
    state.paused = false;
    syncHud();
    return;
  }
  overlay.hidden = true;
  hud.hidden = false;
  overlayMode = "hidden";
  if (state.phase === "win") {
    state = nextLevel(state);
  } else if (state.phase === "fail") {
    state = resetLevel(state.levelIndex);
  } else if (state.phase === "title") {
    state = resetLevel(firstOpenLevel());
  }
  syncHud();
}

function syncHud(): void {
  levelLabel.textContent = `Уровень ${state.levelIndex + 1}`;
  shotLabel.textContent = `Попытки ${attemptsFraction(state)}`;
  if (state.notice && overlay.hidden) {
    toast.hidden = false;
    toast.textContent = state.notice;
  } else {
    toast.hidden = true;
    toast.textContent = "";
  }
  if (state.banner && overlay.hidden) {
    const fade = Math.min(1, Math.max(0, (state.bannerUntil - state.time) / 0.55));
    banner.hidden = false;
    bannerKicker.textContent = `Уровень ${state.levelIndex + 1}`;
    bannerTitle.textContent = state.banner;
    banner.style.opacity = String(fade);
  } else {
    banner.hidden = true;
    banner.style.opacity = "0";
  }
}

function stickArgs(event: PointerEvent) {
  return [canvas, camera, view, safeAreaBottom(), event.clientX, event.clientY] as const;
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointerDownStick(state, ...stickArgs(event));
});

canvas.addEventListener("pointermove", (event) => {
  pointerMoveStick(state, ...stickArgs(event));
});

canvas.addEventListener("pointerup", () => {
  pointerUp(state, (power) => {
    sfx.launch();
    haptic(power / MAX_PULL > 0.72 ? "heavy" : "medium");
    syncHud();
  });
});

canvas.addEventListener("pointercancel", () => {
  state.aim = null;
});

restart.addEventListener("click", () => {
  state = resetLevel(state.levelIndex);
  overlayMode = "hidden";
  overlay.hidden = true;
  syncHud();
});

levelsBtn.addEventListener("click", () => {
  showLevels();
});

play.addEventListener("click", onPlay);

window.addEventListener("resize", () => {
  view = resizeCanvas(canvas, ctx);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") {
    state = resetLevel(state.levelIndex);
    overlayMode = "hidden";
    overlay.hidden = true;
    hud.hidden = false;
    syncHud();
  }
});

function frame(now: number): void {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  const prev = state.phase;
  tick(state, dt, sfx);
  camera = draw(ctx, state, view, safeAreaBottom());
  if (state.phase !== prev && overlayMode === "hidden") {
    if (state.phase === "win") {
      haptic("heavy");
      const earned = starsFromShots(state.shots);
      const best = rememberStars(state.levelIndex, earned);
      const lastLevel = state.levelIndex === LEVELS.length - 1;
      overlayMode = "win";
      const bestNote = best[state.levelIndex] > earned ? ` Лучший результат: ${best[state.levelIndex]}★` : "";
      showOverlay(
        lastLevel ? "Орбита закрыта" : "Маяки собраны",
        `${starLine(earned)}.${bestNote}`,
        lastLevel ? "Сначала" : "Дальше",
        `<p class="stars-result">${starsMarkup(earned)}</p>`,
      );
    }
    if (state.phase === "fail") {
      haptic("heavy");
      overlayMode = "fail";
      showOverlay("Попытки закончились", state.message, "Ещё раз");
    }
  }
  syncHud();
  requestAnimationFrame(frame);
}

showTitle();
syncHud();
requestAnimationFrame(frame);
