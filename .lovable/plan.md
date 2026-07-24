## Problema

Em `src/components/feed/StoryViewer.tsx` (linha 191), a confirmação de exclusão de story usa `window.confirm("Apagar este story?")`, que no navegador mostra o prompt nativo com o domínio do iframe (`ccce3d77-...lovableproject.com diz`), quebrando a UX.

## Solução

Trocar o `confirm()` nativo pelo `AlertDialog` do shadcn (já usado em outros pontos do app, como `/subscriptions` para cancelamento).

### Mudanças em `src/components/feed/StoryViewer.tsx`

1. Importar `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` de `@/components/ui/alert-dialog`.
2. Adicionar estado `const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);`.
3. O botão da lixeira (linha ~262) passa a apenas abrir o dialog: `onClick={() => setConfirmDeleteOpen(true)}`.
4. `handleDelete` remove o `confirm(...)` — mantém apenas a lógica de exclusão e fecha o dialog no final (`setConfirmDeleteOpen(false)`).
5. Renderizar o `<AlertDialog>` no final do componente (junto do `PaymentModal`) com título "Apagar story?", descrição "Essa ação não pode ser desfeita.", botões "Cancelar" e "Apagar" (com `handleDelete` no confirm, estado `disabled={deleting}`).

Nenhuma mudança em backend ou outras telas.
