## Objetivo
Fazer o toggle de "Modo noturno" em `/settings/theme` realmente aplicar tema escuro em toda a aplicação, sem flash na carga inicial.

## Situação atual
- `settings.theme.tsx` já grava `localStorage.theme` e alterna a classe `.dark` no `<html>`.
- `ThemeInit` aplica a classe no mount.
- `src/styles.css` define **apenas tokens do tema claro** — não há bloco `.dark { ... }`, então ativar o toggle hoje não muda nada visualmente.
- Vários headers/containers usam `bg-white` hardcoded (inclusive o header desta própria página), o que quebra o dark mode mesmo quando os tokens existirem.

## Escopo da mudança (apenas UI/tema)

### 1. Tokens de tema escuro em `src/styles.css`
Adicionar bloco `.dark { ... }` sobrescrevendo os mesmos tokens do `:root` (background, foreground, card, popover, primary, secondary, muted, accent, border, input, ring, surface, surface-2, destructive, success, gradientes e sombras) com uma paleta escura coerente com a identidade lilás atual (fundo quase preto com leve tint roxo, superfícies elevadas em cinza-arroxeado, primary mantido/ajustado para contraste AA).

### 2. Anti-flash na primeira renderização
Injetar um pequeno script inline no `<head>` (via `head()` de `src/routes/__root.tsx`) que, antes do React montar, lê `localStorage.theme` e adiciona `dark` em `document.documentElement` — evita flash claro→escuro em usuários que já escolheram dark. `ThemeInit` permanece como fallback.

### 3. Trocar `bg-white` hardcoded por token semântico
Substituir `bg-white` por `bg-card` (ou `bg-background`, conforme o caso) nos headers/superfícies que precisam responder ao tema. Alvos com maior impacto visual em todas as páginas autenticadas:
- `src/routes/_authenticated/settings.theme.tsx` (header)
- `src/routes/_authenticated/settings.restrictions.tsx` (header — mesmo padrão)
- Demais arquivos de `settings.*.tsx`, `chat.*.tsx`, `subscriptions.tsx`, `vault.tsx`, `bugreport.tsx`, `criar-perfil-gratuito.tsx`, `creator.onboarding.redes-sociais.tsx`, `settings.two-factor.*` — mesma troca `bg-white` → `bg-card`.
- `src/components/onboarding/OnboardingShell.tsx`, `src/components/feed/PublicationCard.tsx`, `src/components/feed/MediaLightbox.tsx` (o lightbox mantém `bg-black`; ajustar só onde `bg-white` estiver como superfície de UI).
- `src/routes/index.tsx` (landing pública) fica **fora do escopo** — landing continua com fundo claro fixo.

### 4. Feedback imediato no próprio toggle
`settings.theme.tsx` já reflete o estado no texto; nenhum trabalho extra além da troca `bg-white` → `bg-card` no header.

## Fora de escopo
- Nenhuma alteração em regras de negócio, tabelas, RLS, server functions ou fluxo de restrições.
- Não vamos revisar todas as páginas públicas/marketing; foco é a área logada, onde vive o toggle.
- Modo "sistema" (prefers-color-scheme automático) — mantém apenas claro/escuro manual.

## Resultado esperado
Ao ativar o switch em `/settings/theme`, toda a área autenticada muda para tema escuro imediatamente, a preferência persiste em `localStorage`, e recargas não mostram flash de tema claro antes do dark ser aplicado.