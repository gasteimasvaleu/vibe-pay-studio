import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageCircle, Check, X, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  checkUsernameAvailability,
  updateProfileIdentity,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/settings/social")({
  head: () => ({
    meta: [
      { title: "Nome de perfil e identificador · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, active_profile_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: creatorProfiles } = await supabase
      .from("creator_profiles")
      .select("id, kind, username, display_name")
      .eq("user_id", user.id);
    const rows = (creatorProfiles ?? []) as Array<{
      id: string;
      kind: "paid" | "free";
      username: string;
      display_name: string | null;
    }>;
    const activeCreator =
      rows.find((row) => row.id === profile?.active_profile_id) ??
      rows.find((row) => row.kind === "paid") ??
      rows[0] ??
      null;
    const username =
      activeCreator?.username ?? profile?.username ?? user.email?.split("@")[0] ?? "voce";
    const displayName =
      activeCreator?.display_name ??
      (activeCreator?.kind === "paid" ? profile?.display_name : null) ??
      username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];
    return { username, displayName };
  },
  component: SettingsSocialPage,
});

const USERNAME_RE = /^[a-z0-9_][a-z0-9_]{2,29}$/;

type Status =
  | { kind: "idle" }
  | { kind: "invalid"; message: string }
  | { kind: "checking" }
  | { kind: "self" }
  | { kind: "available" }
  | { kind: "taken" };

function SettingsSocialPage() {
  const router = useRouter();
  const { username: initialUsername, displayName: initialDisplayName } =
    Route.useRouteContext();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [handle, setHandle] = useState(initialUsername);
  const [status, setStatus] = useState<Status>({ kind: "self" });
  const [saving, setSaving] = useState(false);
  const reqIdRef = useRef(0);

  const checkFn = useServerFn(checkUsernameAvailability);
  const saveFn = useServerFn(updateProfileIdentity);

  const displayNameValid = useMemo(() => {
    const v = displayName.replace(/\s+/g, " ").trim();
    return v.length >= 2 && v.length <= 40;
  }, [displayName]);

  useEffect(() => {
    if (handle === initialUsername) {
      setStatus({ kind: "self" });
      return;
    }
    if (!USERNAME_RE.test(handle) || handle.startsWith("_")) {
      setStatus({
        kind: "invalid",
        message:
          "Use 3–30 caracteres: letras, números ou _ (não pode começar com _).",
      });
      return;
    }
    setStatus({ kind: "checking" });
    const id = ++reqIdRef.current;
    const t = window.setTimeout(async () => {
      try {
        const res = await checkFn({ data: { username: handle } });
        if (id !== reqIdRef.current) return;
        if (!res.available) {
          if ("reason" in res && res.reason === "reserved") {
            setStatus({ kind: "invalid", message: "Este identificador é reservado." });
          } else if ("reason" in res && res.reason === "invalid_format") {
            setStatus({ kind: "invalid", message: "Formato inválido." });
          } else {
            setStatus({ kind: "taken" });
          }
        } else if (res.isSelf) {
          setStatus({ kind: "self" });
        } else {
          setStatus({ kind: "available" });
        }
      } catch {
        if (id !== reqIdRef.current) return;
        setStatus({ kind: "invalid", message: "Erro ao verificar." });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [handle, initialUsername, checkFn]);

  const hasChanges =
    (displayName.replace(/\s+/g, " ").trim() !== initialDisplayName ||
      handle !== initialUsername);
  const canSave =
    hasChanges &&
    displayNameValid &&
    (status.kind === "self" || status.kind === "available");

  async function onSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await saveFn({
        data: { displayName, username: handle },
      });
      if (res.ok) {
        toast.success("Perfil atualizado");
        await router.invalidate();
      } else if (res.reason === "username_taken") {
        setStatus({ kind: "taken" });
        toast.error("Este identificador já está em uso");
      } else if (res.reason === "invalid_display_name") {
        toast.error("Nome do perfil inválido");
      } else {
        toast.error("Não foi possível salvar");
      }
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    setDisplayName(initialDisplayName);
    setHandle(initialUsername);
    setStatus({ kind: "self" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Nome de perfil e Identificador
          </h1>
          <div className="w-9" aria-hidden="true" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3">
        <label className="group block rounded-2xl border border-transparent bg-muted/60 px-5 py-3 transition-colors hover:bg-muted/40 hover:border-border focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
          <span className="block text-xs text-muted-foreground transition-colors group-focus-within:text-primary">
            Nome do Perfil
          </span>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="border-0 bg-transparent p-0 h-auto text-lg text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </label>
        {!displayNameValid && (
          <p className="px-5 text-xs text-destructive">
            Use entre 2 e 40 caracteres.
          </p>
        )}

        <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-muted/60 px-5 py-3 transition-colors hover:bg-muted/40 hover:border-border focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
          <MessageCircle className="h-6 w-6 text-muted-foreground shrink-0 transition-colors group-focus-within:text-primary" />
          <div className="flex-1 min-w-0">
            <span className="block text-xs text-muted-foreground transition-colors group-focus-within:text-primary">
              monetisexy.com.br/(seu @)
            </span>
            <Input
              value={handle}
              onChange={(e) =>
                setHandle(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "")
                    .slice(0, 30),
                )
              }
              className="border-0 bg-transparent p-0 h-auto text-lg text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </label>

        <div className="px-5 text-xs min-h-[1rem]">
          {status.kind === "checking" && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Verificando…
            </span>
          )}
          {status.kind === "available" && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <Check className="h-3 w-3" /> Disponível
            </span>
          )}
          {status.kind === "taken" && (
            <span className="inline-flex items-center gap-1.5 text-destructive">
              <X className="h-3 w-3" /> Já está em uso
            </span>
          )}
          {status.kind === "self" && (
            <span className="text-muted-foreground">
              Este é seu identificador atual.
            </span>
          )}
          {status.kind === "invalid" && (
            <span className="text-destructive">{status.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            variant="default"
            onClick={onSave}
            disabled={!canSave || saving}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onCancel}
            disabled={!hasChanges}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Cancelar
          </Button>
        </div>
      </main>
    </div>
  );
}
