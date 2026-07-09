## Aba "Engajamento"

Adicionar `EngajamentoPanel` renderizado quando `mainTab === "Engajamento"` em `src/routes/_authenticated/my-monetisex-stats.tsx`. Atualizar o switch principal para incluir esse caso antes do fallback de `Visão geral`.

### Estrutura

**Sub-tabs (pílulas, mesmo estilo das outras abas):**
- `Publicações` (ativa por padrão)
- `Lives`

**Linha "Ordenar por"** (só quando Publicações — assumir mesmo para Lives por simplicidade):
- Label "Ordenar por" bold
- Chips: `Recentes` (ativa), `Faturamento`, `Mimos`, `Curtidas`, `Comentários` — usando o componente `Chip` existente

**Grid 2/3 + 1/3:**

Coluna principal:
- Card branco arredondado com:
  - Header: `1 postagem  R$ 0,00` (bold) à esquerda, legenda "● Faturamento  ● Quantidade" à direita
  - Corpo vazio com texto centralizado muted: "Sem dados de engajamento para o período selecionado."
- Abaixo do card, texto centralizado muted: "Nenhuma publicação encontrada no período."

Coluna lateral:
- Card `Resumo`:
  - Título "Resumo" bold
  - Duas colunas com ícone circular laranja claro + label/valor:
    - Ícone imagem (`ImageIcon`) → "Quantidade" / "0"
    - Ícone `$` (`DollarSign`) → "Faturamento" / "R$ 0,00"
- Card `Top postagem`:
  - Título "Top postagem" bold
  - Texto muted centralizado: "Nenhuma postagem encontrada no período."

### Detalhes técnicos

- Novos ícones lucide: `Image`, `DollarSign`.
- Novo componente `EngajamentoPanel` com estado local para sub-tab (`Publicações`/`Lives`) e ordenação.
- Ícones circulares: `h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center`.
- Nenhuma mudança em dados/backend, apenas UI estática seguindo o screenshot.
