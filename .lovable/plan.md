## Plano: página `/settings/creator`

**Nova rota:** `src/routes/_authenticated/settings.creator.tsx` (autenticada, `noindex`).

**Link:** em `CreatorDashboard.tsx`, adicionar `to="/settings/creator"` no `ActionCard` "Definições".

**Layout** (seguindo os screenshots, mesma estrutura das outras páginas do dashboard):

- Header padrão full-width: `border-b border-border backdrop-blur-md bg-card/80`, com botão voltar à esquerda (`ArrowLeft`, `router.history.back()`), título centralizado **"Configurações de Perfil"** e spacer `w-9` à direita.
- Main `max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8`.
- **Card de perfil** (destaque no topo): `rounded-2xl border border-border bg-card p-4 shadow-card`, com `Avatar` grande à esquerda (dados vindos do `useAuth`/`profile` já usado no dashboard — nome + `@username`), textos no meio, `ChevronRight` à direita. Link para `/perfil/$username` com o username do usuário atual.
- **Grupo "Perfil"** (h2 `text-sm font-bold` acima): lista dentro de um wrapper `rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border` com 2 linhas:
  - `Assinatura` — ícone `DollarSign`, `to="/mywallet"` (placeholder até ter rota específica).
  - `Dados Pessoais` — ícone `User`, `to="/creator/onboarding/documentos"` (placeholder).
- **Grupo "Geral"** (h2 `text-sm font-bold` acima): mesmo wrapper com 6 linhas:
  - `Segurança` — `Shield`.
  - `Privacidade` — `EyeOff`.
  - `Configuração do chat` — `MessageCircle`, `to="/chat-configuracoes"`.
  - `Assinantes restritos` — `UserX`.
  - `Tema` — `CircleHalf` (ou `Contrast`).
  - `Idioma` — `Globe`.

Rows sem rota ainda navegam via `onClick` com `toast.info("Em breve")` (sem quebrar o layout). Todas as linhas têm hover `hover:bg-accent`, altura confortável (`px-4 py-4`), ícone à esquerda em `text-foreground`, label `text-base`, `ChevronRight` à direita em `text-muted-foreground`.

**Componente auxiliar interno** `SettingsRow` no mesmo arquivo — recebe `icon`, `label`, `to?`, `onClick?` — para evitar repetição.

**Sem alterações** em backend, outras rotas ou outros arquivos além dos dois listados.
