## Mudança

Aplicar o mesmo padrão do `TabsRow` ao `SubTabsRow` (`src/routes/_authenticated/my-monetisex-stats.tsx` L394–408), que renderiza as sub-abas (`Faturamento`, `Destaques`, `Sequência de atividades`, `Resumo`, etc.).

- **Mobile (`< sm`)**: substituir os chips `flex-wrap` por um `DropdownMenu` full-width mostrando a sub-aba ativa + `ChevronDown`, com os itens do dropdown destacando o selecionado (`bg-primary/15 text-primary`).
- **Desktop (`sm+`)**: manter o layout atual de chips com borda lado a lado, inalterado.

Sem mudanças em dados, tipografia, ou nos consumidores do componente.
