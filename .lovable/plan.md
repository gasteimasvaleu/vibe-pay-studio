# Menu dos "3 pontinhos" — Top postagem e Top Live

Adicionar o popover que abre ao clicar no botão `MoreVertical` de cada cartão em `src/routes/_authenticated/my-monetisex-stats.tsx`.

## Componente

Usar `DropdownMenu` do shadcn (`@/components/ui/dropdown-menu`) — já disponível no projeto.

Substituir `CardMenuButton` (atualmente um `<button>` isolado) por um novo `CardMenu` que aceita `items: { label: string; onSelect?: () => void }[]` e renderiza:

- `DropdownMenuTrigger asChild` envolvendo o mesmo botão redondo dos 3 pontinhos.
- `DropdownMenuContent align="end"` com `rounded-2xl`, padding generoso, `bg-popover text-popover-foreground border-border shadow-lg`.
- Um `DropdownMenuItem` por entrada, cada um com `py-3 text-base cursor-pointer`.

## Uso

- `TopPostagemCard` → itens:
  1. `Exibir estatísticas`
  2. `Copiar link da publicação`
  3. `Fixar post`
  4. `Arquivar post`
- `TopLiveCard` → itens:
  1. `Exibir estatísticas`

`onSelect` de cada item fica vazio por ora (apenas layout).

## Fora do escopo
- Sem ações reais (nada de copiar link / fixar / arquivar).
- Nenhuma alteração em `TopAssinantesCard` (não tem menu no screenshot).
