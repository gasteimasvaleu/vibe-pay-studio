import { useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function openOverlay() {
  count += 1;
  emit();
}

export function closeOverlay() {
  count = Math.max(0, count - 1);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return count > 0;
}

export function useFullscreenOverlay(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
