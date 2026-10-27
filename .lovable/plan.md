# Correção: videochamada paga do chat

Escopo: `startPaidVideoCall`, a mensagem de erro do botão de videochamada e as permissões de escrita nas carteiras. Nada mais muda.

## O que conferi no código e no banco
- `startPaidVideoCall` lê o saldo, faz o débito direto com o cliente do usuário e cria a chamada já como `accepted`/`paid`. Não cria transação e não credita o creator.
- A função `pay_with_wallet` já tem o fluxo `video_call`. Ela trava o saldo, exige chamada em `pending_payment` do próprio fã, debita e muda a chamada para `accepted`/`paid`. A transação e o crédito ao creator ficam com os gatilhos de pagamento já existentes.
- **Item 3 ainda não está ok:** hoje `authenticated` tem permissão de tabela para INSERT, UPDATE e DELETE em `subscriber_wallets` e `creator_wallets`, além de SELECT. Na prática a escrita é barrada porque não há regra que permita, mas a permissão existe.
- Outros lugares no código do app que escrevem nessas carteiras: **nenhum**. Os únicos que leem são `admin-wallets.functions.ts` e `finance.functions.ts`, e só leem. Toda escrita restante está em funções do banco (`pay_with_wallet`, `request_withdrawal`, `reverse_wallet_topup`, `release_matured_earnings`, `admin_unblock_wallet`, os gatilhos de transação e os `ensure_*_wallet`), que não são alteradas.

## O que muda
1. **`startPaidVideoCall`** (`src/lib/communication.functions.ts`):
   - lê `video_call_enabled`, `video_call_price_cents` e `video_call_default_minutes` do creator no servidor. Preço e duração vêm só do banco, e o parâmetro de duração enviado pelo app deixa de ser usado;
   - **preço > 0:** cria a chamada pelo servidor como `pending_payment`/`pending`, com preço e duração do creator. Depois chama `pay_with_wallet` (`_kind: 'video_call'`, `_call_id`) com a sessão do fã;
   - se o pagamento falhar, a chamada vira `cancelled` e o erro volta ao app. Saldo insuficiente chega como `insufficient_wallet_balance`, o mesmo código que o botão já trata;
   - **preço = 0:** continua criando direto como `accepted`/`paid`, sem mexer na carteira;
   - remove a leitura e o débito de `subscriber_wallets` desse arquivo.
2. **Botão de videochamada** (`VideoCallHeaderButton.tsx`): confirmação, carregamento e entrada na sala continuam iguais. Na mensagem de saldo insuficiente entra um botão **Recarregar**, que abre a página de recarga.
3. **Permissões (migration 1):** revoga INSERT, UPDATE e DELETE de `anon` e `authenticated` em `subscriber_wallets` e `creator_wallets`. Fica só SELECT, ainda limitado pelas regras atuais ao próprio dono ou ao admin. As funções de pagamento continuam funcionando, porque rodam com permissão do dono do banco.

## Testes (com resultado mostrado no chat)
Uso dois usuários de teste. Coloco saldo e configuração de videochamada pelo banco, rodo e depois apago tudo:
- saldo suficiente: o saldo cai exatamente o preço, aparece a transação `video_call` e a carteira do creator recebe o valor líquido;
- saldo insuficiente: erro de saldo insuficiente, nenhum débito e chamada `cancelled`;
- duas chamadas ao mesmo tempo com saldo para uma: só uma é paga;
- chamada gratuita: criada e liberada;
- `joinVideoCall` aceita a chamada paga. Confiro a etapa de pagamento. Abrir a sala de vídeo de verdade depende do serviço de vídeo e pode não rodar aqui; se não rodar, eu aviso.

## Arquivos
- `src/lib/communication.functions.ts`
- `src/components/chat/VideoCallHeaderButton.tsx`
- 1 migration (permissões das carteiras)
