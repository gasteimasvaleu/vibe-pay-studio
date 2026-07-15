## Problema

A aba **Áudios** do Vault não mostra os áudios das publicações porque a função `listVaultPublications` só lê `publication_media`, que armazena apenas `image` e `video`. Áudios ficam nas colunas `audio_url` / `audio_storage_path` da própria tabela `publications` (hoje há 2 publicações com áudio no banco).

Além disso, o mapeamento atual força todo item de `publication_media` como `"image"` ou `"video"` (nada vira `"audio"` nem `"gif"`), então mesmo que houvesse, seriam classificados errado.

## Mudanças

**`src/lib/vault.functions.ts` — `listVaultPublications`**

1. Selecionar também `audio_url, audio_storage_path` da tabela `publications`.
2. Para cada publicação com `audio_url`, emitir um `VaultMediaItem` extra com:
   - `source: "publication"`
   - `id`: id da publicação (prefixado, ex.: `audio:<pub_id>`, para não colidir com ids de `publication_media`)
   - `type: "audio"`
   - `url`: `audio_url`
   - `storagePath`: `audio_storage_path`
3. Corrigir o mapeamento de `publication_media.type` para respeitar `audio` e `gif` caso passem a existir (fallback continua `image`).
4. Aplicar o `applyTypeFilter` normalmente — agora "Áudios" retorna os itens de áudio das publicações.

**Categorias (`vault_category_items`)**

O id de áudio de publicação (`audio:<pub_id>`) não existe em `publication_media`, então:
- Bloquear no `addVaultItemsToCategory` a tentativa de anexar item de áudio-publicação a uma categoria (validação com mensagem clara), OU
- Manter simples: permitir apenas categorizar itens de `publication_media` e de `vault_uploads` (comportamento atual). O UI já usa `joinId` de `vault_category_items`, então basta a validação server-side impedir o `source: "publication"` quando o id começa com `audio:`.

**Frontend (`src/routes/_authenticated/vault.tsx`)**

Nenhuma mudança de UI necessária — a grid já renderiza `type === "audio"` com player. Apenas garantir que a chave (`item.key`) usada na seleção não colida (usar `source + id` como já é feito).

## Fora do escopo

- Adicionar suporte a áudio no `publication_media` (schema atual mantém áudio na `publications`).
- Permitir anexar áudio de publicação a categorias personalizadas.
