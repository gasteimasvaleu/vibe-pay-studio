## Objetivo

Tornar a página `/settings/details` funcional para bio + localização, com botão de geolocalização dentro do input e botões Salvar/Cancelar em fluxo (roxo, largura do input).

## Mudanças

### 1. Migração — adicionar `profiles.location`
- Coluna `location text` (nullable, `check length <= 120`).
- `profiles.bio` já existe.

### 2. Server function `updateProfileDetails` em `src/lib/profile.functions.ts`
- Middleware `requireSupabaseAuth`.
- Input: `{ bio: string; location: string }`.
- Valida: `bio ≤ 3000`, `location ≤ 120`, trim; strings vazias viram `null`.
- `update({ bio, location })` em `profiles` do usuário.

### 3. `settings.details.tsx` — carregar valores reais
- `beforeLoad` passa a selecionar também `bio, location`.
- Estados `bio`/`location` iniciam com os valores do perfil (fallback `""`).
- `dirty` compara com iniciais reais.

### 4. Botão de geolocalização dentro do input de localização
- Ícone `LocateFixed` (lucide) à direita do input, dentro do mesmo container.
- Ao clicar:
  1. `navigator.geolocation.getCurrentPosition` (mostra loader no botão).
  2. Reverse geocoding via Nominatim (`https://nominatim.openstreetmap.org/reverse?format=json&lat=..&lon=..&accept-language=pt-BR`) — sem chave, uso client-side.
  3. Monta string `Cidade, Estado` (ou `Cidade, País` fallback) e preenche o input.
  4. Erros: `toast.error` ("Permissão negada" / "Não foi possível obter localização").

### 5. Botões Salvar / Cancelar em fluxo
- Remover a barra fixa inferior (`fixed bottom-0 ...`) e o `pb-28`.
- Abaixo do input de localização, dois botões empilhados, cada um `w-full`:
  - **Salvar** — `bg-primary text-primary-foreground hover:bg-primary/90` (roxo padrão do app, mesmo estilo usado em `settings.social.tsx`). `disabled={!dirty || saving}`. Chama `updateProfileDetails`, `toast.success`, `router.invalidate()`, reseta `dirty` atualizando iniciais.
  - **Cancelar** — mesmo estilo roxo (consistência com `settings.social.tsx`). `disabled={!dirty || saving}`. Restaura valores iniciais.

## Detalhes técnicos

- Nominatim exige `User-Agent`/rate-limit razoável; uso pontual em clique manual está ok. Fallback silencioso se a resposta falhar.
- Sem alterações em `CoverCropDialog`/`CoverPreviewDialog`.
- Sem novas dependências.
