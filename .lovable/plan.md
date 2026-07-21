## Remover "Indicações de criador de conteúdo" (creator_referrals)

A funcionalidade de indicação de criadores não está implementada. Remover as referências da UI e do backend.

### Frontend
- `src/routes/_authenticated/settings.privacy-mail.tsx`: remover o item `creator_referrals` do array de toggles.
- `src/lib/privacy.functions.ts`: remover `creator_referrals` do tipo, dos defaults, do SELECT e do mapper.
- `src/lib/email-templates.meta.ts`: remover da lista de templates, labels, descrições, variáveis e defaults (essa lista alimenta `/admin/emails`).
- `src/lib/admin-email-templates.functions.ts`: remover do array de kinds válidos.

### Backend (server-only)
- `src/lib/email.server.ts`: remover do union type e apagar o TODO comment.
- `src/lib/email-templates.server.ts`: remover do union type, dos templates e das variáveis.
- `src/lib/email-events.server.ts`: remover o bloco que dispara o email `creator_referrals` na criação de perfil indicado.

### Banco de dados
- Migração: remover a coluna `creator_referrals` de `public.email_preferences`, apagar o template `creator_referrals` da tabela `email_templates` e ajustar a função `can_send_email` para não referenciar mais essa chave.

### Observações
- `src/integrations/supabase/types.ts` é regenerado após a migração — não editar à mão.
- Não mexer em `supabase/migrations/*` já executadas.
