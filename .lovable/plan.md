## Ligar a tela "Meu Banco" ao Asaas (destravar o toast "criador não configurou recebimento")

Hoje `/banco` → sheet `CadastrarBancoForm` só mostra `toast("Em breve…")`. O toast do pagamento aparece porque `profiles.asaas_wallet_id` é `null`. Nenhuma UI chama `createCreatorSubaccount`.

Esta é também a resposta à pergunta original: **é aqui que o criador deveria configurar o recebimento**, então vamos fazer essa tela realmente configurar.

### 1. Migração: tabela `payout_accounts`

Guardar a conta bancária/PIX cadastrada (Asaas usa essa info para transferências de saque, mas hoje não temos onde salvar).

Colunas de domínio: `user_id` (FK auth.users, unique), `bank_name`, `account_type` ('corrente'|'poupanca'), `agency`, `account_number`, `pix_key_type` ('cpf'|'cnpj'|'email'|'telefone'|'aleatoria'), `pix_key`.

RLS: dono lê/insere/atualiza; `service_role` acessa tudo (para transferências server-side). GRANTs para `authenticated` e `service_role`.

### 2. Server function `saveCreatorPayoutSetup` (`src/lib/payments.functions.ts`)

Uma única chamada faz tudo, protegida por `requireSupabaseAuth`:

1. Valida com Zod: dados de subconta Asaas (`fullName`, `cpfCnpj`, `birthDate`, `mobilePhone`, `postalCode`, `address`, `addressNumber`, `province`) + dados bancários/PIX do form.
2. Confere `profiles.kyc_status === 'verified'` — se não, erro claro "Verifique sua identidade antes de configurar recebimento" com o passo do onboarding.
3. Se `asaas_wallet_id` já existe, pula a criação; senão chama `asaas.createSubaccount(...)` e grava `asaas_account_id`/`asaas_wallet_id`/`asaas_account_status` em `profiles` (reaproveita a lógica que já existe em `createCreatorSubaccount`).
4. Faz `upsert` em `payout_accounts` (por `user_id`).
5. Retorna `{ walletId, accountStatus, payoutAccount }`.

`createCreatorSubaccount` fica como está (compat), a UI passa a usar a nova.

### 3. UI — `CadastrarBancoForm.tsx`

Adicionar seção "Dados do titular (obrigatórios pelo Asaas)" antes da parte bancária, com: nome completo, CPF/CNPJ, data de nascimento, telefone, CEP, endereço, número, bairro. Máscaras simples (CPF, telefone, CEP). Pré-preenche o que já der (username, email) e mostra alerta caso `kyc_status !== 'verified'` com link para `/creator/onboarding/documentos`.

`handleSubmit` passa a chamar `saveCreatorPayoutSetup` via `useServerFn`, exibe erros do servidor (`toast.error(e.message)`), e no sucesso: `toast.success("Recebimento configurado")` + `onClose()` + invalida a query do profile.

### 4. UI — `/banco` (`banco.tsx`)

- Carregar `profiles` (`kyc_status`, `asaas_wallet_id`, `asaas_account_status`) e a `payout_accounts` do usuário via `useQuery` no componente.
- Card de status no topo:
  - KYC não verificado → alerta amarelo "Finalize a verificação de identidade" + botão para o onboarding.
  - KYC ok e sem `asaas_wallet_id` → alerta roxo "Configure seu recebimento para começar a receber" + botão que abre o sheet.
  - Wallet criada → chip verde "Recebimento ativo" com últimos 4 dígitos da conta.
- Se `payout_accounts` já existe, o card "Adicionar novo banco" vira card do banco atual com opção "Editar" (reabre o mesmo sheet pré-preenchido). Escopo: 1 conta por usuário nesta iteração.

### 5. Fora do escopo

- Fluxo de saque em si (`asaas.transfer`), extrato real, múltiplas contas bancárias por usuário, edição da subconta Asaas depois de criada, tela dedicada em Configurações. Foco só em destravar o `asaas_wallet_id` a partir da tela que já existe.

### Notas técnicas

- `asaas.createSubaccount` já existe em `src/lib/asaas.server.ts` (usado por `createCreatorSubaccount`).
- Reutilizar `loadAsaas()` e o mapeamento de `accountStatus` de `payments.functions.ts:185-188`.
- Sem alteração no fluxo de pagamento/webhook: assim que `asaas_wallet_id` for gravado, `getCreatorWallet` deixa de lançar erro e `createUnlockPayment` funciona.
