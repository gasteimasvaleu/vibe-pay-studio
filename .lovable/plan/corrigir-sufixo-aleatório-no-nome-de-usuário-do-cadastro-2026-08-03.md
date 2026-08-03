# Corrigir sufixo aleatório no nome de usuário do cadastro

## O problema

O perfil criado hoje ficou como `govitynow_0b77c6c7` mesmo com o nome `govitynow` livre no banco (confirmado por consulta: nenhum outro perfil usa esse username).

Esse sufixo é o "último recurso" do código: em `src/lib/auth.ts`, a função `isUsernameTaken()` retorna `true` sempre que a checagem falha ("em caso de erro, assume ocupado"). Ou seja, qualquer falha momentânea na consulta (sessão ainda não estabelecida no momento da criação do perfil, erro de rede, resposta inesperada) faz o app pular direto para `nome_<8 chars do id>` — mesmo com o nome disponível. Também o laço de sufixos só tenta `_2`.. `_9` antes de cair nesse fallback.

## O que fazer

1. **Resolver o nome no servidor, não no navegador**
   Criar uma função no banco (`SECURITY DEFINER`) que recebe o nome desejado e devolve o primeiro disponível, checando tudo em uma única consulta (sem depender de sessão nem de várias idas e voltas). Ela também considera os nomes de perfis de criador/gratuitos, para não gerar conflitos depois.

2. **Nunca "assumir ocupado" em caso de erro**
   Se a checagem falhar, o app tenta inserir com o nome limpo mesmo assim. Só quando o banco recusar por duplicidade é que se aplica sufixo — e nesse caso um sufixo numérico curto (`_2`, `_3`, ...), nunca um pedaço do ID.

3. **Ampliar a faixa de sufixos numéricos**
   De `_2.._9` para `_2.._99`, eliminando na prática o uso do sufixo com ID.

4. **Corrigir o registro já criado**
   Renomear `govitynow_0b77c6c7` para `govitynow` (o nome está livre). Perfis antigos como `sexando_3fc0cc8a` também podem ser normalizados, se você quiser — confirme.

## Detalhes técnicos

- Migração: nova função `public.resolve_available_username(desired text) returns text`, `SECURITY DEFINER`, `search_path = public`, com `GRANT EXECUTE` para `anon` e `authenticated`; lê `profiles.username`, `profiles.free_username` e `creator_profiles.username` em lower-case.
- `src/lib/auth.ts`: `resolveAvailableUsername()` passa a chamar a RPC; `isUsernameTaken()` deixa de existir (ou passa a retornar `false` em erro); o bloco de retry de `ensureCurrentUserProfile()` continua, agora aplicando sufixo numérico incremental.
- Update pontual do username existente via migração/consulta.
