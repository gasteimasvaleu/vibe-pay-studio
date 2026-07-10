## Popover de ordenação para a sidebar "PADRÃO"

O botão de sliders no header da sidebar "PADRÃO" (linha 105 de `vault.tsx`) deve abrir um popover com dois grupos de radios, seguindo o screenshot.

### Alterações em `src/routes/_authenticated/vault.tsx`

- Envolver o botão existente com `Popover`/`PopoverTrigger`/`PopoverContent` (já importados).
- Reutilizar o componente `RadioRow` já existente para as linhas.
- Dois novos estados locais:
  - `sidebarSort: "padrao" | "nome" | "recentes" | "midias"` (default `"padrao"`)
  - `sidebarDirection: "asc" | "desc"` (default `"asc"`)
- Conteúdo do popover (`align="start"`, `w-64`, `rounded-2xl`, `p-2`):
  - Grupo 1 (radio):
    - Padrão (default)
    - Nome
    - Recentes
    - Mídias
  - Divider `border-t border-border` com `my-2`.
  - Grupo 2 (radio):
    - Ascendente (default)
    - Decrescente
- Sem lógica de ordenação real por enquanto (apenas UI/estado; sidebar ainda é estática).
