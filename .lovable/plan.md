## Objetivo

Adicionar os botões **Mimo** e **Chat** ao card de identidade do perfil (após os ícones de redes sociais), seguindo o layout do screenshot: dois botões grandes lado a lado, ocupando a largura do card, cada um com ícone à esquerda e rótulo.

## Alteração

**Arquivo:** `src/routes/_authenticated/perfil.$username.tsx` — dentro do bloco de identidade (o `<div>` que começa na linha 574), após a linha de `SocialButton`s (~linha 598) e antes do bloco `isOwner` de "Editar perfil".

- Renderizar apenas quando `!isOwner`.
- Grid de 2 colunas com `gap-3`, respeitando o padding direito do card (`pr-4 md:pr-6`).
- Cada botão:
  - Altura ~56px, `rounded-2xl`, fundo `bg-secondary`/`bg-muted` sutil, borda `border-border`, hover leve.
  - Ícone circular à esquerda + rótulo centralizado no restante.
  - **Mimo**: ícone `DollarSign` dentro de um círculo, rótulo "Mimo". `onClick`: `setTipPubId(undefined); setTipOpen(true)` (abre o `TipDialog` já existente sem publicação específica).
  - **Chat**: ícone `MessageCircle` dentro de um círculo, rótulo "Chat". `onClick`: `navigate({ to: "/chat" })`.
- Ícones e imports: `DollarSign` já é usado no arquivo; `MessageCircle` já está importado. Nenhum import novo necessário.

## Fora de escopo

- Bio/descrição do perfil (o screenshot mostra "A Rede Social Brasileira.", mas o campo não existe hoje no `profiles` selecionado — não faz parte do pedido).
- Mudar o topo do card (avatar, banner, badge de verificado).
- Remover o card `SubscriptionPlansCard` que aparece abaixo — os botões novos são adicionais, não substituem os planos de assinatura.
