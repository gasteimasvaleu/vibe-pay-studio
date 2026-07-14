## Objetivo
Substituir os placeholders (`R$ -`, "Aqui você verá as movimentações") de `/banco` por dados reais do creator: saldos por origem (Nacional / Internacional) e extrato paginado.

## Dados disponíveis
Já existem no backend:
- `getCreatorWallet` → `releasedCents`, `pendingNationalCents`, `pendingInternationalCents`.
- `listCreatorTransactions` → linhas de `transactions` com `kind`, `amount_cents_gross`, `net_cents`, `payment_method`, `is_international`, `buyer_id`, `status`, `created_at`, `released_at`.
- `listCreatorWithdrawals` → histórico de saques (para futuras iterações; não bloqueia esta entrega).

Gap: `creator_wallets.released_cents` é um pool único (não separa nacional/internacional). Para preencher "Liberado" em cada card, o novo server fn abaixo deriva o split a partir das próprias `transactions`.

## Novo server fn
`getCreatorBancoOverview` em `src/lib/finance.functions.ts` (usa `requireSupabaseAuth`), retorna:
```ts
{
  national:      { releasedCents, pendingCents },
  international: { releasedCents, pendingCents },
  totals:        { releasedCents, pendingCents },
  updatedAt: string | null,
}
```
Implementação: uma única `select` em `transactions` filtrando `creator_id = userId`, `status = 'paid'`, `net_cents > 0`, `kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus')`, projetando `net_cents, is_international, wallet_released_at`. Soma no server:
- Já liberado nacional: `wallet_released_at IS NOT NULL AND is_international = false`
- A liberar nacional: `wallet_released_at IS NULL AND is_international = false`
- Idem para internacional.
Sanity-check contra `getCreatorWallet` (usar o `released_cents` total do wallet como fallback quando a soma derivada for zero).

## Mudanças em `src/routes/_authenticated/banco.tsx`

### 1. Cards de saldo (linhas ~86-109)
- Substituir o array literal por dois cards renderizados a partir de `overviewQuery.data.national` e `.international`.
- "Liberado para saque": `formatBRL(releasedCents)`.
- "Saldo a liberar": `formatBRL(pendingCents)`.
- Skeleton simples enquanto `overviewQuery.isLoading`.
- Botão **Sacar**:
  - Habilitado apenas quando `walletActive && releasedCents > 0`.
  - Ao clicar, hoje a rota `/banco/sacar` não existe → abrir o `Sheet` de "em breve" (toast: "Solicitação de saque em breve") **ou** apenas manter `disabled` com tooltip. Preferir manter desabilitado com hint contextual ("Saques em breve" quando não houver rota), para não prometer ação que não existe. Reavaliar quando `/banco/sacar` for criado (fora do escopo).
- Card Internacional fica desabilitado quando ambos os valores são 0 (mostra "Sem movimentações internacionais").

### 2. Extrato (linhas ~112-122)
Substituir o placeholder por uma lista real:
- `useQuery` com `listCreatorTransactions({ limit: 20 })`.
- Estados: loading (skeleton), vazio (mantém a mensagem atual "Aqui você verá as movimentações"), preenchido.
- Cada item mostra:
  - Ícone por `kind` (assinatura, gorjeta, desbloqueio, chamada) — usar `Banknote`/`Wallet` já importados + `MessageCircle`/`Film`.
  - Título humanizado (`kindLabel(kind)`) + método de pagamento em badge pequeno.
  - Data relativa (`Intl.DateTimeFormat pt-BR`, curto).
  - Valor bruto e, em uma linha secundária menor, `Líquido: R$ …` (net_cents).
  - Bandeira "Internacional" quando `is_international`.
  - Status pendente (badge amarelo) quando `status !== 'paid'` (para o futuro; hoje o fetch já filtra em `.eq status paid` — remover esse filtro para poder mostrar pagamentos abertos também).
- Ordenação já vem `created_at desc` do server.
- Rodapé com link "Ver tudo" (placeholder desabilitado por enquanto ou removido — não há rota dedicada). Ficar apenas com os 20 mais recentes.

### 3. Hooks e helpers no topo do arquivo
- Adicionar `useQuery` para `getCreatorBancoOverview` e `listCreatorTransactions`.
- Adicionar util `formatBRL(cents)` e `kindLabel(kind)` locais.
- Adicionar ícones novos importados de `lucide-react` (`Gift`, `Film`, `MessageCircle`, `Repeat`).

## Fora de escopo
- Fluxo de "Sacar" (formulário/confirmação/PIX) — a rota `/banco/sacar` não existe ainda; botão fica desabilitado com hint até ser construído.
- Extrato paginado com filtros / infinite scroll — hoje entrega apenas as 20 últimas.
- Histórico de saques — dados existem em `listCreatorWithdrawals`, mas nenhuma seção nova nesta iteração.
- Card de "Integração com Asaas" e "Recebimento ativo" — permanecem como estão.

## Como testar
1. Creator sem vendas: os dois cards mostram R$ 0,00 e o extrato mostra a mensagem atual.
2. Creator com uma venda PIX nacional já liberada: card Nacional mostra o net em "Liberado" e extrato mostra a linha correspondente.
3. Creator com uma venda de cartão nacional recente (não liberada): valor aparece em "Saldo a liberar" e uma linha "libera em …" (opcional) no item do extrato.
4. Botão Sacar fica desabilitado enquanto `releasedCents = 0` ou wallet não estiver ativo.