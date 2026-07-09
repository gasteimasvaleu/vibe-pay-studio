## Sub-aba "Atividade dos assinantes"

Substituir o placeholder "Em breve" restante em `AssinantesPanel` para renderizar layout dedicado quando `tab === "Atividade dos assinantes"`.

### Layout

**Grid 2/3 + 1/3:**

Coluna principal (empilhada):

1. Card `Atividade dos assinantes`:
   - Título "Atividade dos assinantes" bold
   - Subtítulo muted: "Distribuição de acessos dos assinantes por dia e horário"
   - Heatmap: grid 7 linhas (Sun, Mon, Tue, Wed, Thu, Fri, Sat) × 8 colunas (12am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm)
     - Label do dia à esquerda de cada linha
     - Células retangulares em `bg-primary/10` com `rounded-md`
     - Row de labels de hora abaixo do grid

2. Card `Horas mais ativas`:
   - Título "Horas mais ativas" bold
   - Área de gráfico com 4 linhas horizontais rotuladas `100%`, `66%`, `33%`, `0%`
   - Eixo X com labels: `12am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm`

Coluna lateral (reusar do Top assinantes):
- Card `Resumo` (Assinantes, Assinaturas/Renovações, Ganhos de assinaturas)
- Card `Top assinantes` (chips + "Sem dados para este filtro.")

### Detalhes técnicos

- Extrair o bloco da sidebar (Resumo + Top assinantes) em uma função interna `SidebarResumo` dentro de `AssinantesPanel` para reutilizar entre Top assinantes e Atividade.
- Heatmap: `grid grid-cols-[auto_repeat(8,minmax(0,1fr))] gap-2 items-center`, células com `h-6 rounded-md bg-primary/10`.
- Sem dados/backend; UI estática.
