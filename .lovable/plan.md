## Problema
Ao integrar o `ChatComposer` em `/chat-agendamento`, removi o `TooltipProvider` do arquivo. O `ChatComposer` usa `Tooltip` do Radix internamente, que exige um `TooltipProvider` ancestral — sem ele o React lança `Tooltip must be used within TooltipProvider` e a página renderiza o fallback "This page didn't load".

## Correção
Em `src/routes/_authenticated/chat-agendamento.tsx`:
1. Reintroduzir o import `TooltipProvider` de `@/components/ui/tooltip`.
2. Envolver o retorno do componente `Composer` (ou toda a página) com `<TooltipProvider delayDuration={200}>` para que os tooltips do `ChatComposer` tenham contexto.

Nenhuma outra mudança de lógica.