Implementar o campo de busca do cabeçalho esquerdo da página `/vault` conforme o screenshot de referência.

## Alterações em `src/routes/_authenticated/vault.tsx`

1. **Adicionar estados de busca**:
   - `searchOpen: boolean` (controla se o input de busca está aberto).
   - `searchQuery: string` (valor digitado no input).

2. **Comportamento do cabeçalho esquerdo**:
   - Quando `searchOpen` é `false`, exibir o título "ACERVO" e os botões de lupa e + (como está hoje).
   - Quando `searchOpen` é `true`, ocultar o título "ACERVO" e o botão +, e exibir um campo de busca no lugar.

3. **Design do campo de busca** (baseado no screenshot):
   - Input arredondado tipo "pill" com borda laranja/coral (`border-primary` ou tom semelhante).
   - Placeholder "Buscar".
   - Botão de **X** à esquerda para fechar o input e restaurar o título/botões.
   - Ícone de **lupa** à direita (dentro do input ou como elemento decorativo).
   - Foco automático ao abrir.
   - Fechar também ao pressionar `Escape`.

4. **Filtrar a lista da sidebar**:
   - Aplicar `searchQuery` como filtro nos itens do menu "PADRÃO" (Todas as mídias, Publicações, Conversas, Envios), comparando o termo com o `label` de cada aba (case-insensitive).
   - Se `searchQuery` estiver vazio, mostrar todos os itens normalmente.

5. **Acessibilidade**:
   - Manter rótulos `aria-label` nos botões de fechar e buscar.

Nenhuma nova rota, servidor ou banco de dados será criado. Apenas UI e estado local no componente existente.