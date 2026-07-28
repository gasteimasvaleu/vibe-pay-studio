# Corrigir dialog nativo ao apagar oferta

## Problema
Em `src/routes/_authenticated/promotions.tsx` (linha 145), a exclusão de oferta usa `window.confirm(...)`, que exibe o dialog nativo do navegador com o domínio `lovableproject.com`.

## Solução
Substituir pelo `AlertDialog` do shadcn, seguindo o mesmo padrão já aplicado em `StoryViewer.tsx`.

### Alterações em `src/routes/_authenticated/promotions.tsx`
1. Importar `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` de `@/components/ui/alert-dialog`.
2. Adicionar estado local `confirmDeleteId: string | null` em `PromotionsListPage`.
3. Trocar o `window.confirm` no `onDelete` do `PromotionCard` por `setConfirmDeleteId(p.id)`.
4. Renderizar um `<AlertDialog>` controlado com título "Apagar oferta?", descrição "Esta ação não pode ser desfeita.", botões Cancelar e Apagar (destructive). O Apagar chama `deleteMutation.mutate(confirmDeleteId)` e fecha o dialog.

Nenhuma outra mudança de comportamento — apenas UX do confirm.
