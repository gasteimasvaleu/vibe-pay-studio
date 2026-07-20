import type { ReactNode } from "react";

interface GlassPromoCardProps {
  eyebrow: string;
  title: string;
  body: string;
  footer: string;
  icon?: ReactNode;
}

export function GlassPromoCard({ eyebrow, title, body, footer }: GlassPromoCardProps) {
  return (
    <div className="relative group">
      {/* outer bubble glow */}
      <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-white/20 via-purple-300/10 to-fuchsia-300/10 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />

      <div
        className="relative rounded-[2rem] border border-white/25 bg-white/10 backdrop-blur-2xl p-6 shadow-2xl overflow-hidden"
        style={{
          boxShadow:
            "0 20px 60px -20px rgba(120, 40, 200, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        {/* top highlight (bubble sheen) */}
        <div
          className="pointer-events-none absolute -top-16 -left-8 h-40 w-40 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 60%)",
          }}
        />
        {/* subtle bottom refraction */}
        <div
          className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(180,130,255,0.4), transparent 60%)",
          }}
        />

        <div className="relative space-y-3">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/70">
            {eyebrow}
          </p>
          <h3 className="text-xl font-black leading-tight text-white drop-shadow-sm">
            {title}
          </h3>
          <p className="text-sm text-white/85 leading-relaxed">{body}</p>
          <p className="text-xs text-white/60 pt-2 border-t border-white/15">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
