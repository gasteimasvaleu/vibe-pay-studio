## Objetivo
Criar a página `/settings/security` (UI mock) com a lista de provedores de rede social, acessada ao clicar em "Autenticação por rede social" no menu de Segurança.

## Arquivos

**Novo:** `src/routes/_authenticated/settings.security.tsx`
- Rota: `/_authenticated/settings/security`
- `head()`: título "Autenticação por rede social · Monetisexy", `noindex`
- `beforeLoad`: auth check padrão via `supabase.auth.getUser()`
- Layout seguindo o screenshot:
  - Header padrão (botão voltar, título centralizado "Autenticação por rede social")
  - `main max-w-5xl mx-auto px-4 md:px-6 py-6`
  - Card grande `rounded-2xl border border-border bg-card shadow-card p-5 space-y-4`:
    - Título `h2` bold "Autenticação por rede social"
    - Grid `grid grid-cols-1 md:grid-cols-3 gap-3` com 3 pills:
      - Google · conectado (ícone G colorido inline SVG)
      - Twitter · não conectado (ícone X — usar `lucide-react` `Twitter` ou SVG inline do X)
      - Apple · não conectado (ícone Apple — SVG inline, já que lucide não tem)
    - Cada pill: `flex items-center justify-center gap-2 rounded-full bg-background/60 px-5 py-3 text-sm text-foreground`, mock estático (sem interação por enquanto — `onClick` faz `toast.info("Em breve")`)

**Editado:** `src/routes/_authenticated/settings.security-menu.tsx`
- Trocar `{ label: "Autenticação por rede social" }` (linha 79) por `{ label: "Autenticação por rede social", to: "/settings/security" }` para o item virar `<Link>`.

## Observações
- Página puramente visual/mock; nenhum fluxo real de OAuth, backend ou banco.
- Ícones de Google/Apple/X são inline SVG (não há na lucide para Google/Apple).
