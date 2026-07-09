## Aba "Assinantes"

Adicionar `AssinantesPanel` renderizado quando `mainTab === "Assinantes"` em `src/routes/_authenticated/my-monetisex-stats.tsx`. Atualizar switch principal.

### Sub-tabs (pílulas)
- `Assinaturas` (ativa por padrão)
- `Top assinantes`
- `Atividade dos assinantes`

Divisor abaixo (border-t) como nas outras abas.

### Layout (quando "Assinaturas" está ativa)

**Grid 2/3 + 1/3 (topo):**

Coluna principal — Card de gráfico:
- Header: `0 Assinantes, R$ 0,00` (bold) + legenda "● Faturamento ● Quantidade"
- Área do gráfico com linhas horizontais tracejadas rotuladas `R$1`, `R$1`, `R$0`, `1`, `1`
- No meio do gráfico, texto centralizado muted: "Nenhum dado disponível para o período."
- Eixo X: `Jun 9, 2026 / Jun 16, 2026 / Jun 24, 2026 / Jul 2, 2026 / Jul 9, 2026`

Coluna lateral:
- Card `Top assinantes`:
  - Título "Top assinantes" bold
  - Linha de chips (scroll horizontal `overflow-x-auto`): `Total` (ativa), `Assinaturas`, `Mimos`, `Chat` (parcialmente visível)
  - Texto muted centralizado: "Sem dados para este filtro."
- Card `Assinantes por faixa de preço`:
  - Título bold
  - Texto muted centralizado: "Nenhum dado disponível para o período."

**Abaixo (largura da coluna principal 2/3):**

- Bloco `Filtrar por`:
  - Label "Filtrar por" bold
  - Chips: `Todos` (ativo), `Renovações`, `Novos assinantes`
- Input de busca:
  - Ícone `Search` à esquerda, placeholder "Pesquisar assinantes..."
  - Estilo pílula arredondada com border
- Card tabela:
  - Header: `Nome | Status | Preço | Duração total`
  - Corpo vazio com texto centralizado muted: "Nenhum assinante encontrado."

### Sub-tabs restantes

`Top assinantes` e `Atividade dos assinantes`: renderizar placeholder simples "Em breve." Pode ser refinado nas próximas iterações quando os screenshots forem enviados.

### Detalhes técnicos

- Novos ícones lucide: `Search`.
- Estado local para sub-tab, filtro (Todos/Renovações/Novos assinantes), filtro Top assinantes e query de busca.
- Input com border pílula: `rounded-full border border-border bg-card px-5 py-3 pl-11`.
- Sem mudanças em dados/backend.
