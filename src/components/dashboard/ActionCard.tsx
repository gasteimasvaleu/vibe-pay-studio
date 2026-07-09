import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function ActionCard({
  icon,
  title,
  description,
  tone = "default",
  onClick,
  disabled,
  to,
  highlight,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "default" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  to?: string;
  highlight?: boolean;
}) {
  const isDanger = tone === "danger";
  const className = `group text-left rounded-2xl border p-5 backdrop-blur-md transition-all disabled:opacity-60 ${
    highlight
      ? "border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 to-purple-600/10 hover:border-fuchsia-300/70"
      : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
  } ${isDanger ? "hover:border-fuchsia-400/40" : ""}`;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl border grid place-items-center ${
            isDanger
              ? "bg-fuchsia-500/15 border-fuchsia-400/30 text-fuchsia-300"
              : highlight
                ? "bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200"
                : "bg-white/5 border-white/10 text-fuchsia-300"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-base font-semibold ${
            isDanger ? "text-fuchsia-300" : "text-white"
          }`}
        >
          {title}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/60">{description}</p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}
