Substituir o `window.confirm("Encerrar a transmissão?")` em `src/routes/_authenticated/live.$liveId.transmitir.tsx` por um `AlertDialog` (shadcn), no mesmo padrão já usado no resto do app (ex.: exclusão de story).

### Mudanças
- `src/routes/_authenticated/live.$liveId.transmitir.tsx`
  - Importar `AlertDialog*` de `@/components/ui/alert-dialog`.
  - Adicionar state `endDialogOpen`.
  - Trocar o botão "Encerrar" para abrir o dialog em vez de chamar `confirm`.
  - Mover a lógica de encerrar transmissão para o `AlertDialogAction` (título "Encerrar transmissão?", descrição curta, botões "Cancelar" / "Encerrar" em variante destrutiva).

Sem mudanças de backend.