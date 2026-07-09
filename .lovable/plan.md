## Aba "Alcance"

Adicionar `AlcancePanel` renderizado quando `mainTab === "Alcance"` em `src/routes/_authenticated/my-monetisex-stats.tsx`. Atualizar o switch principal.

### Layout

**Grid 2/3 + 1/3 (topo):**

Coluna principal — Card de gráfico:
- Header: `0 Visitantes` (bold, grande) + legenda "● Visitantes (laranja) ● Usuários (cinza)"
- Área do gráfico com grid horizontal (linhas "1", "1", "0") e eixo X: `08/06, 14/06, 20/06, 26/06, 02/07, 08/07`

Coluna lateral — Card `Resumo`:
- Grid 2x2 com ícone circular (outline com bg card e ring border) + label/valor:
  - `Users` → "Visitantes" / "0"
  - `UserPlus` → "Assinaturas" / "0"
  - `DollarSign` → "Assinaturas" / "R$ 0,00"
  - `UserPlus` → "Renovações" / "0"

**Abaixo (largura da coluna principal 2/3):**

- Card tabela `Visitantes do perfil`:
  - Header: colunas alinhadas à direita `Visitantes | Usuários | Total`
  - Linha: `Visitantes do perfil` (esquerda) `0 | 0 | 0 (bold)` (direita)
- Card `Principais países`:
  - Título "Principais países" bold
  - Texto muted centralizado: "Nenhum dado disponível para o período."

### Detalhes técnicos

- Novos ícones lucide: `UserPlus`.
- Ícones circulares no Resumo: `h-10 w-10 rounded-full border border-border text-primary grid place-items-center bg-card`.
- Sem mudanças em dados/backend; UI estática seguindo screenshots.
