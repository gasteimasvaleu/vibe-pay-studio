import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


const LOGO_URL =
  "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/monetisexy3..png";

export function TopNav() {
  const [initial, setInitial] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const name =
        (data.user?.user_metadata as { username?: string } | null)?.username ??
        data.user?.email?.split("@")[0] ??
        "";
      setInitial(name.charAt(0).toUpperCase());
    });
    return () => {
      mounted = false;
    };
  }, []);

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
          <Link
            to="/dashboard"
            aria-label="Meu painel"
            className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90 transition-opacity"
          >
            {initial}
          </Link>
        </div>

      </div>
    </header>
  );
}
