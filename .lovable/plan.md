## Criar página `/settings/device-management`

### Arquivos
1. **`src/routes/_authenticated/settings.device-management.tsx`** (novo)
   - `createFileRoute("/_authenticated/settings/device-management")` com `head` (title "Seus acessos · Monetisexy", noindex) e `beforeLoad` verificando `supabase.auth.getUser()`.
   - Header padrão: botão voltar (ArrowLeft, `router.history.back()`), título "Seus acessos".
   - **Seção "Acessos conectados"**:
     - Título bold + parágrafo descritivo: "Estes são todos os acessos conectados à sua conta. Caso não reconheça algum deles, remova todos os acessos e `troque sua senha` para mais segurança" (com "troque sua senha" sublinhado, clicável → `toast.info("Em breve")`).
   - **Subseção "Acesso atual"**:
     - Título bold + 1 card do acesso atual (Chrome, João Pessoa PB BR, data, IP) com menu 3 pontos (Renomear / Remover acesso).
   - **Subseção "Outros acessos"**:
     - Título bold + lista de cards (mock com 3 sessões) mesmo formato. Suporte a `showAll` state — inicialmente mostra 2, botão "Ver mais" revela restante.
   - **Botão "Ver mais"** (card branco full-width, texto centralizado) — visível apenas se houver mais sessões. Alterna `showAll`.
   - **Botão "Remover todos os acessos"** (card branco full-width, texto centralizado `text-destructive`, dispara `toast.info("Em breve")`).
   - **Card "Ver acessos removidos"** (chevron à direita, `toast.info("Em breve")`).
   - Reutiliza `DropdownMenu` shadcn com "Renomear" / "Remover acesso" (vermelho).

2. **`src/routes/_authenticated/settings.security-menu.tsx`** (editar)
   - Botão "Ver todos acessos" (linha 87) vira um `<Link to="/settings/device-management">` no lugar do `<button onClick={soon}>`.

### Detalhes visuais
- Mesmo estilo dos outros cards de settings (`rounded-2xl border-border bg-card shadow-card`).
- Ícone Laptop para dispositivos, MoreVertical para menu, ChevronRight para "Ver acessos removidos".
- Layout `max-w-3xl mx-auto` como as outras.
