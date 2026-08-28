/** Thin native layer: no-ops on web, Capacitor plugins later. */

export function isNativeShell(): boolean {
  return typeof (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform === "function"
    ? Boolean((window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.())
    : false;
}

export function haptic(kind: "light" | "medium" | "heavy"): void {
  const ms = kind === "light" ? 8 : kind === "medium" ? 16 : 28;
  navigator.vibrate?.(ms);
}

export function lockPageChrome(): void {
  const block = (event: Event) => event.preventDefault();
  document.addEventListener("gesturestart", block, { passive: false });
  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.target instanceof HTMLCanvasElement) event.preventDefault();
    },
    { passive: false },
  );
}

export function safeAreaBottom(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--safe-bottom");
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

type FsDoc = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function fullscreenAvailable(): boolean {
  const doc = document as FsDoc;
  return Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const doc = document as FsDoc;
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<void> {
  if (!fullscreenAvailable()) return;
  const doc = document as FsDoc;
  try {
    if (isFullscreen()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
      return;
    }
    const el = document.documentElement as FsEl;
    if (el.requestFullscreen) await el.requestFullscreen();
    else await el.webkitRequestFullscreen?.();
  } catch {
    /* user denied or unsupported */
  }
}

export function onFullscreenChange(handler: () => void): void {
  document.addEventListener("fullscreenchange", handler);
  document.addEventListener("webkitfullscreenchange", handler);
}
