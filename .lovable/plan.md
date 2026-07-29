# Plano: Padronizar todos os menus "..." com o estilo do `PublicationOptionsMenu`

## Objetivo
Aplicar em todos os menus de três pontinhos (`MoreVertical` / `MoreHorizontal`) o mesmo padrão visual do popover usado em `PublicationOptionsMenu` no feed: `Popover` arredondado (`rounded-3xl`), lista interna agrupada em `rounded-2xl` com divisores, ícones à esquerda, e ação destrutiva destacada em bloco separado `bg-destructive/10`. Nada de bottom sheet — só popover, como já é hoje no feed.

## Referência visual (padrão a ser replicado)
`src/components/feed/PublicationOptionsMenu.tsx`:
- `PopoverContent` com `w-[340px] rounded-3xl p-4 bg-card border border-border shadow-xl` (`align="end" sideOffset={8}`).
- Lista principal em `rounded-2xl bg-background border border-border overflow-hidden divide-y divide-border`.
- Cada item: `flex items-center gap-4 px-4 py-3.5`, ícone `h-6 w-6 strokeWidth={1.75}`, label `text-sm font-semibold text-foreground`, hover `hover:bg-foreground/5`.
- Bloco destrutivo separado no fim: `mt-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15` com ícone/label `text-destructive`.

## Estratégia
1. Criar um componente compartilhado `src/components/ui/action-popover.tsx` que exporta:
   - `ActionPopover` (wrapper de `Popover`, aceita `trigger`, `align`, `open/onOpenChange`, `widthClass`).
   - `ActionPopoverList` (container `divide-y` arredondado).
   - `ActionPopoverItem` (botão com ícone + label; opcional `variant="default" | "destructive"`; suporta `disabled`).
   - `ActionPopoverDestructive` (bloco separado `mt-3` com fundo `bg-destructive/10`).
   - Reutilizar tokens semânticos — nunca cores fixas.
2. Refatorar `PublicationOptionsMenu` para usar o novo componente sem mudar comportamento.
3. Migrar cada menu existente que hoje usa `DropdownMenu` (ou `Popover` ad-hoc) para `ActionPopover`, preservando 100% das ações, permissões e handlers. Ajustar tamanho de ícones/padding em contextos menores (ex.: comentários, mensagens de chat) onde as opções são poucas: usar as mesmas classes utilitárias, apenas com `widthClass` menor (`w-[280px]`) quando adequado.

## Arquivos a migrar (um por vez, sem alterar lógica)
- `src/components/chat/ThreadActionsMenu.tsx` — ações de conversa (Ver perfil, Silenciar, Restringir, Denunciar, Limpar, Apagar). Destrutivo: "Apagar conversa".
- `src/components/chat/MessageActionsMenu.tsx` — ações da mensagem (Responder, Copiar, Encaminhar, Denunciar, Apagar). Destrutivo: "Apagar mensagem" (dono) / "Denunciar" (viewer).
- `src/components/feed/CommentsSheet.tsx` — menu do comentário (Denunciar, Apagar). Destrutivo conforme dono/viewer.
- `src/routes/_authenticated/perfil.$username.tsx` — menu do header do perfil público. Já é `Popover`; só substituir pelo componente unificado.
- `src/routes/_authenticated/profile.$username.tsx` — variante do perfil; unificar.
- `src/routes/_authenticated/vault.tsx` — menu por item do cofre.
- `src/routes/_authenticated/publicacoes-agendadas.tsx` — menu por publicação agendada.
- `src/routes/_authenticated/my-monetisex-stats.tsx` — menu do card de destaque.
- `src/routes/_authenticated/settings.security-menu.tsx` — menu por sessão/dispositivo.
- `src/routes/_authenticated/settings.device-management.index.tsx` — menu por dispositivo.

## Regras de migração
- **Não alterar** os handlers, mutations, permissões, textos ou fluxos de confirmação (`AlertDialog`) existentes.
- Manter `align="end"` e `sideOffset={8}` como padrão.
- Manter o gatilho atual (o botão `MoreVertical`/`MoreHorizontal` de cada tela); só trocar o conteúdo do popover.
- Quando uma tela tinha `DropdownMenuSeparator`, mapear para a divisão natural entre `ActionPopoverList` (ações neutras) e `ActionPopoverDestructive` (ação destrutiva). Se houver mais de um grupo neutro, usar `ActionPopoverList` extra com `mt-3`.
- Para itens com estado (ex.: "Silenciado"), preservar a label e o ícone atuais.
- Não introduzir `window.confirm`/`window.prompt`. Confirmações continuam via `AlertDialog` já existente em cada tela.

## Escopo fora
- Sem mudanças de RLS, server functions, rotas, dados ou regras de negócio.
- Sem alteração no `PublicationCard` além, eventualmente, do import do menu.
- Componentes `breadcrumb.tsx` e `pagination.tsx` do shadcn não são menus de ações e ficam fora.

## Critérios de aceitação
- Todos os menus "..." abrem com o mesmo visual do menu atual do feed (popover arredondado, itens com ícone à esquerda, ação destrutiva destacada).
- Todas as ações continuam funcionando exatamente como antes (mesmos handlers, mesmos toasts, mesmos diálogos de confirmação).
- Responsivo: largura fixa (`w-[340px]` ou `w-[280px]` para menus pequenos), sem estourar a viewport em mobile — o `Popover` do Radix já respeita colisão de bordas.
- Nenhum warning novo no console; typecheck limpo.

## Verificação
- Build/typecheck automáticos.
- Abrir cada menu no preview (feed, chat lista, chat mensagem, comentário, perfil, vault, agendadas, stats, sessões, dispositivos) e conferir visual + ação principal + ação destrutiva.