import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyRoles } from "@/lib/admin-dashboard.functions";

const LOGO_URL =
  "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/monetisexy3..png";

export function TopNav() {
  const [initial, setInitial] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user;
      setSignedIn(!!user);
      const name =
        (user?.user_metadata as { username?: string } | null)?.username ??
        user?.email?.split("@")[0] ??
        "";
      setInitial(name.charAt(0).toUpperCase());

      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("avatar_url, free_avatar_url, active_view")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!mounted) return;
        const inFree = prof?.active_view === "free";
        const resolved = inFree
          ? prof?.free_avatar_url ?? prof?.avatar_url ?? null
          : prof?.avatar_url ?? null;
        setAvatarUrl(resolved);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getRoles = useServerFn(getMyRoles);
  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getRoles(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const isAdmin = rolesQ.data?.isAdmin ?? false;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-2">
        <Link to="/feed" aria-label="Monetisexy" className="flex items-center">
          <img src={LOGO_URL} alt="Monetisexy" className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            aria-label="Buscar"
            className="h-9 w-9 grid place-items-center rounded-full text-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-5 w-5" />
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Painel admin"
              className="h-9 w-9 grid place-items-center rounded-full text-primary hover:bg-accent transition-colors"
            >
              <ShieldCheck className="h-5 w-5" />
            </Link>
          )}
          <Link
            to="/dashboard"
            aria-label="Meu painel"
            className="h-9 w-9 rounded-full overflow-hidden ring-1 ring-border hover:opacity-90 transition-opacity"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Meu painel"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="h-full w-full grid place-items-center bg-gradient-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                {initial}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

