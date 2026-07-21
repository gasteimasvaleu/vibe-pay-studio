## Objetivo
Ajustar o ícone de alerta exibido no dialog de confirmação de arquivar/desarquivar post para usar as cores padrão do app (roxo/lilás `primary`), em vez do âmbar atual.

## Local
- Arquivo: `src/components/feed/PublicationOptionsMenu.tsx`
- Linha aproximada: 318

## Alteração proposta
No elemento que envolve o ícone `AlertTriangle`, substituir as classes âmbar pelas cores do tema:

- `bg-amber-100` → `bg-primary/10`
- `text-amber-500` → `text-primary`

Isso alinha o ícone ao padrão visual do app e mantém consistência com o botão "Confirmar" já ajustado anteriormente.

## Verificação
- Revisar visualmente o dialog de arquivar post no preview para confirmar que o ícone aparece na cor roxa padrão.
- Garantir que não haja regressão no layout ou contraste do dialog.