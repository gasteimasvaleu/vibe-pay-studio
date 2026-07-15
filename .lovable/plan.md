## Objetivo
Transformar `/vault` em uma biblioteca de mídia real do criador, com 4 abas fixas (Todas, Publicações, Conversas, Envios), categorias personalizadas do usuário, filtros de tipo, ordenação e busca funcionando.

## Escopo confirmado
- **Publicações**: lê `publication_media` das publicações do usuário logado.
- **Conversas**: hoje `chat_messages` não tem coluna de mídia — a aba fica com estado vazio ("Sem mídias nas conversas ainda") até chat ganhar suporte a anexos. Sem migração agora.
- **Envios**: uploads avulsos no bucket `publications` sob prefixo `vault/<user_id>/…`, com registro em nova tabela `vault_uploads`.
- **Categorias do usuário**: nova tabela `vault_categories` + `vault_category_items` (poliformo: aponta para `publication_media.id` ou `vault_uploads.id`).

## Banco (migração única)

```text
vault_uploads
  id, user_id, storage_path, url, type (image|video|audio|gif),
  mime, size_bytes, width, height, duration_seconds, created_at
  RLS: dono lê/escreve; service_role total

vault_categories
  id, user_id, name, position, created_at, updated_at
  UNIQUE (user_id, lower(name))
  RLS: dono lê/escreve

vault_category_items
  id, category_id, source ('publication'|'upload'),
  publication_media_id (fk), vault_upload_id (fk),
  position, created_at
  CHECK: exatamente um dos dois FKs preenchido
  RLS: acesso pelo dono da categoria
```

GRANTs `authenticated` + `service_role` em todas.

## Backend (server functions em `src/lib/vault.functions.ts`)
Todas com `requireSupabaseAuth`:
- `listVaultPublications({ mediaType?, sort, limit, offset })` — join `publications` + `publication_media` do próprio usuário.
- `listVaultChatMedia()` — retorna `[]` por ora (documentado).
- `listVaultUploads({ mediaType?, sort })`
- `listVaultCategories()` e `listVaultCategoryItems(categoryId, filtros)`
- `createVaultCategory(name)`, `renameVaultCategory`, `deleteVaultCategory`, `reorderVaultCategories`
- `addItemsToCategory(categoryId, items[])` / `removeItemFromCategory`
- `createVaultUpload({ storagePath, url, type, mime, size, ... })` — grava após upload direto ao Storage.
- `deleteVaultUpload(id)` — apaga do Storage e da tabela.

Contadores de mídia por aba/categoria vêm de counts agregados.

## Frontend (`src/routes/_authenticated/vault.tsx`)
Refactor completo do mock para consumir React Query + server functions:

1. **Loader** com `ensureQueryData` para contagens das 4 abas + categorias do usuário.
2. **Sidebar**: 4 abas fixas com contagens reais + lista de categorias do usuário (ordenação por Padrão/Nome/Recentes/Mídias respeitando `sidebarDirection`).
3. **Conteúdo da aba ativa**: grid responsivo de mídia (thumb, badge de tipo, hover com data). Filtro `TODAS/FOTO/VÍDEO/ÁUDIO/GIF` e ordenação recentes/antigas passam para o server fn via `loaderDeps`+search params. Busca (`Search`) filtra por caption/nome.
4. **Modo seleção** (ícone `CheckSquare` já existe): permite selecionar várias mídias e "Adicionar a uma categoria".
5. **Aba Envios**: botão de upload real (drag-and-drop + input) → sobe arquivo para `publications/vault/<uid>/<uuid>.<ext>` via `supabase.storage`, obtém signed URL, chama `createVaultUpload`. Suporta imagem, vídeo, gif, áudio. Preview/lightbox reaproveitando `MediaLightbox`. Exclusão com confirmação.
6. **Diálogo "Adicionar nova categoria"**: passa a criar categoria real via `createVaultCategory`; o botão "Adicionar mídia" abre picker das minhas mídias (publicações + envios) para popular a categoria na hora.
7. **Estados vazios** reais por aba.
8. **Aba Conversas**: mostra o `EmptyCategory` atual com legenda "Em breve" (comentário no código explicando o motivo).

## Fora de escopo
- Adicionar mídia em `chat_messages` (exige mudança de schema/UX própria).
- Reordenação drag-and-drop dentro da categoria (ordenação por criação por enquanto).
- Compartilhamento/uso direto do envio dentro do publisher (podemos ligar em outra tarefa).

## Passos de implementação
1. Migração: `vault_uploads`, `vault_categories`, `vault_category_items` (+ grants + RLS + triggers de `updated_at`).
2. `src/lib/vault.functions.ts` com todos os server fns.
3. Refactor de `src/routes/_authenticated/vault.tsx` para consumir os dados reais, mantendo o layout/estilo atual.
4. Componentes auxiliares em `src/components/vault/` (MediaGrid, UploadDropzone, CategoryPickerDialog).
5. Verificação: build limpo + smoke test no preview (upload, criar categoria, filtro, ordenação).
