import { useEffect, useState } from "react";

type BannerState = {
  message: string;
  visible: boolean;
};

const listeners = new Set<(state: BannerState) => void>();
let currentState: BannerState = { message: "", visible: false };

function emit(state: BannerState) {
  currentState = state;
  listeners.forEach((listener) => listener(state));
}

export function showTopBanner(message: string, duration = 2500) {
  emit({ message, visible: true });
  setTimeout(() => {
    emit({ message: "", visible: false });
  }, duration);
}

export function TopBanner() {
  const [state, setState] = useState<BannerState>(currentState);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  if (!state.visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9999] bg-success text-success-foreground py-4 px-6 text-center text-base font-medium shadow-sm animate-in slide-in-from-top-full duration-300"
    >
      {state.message}
    </div>
  );
}
