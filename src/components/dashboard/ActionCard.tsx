import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

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
  const navigate = useNavigate();
  const isDanger = tone === "danger";
  const className = disabled
    ? "group text-left rounded-2xl border border-border bg-card p-4 shadow-card opacity-60 cursor-not-allowed"
    : "group text-left rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40 hover:bg-accent";

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div
          className={`h-9 w-9 rounded-lg border grid place-items-center ${
            isDanger
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-sm font-semibold ${
            isDanger ? "text-destructive" : "text-card-foreground"
          }`}
        >
          {title}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </>
  );

  return (
    <button
      type="button"
      onClick={() => {
        if (to) {
          navigate({ to: to as never });
          return;
        }
        onClick?.();
      }}
      disabled={disabled}
      className={className}
    >
      {content}
    </button>
  );
}
