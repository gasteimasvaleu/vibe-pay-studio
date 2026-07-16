## Objetivo

Botão da câmera (foto de perfil) em `/settings/myprofile` abre um dialog fullscreen (como no screenshot) para escolher um arquivo, dar zoom/rotacionar e recortar em círculo — salvando em `profiles.avatar_url`.

## Backend

**Migration nova:**
- Criar bucket público `avatars` via `storage.buckets`.
- Policies em `storage.objects` para bucket `avatars`:
  - SELECT público (`bucket_id = 'avatars'`).
  - INSERT/UPDATE/DELETE para `authenticated` quando `(storage.foldername(name))[1] = auth.uid()::text`.
- Layout de path: `avatars/{userId}/{uuid}.jpg`.

Sem mudanças em `profiles` (já tem `avatar_url`).

## Server function

`src/lib/onboarding.functions.ts` ou novo `src/lib/profile.functions.ts` — `updateAvatarUrl({ avatarUrl })`:
- `.middleware([requireSupabaseAuth])`.
- Update `profiles.avatar_url` do `userId`.
- Retorna `{ avatarUrl }`.

## UI

**Nova lib de crop:** `bun add react-easy-crop` (usa canvas, gera Blob JPEG).

**Novo componente** `src/components/settings/AvatarCropDialog.tsx`:
- Dialog fullscreen preto (`bg-black`, `max-w-none w-screen h-screen`), sem borda arredondada, com estrutura do screenshot:
  - **Top bar:** botões "Mais zoom" / "Menos zoom" à esquerda; "Girar horizontal" / "Girar direita" / "Girar esquerda" à direita, cada um com ícone circular escuro e label branco abaixo.
  - **Área central:** `<Cropper>` do `react-easy-crop`, aspect `1`, `cropShape="round"`, `showGrid={false}`. Fundo cinza claro atrás da máscara.
  - **Footer:** dois botões redondos (X para cancelar, ✓ para confirmar) sobre pill escuro.
- Estado local: `image`, `zoom`, `rotation`, `crop`, `croppedAreaPixels`.
- Ações:
  - Zoom in/out: `setZoom((z) => clamp(z ± 0.2, 1, 5))`.
  - Girar direita/esquerda: `setRotation((r) => r ± 90)`.
  - Girar horizontal: aplica flip via CSS `transform: scaleX(-1)` no wrapper + flag para incluir no canvas de export.
- `getCroppedImg(imageSrc, croppedAreaPixels, rotation, flip)` — helper que desenha em `<canvas>` e retorna `Blob` JPEG 512×512, qualidade 0.9.

**Fluxo de upload** (dentro do dialog, no confirmar):
1. Gera Blob.
2. `path = avatars/{userId}/{crypto.randomUUID()}.jpg`.
3. `supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: false })`.
4. `getPublicUrl(path)` — bucket público.
5. Chama server fn `updateAvatarUrl({ avatarUrl })`.
6. Se havia avatar antigo em `avatars/{userId}/...`, tenta remover (best-effort).
7. Fecha dialog, `router.invalidate()`, `toast.success`.

**Integração em `settings.myprofile.tsx`:**
- Loader passa `avatarUrl` no `beforeLoad`.
- Renderiza `<AvatarImage>` quando existir.
- `<input type="file" accept="image/*" hidden>` — botão da câmera dispara `click()`.
- Ao escolher arquivo → lê como dataURL → abre `AvatarCropDialog` com aquela imagem.

Sem outras mudanças no arquivo.