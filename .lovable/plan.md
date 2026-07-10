## Popover de ordenação para "MAIS RECENTES"

O botão de sliders no header "MAIS RECENTES" (abas Todas as mídias e Publicações) deve abrir um popover conforme o screenshot.

### Alterações em `src/routes/_authenticated/vault.tsx`

- Usar `Popover`/`PopoverTrigger`/`PopoverContent` do `@/components/ui/popover` no botão da linha 126 (o mesmo componente serve para ambas as abas, já que o botão é compartilhado).
- Dois estados locais:
  - `timeRange: "all" | "specific"` (default `"all"`).
  - `sortOrder: "recent" | "oldest"` (default `"recent"`).
- Conteúdo do popover (card branco, `rounded-2xl`, `shadow-lg`, largura ~260px, `align="end"`):
  - Grupo 1 (radio):
    - "Todo o tempo" (selecionado por padrão)
    - "Data específica"
  - Divider (`border-t border-border`)
  - Grupo 2 (radio):
    - "Mais recentes" (selecionado por padrão)
    - "Mais antigas"
  - Cada linha é um botão com um círculo radio à esquerda: quando ativo, círculo preenchido `bg-primary` com anel branco interno (donut); quando inativo, apenas borda `border-muted-foreground/40`. Rótulo `text-foreground` em fonte semibold.
- Sem lógica de filtragem por enquanto (apenas UI/estado, já que a lista ainda está vazia).
- O botão da sidebar ("PADRÃO") não é alterado nesta task.
