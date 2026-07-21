## Verificação da função "Reenviar e-mail"

### Estado atual
A página `/cadastro/confirme-email` já possui a função implementada no cliente:

- Chama `supabase.auth.resend({ type: "signup", email })`.
- Possui cooldown de 30 segundos.
- Exibe estados de carregamento, sucesso e erro.

### Riscos que podem fazer parecer que não funciona
1. **Supabase Auth pode estar com "Confirm email" desativado** — nesse caso o e-mail de signup nunca é enviado e `resend` pode retornar erro.
2. **Rate limit do Supabase** — tentativas repetidas em curto prazo podem ser bloqueadas.
3. **Domínio de e-mail não configurado / em sandbox** — e-mails podem ir para spam ou ser suprimidos.
4. **Erros não mapeados** — `getAuthErrorMessage` pode não traduzir todos os códigos do `resend`.

### Plano
1. **Auditar o fluxo de cadastro** (`src/routes/cadastro.index.tsx` e `src/lib/auth.ts`) para garantir que o e-mail usado no reenvio é o mesmo da conta criada.
2. **Verificar a configuração do Supabase Auth** via dashboard/API para confirmar que `confirm_email` está habilitado e que há um template de confirmação ativo.
3. **Melhorar o tratamento de erros** no `handleResend` para exibir mensagens específicas dos códigos de erro do Supabase (`over_email_send_rate_limit`, `email_not_confirmed`, etc.).
4. **Adicionar teste/validação** simulando o clique em "Reenviar e-mail" e verificando se a chamada ao Supabase é disparada corretamente.
5. **(Opcional) Se o projeto usar e-mail customizado**, garantir que o domínio e templates estejam configurados; caso contrário, manter o comportamento padrão do Supabase.

### Entregáveis
- `src/routes/cadastro.confirme-email.tsx` com tratamento de erro aprimorado.
- Log de diagnóstico da configuração de auth (confirm_email, rate limits).
- Instruções sobre como testar o reenvio sem depender de caixa de entrada real.