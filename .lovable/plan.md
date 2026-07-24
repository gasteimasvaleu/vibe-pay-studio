## Plano

1. **Fazer o botão “Editar perfil” respeitar o perfil exibido**
   - Quando estiver em `/perfil/monetisex2`, o clique não deve abrir a edição do perfil principal por engano.
   - Antes de navegar para as configurações, o app vai definir o `creator_profiles.id` daquele perfil como `active_profile_id` da conta.
   - Depois disso, a navegação continua para `/settings/creator`, já apontando para o perfil correto.

2. **Corrigir a tela “Configurações de Perfil”**
   - Hoje ela lê `profiles.username/avatar_url`, por isso mostra Monetisex mesmo quando o ativo deveria ser Monetisex2.
   - Vou mudar para carregar o `creator_profiles` ativo e exibir nome, @ e avatar do perfil ativo.
   - Se não houver `active_profile_id`, manter fallback seguro para o perfil pago/legado.

3. **Corrigir “Meu perfil” e subpáginas de edição**
   - `/settings/myprofile` deve mostrar avatar, nome, @ e link do perfil ativo.
   - `/settings/social` deve editar o nome e identificador do `creator_profiles` ativo.
   - `/settings/details` e `/settings/social-media` já usam parte da lógica de ativo, mas vou revisar para garantir que leiam e salvem sempre no perfil ativo.

4. **Ajustar funções de servidor para não misturar perfis vinculados**
   - `checkUsernameAvailability` e `updateProfileIdentity` precisam considerar “self” pelo `active_profile_id`, não só pelo `user_id`, porque a mesma conta pode ter dois perfis com usernames diferentes.
   - As funções de avatar, capa, bio e redes sociais devem atualizar o `creator_profiles` ativo; o `profiles` principal só deve ser atualizado quando fizer sentido como fallback/compatibilidade.

5. **Invalidar estado após troca/edição**
   - Após ativar o perfil certo e após salvar mudanças, invalidar router/query cache para TopNav, dashboard e páginas de configuração refletirem o perfil correto.

6. **Validar o fluxo**
   - Testar o caminho: abrir `/perfil/monetisex2` → clicar “Editar perfil” → conferir que a tela mostra Monetisex2 → abrir “Nome de perfil e identificador” → confirmar que os campos vêm de Monetisex2, não Monetisex.

## Detalhes técnicos

- Arquivos principais a alterar:
  - `src/routes/_authenticated/perfil.$username.tsx`
  - `src/routes/_authenticated/settings.creator.tsx`
  - `src/routes/_authenticated/settings.myprofile.tsx`
  - `src/routes/_authenticated/settings.social.tsx`
  - `src/routes/_authenticated/settings.details.tsx` se necessário
  - `src/routes/_authenticated/settings.social-media.tsx`
  - `src/lib/profile.functions.ts`
- Reutilizar/ajustar a server function existente `setActiveCreatorProfile` em `src/lib/creator-profile.functions.ts` para ativar o perfil aberto antes da navegação.