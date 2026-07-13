## Criar conta de assinante

Vou criar a conta diretamente no Supabase (sem enviar email de confirmação) usando a Admin API via uma migração SQL que:

1. Insere o usuário em `auth.users` já com `email_confirmed_at = now()` (email pré-confirmado).
2. Define os metadados (`raw_user_meta_data`) com `username: sexandoapp` e `account_type: subscriber`, para que o trigger `handle_new_user` crie o perfil correto na tabela `public.profiles`.
3. Senha criptografada com `crypt('Caiaco15', gen_salt('bf'))`.

### Dados
- Username: `sexandoapp`
- Email: `sexandoapp@hotmail.com`
- Senha: `Caiaco15`
- Tipo: `subscriber`
- Email confirmado: sim (sem envio)

Após aplicar, você poderá logar imediatamente com email + senha.
