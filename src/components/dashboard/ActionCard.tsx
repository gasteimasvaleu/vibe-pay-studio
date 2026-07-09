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
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "default" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  to?: string;
}) {
  const isDanger = tone === "danger";
  const className = `group text-left rounded-2xl border border-border bg-card p-5 shadow-card transition-all disabled:opacity-60 ${
    isDanger
      ? "hover:border-primary/40 hover:bg-accent"
      : "hover:border-primary/40 hover:bg-accent"
  }`;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl border grid place-items-center ${
            isDanger
              ? "bg-primary/10 border-primary/20 text-primary"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}
        >
          {icon}
        </div>
        <span className="text-base font-semibold text-card-foreground">
          {title}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
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
