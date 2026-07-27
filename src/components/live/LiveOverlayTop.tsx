import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveOverlayTopProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  viewers: number;
  status: "live" | "ended" | "scheduled" | string;
  mobile?: boolean;
  right?: React.ReactNode;
}

export function LiveOverlayTop({ username, displayName, avatarUrl, viewers, status, mobile = false, right }: LiveOverlayTopProps) {
  return (
    <div
      className={cn(
        "absolute left-3 right-3 flex items-center justify-between z-10 pointer-events-none",
        mobile ? "top-[calc(env(safe-area-inset-top)+0.75rem)]" : "top-3",
      )}
    >
      <Link
        to="/u/$username"
        params={{ username }}
        className="pointer-events-auto flex items-center gap-2 bg-black/45 backdrop-blur rounded-full pl-1 pr-3 py-1"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-white/20" />
        )}
        <div className="leading-tight">
          <p className="text-xs font-bold text-white truncate max-w-[140px]">{displayName || `@${username}`}</p>
          <p className="text-[10px] text-white/70 truncate max-w-[140px]">@{username}</p>
        </div>
      </Link>

      <div className="pointer-events-auto flex items-center gap-2">
        {right}
        {status === "live" && (
          <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-emerald-500 text-white font-bold text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> AO VIVO
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-white text-xs bg-black/45 backdrop-blur px-2 h-6 rounded-full">
          <Users className="h-3.5 w-3.5" /> {viewers}
        </span>
      </div>
    </div>
  );
}
