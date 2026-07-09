Plano de implementação:

1. **Substituir o componente `GooeyLoader`**
   - Recriar `src/components/onboarding/GooeyLoader.tsx` no formato do loader enviado.
   - Usar props `primaryColor`, `secondaryColor` e `borderColor` com fallback para os tokens do app.
   - Ajustar o fallback visual para o roxo padrão da Monetisex, usando `var(--primary)`/gradiente roxo do tema.

2. **Aplicar a UX na tela `/creator/onboarding/documentos/verificando`**
   - Manter o fundo escuro do `OnboardingShell`.
   - No estado `processing`/`not_started`, exibir somente:
     - o novo loader gooey roxo;
     - a mensagem “Verificação de identidade em andamento”;
     - o texto “Isso pode demorar alguns minutos...” abaixo.
   - Remover qualquer conteúdo antigo que apareça enquanto a verificação ainda não saiu.

3. **Corrigir o loading que aparece antes da rota renderizar**
   - O spinner branco da captura provavelmente vem do pending da rota autenticada antes da página `verificando` montar.
   - Adicionar um `pendingComponent` na rota autenticada que, quando a URL atual for a página de verificação, usa exatamente a mesma tela escura com o novo `GooeyLoader` e a mensagem.
   - Para as demais rotas autenticadas, manter um pending simples/compatível, sem impactar o fluxo.

4. **Validar visualmente**
   - Abrir a rota de verificação no preview e confirmar que o fundo branco/spinner circular antigo não aparece mais.
   - Confirmar que o loader está roxo e centralizado, com a mensagem abaixo.