## Objetivo

Tornar `/criar-perfil-gratuito` totalmente funcional: avatar e capa enviados pelo usuário passam a ser persistidos de verdade em `profiles.avatar_url` / `cover_url`, e as imagens placeholder do `picsum.photos` são substituídas por assets reais do projeto.

## Mudanças

### 1. Upload real de avatar e capa
Reusar os buckets privados já existentes (`avatars` e `covers`) e o mesmo padrão de URL assinada de longa duração (~10 anos) que `AvatarCropDialog` / `CoverPreviewDialog` já usam.

- Ao selecionar um arquivo (avatar ou capa), fazer `supabase.storage.from(bucket).upload(...)` para `${userId}/${uuid}.jpg`.
- Gerar `createSignedUrl` com TTL de 10 anos e guardar essa URL no state (`avatarUrl`, `coverUrl`).
- Mostrar spinner enquanto o upload roda; toast em caso de erro.
- No submit, enviar `avatarUrl` e `coverUrl` reais (não mais `null` / URL do picsum) para `createFreeCreatorProfile`.
- Se o usuário selecionar uma das opções pré-definidas de capa, usar a URL real dessa imagem (asset do projeto, ver abaixo).

### 2. Substituir placeholders picsum por assets reais
- **Step 1 (`HERO_IMAGES`)**: 4 imagens decorativas. Gerar 4 assets em `src/assets/` (fotos estilo lifestyle/criadora, alinhadas ao tom do produto) e importar via `import heroA from "@/assets/..."`.
- **Step 2 (`COVER_OPTIONS`)**: 3 capas pré-prontas. Gerar 3 assets de capa (3:1 ou 4:3) em `src/assets/` e usar as URLs importadas como opções selecionáveis. Assim, se o usuário escolher uma delas sem enviar a própria, ela é salva de verdade como capa.

### 3. Ajustes de UX
- Botão de avatar mostra loader durante upload.
- Bloquear "Criar Conta" enquanto qualquer upload estiver em andamento.
- Manter validações atuais (`handle` regex, `displayName` obrigatório).

## Arquivos afetados

- `src/routes/_authenticated/criar-perfil-gratuito.tsx` — lógica de upload real, estado de loading por upload, uso dos novos assets.
- `src/assets/` — 4 imagens hero + 3 capas geradas (jpg).
- Nenhuma mudança em `onboarding.functions.ts` (já aceita `avatarUrl` e `coverUrl`).
- Nenhuma migração de banco necessária (buckets `avatars` e `covers` já existem).

## Fora de escopo

- Cropper para avatar/capa nesta tela (mantemos upload direto; edição fina já existe em Configurações).
- Alterações no `createFreeCreatorProfile`.
