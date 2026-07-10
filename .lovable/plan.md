## Ajuste no Sheet de ordenação de Assinaturas

O sheet de ordenação em `src/routes/_authenticated/subscriptions.tsx` está ocupando toda a largura horizontal na versão desktop. Vamos alinhar ele com o mesmo padrão usado no sheet "Filtrar por" do chat.

### O que será feito

- Alterar a classe `className` do `SheetContent` na rota `subscriptions.tsx` para limitar a largura a **420px** em telas a partir de `sm`.
- Manter os estilos atuais do sheet: cantos arredondados no topo, sem borda superior, sem padding interno padrão.

### Classe resultante esperada

```text
"rounded-t-3xl border-t-0 p-0 sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0"
```

### Por quê

O `SheetContent` com `side="bottom"` usa `inset-x-0` por padrão, o que força largura total. Nos outros sheets da aplicação (como o de filtros do chat), essa largura é limitada no breakpoint `sm:` com `max-w-[420px]` + `mx-auto` + `left-0`/`right-0` para centralizar o conteúdo sem estourar a tela.

### Escopo

Apenas UI. Sem mudança de comportamento, estado, lógica de negócio ou dados.