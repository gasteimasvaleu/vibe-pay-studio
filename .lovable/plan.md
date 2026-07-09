Plano de correção direta:

1. **Remover a mensagem indevida da tela de documentos**
   - Tirar o erro “Não conseguimos abrir a Veriff automaticamente...” que apareceu mesmo com a Veriff abrindo em nova aba.
   - Não bloquear o fluxo por causa do retorno de `window.open`, porque no preview/iframe ele pode retornar bloqueado mesmo quando a aba abre.

2. **Após clicar em “Iniciar verificação”, navegar sempre para `/creator/onboarding/documentos/verificando`**
   - Criar a sessão da Veriff.
   - Abrir a Veriff em nova aba quando possível.
   - Em seguida, mandar a tela atual do app para `/creator/onboarding/documentos/verificando`, sem ficar preso na página anterior.

3. **Garantir que `/documentos/verificando` seja a tela de loading pedida**
   - Fundo escuro do onboarding.
   - Loader gooey roxo.
   - Texto abaixo: “Verificação de identidade em andamento”.
   - Subtexto: “Isso pode demorar alguns minutos...”
   - Sem cards antigos, sem mensagem de erro, sem spinner branco.

4. **Validar o fluxo**
   - Clicar em “Iniciar verificação”.
   - Confirmar que a página atual muda para `/documentos/verificando`.
   - Confirmar que a UX exibida é a tela escura com loader roxo e mensagem, enquanto a Veriff fica na nova aba.