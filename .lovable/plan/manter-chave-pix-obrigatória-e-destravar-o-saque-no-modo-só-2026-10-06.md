# Manter chave PIX obrigatória e destravar o saque no modo "Só PIX"

## Resumo

A chave PIX continua obrigatória nos dois modos de recebimento — nada muda no cadastro. O que precisa de correção é a tela **Meu Banco**: ela hoje reconhece apenas quem tem conta Asaas, então um creator no modo "Só PIX" fica com o botão de saque bloqueado para sempre, mesmo tendo saldo.

## O que está confirmado no código hoje

- O salvamento do recebimento exige tipo e chave PIX **antes** de qualquer verificação de modo, e a tabela `payout_accounts` guarda essas colunas como obrigatórias. Ou seja: a exigência que você confirmou já está valendo nos dois modos.
- O saque (`requestWithdrawal`) já sabe agir por modo: no "Só PIX" ele usa a chave Asaas da plataforma; no split usa a API key do próprio creator.
- O saldo do creator é creditado na carteira do app para qualquer venda paga, independentemente de ter Wallet ID — confirmado no gatilho que libera saldos.
- Mas a tela Meu Banco decide "está configurado?" olhando só o Wallet ID Asaas (`walletActive`) e a API key (`hasApiKey`). No modo "Só PIX" esses dois campos ficam vazios por natureza, então:
  - o aviso "Configure seu recebimento" aparece mesmo depois de cadastrar;
  - o botão de saque mostra "Configure seu recebimento primeiro" e, se esse passasse, "Cadastre sua API Key Asaas para sacar";
  - o painel verde "Recebimento ativo" mostra `Wallet ID:` vazio.

Resultado: quem escolhe "Só PIX" (justamente quem não quer conta Asaas) nunca consegue sacar pelo app.

## O que fazer

1. **Reconhecer o modo na tela Meu Banco.** A função que devolve o status do recebimento já traz `payoutMode`; a tela passa a usá-lo em vez de adivinhar pelo Wallet ID.

2. **Regras de bloqueio do saque por modo.**
   - "Só PIX": precisa de chave PIX cadastrada (sempre obrigatória) e saldo mínimo de R$ 50. Não exige Wallet ID nem API key.
   - "Conta Asaas": exige Wallet ID e, para sacar pelo app, a API key — sem ela, a mensagem continua orientando sacar no painel Asaas.
   - Verificação de identidade e saldo mínimo continuam valendo para todos.

3. **Painel de status adaptado ao modo.**
   - "Só PIX": "Recebimento ativo · Chave PIX" com a chave mascarada e a nota de que o saldo fica no app e o saque é enviado pela plataforma.
   - "Conta Asaas": mantém Wallet ID e a linha de saque automático ativado/não ativado.

4. **Texto do diálogo de saque.** A linha "Transferência via PIX pela Asaas" passa a dizer que o envio é feito pela plataforma no modo "Só PIX", evitando a impressão de que o creator precisa de conta Asaas.

5. **Cadastro sem mudanças.** A seção "Chave PIX para saque" permanece visível e obrigatória nos dois modos, exatamente como está.

## Como verificar

- Typecheck e log de build sem erros.
- Conferir na tela que, simulando um cadastro no modo "Só PIX" (sem Wallet ID/API key), o painel mostra "Recebimento ativo", o botão de saque fica habilitado com saldo liberado, e no modo split o aviso de API key continua aparecendo quando ela falta.

## Detalhes técnicos

- `src/routes/_authenticated/banco.tsx`: derivar `isPixMode` de `status.payoutMode`; substituir `walletActive`/`hasApiKey` em `withdrawDisabledReason` (linhas ~197-198 e 290-297) e na troca de painel `!walletActive ? ... : ...` (linhas ~922-960) por um cálculo por modo (`payoutConfigured`, `canAutoWithdraw`).
- `src/components/banco/SacarDialog.tsx`: receber o modo e ajustar a frase de apoio do campo de valor; a chave de destino mascarada já é exibida.
- Nenhuma migração é necessária: `payout_accounts.payout_mode`, `pix_key` e `pix_key_type` já existem e seguem obrigatórios.
