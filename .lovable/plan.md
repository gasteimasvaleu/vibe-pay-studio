# Respeitar o username escolhido no cadastro

Hoje `ensureCurrentUserProfile` sempre anexa `_<8chars do user.id>` ao username via `makeUsername`, mesmo quando o usuário digitou um username próprio no cadastro. Vamos mudar para respeitar o valor escolhido e só adicionar sufixo se houver colisão real no banco.

## Mudanças

**1. `src/lib/auth.ts`**

- Substituir `makeUsername(value, userId)` por uma função `resolveAvailableUsername(base, userId)` **assíncrona** que:
  1. Sanitiza o `base` (regras atuais: sem acentos, lowercase, `[a-z0-9_]`, trim de `_`, mínimo 3 chars → fallback `usuario`, máximo 20 chars — alinhado com `USERNAME_MIN/MAX` de `src/lib/utils.ts`).
  2. Consulta `profiles` por `username = base` (via `supabase.from("profiles").select("id").eq("username", base).maybeSingle()`).
  3. Se **livre**, usa o `base` puro.
  4. Se **ocupado**, tenta sufixos incrementais curtos: `base_2`, `base_3`, … até `base_9`, respeitando o limite de 30 chars. Se ainda colidir (raro), cai no formato antigo `base_<userId.slice(0,8)>` como último recurso garantido de unicidade.

- Em `signUpWithEmail`, passar o `username` digitado como `preferred.username` já é feito — manter.
- Em `ensureCurrentUserProfile`, trocar a chamada `makeUsername(fallbackName, user.id)` por `await resolveAvailableUsername(fallbackName, user.id)`.
- Tratar corrida: se o `INSERT` retornar erro de duplicidade em `username` (unique violation), rodar `resolveAvailableUsername` novamente e reinserir uma vez.

**2. Nada muda no schema.** A coluna `profiles.username` já é única; a lógica é puramente aplicacional.

**3. Nada muda em OAuth (Google).** Contas OAuth continuam caindo no fallback (metadata → prefixo do e-mail → `usuario`), agora sem sufixo aleatório quando o nome estiver livre.

## Detalhes técnicos

- A checagem de disponibilidade roda com o cliente `supabase` do browser (usuário já autenticado logo após signup), então a policy de SELECT em `profiles` (que já permite leitura pública dos campos básicos) cobre.
- Reserva de nomes: manter `sanitizeUsername` de `src/lib/utils.ts` como referência de charset; a normalização em `resolveAvailableUsername` produz o mesmo formato (não vamos duplicar a lista de reservados aqui — `validateUsername` em `profile-active.server.ts` já barra reservados no fluxo de criação de perfil de creator; o cadastro base não valida reservados hoje e manter esse comportamento evita mudar escopo).
- Limite de 30 chars é o teto atual da coluna; ao adicionar sufixo `_N`, truncar o base antes de concatenar.

## Fora de escopo

- Não vamos adicionar UI de "username disponível?" em tempo real no formulário de cadastro.
- Não vamos bloquear nomes reservados no cadastro base (comportamento atual preservado).
- Não vamos renomear usernames existentes com sufixo antigo — só afeta cadastros novos.
