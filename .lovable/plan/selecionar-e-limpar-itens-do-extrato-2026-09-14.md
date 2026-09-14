# Selecionar e limpar itens do extrato

## O que você vai poder fazer

Na página Meu Banco (extrato e saques) e no extrato de Minha Carteira:

- Um botão "Selecionar" no topo de cada lista ativa o modo de seleção.
- Cada item ganha uma caixinha de marcar; há também "Selecionar todos".
- Com itens marcados, aparece uma barra com a contagem e o botão "Ocultar".
- Uma confirmação simples explica que os itens somem só da sua visualização e que o saldo não muda.
- Um botão "Mostrar ocultos" exibe o que foi escondido, com a opção "Restaurar" (individual ou em lote).

Nada é apagado do histórico financeiro: saldos, saques e relatórios continuam exatamente iguais. A ocultação vale só para a sua conta.

## Onde aparece

1. Meu Banco → Extrato
2. Meu Banco → Saques
3. Minha Carteira → Transações

## Detalhes técnicos

**Banco de dados** (uma migração):

- Nova tabela `public.transaction_hides` (`user_id`, `transaction_id` → `transactions.id` ON DELETE CASCADE, `created_at`), chave única (user_id, transaction_id).
- Nova tabela `public.withdrawal_hides` (`user_id`, `withdrawal_id` → `withdrawals.id` ON DELETE CASCADE, `created_at`), chave única (user_id, withdrawal_id).
- GRANT SELECT/INSERT/DELETE para `authenticated`, GRANT ALL para `service_role`; RLS ativada com políticas escopadas em `auth.uid() = user_id` (ver, inserir, remover só as próprias linhas).
- Segue o mesmo padrão já usado em `publication_hides` / `chat_message_hides`.

**Server functions** (`src/lib/finance.functions.ts`):

- `listCreatorTransactions`, `listCreatorWithdrawals` e `listSubscriberTransactions` ganham o parâmetro opcional `includeHidden` (default `false`) e retornam também `hidden: boolean` por item. Filtragem por `NOT IN (select ... from *_hides where user_id = userId)` resolvida em duas consultas (ids ocultos + lista), sem alterar os cálculos de saldo em `computeProfileWallet`.
- Novas funções: `hideTransactions({ ids })`, `unhideTransactions({ ids })`, `hideWithdrawals({ ids })`, `unhideWithdrawals({ ids })` — todas com `requireSupabaseAuth`, inserindo/removendo em lote pelo `userId` do contexto.

**UI**:

- Componente reutilizável `src/components/finance/SelectableList.tsx` com o estado de seleção (Set de ids), cabeçalho ("Selecionar" / "Cancelar" / "Selecionar todos") e a barra de ação inferior.
- `src/routes/_authenticated/banco.tsx`: aplica o componente às seções Extrato e Saques; após ocultar/restaurar, `invalidateQueries` das chaves de extrato e saques (saldos não precisam ser recalculados).
- `src/routes/_authenticated/mywallet.extrato.tsx`: mesmo tratamento na lista de transações, convivendo com os filtros atuais (o toggle "Mostrar ocultos" entra no `queryKey`).
- Confirmação via `AlertDialog` do shadcn e feedback com `sonner`.
