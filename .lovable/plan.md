## Objetivo

Tornar o selo de perfil certificado real: o criador (perfil pago e perfil gratuito, cada um separadamente) solicita a certificação enviando 3 fotos de corpo inteiro, com rosto visível, segurando um papel com um código gerado pelo site. O pedido cai no painel administrativo, onde é aprovado ou recusado. Só perfis aprovados exibem o selo.

## Estado atual (verificado)

- Não existe nenhuma coluna de "verificado" em `profiles` ou `creator_profiles`. O que existe é `kyc_verified_at`, que é a verificação de identidade do Veriff (documento), coisa diferente.
- O selo `BadgeCheck` hoje é **decorativo**: em `perfil.$username.tsx` (linha ~820) é fixo, e em `ProfileHeaderCard.tsx` só depende de `isCreator`. Em `em-alta/Cards.tsx` vem de dados mockados.

## Banco de dados

1. `creator_profiles`: nova coluna `verified_at timestamptz` (nulo = não certificado).
2. Nova tabela `profile_verification_requests`:
   - `user_id`, `creator_profile_id`, `code` (código gerado), `photo_paths text[]`, `status` (`pending` | `approved` | `rejected`), `admin_notes`, `reviewed_by`, `reviewed_at`, timestamps.
   - GRANTs para `authenticated` e `service_role`; RLS: o dono lê/cria os próprios pedidos; admin/moderador (via `has_role`) lê e atualiza todos; sem exclusão.
   - Índice único parcial impedindo dois pedidos `pending` para o mesmo perfil.
3. Novo bucket **privado** de storage `profile-verification`, com políticas: o dono envia dentro da própria pasta `user_id/…`; leitura apenas por admin/moderador (as fotos nunca ficam públicas).

## Backend (`src/lib/verification.functions.ts`)

- `getMyVerificationStatus` — devolve, para o perfil ativo: se já é certificado, se há pedido pendente/recusado, e o **código de verificação** (gerado de forma determinística e persistido no pedido em rascunho, formato tipo `MTX-7F3K92`).
- `createVerificationUploadUrl` — URL assinada de upload no bucket privado (mesmo padrão de `leak-reports.functions.ts`).
- `submitVerificationRequest` — exige exatamente 3 fotos, valida que não há pedido pendente e grava `status = 'pending'`.
- Admin: `listVerificationRequests`, `getVerificationPhotos` (URLs assinadas temporárias) e `reviewVerificationRequest` (aprovar → grava `verified_at` no `creator_profiles`; recusar → exige motivo). Toda ação registra em `audit_logs`, como já é feito em `admin.functions.ts`.

## Frontend

4. **Nova página `/certificar-perfil`** (rota autenticada):
   - Explica o processo, mostra o **código em destaque** com botão de copiar e as regras (corpo inteiro, rosto visível, papel legível com o código, sem filtros).
   - Três slots de upload de foto (com pré-visualização e possibilidade de trocar) e botão "Enviar para análise".
   - Estados: sem pedido, em análise, aprovado (selo ativo) e recusado (mostra o motivo e permite reenviar com um novo código).
5. **Dashboard**: novo `ActionCard` "Certificar perfil" no `CreatorDashboard`, exibido tanto no modo criador pago quanto no modo gratuito (`isFreeMode`), com descrição dinâmica ("Solicite o selo de perfil verificado" / "Em análise" / "Perfil certificado").
6. **Admin**: nova rota `/admin/verifications` + item "Certificações" na navegação de `admin.tsx`. Lista pedidos pendentes com dados do usuário, código gerado, as 3 fotos (abrindo em visualização ampliada) e botões Aprovar / Recusar com motivo.
7. **Selo real**: `BadgeCheck` passa a ser condicional a `verified_at` do perfil em questão — na página `/perfil/$username`, no `ProfileHeaderCard` do dashboard e nos resultados de busca (o campo `verified_at` será incluído na consulta/RPC de busca de perfis).

## Detalhes técnicos

- A certificação é **por perfil de criador**, então um criador com perfil pago e perfil gratuito precisa solicitar para cada um; a página usa sempre o `active_profile_id`.
- As fotos são conteúdo sensível: bucket privado, leitura só por admin via URL assinada de curta duração, nunca embutidas em páginas públicas.
- Reaproveita os padrões já existentes no projeto: `requireSupabaseAuth`, `has_role`, upload assinado (padrão dos relatórios de vazamento) e o layout de tabelas do admin.
