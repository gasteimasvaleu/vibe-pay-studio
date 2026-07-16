## Configurar Resend para envio de e-mails transacionais

O código já está pronto para disparar via gateway do Resend (`src/lib/email.server.ts`). Falta conectar a conta e definir o remetente.

### Passos

1. **Conectar Resend via connector da Lovable** (`standard_connectors--connect` com `connector_id: resend`).
   - Isso provisiona automaticamente `RESEND_API_KEY` como variável de ambiente nas server functions.
   - `LOVABLE_API_KEY` já existe no projeto.

2. **Definir remetente (`from`)**:
   - **Opção A — Testes rápidos:** manter `Monetisexy <onboarding@resend.dev>`. Só entrega para o e-mail do dono da conta Resend. Serve para validar o pipeline.
   - **Opção B — Produção:** você verifica um domínio no painel do Resend (ex.: `mail.monetisexy.com`) e me passa o remetente (ex.: `Monetisexy <no-reply@mail.monetisexy.com>`). Eu troco o default no `email.server.ts` e adiciono `APP_EMAIL_FROM` como secret opcional para permitir override sem deploy.

3. **Teste end-to-end**:
   - Após conectar, disparo um envio de teste (via server fn one-off ou reconciliação de uma transação real) e confirmo status 200 do gateway + entrega.
   - Se falhar, leio o corpo do erro do Resend e ajusto (domínio não verificado, escopo, etc.).

### Perguntas rápidas antes de executar

- Confirma que quer usar o **connector Resend da Lovable** (recomendado — sem gerenciar API key manualmente)? Ou prefere colar uma API key existente?
- Já tem um **domínio verificado no Resend**, ou começamos com `onboarding@resend.dev` só para validar?

### Fora de escopo

- Criar conta no Resend / verificar DNS do domínio (isso é feito por você no painel deles).
- Retry queue, bounce tracking, unsubscribe link físico (o link para preferências já está no template).
