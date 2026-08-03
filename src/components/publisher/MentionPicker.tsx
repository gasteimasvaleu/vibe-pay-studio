import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import type { MentionedProfile } from "@/lib/publications.functions";

function escapeIlike(input: string) {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function MentionPicker({
  selected,
  onChange,
}: {
  selected: MentionedProfile[];
  onChange: (next: MentionedProfile[]) => void;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<MentionedProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    let alive = true;
    if (debounced.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const pattern = `%${escapeIlike(debounced.replace(/^@/, ""))}%`;
    void (supabase as any)
      .from("creator_profiles_search")
      .select("id, user_id, username, display_name, avatar_url, cover_url, verified_at")
      .eq("restrict_mentions", false)
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(8)
      .then(({ data }: any) => {
        if (!alive) return;
        setResults(
          ((data ?? []) as any[]).map((r) => ({
            id: r.id,
            user_id: r.user_id,
            username: r.username,
            display_name: r.display_name ?? null,
            avatar_url: r.avatar_url ?? null,
            cover_url: r.cover_url ?? null,
            verified: !!r.verified_at,
          })),
        );
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced]);

  const add = (p: MentionedProfile) => {
    if (selected.some((s) => s.id === p.id)) return;
    onChange([...selected, p]);
    setTerm("");
    setResults([]);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Referenciar perfis</p>
        <p className="text-xs text-muted-foreground">
          Visível apenas para administradores. Os perfis aparecem abaixo da legenda.
        </p>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-background border border-border text-xs"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={p.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {p.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              @{p.username}
              <button
                type="button"
                aria-label={`Remover @${p.username}`}
                onClick={() => onChange(selected.filter((s) => s.id !== p.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar @usuário"
          className="pl-9 h-9 bg-background"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-foreground/5 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {p.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">
                  {p.display_name ?? p.username}
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  @{p.username}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
