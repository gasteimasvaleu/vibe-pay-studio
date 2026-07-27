import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";

export interface FloatingReactionsHandle {
  push: (emoji: string) => void;
}

type Item = { id: number; emoji: string; left: number; drift: number; duration: number };

let _seq = 1;

export const FloatingReactions = forwardRef<FloatingReactionsHandle>(function FloatingReactions(_p, ref) {
  const [items, setItems] = useState<Item[]>([]);
  const timeouts = useRef<number[]>([]);

  useImperativeHandle(ref, () => ({
    push: (emoji: string) => {
      const item: Item = {
        id: _seq++,
        emoji,
        left: 20 + Math.random() * 60,
        drift: (Math.random() - 0.5) * 40,
        duration: 2400 + Math.random() * 900,
      };
      setItems((cur) => [...cur, item]);
      const t = window.setTimeout(() => {
        setItems((cur) => cur.filter((i) => i.id !== item.id));
      }, item.duration + 100);
      timeouts.current.push(t);
    },
  }));

  useEffect(() => () => { timeouts.current.forEach(clearTimeout); }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((i) => (
        <span
          key={i.id}
          className="floating-reaction absolute bottom-2 text-2xl select-none"
          style={{
            left: `${i.left}%`,
            // @ts-ignore custom prop
            "--drift": `${i.drift}px`,
            animation: `floatUp ${i.duration}ms ease-out forwards`,
          }}
        >
          {i.emoji}
        </span>
      ))}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
          15%  { opacity: 1; transform: translate(0, -10px) scale(1); }
          100% { transform: translate(var(--drift, 0px), -220px) scale(1.1); opacity: 0; }
        }
      `}</style>
    </div>
  );
});
