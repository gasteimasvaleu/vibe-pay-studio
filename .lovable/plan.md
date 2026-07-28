## Problema

Os botões do `DialogFooter` (ex.: "Cancelar" / "Enviar denúncia" no `ThreadActionsMenu`) ficam colados verticalmente no mobile e sem folga adequada no desktop. A causa está na classe compartilhada dos componentes base:

- `src/components/ui/dialog.tsx` (linha 63) — `DialogFooter`
- `src/components/ui/alert-dialog.tsx` (linha 53) — `AlertDialogFooter`

Ambos usam `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`, que:
- **Mobile**: empilha em coluna invertida sem `gap`, resultando em bordas coladas.
- **Desktop**: usa `space-x-2` (não cobre casos em que os botões quebram linha).

Como todos os diálogos e alertas do app usam esses dois componentes, a correção é global — resolve o botão de denúncia e qualquer outro modal com múltiplos botões no footer.

## Mudança

Trocar a classe dos dois footers para incluir `gap-2` (funciona em coluna e linha) mantendo o `sm:space-x-2` opcionalmente ou substituindo-o:

```ts
// dialog.tsx e alert-dialog.tsx
"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 sm:space-x-0"
```

Isso garante:
- Espaçamento vertical entre botões empilhados no mobile.
- Espaçamento horizontal consistente no desktop.
- Nenhum efeito colateral em footers com um único botão.

## Arquivos alterados

1. `src/components/ui/dialog.tsx` — atualizar `DialogFooter`.
2. `src/components/ui/alert-dialog.tsx` — atualizar `AlertDialogFooter`.

## Validação

Após a mudança, verificar visualmente o diálogo de denúncia em `/chat/:threadId` e um `AlertDialog` (ex.: confirmação de apagar conversa) em mobile (393px) e desktop.
