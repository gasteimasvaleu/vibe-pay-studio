# Correção de segurança: cadastro de cartão e cliente Asaas

Escopo: `src/lib/saved-cards.functions.ts`, `ensureCustomerId` em `src/lib/payments.functions.ts` e uma migration. Nada mais muda.

## Resultado das consultas pedidas (já feitas, só leitura)
- (a) `asaas_card_token` presente em `saved_cards` de mais de um usuário: **nenhum**.
- (b) `asaas_customer_id` compartilhado por mais de um usuário em `profiles`: **nenhum**.
Não há sinal de exploração, e a trava de unicidade pode ser criada sem conflito.

## O que muda
1. **Fim do reaproveitamento de cartão** (`tokenizeAndSaveCard`): apago o bloco que procura, com acesso de administrador, outro `saved_cards` com o mesmo cliente + últimos 4 dígitos + validade e copia o token. Todo cartão novo é sempre tokenizado no Asaas com número, CVV e dados do titular informados naquele momento.
2. **Fim do vínculo por CPF** (`ensureCustomerId`, nos dois arquivos — existe uma cópia em `saved-cards.functions.ts` com o mesmo problema): removo a chamada `findCustomerByCpf`. Sem `asaas_customer_id`, cria-se sempre um cliente novo no Asaas com `externalReference = user_id`. A gravação só acontece se o campo ainda estiver vazio (evita sobrescrever em pedidos simultâneos).
3. **Trava de unicidade**: índice único parcial em `profiles(asaas_customer_id)` quando não nulo — um cliente Asaas nunca fica ligado a dois usuários.
4. **Limite de tentativas na tokenização**: 5 tentativas por hora por usuário e 5 por hora por IP. Ao passar do limite: "Muitas tentativas de cadastro de cartão. Tente novamente em 1 hora."
   - Observação: a plataforma não tem um limitador pronto, então este é um limite feito sob medida, guardado no banco. Ele conta toda tentativa (inclusive as recusadas) e funciona bem para esse volume; não substitui proteção de rede.

## Migration (1)
- `CREATE UNIQUE INDEX profiles_asaas_customer_id_unique ON profiles(asaas_customer_id) WHERE asaas_customer_id IS NOT NULL`.
- Tabela `card_tokenize_attempts` (id, user_id, ip, created_at), índices por (user_id, created_at) e (ip, created_at); RLS ligado e sem nenhuma regra para usuários — só o servidor (service role) lê e grava.
- Função `check_card_tokenize_rate(_user_id uuid, _ip text) returns boolean` (só service role): trava por usuário, conta tentativas da última hora por usuário e por IP, registra a tentativa se estiver dentro do limite e apaga registros com mais de 1 dia.

## Código
- `src/lib/saved-cards.functions.ts`:
  - no começo de `tokenizeAndSaveCard`, lê o IP (`cf-connecting-ip`, depois `x-forwarded-for`) e chama a checagem de limite pelo servidor; recusa se passar;
  - remove o bloco de cópia do token;
  - `ensureCustomerId` local sem busca por CPF.
- `src/lib/payments.functions.ts`: `ensureCustomerId` sem busca por CPF.
- Não removo `findCustomerByCpf` de `asaas.server.ts` (fica sem uso; fora do escopo).

## Testes
- Conta A cadastra cartão; conta B informa mesmo CPF, mesmos 4 últimos dígitos e validade com outro número: o Asaas recusa ou gera um token novo; nunca aparece o cartão da conta A.
- 6ª tentativa na mesma hora: recusada pelo limite.
- Cadastro normal de cartão e um pagamento com cartão salvo continuam funcionando (teste no sandbox do Asaas, se as chaves de teste estiverem configuradas; senão aviso o que não deu para testar).

Ao final listo a migration e os arquivos alterados.
