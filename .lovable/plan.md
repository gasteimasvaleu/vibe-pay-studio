## Mudanças

### 1. Miniaturas na sidebar (até 3 por linha)

**`src/lib/vault.functions.ts`**
- Estender `getVaultCounts` para também retornar `previews: { all: string[]; publications: string[]; uploads: string[]; chat: string[] }` — até 3 URLs de `publication_media` (mais recentes por `created_at`) + `vault_uploads`. Para "todas" e "publicações" pegar top 3 imagens/gifs/vídeos (evitando áudio). Para "uploads" idem em `vault_uploads`. Chat continua vazio.
- Estender `listVaultCategories` para incluir `previews: string[]` (até 3 URLs) por categoria, resolvendo via join entre `vault_category_items` → `publication_media`/`vault_uploads` limitando a 3 por categoria (single query com `.limit()` client-side por categoria).

**`src/routes/_authenticated/vault.tsx`**
- Adicionar prop opcional `previewUrls?: string[]` em `SidebarRow` e renderizar um cluster de até 3 miniaturas empilhadas à direita (semelhante ao screenshot: 3 quadradinhos sobrepostos com leve rotação/offset, arredondamento sutil coerente com o tema atual).
- Fallback: quando `previewUrls` estiver vazio, não renderiza o cluster (mantém layout atual).

### 2. Ações da barra de seleção: Excluir + Baixar

**`src/routes/_authenticated/vault.tsx`** — barra inferior de seleção (linhas 578–625) redesenhada como pill flutuante centralizada (como screenshot: `X` fechar · "N/total selecionado" · lixeira · download):

- **Fechar (X)**: sai do modo seleção, limpa `selectedKeys`.
- **Contador**: `N / total selecionado` (total = `content.items.length`).
- **Excluir (lixeira)**:
  - Aba `envios`: mantém o comportamento atual (deleta `vault_uploads`).
  - Aba `categoria`: remove do vínculo (`removeFromCategory` para cada `joinId`) — igual ao botão "Remover da categoria" atual, agora consolidado no ícone.
  - Aba `publicações`/`todas`/`conversas`: desabilitar o botão (não é possível excluir mídia de publicação pelo vault) com `title` explicativo.
- **Download (ícone)**: dispara download de cada item selecionado via `<a href={item.url} download>` em loop (com pequeno `setTimeout` entre eles para o navegador aceitar múltiplos). Funciona para qualquer aba e qualquer tipo (usa a URL já retornada pelo servidor, seja pública do bucket `criativos` ou signed URL do `publications`).
- Botão "Adicionar à categoria" continua existindo, movido para dentro do mesmo pill (à direita da lixeira/download) para preservar a funcionalidade.

### Fora do escopo
- Bulk-download como zip (usa downloads individuais nativos do browser).
- Reordenação de miniaturas.
- Miniaturas para "Conversas" (segue vazio até chat ganhar anexos).
