Criar página `/account-status` (rota `_authenticated/account-status.tsx`) acessível ao clicar no ícone `UserRoundCheck` (botão "Presença") na sidebar do chat, com o layout dos screenshots adaptado ao tema claro do app (background `#FFFFFF`, primário laranja/gradiente, tokens semânticos existentes).

## Escopo

Puramente frontend. Estado local apenas — sem persistência em backend nesta etapa (o status pode ser plugado depois em `profiles` ou tabela dedicada, mas isso não faz parte deste plano).

## Alterações

### 1. Nova rota `src/routes/_authenticated/account-status.tsx`

Layout inspirado nos screenshots, mas usando o design system do app:

- **AppTopBar** no topo (mesma navbar do chat, para consistência).
- Container centralizado `max-w-3xl mx-auto px-4 md:px-6 py-6`.
- Header da página:
  - Botão voltar (ícone `ArrowLeft`) à esquerda, que chama `router.history.back()` (fallback para `/chat`).
  - Título centralizado "Personalizar status" (`text-xl font-semibold`).
- Seção **Visibilidade**:
  - Label `text-sm font-semibold text-foreground` "Visibilidade".
  - Card `rounded-2xl border border-border bg-card` contendo 3 opções empilhadas, separadas por `divide-y divide-border`:
    1. **Online** — bolinha verde (`bg-emerald-500`) em círculo `bg-emerald-100`, título "Online", subtítulo "Disponível na plataforma".
    2. **Offline** — bolinha `bg-muted-foreground` em círculo `bg-muted`, título "Offline", subtítulo "Você vê tudo normalmente".
    3. **No chat** — ícone `MessageCircle` em círculo `bg-primary/10 text-primary`, título "No chat", subtítulo "Respondendo mensagens agora".
  - Cada linha é um botão que seleciona a opção; à direita, um indicador circular: selecionado = círculo preenchido com `bg-gradient-primary` + ícone `Check` branco; não selecionado = círculo com `border border-border`.
- Seção **Limpar status após** (visível apenas quando a opção selecionada não é "Online"):
  - Label "Limpar status após".
  - `Select` do shadcn com opções: "Não limpar", "30 minutos", "1 hora", "4 horas", "Hoje", "Esta semana". Default: "30 minutos".
- Ações no rodapé, grid `grid-cols-2 gap-3`:
  - **Cancelar** — botão outline com borda `border-foreground/20`, texto `text-foreground`, `rounded-full h-12`, ao clicar volta para `/chat`.
  - **Definir status** — botão primário com `bg-gradient-primary text-primary-foreground shadow-glow rounded-full h-12`, desabilitado enquanto nenhuma opção estiver selecionada (estado inicial vazio). Ao clicar, salva no `localStorage` (`account-status`) e navega de volta para `/chat`.

### 2. Editar `src/routes/_authenticated/chat.tsx`

- Envolver o `IconBtn` de `UserRoundCheck` (linha ~170) com um `Link to="/account-status"` (ou converter o `IconBtn` daquele item para renderizar como `Link`) para navegar até a nova página ao clicar.

## Fora de escopo

- Persistência do status em banco de dados.
- Sincronização em tempo real do status entre usuários.
- Alterações em qualquer outro arquivo além dos dois acima.
