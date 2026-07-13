## Objetivo

Padronizar visualmente o cabeçalho abaixo da navbar em todas as páginas autenticadas: mesmo estilo de título, mesmo botão de voltar (com efeito hover em círculo).

## Padrão único

**Título (h1):**
- `text-base font-semibold text-foreground truncate` (mesmo padrão já usado no `DashboardShell`)

**Botão voltar:**
- `h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors`
- Ícone: `<ArrowLeft className="h-5 w-5" />`
- `aria-label="Voltar"`

Esse é exatamente o mesmo padrão que já existe em `src/components/dashboard/DashboardShell.tsx` (usado como referência canônica).

## Implementação

1. Criar um componente compartilhado `src/components/site/PageHeader.tsx` com:
   - Props: `title: string`, `onBack?: () => void` (default: `router.history.back()`), `right?: ReactNode`
   - Renderiza `<header class="... bg-white">` com o botão voltar padronizado à esquerda, título centralizado e slot opcional à direita.
   - Mantém o wrapper existente (`max-w-3xl mx-auto ... py-3`, `bg-white`, `border-b`).

2. Substituir os `<header>` manuais nas seguintes páginas para usar `<PageHeader />`, preservando qualquer conteúdo do slot direito (ex: botões de "Salvar", menus, ações):

   - `profile.$username.tsx` (título "Meu perfil" + dropdown à direita)
   - `perfil.$username.tsx`
   - `vault.tsx` (2 headers)
   - `subscriptions.tsx`
   - `settings.two-factor.setup.tsx`, `settings.two-factor.index.tsx`
   - `settings.theme.tsx`, `settings.subscription.tsx`
   - `settings.social.tsx`, `settings.social-media.tsx`
   - `settings.security.tsx`, `settings.security-menu.tsx`
   - `settings.restrictions.tsx`, `settings.details.tsx`
   - `settings.change-password.tsx`, `settings.muted.tsx`
   - `settings.device-management.index.tsx`, `settings.device-management.removed.tsx`
   - `settings.privacy.tsx`, `settings.privacy-mail.tsx`, `settings.privacy-options.tsx`
   - `settings.personal.tsx`, `settings.creator.tsx`, `settings.myprofile.tsx`
   - `settings.chat-settings.tsx`, `settings.language.tsx`
   - `mywallet.index.tsx`, `mywallet.extrato.tsx`, `mywallet.recarregar.tsx`
   - `content-leak-report.tsx`, `my-monetisex-stats.tsx`
   - `follow.tsx`, `bugreport.tsx`, `colecoes.tsx`, `promotions.tsx`
   - `banco.tsx` (2 headers), `banco.cadastrar.tsx`
   - `account-status.tsx`, `publisher.tsx`
   - `criar-perfil-gratuito.tsx`
   - `PromotionShell.tsx`

3. Manter fora do padrão (têm layout próprio):
   - `DashboardShell.tsx` (já é a referência, mas manter o link "Feed" no slot direito)
   - `OnboardingShell.tsx` (fluxo de onboarding)
   - Cabeçalhos internos de chat (`chat.$threadId.tsx`, `chat-agendamento.tsx`, `chat-configuracoes.tsx`) — pertencem à UI de chat, não ao padrão de página; podem opcionalmente usar `PageHeader` se você quiser incluí-los. **Confirmar se devem entrar.**

4. Validar com `tsgo --noEmit` e `bun run build`.

## Pergunta

Os cabeçalhos das telas de chat (`chat.$threadId.tsx`, `chat-agendamento.tsx`, `chat-configuracoes.tsx`) devem também seguir o padrão, ou ficam com o layout próprio da UI de chat?
