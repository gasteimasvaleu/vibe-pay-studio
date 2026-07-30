import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileHeaderCard({
  username,
  isCreator,
  stat,
  levelBadge = "+100",
  showProfileLink = true,
  avatarUrl,
  footer,
  verified = false,
}: {
  username: string;
  isCreator: boolean;
  verified?: boolean;
  stat?: { value: number; label: string };
  levelBadge?: string;
  showProfileLink?: boolean;
  avatarUrl?: string | null;
  footer?: ReactNode;
}) {
  const displayName = username
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const resolvedStat =
    stat ?? { value: 0, label: isCreator ? "Superfãs" : "Assinaturas" };

  return (
    <section className="rounded-2xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      {/* Faixa gradiente */}
      <div className="relative h-20 bg-gradient-primary">
        <div className="absolute top-2.5 right-3">
          <span className="inline-flex items-center rounded-full bg-background/85 backdrop-blur px-2.5 py-0.5 text-xs font-bold text-primary shadow-sm">
            {levelBadge}
            <span className="text-[10px] align-super ml-0.5">°</span>
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className={cn("relative px-4", footer ? "pb-3" : "pb-4")}>
        <div className="flex items-start justify-between -mt-8">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Avatar de @${username}`}
              className="h-16 w-16 rounded-full ring-4 ring-card object-cover shadow-[var(--shadow-glow)]"
            />
          ) : (
            <div className="h-16 w-16 rounded-full ring-4 ring-card bg-gradient-primary grid place-items-center text-xl font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
              {username.slice(0, 1).toUpperCase()}
            </div>
          )}

          {showProfileLink && (
            <Link
              to="/perfil/$username"
              params={{ username }}
              className="mt-10 inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
              Ver perfil <span aria-hidden>→</span>
            </Link>
          )}
        </div>

        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground truncate">
              {displayName}
            </h2>
            {verified && (
              <BadgeCheck className="h-4 w-4 text-primary" aria-label="Perfil certificado" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{username}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="text-sm font-semibold text-foreground align-middle">
              {resolvedStat.value}
            </span>{" "}
            <span className="align-middle">{resolvedStat.label}</span>
          </p>
        </div>
      </div>
      {footer}
    </section>
  );
}
