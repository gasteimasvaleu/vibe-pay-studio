import type { ReactNode } from "react";

interface GlassPromoCardProps {
  eyebrow: string;
  title: string;
  body: string;
  footer: string;
  icon?: ReactNode;
}

const TITLE_SHADOW =
  "0 2px 12px rgba(120,40,200,0.9), 0 0 24px rgba(80,20,160,0.7), 0 0 40px rgba(60,10,140,0.5)";
const TEXT_SHADOW =
  "0 1px 8px rgba(80,20,160,0.85), 0 0 16px rgba(60,10,140,0.55)";

export function GlassPromoCard({ eyebrow, title, body, footer }: GlassPromoCardProps) {
  return (
    <div className="relative group h-full">
      {/* outer bubble glow */}
      <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-white/20 via-purple-300/10 to-fuchsia-300/10 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />

      <div
        className="relative h-full flex flex-col rounded-[2rem] border border-white/25 bg-white/15 backdrop-blur-2xl p-6 shadow-2xl overflow-hidden"
        style={{
          boxShadow:
            "0 20px 60px -20px rgba(120, 40, 200, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-16 -left-8 h-40 w-40 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(180,130,255,0.4), transparent 60%)",
          }}
        />

        <div className="relative flex flex-col h-full gap-3">
          <p
            className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {eyebrow}
          </p>
          <h3
            className="text-xl font-black leading-tight text-white"
            style={{ textShadow: TITLE_SHADOW }}
          >
            {title}
          </h3>
          <p
            className="text-sm text-white leading-relaxed"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {body}
          </p>
          <p
            className="text-xs text-white/90 pt-3 mt-auto border-t border-white/20"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
