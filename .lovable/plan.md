## Problema

No mobile o `PublishStoryDialog` estoura a altura da viewport: o header + preview 9:16 (`max-h-[50vh]`) + legenda + campo de preço + botão não cabem, e o dialog não rola — o botão "Publicar story" fica cortado atrás da barra do sistema.

## Correção

Arquivo: `src/components/feed/PublishStoryDialog.tsx`

1. No `<DialogContent>`, limitar a altura ao viewport e habilitar scroll interno:
   - `max-h-[90dvh] overflow-y-auto` (mantém `sm:max-w-md`).
2. Reduzir o preview no mobile para não dominar a tela: trocar `max-h-[50vh]` por `max-h-[40dvh] sm:max-h-[50vh]`.
3. Garantir que o `<DialogHeader>` fique fixo no topo do container rolável: adicionar `sticky top-0 bg-background z-10 pb-2` no header para o título continuar visível ao rolar.

Sem alterações de comportamento; apenas layout responsivo do modal.

## Verificação

- Preview mobile 393px: abrir "Seu story" → dialog cabe, conteúdo rola, botão "Publicar story" visível.
- Desktop: aparência inalterada.
