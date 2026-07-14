## Resposta rápida à sua dúvida

No **Modelo B**, o Asaas faz o **recebimento automático** (o split joga 85% do pagamento direto na carteira Asaas do criador). **Mas o saque Pix para a conta bancária do criador não é automático só com o Wallet ID.**

Para o app conseguir **ordenar** o saque Pix da conta Asaas do criador para a chave Pix dele, precisamos da **API key da conta Asaas do criador**. Com apenas o Wallet ID o dinheiro chega na carteira Asaas dele, mas o criador teria que fazer o saque manualmente no painel Asaas.

Resumindo:
- **Wallet ID** → recebe o split.
- **API key** → permite o app sacar automaticamente para a chave Pix.

Como seus criadores são maioria CPF, **não dá para criar subconta Asaas pela plataforma** (subconta só é permitida para CNPJ). A solução é: cada criador usa sua **conta principal Asaas** (CPF ou CNPJ), informa o Wallet ID dela e, opcionalmente, a API key para saques automáticos.

## O que vamos construir

### 1. Cadastro de recebimento simplificado

Alterar o formulário `/banco` e a server function `saveCreatorPayoutSetup`:

- **Remover** o fluxo de criação de subconta Asaas (`createSubaccount`).
- **Adicionar** campos:
  - `Wallet ID Asaas` (obrigatório) — UUID da carteira Asaas do criador.
  - `API key Asaas` (opcional, mas necessária para saque automático) — chave de API da conta do criador.
- Validar o formato do Wallet ID.
- Se a API key for informada, validar chamando `GET /v3/wallets/` com a chave do criador e confirmar que o Wallet ID retornado é igual ao informado.
- Guardar o Wallet ID em `profiles.asaas_wallet_id` e o status como `ACTIVE`.
- Continuar salvando os dados bancários/Pix em `payout_accounts` (usados como registro e como destino do saque Pix).

Arquivos envolvidos:
- `src/components/banco/CadastrarBancoForm.tsx`
- `src/lib/payments.functions.ts` (`saveCreatorPayoutSetup`)

### 2. Armazenamento seguro da API key dos criadores

A API key de cada criador é sensível. Vamos criptografar antes de salvar no banco:

- Criar uma migration adicionando a coluna `profiles.asaas_api_key_encrypted` (texto, nullable).
- Gerar um segredo de projeto `ASAAS_KEYS_ENCRYPTION_KEY` via `generate_secret`.
- Criar funções server-side para criptografar/descriptografar com AES-256-GCM usando esse segredo.
- A API key nunca trafega para o frontend em texto plano; só é descriptografada no momento de chamar a API Asaas.

### 3. Saque automático via Asaas

Alterar `requestWithdrawal` em `src/lib/payouts.functions.ts`:

- Se o criador tiver `asaas_api_key_encrypted`:
  1. Descriptografar a API key.
  2. Chamar `POST /v3/transfers` no nome da conta do criador, com:
     - `value`: valor líquido do saque (em reais).
     - `operationType`: `PIX`.
     - `pixAddressKey` e `pixAddressKeyType`: chave Pix cadastrada.
     - `externalReference`: ID do saque no nosso banco.
  3. Criar o registro em `withdrawals` com `provider = 'asaas'`, `provider_ref = transferId`, status inicial retornado pela API.
- Se não tiver API key, o saque no app é bloqueado com mensagem: "Você precisa cadastrar sua API key Asaas para sacar automaticamente. Sem ela, faça o saque direto no painel Asaas."
- Manter o débito da `creator_wallets` interna para fins de extrato/histórico.

### 4. Acompanhamento do status do saque

Como os webhooks de transferência chegam na conta Asaas que **originou** a transferência (a do criador), não conseguimos configurar webhooks individuais para cada criador de forma prática. Por isso:

- Após criar a transferência, consultar `GET /v3/transfers/{id}` usando a API key do criador em intervalos curtos (polling) até o status ser `DONE` ou `CANCELLED`.
- Atualizar `withdrawals.status` e `processed_at` no banco.
- (Opcional futuro: se o criador configurar o webhook no painel Asaas dele, os eventos `TRANSFER_DONE`/`TRANSFER_FAILED` já são tratados pelo webhook existente em `src/routes/api/public/webhooks/asaas.ts`.)

### 5. Ajustes no split de pagamentos

O split já está implementado em `src/lib/asaas.server.ts` (`createPayment` com `split: [{ walletId, percentualValue: 85 }]`). Apenas garantir que:

- Toda cobrança de criador só seja criada se `profiles.asaas_wallet_id` estiver preenchido.
- A mensagem de erro para o comprador seja clara quando o criador ainda não configurou o recebimento.

### 6. Ajustes de UI/UX

- Na tela `/banco`, mostrar:
  - Wallet ID cadastrado.
  - Se a API key está cadastrada (sim/não, sem exibir o valor).
  - Botão para reenviar/editar dados.
- Adicionar textos explicativos de onde pegar Wallet ID e API key no painel Asaas (Minha Conta → Integrações/API).

### 7. Testes de validação

- Cadastrar um criador com Wallet ID de uma conta Asaas sandbox própria.
- Fazer uma compra de publicação e verificar no painel Asaas se o split ocorreu (85% para a carteira do criador).
- Solicitar saque e verificar se a transferência Pix foi criada via API e o status foi atualizado.

## Observações importantes

- **Subcontas Asaas só são permitidas para CNPJ.** Como a maioria dos seus criadores é CPF, a plataforma não criará subcontas; cada um usará sua conta principal Asaas.
- **A API key é necessária para saque automático.** Sem ela, o criador recebe o dinheiro na Asaas, mas precisa sacar manualmente pelo painel Asaas.
- **A carteira interna (`creator_wallets`) continuará como extrato**, conforme você pediu, refletindo o que entrou via split e o que foi sacado.
- **Taxas:** no Modelo B, a taxa de transferência Pix é cobrada pela Asaas na conta do criador, não pela plataforma. A taxa de 15% da plataforma continua sendo descontada pelo split.