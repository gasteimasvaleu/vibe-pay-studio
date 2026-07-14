## Diagnóstico

- O pagamento foi registrado e há um `publication_unlocks` com `status = paid` para a publicação mostrada.
- O toast “publicação já desbloqueada” vem porque o backend reconhece que essa compra já está paga.
- O problema principal está no feed: `getFeed` marca qualquer publicação não pública como bloqueada sem consultar `publication_unlocks`, então mesmo paga ela continua aparecendo bloqueada.
- A situação “Interrompido” no painel do Asaas indica que o Asaas não está entregando eventos para o webhook. O app tem polling como fallback, mas o webhook também precisa ficar funcional para processar pagamentos quando o usuário fecha o modal.

## Plano de correção

1. Ajustar `getFeed`
   - Buscar os desbloqueios pagos (`publication_unlocks.status = paid`) do usuário logado para as publicações retornadas.
   - Marcar `locked = false` quando o usuário for autor ou tiver desbloqueio pago.
   - Garantir que a mídia completa apareça quando a publicação estiver desbloqueada.

2. Melhorar a experiência após pagamento
   - Ao confirmar pagamento no modal, invalidar/refazer a query do feed e fechar/atualizar o modal de forma consistente.
   - Evitar que uma publicação já paga permita abrir novo checkout; ao clicar, atualizar o feed e mostrar uma mensagem adequada.

3. Endurecer reconciliação do pagamento
   - Conferir o polling `getPaymentIntentStatus` para garantir que, quando o Asaas retornar status pago, ele aplique o desbloqueio e retorne o estado atualizado.
   - Se necessário, fazer o retorno indicar `processedAt` depois da reconciliação, não o valor antigo lido antes dela.

4. Orientar o webhook Asaas
   - Manter a URL correta: `https://vibe-pay-studio.lovable.app/api/public/webhooks/asaas`.
   - O status “Interrompido” deve ser corrigido no painel do Asaas reativando o webhook e confirmando que o token está no header `asaas-access-token` com o mesmo valor salvo em `ASAAS_WEBHOOK_TOKEN`.

## Validação

- Testar no banco que a publicação paga aparece com `locked = false` para o comprador.
- Verificar que o clique em uma publicação já paga não tenta gerar nova cobrança.
- Confirmar que o feed recarrega e exibe a mídia desbloqueada após pagamento confirmado.