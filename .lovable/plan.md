Plano de correção:

1. **Corrigir a causa do spinner branco**
   - O spinner branco não está vindo do `GooeyLoader`; ele aparece antes da tela montar, provavelmente porque o fluxo de documentos tenta navegar o `window.top` para a Veriff dentro do preview.
   - Remover essa navegação para `window.top.location.href`, que trava o preview em uma tela branca de carregamento.

2. **Ajustar o fluxo ao iniciar a Veriff**
   - Depois de criar a sessão da Veriff, navegar a aba atual do app para `/creator/onboarding/documentos/verificando`.
   - Abrir a Veriff em nova aba/janela com `window.open`, sem substituir a tela atual do app.
   - Se o navegador bloquear o popup, manter o usuário na tela de documentos com o link manual “Abrir verificação em nova aba” e sem cair no spinner branco.

3. **Forçar a UX correta na rota `documentos/verificando`**
   - Manter o fundo escuro do onboarding.
   - Usar o `GooeyLoader` roxo enviado.
   - Mostrar a mensagem abaixo: “Verificação de identidade em andamento” e “Isso pode demorar alguns minutos...”.
   - Configurar `pendingMs: 0` nessa rota para que qualquer carregamento da própria rota já use esse estado, sem esperar cair no spinner padrão.

4. **Adicionar fallback global seguro no router**
   - Definir um `defaultPendingComponent` no `src/router.tsx` com fundo escuro e loader roxo, para impedir que o TanStack/preview mostre o spinner branco quando uma rota protegida ainda estiver carregando.

5. **Validar no preview**
   - Reabrir `/creator/onboarding/documentos/verificando`.
   - Confirmar que não há fundo branco nem spinner circular antigo.
   - Confirmar que a tela mostra o fundo escuro, loader roxo e mensagem de verificação.