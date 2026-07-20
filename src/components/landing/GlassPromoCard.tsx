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
    <div className="relative h-full">
      <div className="relative h-full flex flex-col rounded-[2rem] border border-white/60 bg-white/70 backdrop-blur-2xl p-6 shadow-xl overflow-hidden">
        <div className="relative flex flex-col h-full gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-purple-700">
            {eyebrow}
          </p>
          <h3 className="text-xl font-black leading-tight text-black">
            {title}
          </h3>
          <p className="text-sm text-neutral-800 leading-relaxed">
            {body}
          </p>
          <p className="text-xs text-neutral-600 pt-3 mt-auto border-t border-black/10">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
