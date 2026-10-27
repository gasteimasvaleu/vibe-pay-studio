# Correção de segurança no saque

Escopo: só o fluxo de saque e o cálculo do saldo disponível. Nada mais muda.

## Problemas confirmados no código
- `requestWithdrawal` desconta só os saques do perfil ativo e só os status `requested`/`paid`. Trocar o perfil ativo libera sacar o mesmo saldo de novo.
- Leitura do saldo e criação do saque são separadas e sem trava, então pedidos simultâneos passam juntos.
- A regra "creator requests own withdrawal" deixa o usuário criar um saque direto pela API, com qualquer valor.
- A tela Meu Banco (`finance.functions.ts`) e a troca de modo de recebimento (`payments.functions.ts`) também ignoram os status `in_review`/`approved`.

## Migration (1)
1. Função `public.request_withdrawal(_amount_cents bigint, _pix_key text, _pix_key_type text) returns uuid`, SECURITY DEFINER, `search_path = public`:
   - creator = `auth.uid()`; recusa se for nulo;
   - `SELECT released_cents FROM creator_wallets WHERE user_id = auth.uid() FOR UPDATE` (pedidos simultâneos esperam na fila);
   - disponível = `released_cents - SUM(amount_cents)` de todos os saques do usuário (`creator_id`) com status `requested`, `in_review`, `approved`, `paid`;
   - mínimo de 5000 centavos e disponível >= valor; senão `RAISE EXCEPTION 'saldo liberado insuficiente'`;
   - grava `creator_profile_id` do perfil ativo (via `resolve_active_creator_profile`, só para o histórico), `fee_cents = 0`, `net_cents = valor` (mesma regra de hoje, agora calculada no banco), `status = 'requested'`, `is_first_withdrawal = false`, `provider = 'asaas'`; devolve o id.
2. `REVOKE EXECUTE ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`.
3. `DROP POLICY "creator requests own withdrawal" ON withdrawals` — só a função e o servidor criam saques.

## Código
- `src/lib/payouts.functions.ts` (`requestWithdrawal`): checagens de modo, CPF e API key continuam antes; troca o cálculo + insert por `supabase.rpc('request_withdrawal', ...)`; depois lê a linha criada e segue com a transferência Asaas igual hoje (checagem de CPF da chave no modo Só PIX e marcação `failed` em erro mantidas). Erro da função vira a mensagem "saldo liberado insuficiente".
- `src/lib/finance.functions.ts` (saldo exibido em Meu Banco): os saques descontados passam a incluir `in_review` e `approved`, e o saldo liberado mostrado fica limitado ao disponível do usuário inteiro (carteira menos saques de todos os perfis) — assim a tela nunca mostra valor que o saque recusaria.
- `src/lib/payments.functions.ts` (bloqueio de troca de modo de recebimento): inclui `in_review`/`approved` na soma.

## Verificação de exploração (consulta de leitura, resultado mostrado no chat)
Usuários em que a soma dos saques `requested`/`in_review`/`approved`/`paid` é maior que `released_cents`, com e-mail/username, saldo, total sacado e diferença.

## Testes
- 5 pedidos de saque em paralelo com saldo exato de 1: só 1 aceito (feito chamando a função no banco em sessões paralelas como o usuário de teste).
- Sacar tudo, trocar perfil ativo, sacar de novo: recusado.
- Insert direto em `withdrawals` como usuário logado: erro de permissão.

Ao final listo a migration e os arquivos alterados.
