# Saque com chave de telefone recusado e saldo zerado

## O que aconteceu
1. **Saldo zerou**: o saque de R$ 51,96 ficou registrado como "solicitado" mesmo depois de o Asaas recusar. Saques "solicitados" descontam do saldo, por isso ele sumiu. O app tenta marcar o saque como "falhou", mas as regras do banco de dados não deixam o creator alterar o próprio saque, e essa tentativa é bloqueada sem nenhum aviso. Pelo mesmo motivo, saques que dão certo também não ficam "pagos" na hora (dependem do aviso do Asaas).
2. **"Chave não encontrada"**: a chave de telefone foi enviada como `83999249046`. No PIX, chaves de telefone são registradas com o código do país (`+5583999249046`). Provavelmente é por isso que o Asaas não achou a chave.

## O que vou fazer
1. **Atualizar o status do saque pelo servidor**: as mudanças de status (pago / recusado / falhou) passam a ser gravadas pelo próprio servidor, só depois de confirmar que o saque é desse creator. O mesmo vale para cancelar um saque.
2. **Devolver o saldo agora**: marcar esse saque de R$ 51,96 como "falhou", com o motivo "chave PIX não encontrada". O valor volta para "Liberado para saque".
3. **Formatar a chave de telefone**: antes de enviar ao Asaas, colocar o +55 na frente (se o número tiver 10 ou 11 dígitos e ainda não tiver o código). Se o Asaas ainda assim recusar, o aviso vai pedir para conferir se esse telefone está cadastrado como chave PIX no banco do creator.

## Detalhes técnicos
- `payouts.functions.ts`: em `requestWithdrawal` (atualização após a transferência e no catch) e em `cancelWithdrawal`, usar `supabaseAdmin` (import dinâmico de `client.server`) com `.eq("id", row.id).eq("creator_id", userId)`. Não criar policy de UPDATE para creators.
- Função `normalizePixKey(key, type)`: telefone → `+55` + dígitos; CPF/CNPJ → só dígitos.
- Mapear o erro "chave não encontrada" do Asaas para uma mensagem clara em português.
- Correção pontual: withdrawal `1074c03b-…` → `status='failed'`.
