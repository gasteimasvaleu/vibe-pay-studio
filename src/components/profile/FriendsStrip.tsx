import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { listPublicFriends } from "@/lib/friends.functions";

type Props = {
  userId: string;
  isOwner?: boolean;
};

export function FriendsStrip({ userId, isOwner }: Props) {
  const fn = useServerFn(listPublicFriends);
  const { data } = useQuery({
    queryKey: ["friends", "public", userId],
    queryFn: () => fn({ data: { userId, limit: 30 } }),
  });

  const friends = data ?? [];
  if (!isOwner && friends.length === 0) return null;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2 pr-4 md:pr-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <span>Amigos</span>
          <span className="text-muted-foreground font-medium">
            {friends.length}
          </span>
        </div>
        {isOwner && (
          <Link
            to="/my-monetisex-stats"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Gerenciar
          </Link>
        )}
      </div>

      {friends.length === 0 ? (
        <p className="text-xs text-muted-foreground pr-4 md:pr-6">
          Você ainda não adicionou nenhum amigo. Adicione outros criadores no
          perfil deles para exibi-los aqui.
        </p>
      ) : (
        <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pb-2 pr-4 md:pr-6">
          {friends.map((f) => (
            <Link
              key={f.userId}
              to="/perfil/$username"
              params={{ username: f.username }}
              className="flex flex-col items-center gap-1.5 w-16 shrink-0 group"
            >
              <div className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center text-white font-bold border border-border group-hover:ring-2 ring-primary/40 transition">
                {f.avatarUrl ? (
                  <img
                    src={f.avatarUrl}
                    alt={f.displayName ?? f.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{(f.displayName ?? f.username).slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[11px] text-foreground truncate max-w-[64px] text-center">
                {f.displayName ?? f.username}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
