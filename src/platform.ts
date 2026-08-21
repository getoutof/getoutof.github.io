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
