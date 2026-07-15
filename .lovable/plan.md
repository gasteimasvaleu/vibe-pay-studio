## Problema

No fluxo de criação de desafio o sheet de prévia até abre depois da tela de faixas, mas a mídia selecionada nunca é obrigatória nem é enviada junto com a publicação. As três verificações que forçam/enviam a prévia hoje só olham para `toggles.paid.enabled`.

## Correção

`src/routes/_authenticated/publisher.tsx`

1. `previewMissing`: exigir prévia também quando `toggles.challenge.enabled`.
   `const previewMissing = (toggles.paid.enabled || toggles.challenge.enabled) && (!preview || preview.status !== "ready");`
2. `onPost`: bloquear envio e reabrir o `PreviewSheet` quando `visibility === "paid" || visibility === "challenge"` e não houver prévia pronta (mesma mensagem "Adicione uma mídia de prévia").
3. `onPost` payload: mudar a condição do campo `preview` para `(visibility === "paid" || visibility === "challenge") && preview?.status === "ready" && preview.storagePath && preview.publicUrl`, mantendo o restante igual.
4. `onChallengeChange(false)`: chamar `void clearPreview();` ao desligar o toggle de desafio, espelhando o comportamento de `onPaidChange`, para não deixar prévia órfã ao trocar de modo.

Nada mais precisa mudar: o `createPublication` no backend já aceita `preview` para qualquer visibility, e o sheet de prévia já é aberto ao confirmar as faixas.

## Fora de escopo

- Layout/UX do sheet de prévia.
- Exibição da prévia dentro do card do desafio no feed.
