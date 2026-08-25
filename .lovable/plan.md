# Corrigir o @ gerado na criação de conta (e-mail e Google)

## O que está acontecendo

O apelido não é definido pelo app: quando a conta é criada no Supabase, um gatilho no banco (`handle_new_user`) monta o username **sempre** colando um pedaço do ID da conta no final:

- `teste5` → `teste5_4cab49ae`
- `livia bibliatoonkids` (nome do Google) → `livia_bibliatoonkids_03e19916`

Mesmo digitando `teste5` no formulário, o banco força o sufixo. E no "Entrar com Google", como o usuário não escolhe um @, o nome vem do Google e recebe o mesmo hash.

## Correção do gatilho

Reescrever `handle_new_user` para respeitar o nome escolhido:

1. Base do username, nesta ordem: `username` enviado no cadastro → `user_name` (vindo do Google) → parte antes do `@` do e-mail → `usuario`.
2. Normalizar: minúsculas, sem acentos, só letras/números/`_`, 3–20 caracteres.
3. Usar a base **pura** se estiver livre (`teste5`, `livia`).
4. Só em caso de colisão real, tentar `teste5_2`, `teste5_3`, … até 999; e apenas como último recurso um sufixo numérico aleatório de 4 dígitos.
5. Checar disponibilidade contra `profiles.username`, `profiles.free_username` e `creator_profiles.username` — a mesma regra já usada por `resolve_available_username`.

Na prática o gatilho passa a reaproveitar a lógica de `resolve_available_username`, evitando duas regras diferentes.

## Compatibilidade com o Google

- O mesmo gatilho atende o primeiro acesso via Google (que hoje cria conta como assinante e vai para a home).
- Google não envia `username`; envia `user_name`/`email`. A base vira o `user_name` normalizado ou o trecho antes do `@` (ex.: `gasteimasvaleu`), sem sufixo se estiver livre.
- `account_type` continua vindo dos metadados quando existir, com fallback `subscriber`.
- O perfil continua sendo criado com `on conflict (user_id) do nothing`, então o fluxo de OAuth (`/auth/callback` + `ensureCurrentUserProfile`) não duplica nada e não sobrescreve o @ já criado.
- Quem já tem conta por e-mail e depois entra com Google mantém o mesmo perfil e o mesmo @ (o gatilho só roda na criação).
- Colisão no Google gera `nome_2`, legível, em vez de hash.

## Detalhes técnicos

- Migração alterando `public.handle_new_user()` (security definer, `search_path = public`), delegando a escolha do nome para `public.resolve_available_username(base)`.
- Contas já existentes não mudam automaticamente. Posso renomear pontualmente `teste5_4cab49ae` → `teste5` e `livia_bibliatoonkids_03e19916` → `livia_bibliatoonkids`, se você confirmar.
- Nenhuma alteração de front-end necessária; `src/lib/auth.ts` já usa a mesma RPC.
