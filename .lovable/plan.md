
## Objetivo
Criar formulário público `/contato` inspirado no screenshot (Privacy) e um módulo admin para triagem/resposta das mensagens recebidas.

## Banco de dados
Nova migração criando `public.contact_messages`:
- Campos: `name`, `email`, `reason` (enum), `message`, `status` (`open` | `in_progress` | `answered` | `closed`), `admin_reply`, `answered_by`, `answered_at`, `user_id` (nullable — preenchido se logado).
- RLS:
  - INSERT liberado para `anon` e `authenticated` (com validação de tamanho).
  - SELECT/UPDATE/DELETE apenas admins (via `has_role`).
- GRANTs: `INSERT` para `anon` + `authenticated`; `ALL` para `service_role`; `SELECT/UPDATE` para `authenticated` (RLS restringe a admins).
- Índices por `status` e `created_at`.
- Trigger `update_updated_at`.
- Registro em `audit_logs` fica por conta da server function admin.

## Server functions (`src/lib/contact.functions.ts`)
- `submitContact` (público, sem middleware): valida com Zod (nome ≤100, email válido, reason ∈ lista, mensagem 10–2000), captura `user_id` se sessão existir, insere via client publishable.
- `listContactMessages` (admin): filtros por status/motivo/busca, paginação.
- `replyContactMessage` (admin): grava `admin_reply`, marca `answered`, dispara e-mail via Resend (`from` padrão do projeto) ao remetente, loga em `audit_logs`.
- `updateContactStatus` (admin): alterar status manualmente (ex. fechar sem resposta).

## Frontend público — `src/routes/contato.tsx`
Rota pública (fora de `_authenticated`), usando `SiteLayout` para manter identidade Monetisexy (não copiar cor bege/laranja do Privacy — adaptar aos tokens do app, roxo/rosa).
- Header com título "Fale com a Monetisexy" e subtítulo do screenshot.
- Card centralizado (max-w-2xl) com inputs arredondados (`rounded-full` nos inputs simples, `rounded-3xl` no textarea) imitando a estrutura visual:
  - NOME (ícone user)
  - EMAIL (ícone @)
  - MOTIVO (Select shadcn com opções: Cadastros, Acesso ao Perfil, Pagamentos com Cartão de Crédito, Pagamentos, Cancelar Minha Solicitação de Pagamento, Perguntas Técnicas, Reportar Conteúdo Roubado, Aplicação da Lei / Assunto Jurídico, Relatar Material ou Comportamento Ilegal, Marketing e Parcerias, Problemas com Autenticação 2 Fatores, Outro)
  - MENSAGEM (textarea)
- Botão "Enviar" full-width, desabilitado enquanto inválido.
- Rodapé com endereço institucional da Monetisexy + link para "Guia de aplicação da lei" apontando para `/centro-e-seguranca`.
- Head SEO: title/description/og próprios.
- Toast de sucesso e reset após envio.
- Link no Footer global adicionado em `src/components/site/Footer.tsx`.

## Admin — `/admin/contacts`
- Nova rota `src/routes/_authenticated/admin.contacts.tsx` seguindo padrão `AdminTablePage`.
- Filtros: status (Abertas / Em andamento / Respondidas / Fechadas / Todas) e motivo.
- Tabela: data, remetente (nome + email), motivo, preview da mensagem, status (badge), ações.
- Dialog de detalhe: exibe mensagem completa + campo de resposta (textarea) + botões "Enviar resposta" (dispara email) e "Marcar como fechada".
- Registrar todas ações em `audit_logs`.
- Adicionar entry no `ADMIN_NAV` em `src/routes/_authenticated/admin.tsx` (grupo Comunicação/Suporte).

## Detalhes técnicos
- E-mail de resposta: usa integração Resend já existente no projeto (mesma usada em cobranças PIX). Se faltar util, criar wrapper em `src/lib/emails.server.ts` reaproveitando client existente. Template simples HTML com resposta + assinatura Monetisexy.
- Validação Zod compartilhada entre client e server (`src/lib/contact.schema.ts`).
- Toda cor/estilo via tokens do design system — sem hex hardcoded.
