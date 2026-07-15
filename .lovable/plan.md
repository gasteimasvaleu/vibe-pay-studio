## Problema

O slot da prévia no compositor (`StepCompose`, `publisher.tsx` linha 1282) só é renderizado quando `toggles.paid.enabled`. Com desafio ativo (`toggles.challenge.enabled`), a prévia é enviada e salva, mas o thumbnail nunca aparece ao lado da primeira mídia.

## Correção

`src/routes/_authenticated/publisher.tsx`

- Trocar a condição do bloco do slot de prévia de
  `{toggles.paid.enabled && (` para
  `{(toggles.paid.enabled || toggles.challenge.enabled) && (`.

Nada mais muda; a lógica de upload, exibição e `onEditPreview` já funciona igual para os dois modos.
