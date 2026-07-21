## Ajustes no StoryViewer

### 1. Corrigir corte no desktop (aspect ratio de story)
Hoje o container media ocupa 100% do viewport (`flex-1`). Em telas largas, a imagem/vídeo vertical fica pequena/estranha e a horizontal parece cortada. Padronizar para formato 9:16 estilo Instagram:
- Envolver o media em uma "moldura" centralizada `aspect-[9/16]` com `h-full max-h-full w-auto` e `rounded-2xl overflow-hidden` no desktop. No mobile, ocupa toda a tela como hoje.
- Imagem e vídeo passam a usar `h-full w-full object-cover` dentro dessa moldura para preencher sem distorcer. `LockedOverlay` também recebe a mesma moldura.

### 2. Header com avatar + nome do creator
- Expor `creator_username` e `creator_avatar_url` em `StoryItem` (join com `profiles` já feito em `getCreatorStories` — adicionar um `select` extra por `creator_id`).
- No header do `StoryViewer`, mostrar avatar (32px) + `@username` à esquerda; mover data/horário para logo abaixo do nome em texto menor.
- Manter botões de fechar/apagar à direita.

### 3. Ajuste da barra de progresso superior
- Aumentar altura para `h-1`, gap `gap-1.5`, cor de fundo mais suave (`bg-white/25`) e progresso `bg-white`.
- Padding do topo mais confortável (`px-4 pt-4 pb-1`) e limitar largura da barra ao mesmo container da moldura no desktop (centralizada).

### Arquivos
- `src/lib/stories.functions.ts` — adicionar `creator_username` / `creator_avatar_url` ao tipo e ao handler `getCreatorStories`.
- `src/components/feed/StoryViewer.tsx` — novo header, moldura 9:16, progress bar ajustada.

Sem mudanças em lógica de pagamento, RLS ou tabelas.
