import { useCallback, useRef, useState } from "react";

export const CHAT_MIN_RATIO = 0.22;
export const CHAT_MAX_RATIO = 0.82;
export const CHAT_DEFAULT_RATIO = 0.4;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function useLiveDragChat(defaultRatio = CHAT_DEFAULT_RATIO) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chatRatio, setChatRatio] = useState(defaultRatio);
  const dragStateRef = useRef<{ startY: number; startRatio: number; height: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const host = containerRef.current;
    if (!host) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      startY: e.clientY,
      startRatio: chatRatio,
      height: host.getBoundingClientRect().height,
    };
  }, [chatRatio]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s || s.height <= 0) return;
    const deltaY = e.clientY - s.startY;
    const next = clamp(s.startRatio + (-deltaY / s.height), CHAT_MIN_RATIO, CHAT_MAX_RATIO);
    setChatRatio(next);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
    dragStateRef.current = null;
  }, []);

  return { containerRef, chatRatio, setChatRatio, dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
