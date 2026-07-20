## Contexto

O elemento selecionado (`span` com texto "P") está no **botão da switch bar** dentro do `ProfileHeaderCard`, renderizada pelo `DashboardShell` (linhas 62-79 de `src/components/dashboard/DashboardShell.tsx`). Hoje esse círculo exibe apenas a letra "P" como placeholder para representar o perfil creator vinculado.

O `avatar_url` do creator já está disponível no banco e é passado ao `DashboardShell`, mas apenas para o header principal — a switch bar não recebe.

## Mudanças

**`src/components/dashboard/DashboardShell.tsx`**
- Adicionar prop opcional `switchBar.avatarUrl?: string | null` no tipo `SwitchBar`.
- No círculo de 32px, substituir o texto "P" por:
  - `<img>` do `switchBar.avatarUrl` quando existir (com `object-cover`, `rounded-full`, alt descritivo).
  - Fallback para a letra "P" só quando não houver avatar.
  - Manter o `Loader2` durante `loading`.

**`src/components/dashboard/SubscriberDashboard.tsx`**
- Aceitar/receber `creatorAvatarUrl` (o `profile.avatar_url` do creator vinculado) e passá-lo para `switchBar.avatarUrl` quando montar a barra "Voltar ao perfil creator".

**`src/components/dashboard/CreatorDashboard.tsx`**
- Se a switch bar "Acessar perfil gratuito" também existir aqui, passar `switchBar.avatarUrl` usando `free_avatar_url ?? avatar_url` (avatar do perfil de destino — o gratuito).

**`src/routes/_authenticated/dashboard.tsx`**
- Passar o `profile.avatar_url` (creator) para `SubscriberDashboard` e o `profile.free_avatar_url ?? profile.avatar_url` para `CreatorDashboard`, para alimentar a switch bar.

## Resultado

O círculo da barra de troca no dashboard passa a mostrar a imagem do perfil de destino (o creator vinculado quando você está no modo free; o perfil gratuito quando está no modo creator), com fallback tipográfico só se não houver imagem.
