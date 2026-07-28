## Escopo

Aplicar o padrão "dropdown no mobile + chips no desktop" a todas as tiras de sub-abas restantes de `src/routes/_authenticated/my-monetisex-stats.tsx`. Estas são as principais sub-abas dentro dos painéis (`Faturamento` / `Ganhos por produto` já foi feito).

### 1. Substituir por `<SubTabsRow>` (aproveita a variante mobile pronta)

Trocar o bloco `<div className="flex flex-wrap items-center gap-2">{TABS.map(button)}</div>` por `<SubTabsRow tabs={...} active={...} onChange={...} />` em:

- **L1165** – `ENGAJAMENTO_TABS` no `EngajamentoPanel` (Publicações / Lives).
- **L1567** – `ASSINANTES_TABS` no painel de assinantes (Assinaturas / …).

### 2. Cartões "Top" com Chips (`TOP_POST_TABS`, `TOP_LIVE_TABS`, `TOP_ASSIN_TABS`)

Cada `<div className="mt-4 flex flex-wrap gap-2">{TABS.map(Chip)}</div>` vira:

- Mobile: dropdown full-width (mesmo estilo de trigger dos `SubTabsRow`).
- Desktop (`sm+`): chips lado a lado, comportamento atual.

Locais: L2065 (`TopPostagemCard`), L2178 (`TopLiveCard`), L2233 (`TopAssinantesCard`).

Como são 3 pontos idênticos, criar um helper local `<CardTabsRow tabs active onChange />` (mesma assinatura de `SubTabsRow`, visual "Chip") e reusar nos três cards. Fica no mesmo arquivo, ao lado de `SubTabsRow`.

### 3. Filtros com `overflow-x-auto`

Substituir o `flex gap-2 overflow-x-auto` por dropdown full-width no mobile / chips no desktop em:

- **L1755** – `TOP_ASSINANTES_CHIPS` no card compacto de Top assinantes.
- **L1790** – `TOP_ASSINANTES_CHIPS` no card completo "Filtrar por".
- **L1907** – `ASSINANTES_LIST_CHIPS` no card "Filtrar por" da lista.

Usar o mesmo `<CardTabsRow>` criado no passo 2 (a estética é Chip, então serve).

### 4. `ExtratoFiltrosRow` (L1026)

`Filtrar por` + chips inline. No mobile empilhar (label acima, dropdown full-width abaixo); no desktop manter label + chips na mesma linha. Reusa `<CardTabsRow>`.

## Fora de escopo

- Não mexer nos `flex-wrap` de rótulos/badges/valores (linhas 924, 996, 1416, 1581, etc.) — não são navegação por abas.
- Sem mudanças de dados, ordenação ou lógica de negócio.
- Sem tocar em `TabsRow` e no `ExtratosPanel` já ajustados.
