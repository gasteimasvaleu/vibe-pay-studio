## Criar página `/settings/security-menu`

### Arquivos
1. **`src/routes/_authenticated/settings.security-menu.tsx`** (novo)
   - `createFileRoute("/_authenticated/settings/security-menu")` com `head` (title "Segurança · Monetisexy", noindex) e `beforeLoad` verificando `supabase.auth.getUser()`.
   - Header padrão: botão voltar (ArrowLeft, `router.history.back()`), título centralizado "Segurança".
   - **Bloco de opções** (card `rounded-2xl border bg-card divide-y`):
     - "Alterar senha"
     - "Autenticação de dois fatores"
     - "Autenticação por rede social"
     - Cada linha é um botão que dispara `toast.info("Em breve")` (sem chevron, seguindo screenshot).
   - **Seção "Seus acessos"**:
     - Título bold + subtítulo "Acessos conectados recentemente".
     - Lista de cards com ícone Laptop, nome do dispositivo (ex: "Chrome"), localização ("João Pessoa, PB, BR"), data ("10 Jul 2026, 05:45"), IP + navegador.
     - Botão de 3 pontos (MoreVertical) à direita abrindo `DropdownMenu` com "Renomear" e "Remover acesso" (vermelho). Ações disparam `toast.info("Em breve")`.
     - Dados mockados (2 sessões de exemplo).
   - **Rodapé**: card único "Ver todos acessos" com chevron (dispara `toast.info("Em breve")`).

2. **`src/routes/_authenticated/settings.creator.tsx`** (editar linha 93–104)
   - `SettingsRow` "Segurança" recebe `to="/settings/security-menu"`.

### Detalhes visuais
- Seguir estilo já usado em `settings.creator.tsx` (max-w-3xl, bg-card, border-border, shadow-card).
- Dropdown via `@/components/ui/dropdown-menu` (shadcn já disponível).
- Ícones: `Laptop`, `MoreVertical`, `Pencil`, `Trash2`, `ChevronRight`, `ArrowLeft` do lucide-react.
