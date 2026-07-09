Plano de correção final:

1. **Remover a aba `about:blank`**
   - Apagar `reserveVeriffTab()` e qualquer `window.open("about:blank")`.
   - Isso elimina a aba branca mostrada no print.

2. **Não navegar antes da sessão Veriff existir**
   - O clique em “Iniciar verificação” deve primeiro chamar `createIdentityVerificationSession` e aguardar a URL real da Veriff.
   - Isso evita abortar/falhar o server function por desmontar a página antes da resposta.

3. **Abrir a Veriff com a URL real**
   - Depois que `result.url` chegar, chamar `window.open(result.url, "_blank", "noopener,noreferrer")`.
   - Se o popup for bloqueado, usar `window.location.href = result.url` como fallback, para nunca abrir aba branca.

4. **Só então ir para `/creator/onboarding/documentos/verificando`**
   - Depois de abrir a Veriff, navegar a aba atual do app para a tela `documentos/verificando`.
   - Essa rota fica responsável por exibir o loading roxo com fundo escuro e mensagem.

5. **Estado do botão durante a criação da sessão**
   - Enquanto a sessão Veriff está sendo criada, o botão pode ficar desabilitado com “Preparando...”, mas sem abrir loading roxo antes da rota `verificando`.
   - O loading roxo aparece apenas depois que a URL Veriff foi gerada e a tela atual mudou para `/documentos/verificando`.

6. **Validar sinais**
   - Confirmar no código que não existe mais `about:blank`.
   - Confirmar que a ordem é: criar sessão → abrir URL real da Veriff → navegar para `verificando`.
   - Confirmar que `/documentos/verificando` mantém a UX pedida: fundo escuro, gooey roxo e mensagem.