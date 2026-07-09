Converter o `FiltersDialog` da página `/chat` para usar o `Sheet` do shadcn no modo bottom sheet — mesmo padrão já usado no picker de mídia do publisher — que passa a ser o padrão do app para esse tipo de modal.

## Alterações em `src/routes/_authenticated/chat.tsx`

1. **Imports**: adicionar `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` de `@/components/ui/sheet`. Manter `Dialog*` (ainda usado pelo `NewChatDialog`).

2. **Renomear** `FiltersDialog` → `FiltersSheet` (e o uso no JSX do `ChatLayout`). Estado `openFilters`/`filters` permanece igual.

3. **Estrutura do Sheet** (substituindo o `Dialog`):
   ```tsx
   <Sheet open={open} onOpenChange={onOpenChange}>
     <SheetContent
       side="bottom"
       className="rounded-t-2xl sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0"
     >
       <SheetHeader>
         <SheetTitle>Filtrar por</SheetTitle>
       </SheetHeader>
       {/* mesmas 3 seções (Conversas, Usuários, Ordenar) com FilterChip */}
       {/* botão "Aplicar filtros" full-width outline primary rounded-full h-12 */}
     </SheetContent>
   </Sheet>
   ```

4. **Conteúdo interno inalterado**: seções, chips e botão "Aplicar filtros" mantêm exatamente a mesma marcação e estilos já implementados.

## Fora de escopo

- Não migrar o `NewChatDialog` (não foi pedido).
- Sem mudanças de comportamento/estado dos filtros.
