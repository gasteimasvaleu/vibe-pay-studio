import { Link } from "@tanstack/react-router";
import { useCreatorActiveLive } from "@/hooks/useCreatorActiveLive";
import type { ReactNode } from "react";

type Props = {
  creatorId: string | null | undefined;
  children: ReactNode;
  className?: string;
};

/**
 * Envolve o avatar de um criador; se ele estiver ao vivo AGORA,
 * mostra uma badge verde "LIVE" no topo do avatar (estilo Instagram).
 * Clicar na badge leva à live.
 */
export function LiveAvatarBadge({ creatorId, children, className }: Props) {
  const { data } = useCreatorActiveLive(creatorId);
  const liveId = data?.id;
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      {children}
      {liveId && (
        <Link
          to="/live/$liveId"
          params={{ liveId }}
          className="absolute -top-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-lg shadow-emerald-500/40 ring-2 ring-background hover:opacity-90 transition"
          aria-label="Assistir live"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
          LIVE
        </Link>
      )}
    </div>
  );
}
