## Trocar bottom sheet por popover flutuante

O usuário quer um menu flutuante ancorado ao botão de três pontos (como no screenshot), não um sheet inferior.

### Mudanças

**`src/components/feed/PublicationOptionsSheet.tsx` → renomear para `PublicationOptionsMenu.tsx`**

- Trocar `Sheet` + `SheetContent` por `Popover` + `PopoverTrigger` + `PopoverContent` do shadcn (`@/components/ui/popover`).
- O trigger deixa de ser controlado externamente por estado — o `PopoverTrigger asChild` envolve o botão `MoreVertical` diretamente. Alinhamento `align="end"` e `sideOffset={8}` para posicionar abaixo/próximo ao botão, com pequena setinha caindo naturalmente da borda superior direita.
- Largura fixa `w-[340px]`, `rounded-3xl`, `p-4`, sombra elegante (`shadow-xl`), borda sutil, fundo `bg-card`.
- Manter o layout das opções exatamente como está hoje:
  - Card interno arredondado com as 5 opções empilhadas (Copiar link, Favoritos, Editar legenda, Desabilitar comentários, Arquivar post) separadas por `divide-y`.
  - Botão "Excluir post" separado embaixo, em vermelho (`bg-destructive/10`, `text-destructive`).
- Manter os mesmos handlers (`copyLink`, `soon`, `onToggleBookmark`) e o fechamento do popover após cada ação (via estado interno `open`/`onOpenChange`).
- Animação: o `PopoverContent` do shadcn já tem `data-[state=open]:animate-in fade-in-0 zoom-in-95` — manter, é o feel do screenshot.

**`src/components/feed/PublicationCard.tsx`**

- Remover o estado `optionsOpen` e o `<PublicationOptionsSheet ... />` renderizado fora do header.
- Envolver o botão `MoreVertical` com `<PublicationOptionsMenu item={item} onToggleBookmark={...}>` que provê o trigger + conteúdo.
- Atualizar o import.

Nenhuma mudança em outros arquivos ou lógica de negócio.