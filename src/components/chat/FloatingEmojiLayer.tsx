import { AnimatePresence, motion } from "framer-motion";

export type FloatingEmoji = { id: string; emoji: string; x: number };

export function FloatingEmojiLayer({ items }: { items: FloatingEmoji[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -320,
              scale: 1,
              x: [0, it.x * 0.4, it.x],
            }}
            transition={{ duration: 2.6, ease: "easeOut", times: [0, 0.1, 0.75, 1] }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-4xl select-none"
          >
            {it.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
