## Objetivo
Reorganizar o card de "Top postagem" para:
1. O checkbox de seleção ficar dentro do card da postagem, no canto superior direito.
2. A miniatura da postagem (`preview_url`) aparecer dentro do card, à esquerda da legenda.

## Premissa
O checkbox continuará visível apenas quando uma ação está ativa (estado atual), apenas reposicionado para dentro do card.

## Passos

### 1. Backend — incluir miniatura no retorno das estatísticas
- Arquivo: `src/lib/stats.functions.ts`
- Na função `getEngajamentoPublicacoes`:
  - Adicionar `preview_url` ao `.select(...)` da consulta em `publications`.
  - Incluir `previewUrl: p.preview_url ?? null` no objeto retornado para cada item.

### 2. Frontend — reorganizar o card "Top postagem"
- Arquivo: `src/routes/_authenticated/my-monetisex-stats.tsx`
- No componente `TopPostagemCard`:
  - Remover o `Checkbox` que hoje fica à esquerda do `Link`.
  - Dentro do `Link` (card da postagem), adicionar o `Checkbox` posicionado no canto superior direito (apenas quando `action` estiver definido).
  - Adicionar a miniatura da postagem (`top.previewUrl`) à esquerda da legenda, usando um `img` com `object-cover` e fallback para um ícone quando não houver imagem.
  - Ajustar o layout interno do card para que a legenda e as estatísticas fiquem ao lado da miniatura.

### 3. Verificação
- Rodar typecheck para garantir que os novos campos e tipos estão corretos.
- Validar no preview que o checkbox aparece no topo direito do card e a miniatura fica à esquerda da legenda quando há `preview_url`.

## Arquivos alterados
- `src/lib/stats.functions.ts`
- `src/routes/_authenticated/my-monetisex-stats.tsx`