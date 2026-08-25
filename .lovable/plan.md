# Corrigir o @ criado no cadastro (teste5 → teste5_4cab49ae)

## O que está acontecendo

O apelido não é definido pelo app: quando a conta é criada no Supabase, um gatilho no banco (`handle_new_user`) monta o username **sempre** colando um pedaço do ID da conta no final:

`teste5` + `_` + `4cab49ae` → `teste5_4cab49ae`

Ou seja, mesmo digitando `teste5` no formulário, o banco força o sufixo. Não é bug de tela.

## Correção

Reescrever o gatilho para respeitar o nome escolhido:

1. Base do username, nesta ordem: `username` enviado no cadastro → `user_name` (vindo do Google) → parte antes do `@` do e-mail → `usuario`.
2. Normalizar (minúsculas, sem acentos, só letras/números/`_`, 3–20 caracteres).
3. Usar a base **pura** se estiver livre (`teste5`).
4. Só em caso de colisão real, tentar `teste5_2`, `teste5_3`, … até 999; e apenas como último recurso um sufixo numérico aleatório de 4 dígitos.
5. Checar a disponibilidade contra `profiles.username`, `profiles.free_username` e `creator_profiles.username` — a mesma regra já usada pela função `resolve_available_username`, para não gerar conflito depois.

Na prática o gatilho passa a reaproveitar a lógica de `resolve_available_username`, evitando duas regras diferentes.

## Compatibilidade com o login com Google

Não existe cadastro por Google — só login. Ainda assim, quem já tem conta criada por e-mail e depois entra com Google mantém o mesmo perfil e o mesmo @ (o vínculo é pelo e-mail/ID da conta; o gatilho só roda na criação, com `on conflict (user_id) do nothing`).

Como salvaguarda, se por qualquer caminho uma conta nascer sem `username` nos metadados (ex.: primeiro acesso via Google), o gatilho usa o trecho antes do `@` do e-mail como base — normalizado e sem hash, com `_2`, `_3` apenas em colisão real.


## Detalhes técnicos

- Migração alterando `public.handle_new_user()` (security definer, `search_path = public`), delegando a escolha do nome para `public.resolve_available_username(base)`.
- Nenhuma mudança em contas existentes: os @ já criados permanecem como estão (posso corrigir manualmente o seu `teste5_4cab49ae` para `teste5`, se quiser — me confirme).
- Nenhuma alteração de código front-end é necessária; `src/lib/auth.ts` já usa a mesma RPC.
