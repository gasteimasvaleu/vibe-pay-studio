import { Link } from "@tanstack/react-router";
import { Bell, MessageCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function IconButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

export function AppTopBar() {
  const [username, setUsername] = useState<string>("voce");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("profiles_public")
        .select("username")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      setUsername(profile?.username ?? userData.user.email?.split("@")[0] ?? "voce");
    })();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border backdrop-blur-md bg-background/80">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
        <Link to="/feed" className="text-lg font-black tracking-tight text-foreground">
          moneti<span className="text-gradient-primary">sexy.</span>
        </Link>
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <label className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar creators, tags, posts..."
              className="w-full h-10 pl-10 pr-4 rounded-md bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:bg-accent transition-colors"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <IconButton aria-label="Notificações"><Bell className="h-5 w-5" /></IconButton>
          <Link
            to="/chat"
            aria-label="Mensagens"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground transition-colors px-3"
          >
            {signingOut ? "Saindo..." : "Sair"}
          </button>
          <Link
            to="/dashboard"
            aria-label="Meu painel"
            className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center font-bold text-sm text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            {username.slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
