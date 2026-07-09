Plano de correção:

1. **Remover o pending global roxo**
   - Desfazer `defaultPendingComponent`, `defaultPendingMs` e `defaultPendingMinMs` em `src/router.tsx`.
   - Isso impede que o loading roxo apareça antes do clique em “Iniciar verificação”.

2. **Trocar a página imediatamente ao clicar em iniciar verificação**
   - Ao clicar no botão em `/documentos`, navegar primeiro para `/documentos/verificando`.
   - Depois disso, criar a sessão da Veriff em background.
   - Quando receber a URL da Veriff, abrir em nova aba.
   - Assim a tela atual nunca fica em “Preparando...” na página de documentos.

3. **Deixar `/documentos/verificando` como única tela de loading visual**
   - A rota `documentos/verificando` permanece com fundo escuro, loader gooey roxo e mensagem.
   - Essa é a tela exibida enquanto a verificação não sai.

4. **Persistir a URL de retorno corretamente**
   - A sessão Veriff continuará recebendo `return_url` apontando para `/creator/onboarding/documentos/verificando`.
   - Se a abertura da nova aba falhar, o app permanece na tela de verificação e continua aguardando/polling, sem mostrar erro na página anterior.