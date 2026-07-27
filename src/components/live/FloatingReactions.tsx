import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface FloatingReactionsHandle {
  push: (emoji: string) => void;
}

type Reaction = {
  id: string;
  emoji: string;
  offsetX: number;
  startX: number;
  rotate: number;
  scale: number;
};

export const FloatingReactions = forwardRef<FloatingReactionsHandle>(function FloatingReactions(_p, ref) {
  const [items, setItems] = useState<Reaction[]>([]);
  const timeouts = useRef<number[]>([]);

  useImperativeHandle(ref, () => ({
    push: (emoji: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const reaction: Reaction = {
        id,
        emoji,
        offsetX: (Math.random() - 0.5) * 80,
        startX: Math.random() * 40,
        rotate: (Math.random() - 0.5) * 30,
        scale: 0.9 + Math.random() * 0.4,
      };
      setItems((prev) => [...prev, reaction]);
      const t = window.setTimeout(() => {
        setItems((prev) => prev.filter((r) => r.id !== id));
      }, 2400);
      timeouts.current.push(t);
    },
  }));

  useEffect(() => () => { timeouts.current.forEach(clearTimeout); }, []);

  return (
    <div
      className="pointer-events-none absolute bottom-0 right-0 h-full w-32 overflow-hidden z-20"
      aria-hidden
    >
      <AnimatePresence>
        {items.map((r) => (
          <motion.div
            key={r.id}
            initial={{ y: 0, x: r.startX, opacity: 0, scale: 0.4 }}
            animate={{
              y: -360,
              x: r.startX + r.offsetX,
              opacity: [0, 1, 1, 0],
              scale: r.scale,
              rotate: r.rotate,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.2,
              ease: "easeOut",
              opacity: { times: [0, 0.15, 0.7, 1], duration: 2.2 },
            }}
            className="absolute bottom-2 right-4 text-4xl select-none drop-shadow-sm"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
