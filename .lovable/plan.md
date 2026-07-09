## Sub-aba "Top assinantes" (dentro de Assinantes)

Atualizar `AssinantesPanel` em `src/routes/_authenticated/my-monetisex-stats.tsx` para renderizar layout dedicado quando `tab === "Top assinantes"` (substitui o placeholder "Em breve").

### Layout

**Grid 2/3 + 1/3:**

Coluna principal:
- Label `Filtrar por` bold
- Chips: `Total` (ativo), `Assinaturas`, `Mimos`, `Chat`
- Card tabela:
  - Header: `Nome` (esquerda) `Gasto total` (direita)
  - Corpo vazio com texto centralizado muted: "Sem dados para este filtro"

Coluna lateral:
- Card `Resumo`:
  - Título "Resumo" bold
  - Grid 2 colunas:
    - `Users` (ícone circular outline) → "Assinantes" / "0"
    - `UserPlus` (ícone circular outline) → "Assinaturas/Renovações" / "0 / 0"
    - `DollarSign` (ícone circular outline) → "Ganhos de assinaturas" / "R$ 0,00" (com uma linha divisória fina à direita/abaixo simulando o traço do screenshot — usar `<hr>` sutil)
- Card `Top assinantes` (mesmo do modo Assinaturas):
  - Título "Top assinantes" bold
  - Chips com overflow-x-auto: `Total` (ativo), `Assinaturas`, `Mimos`, `Chat`
  - Texto muted: "Sem dados para este filtro."

### Detalhes técnicos

- Reutilizar constante `TOP_ASSINANTES_CHIPS` para ambos os filtros (topFiltro para sidebar, novo `topAssFiltro` para coluna principal).
- Ícones circulares: `h-10 w-10 rounded-full border border-border text-primary grid place-items-center bg-card`.
- Estado local separado para o filtro da coluna principal.
- Nenhuma alteração em dados/backend.
