## Objetivo

No botão da foto de capa em `/settings/details`, abrir um dialog preto (como o do avatar) para recortar a imagem em formato horizontal. Após confirmar o recorte, abrir um segundo dialog de pré-visualização mostrando o banner + avatar. O usuário decide entre **Salvar** (persiste) ou **Cancelar** (descarta).

## O que será construído

### 1. Novo bucket de storage `covers` (privado)
- Criado via `supabase--storage_create_bucket` (privado, como `avatars`).
- Policies RLS em `storage.objects`: usuário só faz upload/leitura/delete dentro da própria pasta `{userId}/...`.

### 2. Server function `updateCoverUrl` em `src/lib/profile.functions.ts`
- Middleware `requireSupabaseAuth`, valida URL, faz `update` em `profiles.cover_url`.

### 3. Novo componente `src/components/settings/CoverCropDialog.tsx`
- Baseado no `AvatarCropDialog`, mas:
  - `aspect={3}` (banner horizontal ~ 3:1, mesma proporção usada no perfil/search).
  - `cropShape="rect"`, sem grid.
  - Saída em canvas ~1500×500 JPEG q0.9.
  - Ao confirmar o recorte, **NÃO** faz upload ainda — apenas retorna o blob/dataURL via `onCropped(previewDataUrl)`.

### 4. Novo componente `src/components/settings/CoverPreviewDialog.tsx`
- Dialog (shadcn `Dialog`) com card claro reproduzindo o layout do segundo screenshot:
  - Título "Pré-visualização".
  - Banner recortado (`3:1`) com botão câmera central (reabre o recorte).
  - Avatar atual sobreposto na base do banner, com botão câmera (reabre o `AvatarCropDialog`).
- Botões **Salvar** (faz upload no bucket `covers`, gera signed URL e chama `updateCoverUrl`) e **Cancelar** (fecha e descarta).

### 5. Integração em `src/routes/_authenticated/settings.details.tsx`
- `beforeLoad` passa a carregar `cover_url` e `avatar_url` do perfil para preencher pré-visualização.
- Substitui o `onClick={() => toast.info("Em breve")}` do botão de capa por:
  1. Abre file picker (`accept="image/*"`, limite 10MB).
  2. Abre `CoverCropDialog` com o arquivo lido.
  3. Ao confirmar recorte → abre `CoverPreviewDialog` com o dataURL recortado.
  4. Em "Salvar" no preview → upload + persistência; atualiza banner exibido e `router.invalidate()`.
- Estado local mantém `coverUrl` atual (usado como fundo do próprio botão, substituindo o gradiente quando existe).

## Fluxo resumido

```text
[botão capa] → file picker → CoverCropDialog (3:1, preto)
   → ok → CoverPreviewDialog (banner + avatar) → Salvar → upload+update
                                                → Cancelar → descarta
```

## Detalhes técnicos

- Aspect ratio: **3:1** (consistente com o card usado em `search.tsx` e no perfil).
- Bucket: `covers`, privado, signed URL de longa duração (mesmo padrão do `avatars`).
- Nomeação: `covers/{userId}/{uuid}.jpg`.
- Sem mudança em outras telas; apenas o botão da capa nesta rota é afetado.
- Reutiliza `react-easy-crop` já instalado.
