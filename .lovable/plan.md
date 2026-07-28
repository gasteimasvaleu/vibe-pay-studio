## Problema

No mobile, `TabsRow` (linha 377) exibe 6 abas (`Visão geral`, `Extratos`, `Engajamento`, `Alcance`, `Assinantes`, `Superfãs`) num container `overflow-x-auto`, forçando scroll horizontal e escondendo a aba ativa.

## Solução: dropdown no mobile, tabs no desktop

Em telas `< sm`, trocar a fileira de botões por um único **trigger** que mostra a aba ativa e abre um `DropdownMenu` (shadcn, já usado no arquivo) com todas as opções. Em `sm+`, manter o layout atual de abas lado a lado — sem scroll, pois cabem confortavelmente.

Padrão visual do trigger mobile:
- Mesmo container `rounded-md border bg-card p-1`.
- Botão full-width com label da aba ativa à esquerda e `ChevronDown` à direita.
- Cada item do dropdown destaca a aba ativa com `bg-primary/15 text-primary`.

### Por que não acordeão
Acordeão consome altura vertical e exige dois cliques para trocar de aba. Dropdown mantém uma linha só, é mais rápido e é o padrão já usado em outros seletores do arquivo (`RangeSelector`).

## Escopo

- Editar apenas `TabsRow` em `src/routes/_authenticated/my-monetisex-stats.tsx` (L377–392).
- `SubTabsRow` já usa `flex-wrap` e não precisa mudar.
- Sem alterações de comportamento, dados ou tipografia.
