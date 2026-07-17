## Objetivo

Substituir o conteúdo atual da aba **Atividade dos assinantes** (feed cronológico `AtividadeAssinantesInline`) pelo layout do screenshot:

- **Esquerda (col-span-2)**:
  1. Card **Atividade dos assinantes** — subtítulo "Distribuição de acessos dos assinantes por dia e horário" + heatmap 7 linhas (Dom..Sáb) × 8 colunas de horário (12am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm — buckets de 3h)
  2. Card **Horas mais ativas** — gráfico de linha/área 0–100% por bucket de 3h
- **Direita**: mesmos cards já existentes na aba Top assinantes — `ResumoAssinantesCard` + `TopAssinantesInline` (Total/Assinaturas/Mimos/Chat), reutilizados.

Dados reais vindos de `profile_views` do perfil do criador no período (proxy de "acessos"; é a única tabela que registra visitas).

## Backend — `src/lib/stats.functions.ts`

Nova server fn `getAssinantesActivity({ from, to })`:

- Lê `profile_views` onde `profile_id = userId` e `created_at` no range.
- Bucketiza cada view por `getDay()` (0=Dom..6=Sáb) e `getHours()`, agrupando em 8 buckets de 3h: `[0-2, 3-5, 6-8, 9-11, 12-14, 15-17, 18-20, 21-23]`.
- Retorna:
  ```ts
  {
    heatmap: number[][];       // 7 × 8 (contagens)
    max: number;               // maior valor do heatmap (para escala de opacidade)
    hourly: number[];          // 8 buckets — soma total por bucket
    hourlyPct: number[];       // 8 buckets — % do maior bucket (0..100)
    total: number;             // total geral
  }
  ```
- Sem paginação; limite implícito do Supabase (1000) é aceitável — para períodos longos a página carrega o suficiente para exibir tendência. Se `count` > 1000 ainda assim, a distribuição relativa se preserva.

## UI — `src/routes/_authenticated/my-monetisex-stats.tsx`

1. Substituir o branch `<AtividadeAssinantesInline range={range} />` (linha 1530) por um novo layout `grid grid-cols-1 md:grid-cols-3 gap-5`:
   - **Esquerda (`md:col-span-2 space-y-5`)**: `<AtividadeHeatmapCard range={range} />` + `<HorasMaisAtivasCard range={range} />` (compartilham a mesma query via chave `["stats","assinantesActivity",from,to]`).
   - **Direita (`space-y-5`)**: `<ResumoAssinantesCard stats={stats.data} loading={stats.isLoading} />` + `<TopAssinantesInline top={top.data ?? []} loading={top.isLoading} filtro={topFiltro} onFiltro={setTopFiltro} />` (reusa estado já existente no `AssinantesPanel`).
2. Manter `AtividadeAssinantesInline` no arquivo (não removido; apenas não usado — evita quebra caso reintroduzido). Opcional: remover se não referenciado — sim, remover para manter arquivo limpo (junto com `getAtividadeAssinantes` no `stats.functions.ts` e do array de imports).
3. Novo componente `AtividadeHeatmapCard`:
   - Card `rounded-2xl border bg-card p-5`
   - Título "Atividade dos assinantes" (bold) + subtítulo `text-sm text-muted-foreground` "Distribuição de acessos dos assinantes por dia e horário"
   - Grid CSS `grid-cols-[auto_repeat(8,minmax(0,1fr))] gap-1.5`:
     - Linhas com label do dia (Dom/Seg/Ter/Qua/Qui/Sex/Sáb) + 8 células
     - Cada célula: `h-8 rounded-md` com `background: hsl(var(--primary) / ${opacity})` onde `opacity = max > 0 ? 0.08 + (count/max) * 0.72 : 0.08`; `title={count acessos}`
   - Rodapé com labels de horário `12am 3am 6am 9am 12pm 3pm 6pm 9pm` (`text-xs text-muted-foreground`, mesma grid)
   - Loading: `Skeleton` 7×8 no lugar das células.
4. Novo componente `HorasMaisAtivasCard`:
   - Card com título "Horas mais ativas"
   - `ResponsiveContainer` + `AreaChart` (recharts, já usado): eixo Y fixo `[0,100]` com ticks `0, 33, 66, 100` sufixados com `%`; eixo X com os 8 labels de horário; área/linha `#8B5CF6` (roxo, para casar com o resto da aba Assinaturas).
   - `dataKey` = `hourlyPct`.
   - Loading: `Skeleton` `h-56`.

## Arquivos alterados

- `src/lib/stats.functions.ts` — adicionar `getAssinantesActivity`; remover `getAtividadeAssinantes` (não mais usada).
- `src/routes/_authenticated/my-monetisex-stats.tsx` — trocar branch Atividade; adicionar `AtividadeHeatmapCard`, `HorasMaisAtivasCard`; remover `AtividadeAssinantesInline` + import de `getAtividadeAssinantes` + import de `MessageSquare/Gift/Lock/XIcon` se ficarem sem uso.

Sem migração, sem mudanças de schema.
