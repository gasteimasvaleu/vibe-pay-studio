import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";

export function ProfileHeaderCard({
  username,
  isCreator,
  stat,
  levelBadge = "+100",
  showProfileLink = true,
  avatarUrl,
}: {
  username: string;
  isCreator: boolean;
  stat?: { value: number; label: string };
  levelBadge?: string;
  showProfileLink?: boolean;
  avatarUrl?: string | null;
}) {
  const displayName = username
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const resolvedStat =
    stat ?? { value: 0, label: isCreator ? "Superfãs" : "Assinaturas" };

  return (
    <section className="rounded-2xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      {/* Faixa gradiente */}
      <div className="relative h-24 bg-gradient-primary">
        <div className="absolute top-3 right-4">
          <span className="inline-flex items-center rounded-full bg-background/85 backdrop-blur px-3 py-1 text-sm font-bold text-primary shadow-sm">
            {levelBadge}
            <span className="text-xs align-super ml-0.5">°</span>
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="relative px-5 pb-5">
        <div className="flex items-start justify-between -mt-10">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Avatar de @${username}`}
              className="h-20 w-20 rounded-full ring-4 ring-card object-cover shadow-[var(--shadow-glow)]"
            />
          ) : (
            <div className="h-20 w-20 rounded-full ring-4 ring-card bg-gradient-primary grid place-items-center text-2xl font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
              {username.slice(0, 1).toUpperCase()}
            </div>
          )}

          {showProfileLink && (
            <Link
              to="/perfil/$username"
              params={{ username }}
              className="mt-12 inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              Ver perfil <span aria-hidden>→</span>
            </Link>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {displayName}
            </h2>
            {isCreator && (
              <BadgeCheck className="h-5 w-5 text-primary" aria-label="Creator verificado" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{username}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="text-lg font-bold text-foreground align-middle">
              {resolvedStat.value}
            </span>{" "}
            <span className="align-middle">{resolvedStat.label}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
