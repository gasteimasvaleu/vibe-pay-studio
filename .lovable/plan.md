## Causa

O servidor (`src/lib/chat-monetization.functions.ts`) exige `priceCents >= 3990` (R$39,90) para convites de videochamada, mas o diálogo do criador aceita qualquer valor (você enviou R$10,00 → 1000 cents) e mostra o `ZodError` cru no toast.

## Correção (frontend apenas)

No componente do diálogo "Convite de videochamada" (compositor do chat, provavelmente `src/components/chat/ChatComposer.tsx` ou um `CallInviteDialog` associado — confirmar ao abrir):

1. Definir constantes `MIN_CALL_BRL = 39.90` e `MAX_CALL_BRL = 5000` no arquivo do diálogo (espelhando o backend).
2. Exibir texto auxiliar sob o campo "Valor (R$)": _"Mínimo R$39,90"_.
3. Validar antes de submeter:
   - Se `valor < 39,90` → `toast.error("Valor mínimo da chamada é R$39,90")` e não chamar o server fn.
   - Desabilitar o botão "Enviar convite" quando `valor` estiver abaixo do mínimo ou acima do máximo.
4. Ajustar `defaultValue` do input para `39,90` (em vez de `10,00`) para não induzir o usuário ao erro.
5. Tratar erro do server fn com mensagem amigável em vez do JSON do Zod: capturar no `onError` e mostrar _"Não foi possível enviar o convite. Verifique o valor e tente novamente."_

Sem alterações no backend nem em lógica de negócio — apenas UX/validação de formulário.
