## Objetivo
Remover o botão "Continuar com Google" da página de cadastro, mantendo apenas o fluxo de cadastro por e-mail/senha, conforme solicitado.

## Alterações
1. **Remover o botão Google** do formulário em `src/routes/cadastro.tsx` (linhas 173–179).
2. **Remover o divisor "ou"** (`<Divider />`) que separava o formulário do botão social, pois não haverá mais seção social.
3. **Limpar estado e handler relacionados ao Google**:
   - Remover `googleLoading` e `setGoogleLoading`.
   - Remover a função `handleGoogle`.
4. **Remover imports não utilizados**:
   - `signInWithGoogle` do `@/lib/auth`.
5. **Remover componente auxiliar não utilizado**:
   - `SocialButton`, caso não seja usado em nenhum outro lugar.

## Resultado esperado
A página `/cadastro` exibirá apenas o formulário de cadastro com e-mail, senha e usuário, sem a opção de cadastro via Google. O login com Google continuará existindo apenas na página `/entrar`.