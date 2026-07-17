## Objetivo

Tornar `/bugreport` funcional (persistir bugs + mídias) e adicionar uma seção "Bugs" no dashboard admin para triagem, seguindo o mesmo padrão já usado em vazamentos (`/content-leak-report` + `/admin/leaks`).

## Banco de dados

Migração única com:

- Tabela `public.bug_reports`
  - `reporter_id` (uuid, FK lógica para `auth.users`)
  - `title` (text)
  - `description` (text)
  - `media_paths` (text[]) — caminhos no bucket `bug-evidence`
  - `status` (enum `bug_report_status`: `open`, `in_progress`, `resolved`, `wont_fix`) default `open`
  - `priority` (enum `bug_report_priority`: `low`, `medium`, `high`) default `medium`
  - `admin_notes` (text)
  - `resolved_at`, `resolved_by`, `created_at`, `updated_at`
- GRANTs (`authenticated` insert/select próprio; `service_role` all)
- RLS:
  - usuário autenticado insere o próprio report
  - usuário lê apenas os próprios
  - admin (via `has_role`) lê/atualiza tudo
- Trigger `updated_at`

## Storage

Bucket privado `bug-evidence` (upload por signed URL, leitura via signed URL gerada no server).

Políticas em `storage.objects`: dono pode fazer upload no próprio prefixo `{user_id}/…`; admin lê tudo.

## Backend (`src/lib/bug-reports.functions.ts`)

Server functions com `requireSupabaseAuth`:

- `createBugEvidenceUploadUrl({ fileName, contentType })` → retorna `{ path, signedUrl }`
- `createBugReport({ title, description, mediaPaths })` → insere linha
- `listAdminBugReports({ status?, priority? })` → só admin; devolve reports + URLs assinadas das mídias + dados básicos do reporter (nome, avatar, email quando disponível via join com `profiles`)
- `updateBugReport({ id, status?, priority?, adminNotes? })` → só admin; grava `resolved_at`/`resolved_by` quando status vira `resolved`/`wont_fix`

## Frontend

- `src/routes/_authenticated/bugreport.tsx`
  - `handleSubmit` async: para cada mídia pede signed upload URL → faz `PUT`, coleta paths, chama `createBugReport`, mostra toast e limpa formulário. Estado `submitting` desabilita o botão.
- `src/routes/_authenticated/admin.tsx`
  - Adiciona item de nav "Bugs" (ícone `Bug`) apontando para `/admin/bugs`.
- `src/routes/_authenticated/admin.bugs.tsx` (novo)
  - Lista com filtros por status e prioridade
  - Cada card: título, descrição, reporter, data, thumbs/vídeos (signed URLs), select de status, select de prioridade, textarea de notas internas, botão salvar
  - Usa `useQuery` + `useMutation` com invalidate

## Detalhes técnicos

- Padrão idêntico ao já implementado em `src/lib/leak-reports.functions.ts` e `src/routes/_authenticated/admin.leaks.tsx` — reaproveitar shape.
- Limites: máx 5 mídias, imagens/vídeos, ~25 MB por arquivo (validar no server function antes de gerar signed URL).
- Signed URLs de leitura no admin válidas por 1h.
- `admin.tsx` já protege com `requireAdminAccess`; as functions de admin também revalidam role via `has_role`.
