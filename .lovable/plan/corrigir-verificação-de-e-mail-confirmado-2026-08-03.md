# Corrigir verificação de e-mail confirmado

## Diagnóstico confirmado

- O usuário `govitynow@hotmail.com` existe e está com o e-mail confirmado no Supabase.
- A função `is_email_confirmed` existe, possui acesso restrito ao servidor e retorna o estado correto.
- A falha ocorre na server function antes da consulta: o arquivo mantém schema, mapa de rate limit, constantes e helper em escopo de módulo. O compilador separa o handler para execução no servidor e essas dependências deixam de existir nesse contexto, fazendo a chamada lançar erro e a tela mostrar “Não foi possível verificar”.

## Implementação

1. Tornar `auth-confirm.functions.ts` um wrapper fino
   - Manter somente imports e a declaração exportada da server function.
   - Usar validação inline compatível com a separação de server functions.
   - Delegar a consulta e o rate limit a um helper exclusivamente de servidor.

2. Isolar a lógica no servidor
   - Criar um módulo server-only para normalizar o e-mail, aplicar o limite de tentativas e chamar o RPC `is_email_confirmed` com a credencial administrativa.
   - Preservar a resposta segura, sem revelar se um e-mail não confirmado existe ou não.
   - Diferenciar internamente indisponibilidade técnica de “ainda não confirmado”, sem expor detalhes sensíveis.

3. Ajustar o feedback da tela
   - Quando a consulta responder normalmente e ainda não houver confirmação, manter o aviso orientativo atual.
   - Mostrar “Não foi possível verificar” somente em falha técnica real.
   - Manter o polling automático e o redirecionamento para o login com e-mail preenchido quando confirmado.

## Validação

- Testar a função com o e-mail já confirmado e confirmar o retorno positivo.
- Reproduzir o clique em “Já confirmei” na página pública e verificar o redirecionamento para `/entrar` com o aviso de sucesso.
- Confirmar que e-mail inexistente/não confirmado continua recebendo uma resposta indistinguível e segura.
