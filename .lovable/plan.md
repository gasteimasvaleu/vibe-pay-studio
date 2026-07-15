## Objetivo
Remover a barra de carregamento global do footer na tela de publisher, pois cada mídia já exibe sua própria barra de progresso individual sobre o preview.

## Alteração
**Arquivo:** `src/routes/_authenticated/publisher.tsx`

Na seção do `<footer>` fixo (linhas ~825–858), remover apenas o bloco que exibe:
- rótulo "Enviando mídia"
- percentual global (`uploadProgress`%)
- `<Progress value={uploadProgress} />`

Manter:
- botão "Continuar" / "Postar"
- texto dinâmico "Enviando (N)..." quando houver uploads em andamento
- cálculo de `uploadProgress` e `uploadingCount` (ainda usados para habilitar/desabilitar o botão e o texto)

## Fora de escopo
- Não alterar a barra de progresso individual dentro de cada card de mídia (`MediaGridItem`).
- Não alterar a barra de progresso da prévia paga nem a de áudio.

## Validação
- Verificar visualmente que o footer não mostra mais a barra global durante upload.
- Confirmar que o botão "Continuar" ainda fica desabilitado enquanto houver uploads pendentes.