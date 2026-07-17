
## Objetivo

Tornar a página `/content-leak-report` funcional (persistir denúncias no banco, com upload de mídias como evidência) e adicionar uma seção **Vazamentos** no dashboard admin para triagem/resolução.

## Backend (migração)

1. Novo bucket privado `leak-evidence` no Storage (só o dono lê seus próprios; admins leem tudo via política).
2. Nova tabela `public.content_leak_reports`:
   - `id uuid pk`, `reporter_id uuid` (auth.uid), `title text`, `leak_url text`, `description text`,
   - `evidence_paths text[]` (paths do bucket),
   - `status text` — `open` | `reviewing` | `resolved` | `dismissed` (default `open`),
   - `admin_notes text`, `resolved_by uuid`, `resolved_at timestamptz`,
   - `created_at`, `updated_at`.
3. GRANTs + RLS:
   - `authenticated` faz `INSERT` das próprias denúncias e `SELECT` das suas.
   - Admin/moderator (`has_role`) faz `SELECT`/`UPDATE` em tudo.
4. Políticas do bucket `leak-evidence`:
   - INSERT/SELECT: dono pela primeira pasta = `auth.uid()`.
   - SELECT extra: admin/moderator veem tudo.

## Server functions (`src/lib/leak-reports.functions.ts`)

- `createLeakReport({ title, leakUrl, description, evidencePaths })` — auth, valida tamanhos, insere linha.
- `createLeakEvidenceUploadUrl({ filename, contentType })` — auth, retorna signed upload URL em `leak-evidence/{uid}/{uuid}-{filename}`.
- `listAdminLeakReports({ status?, limit?, offset? })` — admin only, hidrata reporter (username/avatar) e gera signed URLs (5 min) para cada evidência.
- `updateLeakReport({ id, status, adminNotes? })` — admin only, grava `resolved_by`/`resolved_at`, escreve `audit_logs`.

## Frontend

### `src/routes/_authenticated/content-leak-report.tsx`
- Substitui o `toast.success` fake pelo fluxo real:
  1. Para cada arquivo: pede signed URL → PUT no Storage.
  2. Chama `createLeakReport` com os paths retornados.
  3. Toast de sucesso + `router.history.back()`. Trata erros com toast.

### Admin
- `src/routes/_authenticated/admin.tsx`: adiciona item **Vazamentos** (ícone `FileWarning`) ao `NAV`.
- Nova rota `src/routes/_authenticated/admin.leaks.tsx`: mesma UX das outras abas admin (filtros por status, tabela em `Card`), com:
  - Colunas: reporter, título, link (abre em nova aba), data, status.
  - Expandir linha → descrição completa, thumbnails/links das evidências (signed URLs), textarea de notas admin.
  - Ações: **Em análise**, **Resolvido**, **Descartar**.

## Fora de escopo
- Notificar por email o denunciante (podemos adicionar depois usando `email-events.server.ts`).
- Fluxo de takedown/DMCA automatizado.
