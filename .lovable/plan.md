## Aba "Resumo" — Meu Monetisex

Criar o conteúdo da sub-aba **Resumo** em `src/routes/_authenticated/my-monetisex-stats.tsx`, seguindo os 3 screenshots enviados. Como esta aba precisa de layout próprio (linhas de cards com larguras diferentes do 2/1 usado nas outras), quando `subTab === "Resumo"` o grid principal é substituído por um layout dedicado full-width; nas demais abas nada muda.

### Estrutura visual (3 linhas)

**Linha 1** — grid `md:grid-cols-3`
- `VendasNacionaisCard` — título "Vendas nacionais" + 3 blocos em coluna (Hoje, No mês, Total faturamento histórico), todos com `R$ 0,00`.
- `VendasInternacionaisCard` — idêntico, título "Vendas internacionais".
- `MeuBancoCard` — ícone laranja + "Você está no top +100 da Privacy!", "Faturamento hoje" com underline curto, bloco dividido em 2 colunas ("R$ 0,00 / Saldo liberado" e "R$ 0,00 / Saldo a liberar" com ícone Info), botão outline arredondado "Acessar Meu Banco".

**Linha 2** — grid `md:grid-cols-3`
- `AssinantesCard` — "Total 0", "Ativos 0", linha expansível "Faturamento em relação a outros criadores" (com ícone `Minus`), rodapé centralizado "Parabéns, você está entre os melhores criadores Privacy! Continue assim!".
- `ProjecaoFaturamentoCard` — título + subtítulo "July/26"; blocos "Total R$ 0,00", "Média Dia R$ 0,00", "Projeção" com `R$ 0,00` em laranja à direita e "+0% ↑" abaixo.
- `FaturamentoPeriodoCard` — card simples "Faturamento no período" com `R$ 0,00`.

**Linha 3** — grid `md:grid-cols-2`
- `RecordeDiaCard` — "Recorde de vendas no dia" com 3 linhas expansíveis TOP 1 / TOP 2 / TOP 3 (cada uma com um traço `—` como valor e ícone `Minus` à direita).
- `RecordeMesCard` — idêntico, título "Recorde de vendas no mês".

### Detalhes técnicos

- Reaproveitar as classes já usadas: `rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]`; sub-blocos internos em `rounded-xl bg-muted/60 p-4`.
- Tipografia: título `text-lg font-bold tracking-tight`; labels `text-sm text-muted-foreground`; valores `text-lg font-bold`.
- Ícones novos do `lucide-react`: `MessageCircle` (badge Privacy — já importado), `Minus`, `ArrowUpRight` (ou usar seta unicode existente). Adicionar imports faltantes.
- No render principal, dentro de `<main>`, substituir o bloco `<div className="grid grid-cols-1 md:grid-cols-3 gap-5">…</div>` por um condicional: se `subTab === "Resumo"` renderiza `<ResumoPanel />` (full-width, próprio grid); caso contrário mantém o layout atual intacto.
- Novo componente `ResumoPanel` compõe os 8 cards descritos acima em 3 linhas com `space-y-5`.
- Todos os valores são placeholders estáticos (mock), sem lógica de dados — apenas UI, alinhado com o resto da página.
