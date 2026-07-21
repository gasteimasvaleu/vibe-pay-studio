## Objetivo
Garantir que a página `/settings/social` verifique a disponibilidade do `@` não apenas na tabela `profiles`, mas também em `creator_profiles`, evitando colisões de identificadores entre os dois modelos de perfil.

## Problema atual
- A server function `checkUsernameAvailability` (`src/lib/profile.functions.ts`) consulta apenas `profiles.username`.
- A tabela `creator_profiles` também possui a coluna `username` e pode conter handles iguais a `profiles`, gerando duplicidade.

## Escopo da mudança
1. **Backend**: atualizar `checkUsernameAvailability` para verificar a existência do username em ambas as tabelas (`profiles` e `creator_profiles`).
2. **Backend**: atualizar `updateProfileIdentity` para garantir que, ao salvar, o username escolhido não colida com nenhuma das duas tabelas.
3. **Frontend**: manter o mesmo UX da página (`Verificando…`, `Disponível`, `Já está em uso`), sem alterações visuais.
4. **Opcional**: considerar se o username do `creator_profiles` ativo do próprio usuário deve ser tratado como "self" (identificador atual), para não bloquear reutilização do próprio `@`.

## Como funciona hoje
- O usuário digita o `@` no campo.
- A cada mudança, após debounce de 400 ms, chama `checkUsernameAvailability`.
- A server function valida formato e nomes reservados, depois faz `select user_id from profiles where username = $1`.
- Se o username pertence ao usuário logado, retorna `isSelf: true`; se pertence a outro, retorna `taken`; se não existe, retorna `available`.

## Como vai funcionar após a mudança
- O mesmo fluxo de debounce e status visuais será preservado.
- A server function fará duas consultas (ou uma consulta unificada via `union`) em `profiles` e `creator_profiles`.
- Se o username existir em qualquer uma das tabelas e não pertencer ao usuário logado, será considerado `taken`.
- Se existir apenas em um perfil vinculado ao próprio usuário (seja `profiles` ou `creator_profiles`), será considerado `self`.

## Arquivos envolvidos
- `src/lib/profile.functions.ts` — lógica de verificação e salvamento.
- `src/routes/_authenticated/settings.social.tsx` — nenhuma mudança funcional esperada, apenas garantir que os novos status continuem sendo exibidos corretamente.

## Critérios de aceitação
- [ ] Username existente em `creator_profiles` (de outro usuário) aparece como "Já está em uso".
- [ ] Username existente em `profiles` (de outro usuário) continua aparecendo como "Já está em uso".
- [ ] Username próprio em `profiles` ou `creator_profiles` aparece como "Este é seu identificador atual".
- [ ] Tentativa de salvar um username já usado em outra tabela retorna erro apropriado e não gera exceção não tratada.

## Riscos e observações
- É necessário confirmar se a política de RLS permite ao usuário autenticado ler `creator_profiles.username` de outros usuários. Caso contrário, a verificação deverá ser feita via `supabaseAdmin` dentro do server function (já que é uma validação de segurança, não exposição de dados).