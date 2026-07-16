## Objetivo

Tornar a página `/settings/social` ("Nome de perfil e Identificador") funcional: carregar os valores atuais do banco, checar disponibilidade do `@` (username) em tempo real ao editar, validar o nome, e salvar as alterações no Supabase.

## Comportamento

- **Carregar valores atuais** do `profiles` do usuário logado: `display_name` e `username`.
- **Nome do Perfil** (`display_name`):
  - Validação local: obrigatório, 2–40 caracteres, sem quebras de linha.
  - Sem checagem de banco (não precisa ser único).
- **Identificador (`@`)**:
  - Normalização já feita: lowercase, `[a-z0-9_]`, máx. 30.
  - Validação: mínimo 3 caracteres, não pode começar com `_`, não pode ser uma palavra reservada (`admin`, `api`, `auth`, `settings`, `perfil`, `profile`, etc.).
  - **Checagem de disponibilidade no banco** com debounce (~400ms):
    - Se igual ao atual → "Este é seu identificador atual".
    - Se disponível → "Disponível" em verde.
    - Se ocupado → "Já está em uso" em vermelho.
    - Enquanto checa → spinner "Verificando…".
  - Usa `profiles_username_key` (UNIQUE) — consulta `SELECT 1 FROM profiles WHERE username = $1`.
- **Botão Salvar** aparece no header (canto direito) quando há alterações válidas:
  - Desabilitado enquanto verificando, se inválido, ou se `@` indisponível.
  - Ao salvar: atualiza `profiles` via server function e trata erro `23505` (colisão de corrida) mostrando "Já está em uso".
  - Sucesso: toast, `router.invalidate()` e mantém na página com os novos valores.

## Implementação técnica

### Server functions em `src/lib/profile.functions.ts` (arquivo já existe)

Adicionar duas funções, ambas com `.middleware([requireSupabaseAuth])`:

1. **`checkUsernameAvailability({ username })`** → `{ available: boolean; isSelf: boolean }`
   - Normaliza e valida formato server-side.
   - `context.supabase.from("profiles").select("user_id").eq("username", username).maybeSingle()`.
   - `isSelf = data?.user_id === context.userId`.

2. **`updateProfileIdentity({ displayName, username })`** → `{ ok: true }` ou erro tipado
   - Revalida ambos campos (fonte de verdade no servidor).
   - `update(...).eq("user_id", context.userId)`; captura `error.code === "23505"` e devolve `{ ok: false, reason: "username_taken" }`.

### Página `src/routes/_authenticated/settings.social.tsx`

- Carregar `display_name` + `username` atuais no `beforeLoad` (já lê `username`; adicionar `display_name`).
- Estado local para os dois campos + estado de checagem (`idle | checking | available | taken | invalid | self`).
- Hook `useEffect` com debounce que dispara `checkUsernameAvailability` quando o handle muda e passa validação local. Cancelar via flag de request-id para evitar race.
- Mensagens de status abaixo do input do `@`.
- Botão "Salvar" no header, chamando `updateProfileIdentity` via `useServerFn`.
- Toast de sucesso/erro com `sonner` (já usado no projeto).

## Segurança

- Toda validação e escrita passa por `requireSupabaseAuth` — o cliente nunca escreve direto em `profiles.username`.
- A UNIQUE index existente (`profiles_username_key`) garante integridade mesmo em condição de corrida.
- Sem alterações de schema; sem migração necessária.
