## Página `/settings/subscription` — Valor da assinatura

### Alterações

**Criar `src/routes/_authenticated/settings.subscription.tsx`**
- `createFileRoute("/_authenticated/settings/subscription")`, `noindex`, title "Valor da assinatura · Monetisexy", `beforeLoad` verificando auth.
- Header padrão do dashboard: botão voltar à esquerda, título centralizado **"Valor da assinatura"**.

**Layout do corpo** (`main max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28`):

1. **Card de resumo** (`rounded-3xl bg-card p-6 shadow-card`):
   - Coluna esquerda: label `Assinatura Mensal` (muted, sm) e valor em display grande (`text-5xl font-extrabold`) — `R$ 50,00`.
   - Grid inferior 2 colunas separadas por divisor vertical: **Trimestral** `R$ 150,00` e **Semestral** `R$ 300,00` (calculados dinamicamente a partir do mensal e dos descontos).

2. **Campo Assinatura Mensal** (`rounded-2xl bg-muted px-5 py-3`):
   - Label `Assinatura Mensal` (xs, muted), `Input` numérico formatado `R$ XX,XX`, sem borda, `bg-transparent`.
   - Texto de ajuda abaixo: `Mínimo: R$ 19,90 - Máximo: R$ 200,00`.

3. **Grid 2 colunas** (`grid-cols-1 md:grid-cols-2 gap-3`):
   - **Desconto Trimestral** e **Desconto Semestral** — mesma pilha visual (`rounded-2xl bg-muted`), label pequeno, `Input` numérico com `%` à direita.

4. **Barra fixa inferior** com botão **Salvar** full-width (`h-12 rounded-full`), desabilitado quando não há mudança ou valor fora do range.

**Estado local** (`useState`):
- `monthly` (número, default 50), `discountQ` (default 0), `discountS` (default 0).
- Trimestral = `monthly * 3 * (1 - discountQ/100)`, Semestral = `monthly * 6 * (1 - discountS/100)`.
- Validação: `19.9 <= monthly <= 200`, descontos 0–100.
- Salvar chama `toast.info("Em breve")` (sem coluna no schema no momento — fora do escopo).

**Editar `src/routes/_authenticated/settings.creator.tsx`**
- Linha 89–92: trocar `to="/mywallet"` por `to="/settings/subscription"` no `SettingsRow` "Assinatura".

### Tokens e estilo
- Somente tokens semânticos (`bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`).
- Sem cores hardcoded, sem lógica de backend.
