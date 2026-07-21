Objetivo: alterar o botão/link "Ver todas as transações" no final da página `/mywallet` para usar a cor padrão do app, ocupar a mesma largura horizontal dos elementos acima e ficar centralizado.

Local: `src/routes/_authenticated/mywallet.index.tsx`, linha ~503 (componente `<Button asChild variant="outline" ...>`).

Alterações:
1. Trocar `variant="outline"` para `variant="default"` — isso aplica `bg-primary` e `text-primary-foreground`, a cor padrão do app.
2. Remover as classes customizadas de cor/borda (`text-primary border-primary hover:text-primary hover:bg-primary/10`).
3. Adicionar `w-full` para que o botão ocupe toda a largura da seção, igual à lista de transações acima.
4. Manter o conteúdo centralizado (o botão já usa `justify-center` internamente; adicionar `text-center` de redundância se desejado).

Resultado esperado: botão roxo/lilás (cor primária), texto na cor de contraste, alinhado à largura dos cards/listas acima e centralizado.