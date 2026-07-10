Atualizar o seletor "Ordenar" da página `/subscriptions` para bater com o screenshot.

## Mudanças em `src/routes/_authenticated/subscriptions.tsx`

1. **Trocar `Popover` por um bottom sheet** usando `Sheet` do shadcn (`side="bottom"`), com cantos superiores arredondados e um handle (barra cinza) no topo.
2. **Cabeçalho do sheet**: título "Ordenar por" à esquerda e botão de fechar (X) à direita.
3. **Novas opções de ordenação** (substituindo as atuais):
   - `proxima_expiracao` — "Mais próximo da expiração" (default)
   - `distante_expiracao` — "Mais distante da expiração"
   - `nome_asc` — "Nome (A-Z)"
   - `nome_desc` — "Nome (Z-A)"
4. **Estilo das opções**: cada uma é um cartão arredondado (`rounded-2xl`) com fundo `muted`, label à esquerda e um radio circular à direita. A opção selecionada ganha borda `primary` e o radio preenchido em `primary`.
5. **Rótulo do botão "Ordenar"** no topo permanece "Ordenar" quando a opção default estiver ativa; caso contrário exibe o label da opção selecionada (mantendo comportamento atual).
6. Selecionar uma opção fecha o sheet.

Sem mudanças de dados/lógica de negócio — apenas UI do seletor de ordenação.
