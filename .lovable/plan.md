## Objetivo

Ao clicar em **"Acervo no Monetisexy"** no publisher (tanto no picker de mídia principal quanto no de prévia), abrir um **bottom sheet** mostrando o acervo do usuário (mesmo conteúdo da página `/vault`), permitindo selecionar 1 ou mais itens já enviados e adicioná-los à publicação atual — sem sair do fluxo de criação.

## O que será construído

### 1. Novo componente `VaultPickerSheet`
Arquivo novo: `src/components/publisher/VaultPickerSheet.tsx`

- Baseado em `Sheet side="bottom"` (mesma estética dos outros bottom sheets do publisher: `rounded-t-2xl sm:max-w-[420px]`).
- Header com título "Acervo no Monetisexy" e botão fechar.
- Barra de busca (`Input` com ícone).
- Abas fixas iguais ao `/vault`: **Todas**, **Publicações**, **Conversas**, **Envios** + categorias personalizadas do usuário (via `listVaultCategories`).
- Filtros de tipo: **TODAS / FOTO / VÍDEO / GIF** (áudio omitido — o publisher só aceita image/video).
- Grade de miniaturas (3 colunas) com badge de tipo e overlay de check quando selecionado.
- Modo multi-seleção sempre ativo (tap para marcar/desmarcar).
- Rodapé fixo: "Adicionar N item(ns)" — desabilitado quando vazio.

### 2. Reutilização das server functions existentes
Nada novo no backend. Vamos usar de `@/lib/vault.functions`:
- `listVaultCategories`
- `listVaultUploads` (aba Envios)
- `listVaultPublicationMedia` (aba Publicações)
- `listVaultChatMedia` (aba Conversas)
- `listVaultCategoryItems` (categorias personalizadas)
- Aba "Todas": combinar as três fontes acima client-side.

Cada item já traz `publicUrl`/`signedUrl`, `type` (image/video/audio/gif) e `storagePath` — exatamente o necessário para hidratar `MediaItem` no publisher.

### 3. Integração no `publisher.tsx`
- Novo estado `vaultPickerOpen` + `vaultPickerTarget: "media" | "preview"`.
- Substituir o `onClick={triggerFileInput}` do `PickerOption` "Acervo no Monetisexy" (linha ~868) por `() => { setPickerOpen(false); setVaultPickerTarget("media"); setVaultPickerOpen(true); }`.
- Idem no picker de prévia (linha ~899), com `target="preview"`.
- Handler `onConfirm(items)`:
  - Se `target === "media"`: filtra apenas image/video, converte para `MediaItem` com `status: "ready"`, `uploadProgress: 100`, `previewUrl` e `publicUrl` do vault, e faz `setMedia((m) => [...m, ...items])` respeitando `MAX_MEDIA` já existente.
  - Se `target === "preview"`: pega o primeiro item selecionado e seta `previewMedia` diretamente com `status: "ready"`.

### 4. Estados vazios / carregamento
- Skeleton de grid enquanto `useQuery` está carregando.
- Estado vazio: ícone + texto "Nenhum item no acervo" + botão "Abrir Acervo" que navega para `/vault`.

## Fora do escopo
- Upload de novos itens dentro do sheet (usuário faz isso em `/vault`).
- Áudio (o publisher usa fluxo próprio de gravação).
- Reordenar/deletar itens do vault a partir deste sheet.

## Detalhes técnicos

**Conversão vault → MediaItem:**
```ts
{
  id: crypto.randomUUID(),
  type: vaultItem.type === "video" ? "video" : "image",
  status: "ready",
  storagePath: vaultItem.storagePath,
  publicUrl: vaultItem.url,
  previewUrl: vaultItem.url,
  uploadProgress: 100,
}
```

**Chaves de query:** `["vault-picker", tab, filter, search]` com `staleTime: 30_000`.

**Acessibilidade:** `SheetTitle` visível, botões com `aria-pressed` para selecionados.
